package cleanup

import (
	"context"
	"fmt"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/thomas/skillhive-api/internal/llm"
)

const jobsCollection = "cleanupJobs"

// tokenBudget is an upper bound used to pre-flight reject oversized prompts.
// Gemini 2.0 Flash has ~1M input tokens; we estimate conservatively as len/4.
const tokenBudget = 800_000

type Service struct {
	fs        *firestore.Client
	llmClient llm.Client
	templates *TemplateStore
}

func NewService(fs *firestore.Client, llmClient llm.Client, templates *TemplateStore) *Service {
	return &Service{fs: fs, llmClient: llmClient, templates: templates}
}

// ErrBudgetExceeded signals that the prompt is too big; caller should surface
// as 413 and ask the admin to narrow the filter.
var ErrBudgetExceeded = fmt.Errorf("prompt token budget exceeded")

// RunAnalysis creates a cleanupJobs doc in state `proposed` (on success) or
// `failed` (if Gemini returns unusable output). Returns the persisted job.
func (s *Service) RunAnalysis(ctx context.Context, disciplineID string, entityType EntityType, templateID string, filter Filter, actorUID string) (*Job, error) {
	if !entityType.IsValid() {
		return nil, fmt.Errorf("invalid entity type %q", entityType)
	}
	tmpl, err := s.templates.Get(ctx, templateID)
	if err != nil {
		return nil, fmt.Errorf("load template: %w", err)
	}
	if tmpl.DisciplineID != disciplineID || tmpl.EntityType != entityType {
		return nil, fmt.Errorf("template scope mismatch")
	}

	records, err := LoadRecords(ctx, s.fs, disciplineID, entityType, filter)
	if err != nil {
		return nil, fmt.Errorf("load records: %w", err)
	}

	prompt := BuildPrompt(entityType, tmpl, records)
	if estimateTokens(prompt) > tokenBudget {
		return nil, ErrBudgetExceeded
	}

	job := Job{
		DisciplineID: disciplineID,
		EntityType:   entityType,
		TemplateID:   templateID,
		TemplateName: tmpl.Name,
		Filter:       filter,
		RecordCount:  len(records),
		CreatedBy:    actorUID,
		CreatedAt:    time.Now().UTC(),
	}

	raw, llmErr := s.llmClient.Generate(prompt)
	job.RawLLMResponse = raw
	if llmErr != nil {
		job.Status = StatusFailed
		job.Error = fmt.Sprintf("gemini call failed: %v", llmErr)
		return s.persist(ctx, job)
	}

	parsed, parseErr := ParseResponse(raw)
	if parseErr != nil {
		job.Status = StatusFailed
		job.Error = fmt.Sprintf("parse: %v", parseErr)
		return s.persist(ctx, job)
	}

	proposals, warnings := Validate(entityType, records, parsed.Actions)
	if len(warnings) > 0 {
		// Append warnings to raw response for audit.
		job.RawLLMResponse = raw + "\n\n--- validator warnings ---\n" + strings.Join(warnings, "\n")
	}
	if len(proposals) == 0 {
		job.Status = StatusFailed
		job.Error = "no valid proposals after validation"
		return s.persist(ctx, job)
	}

	job.Proposals = proposals
	job.Status = StatusProposed
	return s.persist(ctx, job)
}

func (s *Service) persist(ctx context.Context, job Job) (*Job, error) {
	ref, _, err := s.fs.Collection(jobsCollection).Add(ctx, job)
	if err != nil {
		return nil, fmt.Errorf("persist job: %w", err)
	}
	job.ID = ref.ID
	return &job, nil
}

// GetJob loads a single job by id.
func (s *Service) GetJob(ctx context.Context, id string) (*Job, error) {
	doc, err := s.fs.Collection(jobsCollection).Doc(id).Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("get job: %w", err)
	}
	var j Job
	if err := doc.DataTo(&j); err != nil {
		return nil, fmt.Errorf("parse job: %w", err)
	}
	j.ID = doc.Ref.ID
	return &j, nil
}

// ListJobs returns jobs for a discipline + entity type, optionally filtered
// by status. Sorted by createdAt desc.
func (s *Service) ListJobs(ctx context.Context, disciplineID string, entityType EntityType, statusFilter JobStatus) ([]Job, error) {
	query := s.fs.Collection(jobsCollection).
		Where("disciplineId", "==", disciplineID).
		Where("entityType", "==", string(entityType)).
		OrderBy("createdAt", firestore.Desc)
	if statusFilter != "" {
		query = query.Where("status", "==", string(statusFilter))
	}
	iter := query.Documents(ctx)
	defer iter.Stop()

	var out []Job
	for {
		doc, err := iter.Next()
		if err != nil {
			if err.Error() == "no more items in iterator" {
				break
			}
			return nil, fmt.Errorf("list jobs: %w", err)
		}
		var j Job
		if err := doc.DataTo(&j); err != nil {
			return nil, fmt.Errorf("parse job: %w", err)
		}
		j.ID = doc.Ref.ID
		// Trim proposals in list view to avoid bloated payloads.
		j.Proposals = nil
		out = append(out, j)
	}
	return out, nil
}

// UpdateProposal applies admin edits to a single proposal (inline-edit of
// `after` fields and/or toggling `approved`). Returns the refreshed job.
func (s *Service) UpdateProposal(ctx context.Context, jobID string, index int, after *ProposedFields, approved *bool) (*Job, error) {
	ref := s.fs.Collection(jobsCollection).Doc(jobID)
	err := s.fs.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		doc, err := tx.Get(ref)
		if err != nil {
			return err
		}
		var j Job
		if err := doc.DataTo(&j); err != nil {
			return err
		}
		if j.Status != StatusProposed {
			return fmt.Errorf("cannot edit proposals on job in status %q", j.Status)
		}
		if index < 0 || index >= len(j.Proposals) {
			return fmt.Errorf("proposal index out of range")
		}
		p := &j.Proposals[index]
		if after != nil && p.Action == ActionUpdate {
			p.After = after
		}
		if approved != nil {
			p.Approved = *approved
		}
		return tx.Set(ref, j)
	})
	if err != nil {
		return nil, fmt.Errorf("update proposal: %w", err)
	}
	return s.GetJob(ctx, jobID)
}

// Discard marks a job as discarded.
func (s *Service) Discard(ctx context.Context, jobID string) error {
	_, err := s.fs.Collection(jobsCollection).Doc(jobID).Update(ctx, []firestore.Update{
		{Path: "status", Value: string(StatusDiscarded)},
	})
	return err
}

func estimateTokens(s string) int { return len(s) / 4 }
