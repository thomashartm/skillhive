package cleanup

import (
	"time"
)

// EntityType identifies which taxonomy this cleanup operates on.
type EntityType string

const (
	EntityCategory  EntityType = "category"
	EntityTechnique EntityType = "technique"
)

func (e EntityType) IsValid() bool {
	return e == EntityCategory || e == EntityTechnique
}

// JobStatus is the lifecycle of a cleanup job.
type JobStatus string

const (
	StatusProposed  JobStatus = "proposed"
	StatusApplied   JobStatus = "applied"
	StatusDiscarded JobStatus = "discarded"
	StatusFailed    JobStatus = "failed"
)

// ActionType is one of update or delete.
type ActionType string

const (
	ActionUpdate ActionType = "update"
	ActionDelete ActionType = "delete"
)

// Template is an admin-authored prompt variant.
type Template struct {
	ID           string     `json:"id" firestore:"-"`
	DisciplineID string     `json:"disciplineId" firestore:"disciplineId"`
	EntityType   EntityType `json:"entityType" firestore:"entityType"`
	Name         string     `json:"name" firestore:"name"`
	Description  string     `json:"description" firestore:"description"`
	PromptBody   string     `json:"promptBody" firestore:"promptBody"`
	CreatedBy    string     `json:"createdBy" firestore:"createdBy"`
	CreatedAt    time.Time  `json:"createdAt" firestore:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt" firestore:"updatedAt"`
}

// Filter narrows the input record set for a job.
type Filter struct {
	ParentID    *string `json:"parentId,omitempty"    firestore:"parentId,omitempty"`
	CategoryID  *string `json:"categoryId,omitempty"  firestore:"categoryId,omitempty"`
	TagSlug     *string `json:"tagSlug,omitempty"     firestore:"tagSlug,omitempty"`
	Search      *string `json:"search,omitempty"      firestore:"search,omitempty"`
}

// RecordSnapshot is the minimal view of a category or technique used in a
// proposal. Fields are populated based on entity type.
type RecordSnapshot struct {
	ID          string    `json:"id"          firestore:"id"`
	Name        string    `json:"name"        firestore:"name"`
	Slug        string    `json:"slug"        firestore:"slug"`
	Description string    `json:"description" firestore:"description"`
	ParentID    *string   `json:"parentId,omitempty"    firestore:"parentId,omitempty"`
	CategoryIDs []string  `json:"categoryIds,omitempty" firestore:"categoryIds,omitempty"`
	UpdatedAt   time.Time `json:"updatedAt"   firestore:"updatedAt"`
}

// ProposedFields are the fields a Gemini "update" action may set.
type ProposedFields struct {
	Name        string   `json:"name"                  firestore:"name"`
	Slug        string   `json:"slug"                  firestore:"slug"`
	Description string   `json:"description"           firestore:"description"`
	ParentID    *string  `json:"parentId,omitempty"    firestore:"parentId,omitempty"`
	CategoryIDs []string `json:"categoryIds,omitempty" firestore:"categoryIds,omitempty"`
}

// Proposal is one reviewable item in a job.
type Proposal struct {
	Index     int            `json:"index"            firestore:"index"`
	Action    ActionType     `json:"action"           firestore:"action"`
	TargetID  string         `json:"targetId"         firestore:"targetId"`
	Before    RecordSnapshot `json:"before"           firestore:"before"`
	After     *ProposedFields `json:"after,omitempty"  firestore:"after,omitempty"`
	MergeInto string         `json:"mergeInto,omitempty" firestore:"mergeInto,omitempty"`
	Rationale string         `json:"rationale"        firestore:"rationale"`
	Approved  bool           `json:"approved"         firestore:"approved"`
}

// AppliedResult is written after Apply() completes.
type AppliedResult struct {
	Updated int         `json:"updated" firestore:"updated"`
	Deleted int         `json:"deleted" firestore:"deleted"`
	Skipped []SkippedOp `json:"skipped" firestore:"skipped"`
}

type SkippedOp struct {
	Index  int    `json:"index"  firestore:"index"`
	Reason string `json:"reason" firestore:"reason"`
}

// Job is the persisted record for a single analysis run.
type Job struct {
	ID             string         `json:"id"             firestore:"-"`
	DisciplineID   string         `json:"disciplineId"   firestore:"disciplineId"`
	EntityType     EntityType     `json:"entityType"     firestore:"entityType"`
	TemplateID     string         `json:"templateId"     firestore:"templateId"`
	TemplateName   string         `json:"templateName"   firestore:"templateName"`
	Filter         Filter         `json:"filter"         firestore:"filter"`
	RecordCount    int            `json:"recordCount"    firestore:"recordCount"`
	Status         JobStatus      `json:"status"         firestore:"status"`
	Proposals      []Proposal     `json:"proposals"      firestore:"proposals"`
	RawLLMResponse string         `json:"rawLlmResponse" firestore:"rawLlmResponse"`
	Error          string         `json:"error,omitempty" firestore:"error,omitempty"`
	CreatedBy      string         `json:"createdBy"      firestore:"createdBy"`
	CreatedAt      time.Time      `json:"createdAt"      firestore:"createdAt"`
	AppliedBy      string         `json:"appliedBy,omitempty" firestore:"appliedBy,omitempty"`
	AppliedAt      *time.Time     `json:"appliedAt,omitempty" firestore:"appliedAt,omitempty"`
	AppliedResult  *AppliedResult `json:"appliedResult,omitempty" firestore:"appliedResult,omitempty"`
}

// LLMAction is the raw parsed shape returned by Gemini before validation.
type LLMAction struct {
	Action    ActionType     `json:"action"`
	ID        string         `json:"id"`
	After     *ProposedFields `json:"after,omitempty"`
	MergeInto string         `json:"mergeInto,omitempty"`
	Rationale string         `json:"rationale"`
}

// LLMResponse is the top-level JSON shape we require from Gemini.
type LLMResponse struct {
	Actions []LLMAction `json:"actions"`
}
