package cleanup

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
)

type Executor struct {
	fs *firestore.Client
}

func NewExecutor(fs *firestore.Client) *Executor {
	return &Executor{fs: fs}
}

// Apply runs the four-pass executor. Returns the final job (with
// appliedResult). Operations that fail concurrency or validation at apply
// time are skipped and recorded in the result — the rest still apply.
func (e *Executor) Apply(ctx context.Context, jobID, actorUID string) (*Job, error) {
	jobRef := e.fs.Collection(jobsCollection).Doc(jobID)
	jobDoc, err := jobRef.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("load job: %w", err)
	}
	var job Job
	if err := jobDoc.DataTo(&job); err != nil {
		return nil, fmt.Errorf("parse job: %w", err)
	}
	job.ID = jobRef.ID

	if job.Status != StatusProposed {
		return nil, fmt.Errorf("job status %q is not 'proposed'", job.Status)
	}

	approved := filterApproved(job.Proposals)
	result := AppliedResult{}

	// Pass 1: concurrency check (read-only).
	fresh := map[string]RecordSnapshot{}
	for _, p := range approved {
		cur, err := e.currentSnapshot(ctx, job.EntityType, p.TargetID)
		if err != nil || cur == nil {
			result.Skipped = append(result.Skipped, SkippedOp{Index: p.Index, Reason: fmt.Sprintf("current record unavailable: %v", err)})
			continue
		}
		if !cur.UpdatedAt.Equal(p.Before.UpdatedAt) {
			result.Skipped = append(result.Skipped, SkippedOp{Index: p.Index, Reason: "stale: record changed since analysis"})
			continue
		}
		fresh[p.TargetID] = *cur
	}
	survivors := filterBySurvivors(approved, fresh)

	// Pass 2: deletes + merges. For each, rewrite refs then delete.
	for _, p := range survivors {
		if p.Action != ActionDelete {
			continue
		}
		if _, ok := fresh[p.MergeInto]; !ok {
			if cur, err := e.currentSnapshot(ctx, job.EntityType, p.MergeInto); err != nil || cur == nil {
				result.Skipped = append(result.Skipped, SkippedOp{Index: p.Index, Reason: "mergeInto target missing at apply time"})
				continue
			}
		}
		if err := e.applyMerge(ctx, job.EntityType, p.TargetID, p.MergeInto); err != nil {
			result.Skipped = append(result.Skipped, SkippedOp{Index: p.Index, Reason: fmt.Sprintf("merge failed: %v", err)})
			continue
		}
		result.Deleted++
	}

	// Pass 3: updates.
	for _, p := range survivors {
		if p.Action != ActionUpdate {
			continue
		}
		if err := e.applyUpdate(ctx, job.EntityType, p); err != nil {
			result.Skipped = append(result.Skipped, SkippedOp{Index: p.Index, Reason: fmt.Sprintf("update failed: %v", err)})
			continue
		}
		result.Updated++
	}

	// Pass 4: finalize.
	now := time.Now().UTC()
	job.Status = StatusApplied
	job.AppliedBy = actorUID
	job.AppliedAt = &now
	job.AppliedResult = &result
	if _, err := jobRef.Set(ctx, job); err != nil {
		return nil, fmt.Errorf("finalize job: %w", err)
	}
	slog.Info("cleanup job applied",
		"jobId", job.ID, "entityType", job.EntityType,
		"actor", actorUID, "updated", result.Updated,
		"deleted", result.Deleted, "skipped", len(result.Skipped))

	return &job, nil
}

func filterApproved(ps []Proposal) []Proposal {
	var out []Proposal
	for _, p := range ps {
		if p.Approved {
			out = append(out, p)
		}
	}
	return out
}

func filterBySurvivors(ps []Proposal, fresh map[string]RecordSnapshot) []Proposal {
	var out []Proposal
	for _, p := range ps {
		if _, ok := fresh[p.TargetID]; ok {
			out = append(out, p)
		}
	}
	return out
}

func (e *Executor) currentSnapshot(ctx context.Context, entityType EntityType, id string) (*RecordSnapshot, error) {
	collection := "categories"
	if entityType == EntityTechnique {
		collection = "techniques"
	}
	doc, err := e.fs.Collection(collection).Doc(id).Get(ctx)
	if err != nil {
		return nil, err
	}
	var snap RecordSnapshot
	if err := doc.DataTo(&snap); err != nil {
		return nil, err
	}
	snap.ID = doc.Ref.ID
	return &snap, nil
}

// applyMerge rewrites references from `from` to `to` then deletes `from`.
func (e *Executor) applyMerge(ctx context.Context, entityType EntityType, from, to string) error {
	disciplineID, err := e.lookupDiscipline(ctx, entityType, from)
	if err != nil {
		return err
	}

	switch entityType {
	case EntityCategory:
		if err := e.rewriteCategoryParents(ctx, disciplineID, from, to); err != nil {
			return fmt.Errorf("rewrite category parents: %w", err)
		}
		if err := e.rewriteCategoryIDsIn(ctx, "techniques", disciplineID, from, to); err != nil {
			return fmt.Errorf("rewrite technique categoryIds: %w", err)
		}
		if err := e.rewriteCategoryIDsIn(ctx, "assets", disciplineID, from, to); err != nil {
			return fmt.Errorf("rewrite asset categoryIds: %w", err)
		}
		if _, err := e.fs.Collection("categories").Doc(from).Delete(ctx); err != nil {
			return fmt.Errorf("delete category: %w", err)
		}
	case EntityTechnique:
		if err := e.rewriteTechniqueIDsIn(ctx, "assets", disciplineID, from, to); err != nil {
			return fmt.Errorf("rewrite asset techniqueIds: %w", err)
		}
		if err := e.rewriteElementTechniqueID(ctx, disciplineID, from, to); err != nil {
			return fmt.Errorf("rewrite curriculum element techniqueIds: %w", err)
		}
		if _, err := e.fs.Collection("techniques").Doc(from).Delete(ctx); err != nil {
			return fmt.Errorf("delete technique: %w", err)
		}
	}
	return nil
}

func (e *Executor) lookupDiscipline(ctx context.Context, entityType EntityType, id string) (string, error) {
	collection := "categories"
	if entityType == EntityTechnique {
		collection = "techniques"
	}
	doc, err := e.fs.Collection(collection).Doc(id).Get(ctx)
	if err != nil {
		return "", err
	}
	var m map[string]interface{}
	if err := doc.DataTo(&m); err != nil {
		return "", err
	}
	if s, ok := m["disciplineId"].(string); ok {
		return s, nil
	}
	return "", fmt.Errorf("no disciplineId on %s/%s", collection, id)
}

func (e *Executor) rewriteCategoryParents(ctx context.Context, disciplineID, from, to string) error {
	iter := e.fs.Collection("categories").
		Where("disciplineId", "==", disciplineID).
		Where("parentId", "==", from).
		Documents(ctx)
	defer iter.Stop()
	return applyBatches(ctx, e.fs, iter, func(docRef *firestore.DocumentRef) []firestore.Update {
		return []firestore.Update{{Path: "parentId", Value: to}, {Path: "updatedAt", Value: time.Now().UTC()}}
	})
}

func (e *Executor) rewriteCategoryIDsIn(ctx context.Context, collection, disciplineID, from, to string) error {
	iter := e.fs.Collection(collection).
		Where("disciplineId", "==", disciplineID).
		Where("categoryIds", "array-contains", from).
		Documents(ctx)
	defer iter.Stop()
	return applyArrayRewrite(ctx, e.fs, iter, "categoryIds", from, to)
}

func (e *Executor) rewriteTechniqueIDsIn(ctx context.Context, collection, disciplineID, from, to string) error {
	iter := e.fs.Collection(collection).
		Where("disciplineId", "==", disciplineID).
		Where("techniqueIds", "array-contains", from).
		Documents(ctx)
	defer iter.Stop()
	return applyArrayRewrite(ctx, e.fs, iter, "techniqueIds", from, to)
}

func (e *Executor) rewriteElementTechniqueID(ctx context.Context, disciplineID, from, to string) error {
	// Curriculum elements live in /curricula/{id}/elements subcollection.
	// We need to find all curricula in the discipline first.
	curIter := e.fs.Collection("curricula").
		Where("disciplineId", "==", disciplineID).
		Documents(ctx)
	defer curIter.Stop()

	for {
		cur, err := curIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return err
		}
		elemIter := cur.Ref.Collection("elements").
			Where("techniqueId", "==", from).
			Documents(ctx)
		if err := applyBatches(ctx, e.fs, elemIter, func(docRef *firestore.DocumentRef) []firestore.Update {
			return []firestore.Update{{Path: "techniqueId", Value: to}, {Path: "updatedAt", Value: time.Now().UTC()}}
		}); err != nil {
			elemIter.Stop()
			return err
		}
		elemIter.Stop()
	}
	return nil
}

// applyBatches streams docs from `iter` and applies single-field updates in
// Firestore batches of up to 450 (safely under the 500-write transaction
// limit). Uses WriteBatch.Commit so any per-batch failure surfaces as an
// error to the caller.
func applyBatches(ctx context.Context, fs *firestore.Client, iter *firestore.DocumentIterator, updatesFor func(*firestore.DocumentRef) []firestore.Update) error {
	const batchSize = 450
	batch := fs.Batch()
	pending := 0
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return err
		}
		batch.Update(doc.Ref, updatesFor(doc.Ref))
		pending++
		if pending >= batchSize {
			if _, err := batch.Commit(ctx); err != nil {
				return fmt.Errorf("commit batch: %w", err)
			}
			batch = fs.Batch()
			pending = 0
		}
	}
	if pending > 0 {
		if _, err := batch.Commit(ctx); err != nil {
			return fmt.Errorf("commit batch: %w", err)
		}
	}
	return nil
}

// applyArrayRewrite reads the current array value for each matching doc and
// writes back the deduped replacement. Surfaces commit errors.
func applyArrayRewrite(ctx context.Context, fs *firestore.Client, iter *firestore.DocumentIterator, field, from, to string) error {
	const batchSize = 450
	batch := fs.Batch()
	pending := 0
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return err
		}
		raw, ok := doc.Data()[field].([]interface{})
		if !ok {
			continue
		}
		cur := make([]string, 0, len(raw))
		for _, v := range raw {
			if s, ok := v.(string); ok {
				cur = append(cur, s)
			}
		}
		next := replaceAndDedupe(cur, from, to)
		batch.Update(doc.Ref, []firestore.Update{
			{Path: field, Value: next},
			{Path: "updatedAt", Value: time.Now().UTC()},
		})
		pending++
		if pending >= batchSize {
			if _, err := batch.Commit(ctx); err != nil {
				return fmt.Errorf("commit batch: %w", err)
			}
			batch = fs.Batch()
			pending = 0
		}
	}
	if pending > 0 {
		if _, err := batch.Commit(ctx); err != nil {
			return fmt.Errorf("commit batch: %w", err)
		}
	}
	return nil
}

func (e *Executor) applyUpdate(ctx context.Context, entityType EntityType, p Proposal) error {
	after := *p.After
	before := p.Before

	collection := "categories"
	if entityType == EntityTechnique {
		collection = "techniques"
	}
	updates := []firestore.Update{
		{Path: "name", Value: after.Name},
		{Path: "slug", Value: after.Slug},
		{Path: "description", Value: after.Description},
		{Path: "updatedAt", Value: time.Now().UTC()},
	}

	switch entityType {
	case EntityCategory:
		// Only write parentId when the admin intentionally changed it. Pass 2
		// may have already rewritten this field for us (e.g., the original
		// parent was merged); blindly writing the proposal's parentId would
		// clobber that rewrite.
		if !equalNullableString(after.ParentID, before.ParentID) {
			disciplineID, err := e.lookupDiscipline(ctx, EntityCategory, p.TargetID)
			if err != nil {
				return err
			}
			if after.ParentID != nil && *after.ParentID != "" {
				if err := e.checkLiveParentCycle(ctx, disciplineID, p.TargetID, *after.ParentID); err != nil {
					return err
				}
			}
			var parentVal interface{} = nil
			if after.ParentID != nil {
				parentVal = *after.ParentID
			}
			updates = append(updates, firestore.Update{Path: "parentId", Value: parentVal})
		}
	case EntityTechnique:
		// Only write categoryIds when the admin intentionally changed them —
		// otherwise preserve any Pass 2 rewrites.
		if !equalStringSlices(after.CategoryIDs, before.CategoryIDs) {
			updates = append(updates, firestore.Update{Path: "categoryIds", Value: after.CategoryIDs})
		}
	}

	_, err := e.fs.Collection(collection).Doc(p.TargetID).Update(ctx, updates)
	return err
}

// checkLiveParentCycle walks the live Firestore parent chain from
// proposedParentID. If selfID appears anywhere in the chain, the proposed
// edge would form a cycle. Used as a Pass 3 re-check because Pass 2 may
// have changed the graph since the proposal was created.
func (e *Executor) checkLiveParentCycle(ctx context.Context, disciplineID, selfID, proposedParentID string) error {
	if proposedParentID == selfID {
		return fmt.Errorf("cycle: parent of %q would be itself", selfID)
	}
	seen := map[string]bool{selfID: true}
	current := proposedParentID
	for current != "" {
		if seen[current] {
			return fmt.Errorf("cycle detected at %q", current)
		}
		seen[current] = true
		doc, err := e.fs.Collection("categories").Doc(current).Get(ctx)
		if err != nil {
			// Parent not found — no cycle from here.
			return nil
		}
		var snap RecordSnapshot
		if err := doc.DataTo(&snap); err != nil {
			return nil
		}
		if snap.ParentID == nil || *snap.ParentID == "" {
			return nil
		}
		current = *snap.ParentID
	}
	return nil
}

func equalNullableString(a, b *string) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return *a == *b
}

func equalStringSlices(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
