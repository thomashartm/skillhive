# AI-Driven Cleanup Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin feature that uses Gemini to propose deduplication/cleanup updates + merges across the category and technique taxonomies, with a persisted review-then-apply flow.

**Architecture:**
- Backend: new `internal/cleanup/` Go package (orchestrator, prompt builder, parser, validator, executor, reference-rewrite helpers) + a new `admin_cleanup.go` HTTP handler wired to the existing `/api/v1/admin` subrouter
- Frontend: new Pinia store `stores/cleanup.ts`, three new admin views (`AdminCleanupView`, `AdminCleanupJobView`, `AdminCleanupTemplatesView`), two new components under `components/admin/`
- Persistence: two new Firestore collections `cleanupPromptTemplates` and `cleanupJobs`

**Tech Stack:** Go 1.25 / Chi / Firestore Go SDK / existing `internal/llm.GeminiClient` ; Vue 3.5 / PrimeVue 4 / Pinia / vue-router ; tests via `go test` (new for this repo) and `vitest` (existing).

**Design spec reference:** `docs/superpowers/specs/2026-04-24-ai-cleanup-admin-design.md`

---

## File Map

**Backend — new files:**
```
backend/internal/cleanup/model.go        // Go structs: Template, Job, Proposal, FilterOpts
backend/internal/cleanup/prompt.go       // BuildPrompt(template, records) -> string
backend/internal/cleanup/parser.go       // ParseResponse(raw) -> actions / error
backend/internal/cleanup/validator.go    // Validate(actions, inputIDs, existingIDs) -> proposals / warnings
backend/internal/cleanup/refs.go         // Reference-rewrite helpers for category + technique
backend/internal/cleanup/fetcher.go      // LoadRecords(disciplineID, entityType, filter) -> []RecordSnapshot
backend/internal/cleanup/templates.go    // Template Firestore CRUD
backend/internal/cleanup/service.go      // RunAnalysis orchestrator
backend/internal/cleanup/executor.go     // Apply() — runs pass 1-4
backend/internal/cleanup/prompt_test.go
backend/internal/cleanup/parser_test.go
backend/internal/cleanup/validator_test.go
backend/internal/cleanup/refs_test.go
backend/internal/cleanup/testhelper_test.go   // Firestore emulator helper
backend/internal/handler/admin_cleanup.go     // HTTP handlers
```

**Backend — modified:**
```
backend/main.go                     // Wire admin_cleanup handler + routes
```

**Frontend — new files:**
```
frontend/src/types/cleanup.ts                                // TS types
frontend/src/stores/cleanup.ts                               // Pinia store
frontend/src/views/AdminCleanupView.vue                      // Landing + job list
frontend/src/views/AdminCleanupJobView.vue                   // Single job review
frontend/src/views/AdminCleanupTemplatesView.vue             // Template CRUD
frontend/src/components/admin/CleanupProposalRow.vue         // One proposal row
frontend/src/components/admin/CleanupDiff.vue                // Before/after diff
frontend/src/components/admin/NewCleanupJobDialog.vue        // "New Analysis" modal
```

**Frontend — modified:**
```
frontend/src/router/index.ts        // Add 3 new routes
frontend/src/views/AdminView.vue    // Add "Cleanup" button to admin-nav
```

---

## Conventions Used in This Plan

- **TDD where practical** — pure functions (prompt, parser, validator, refs) are test-first. Firestore-backed code uses the emulator via a shared test helper.
- **Firestore emulator** — tests that talk to Firestore require the emulator running on `localhost:8181` (per project memory) with `FIRESTORE_EMULATOR_HOST=localhost:8181 GCLOUD_PROJECT=skillhive`. The test helper sets these if the env var is present and skips otherwise.
- **Commits** — after every task, with message starting `feat(cleanup): ` for new code or `test(cleanup): ` for test-only commits.
- **Go test running** — `cd backend && go test ./internal/cleanup/... -v` from repo root uses `cd` because Go modules are rooted at `backend/`.
- **Frontend test running** — `cd frontend && npm run test:run -- <file>` for a single file.

---

## Task 1: Scaffold `internal/cleanup` package with models

**Files:**
- Create: `backend/internal/cleanup/model.go`

- [ ] **Step 1: Create the file with all Go structs used across the package**

```go
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
```

- [ ] **Step 2: Verify the package compiles**

Run: `cd backend && go build ./internal/cleanup/...`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/cleanup/model.go
git commit -m "feat(cleanup): add domain model for AI cleanup jobs"
```

---

## Task 2: Prompt builder (TDD)

**Files:**
- Create: `backend/internal/cleanup/prompt.go`
- Create: `backend/internal/cleanup/prompt_test.go`

- [ ] **Step 1: Write the failing test**

```go
// backend/internal/cleanup/prompt_test.go
package cleanup

import (
	"strings"
	"testing"
	"time"
)

func strPtr(s string) *string { return &s }

func TestBuildPrompt_Category(t *testing.T) {
	tmpl := &Template{
		PromptBody: "You are cleaning up BJJ categories.",
	}
	records := []RecordSnapshot{
		{
			ID: "cat_1", Name: "Closed Guard", Slug: "closed-guard",
			Description: "Bottom position with legs wrapped",
			ParentID:    nil,
			UpdatedAt:   time.Unix(0, 0),
		},
		{
			ID: "cat_2", Name: "closed-guard", Slug: "closed-guard-dup",
			Description: "duplicate entry",
			ParentID:    nil,
			UpdatedAt:   time.Unix(0, 0),
		},
	}

	got := BuildPrompt(EntityCategory, tmpl, records)

	if !strings.Contains(got, "You are cleaning up BJJ categories.") {
		t.Errorf("prompt missing template body: %q", got)
	}
	if !strings.Contains(got, `"id": "cat_1"`) {
		t.Errorf("prompt missing cat_1 id")
	}
	if !strings.Contains(got, `"parentId": null`) {
		t.Errorf("prompt missing null parentId for categories")
	}
	if !strings.Contains(got, `"actions"`) {
		t.Errorf("prompt missing response schema")
	}
	if strings.Contains(got, "categoryIds") {
		t.Errorf("category prompt should not mention categoryIds (that is the technique shape)")
	}
}

func TestBuildPrompt_Technique(t *testing.T) {
	tmpl := &Template{PromptBody: "Cleanup techniques."}
	records := []RecordSnapshot{
		{
			ID: "tech_1", Name: "Armbar from Guard", Slug: "armbar-from-guard",
			Description: "Classic submission",
			CategoryIDs: []string{"cat_1", "cat_4"},
			UpdatedAt:   time.Unix(0, 0),
		},
	}
	got := BuildPrompt(EntityTechnique, tmpl, records)

	if !strings.Contains(got, `"categoryIds"`) {
		t.Errorf("technique prompt must include categoryIds; got %q", got)
	}
	if strings.Contains(got, `"parentId"`) {
		t.Errorf("technique prompt must not include parentId")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/cleanup/ -run TestBuildPrompt -v`
Expected: FAIL — `BuildPrompt` undefined.

- [ ] **Step 3: Implement prompt.go**

```go
// backend/internal/cleanup/prompt.go
package cleanup

import (
	"encoding/json"
	"fmt"
	"strings"
)

// BuildPrompt composes the full Gemini prompt: admin template body +
// serialized input records + required response schema.
//
// For categories, each record has `parentId` (nullable). For techniques,
// each record has `categoryIds` (array). The response schema mirrors that
// shape on its `after` payloads.
func BuildPrompt(entityType EntityType, tmpl *Template, records []RecordSnapshot) string {
	recordsJSON := serializeRecords(entityType, records)
	schema := outputSchema(entityType)

	var b strings.Builder
	b.WriteString(strings.TrimSpace(tmpl.PromptBody))
	b.WriteString("\n\nINPUT RECORDS (JSON):\n")
	b.WriteString(recordsJSON)
	b.WriteString("\n\nRespond ONLY with valid JSON in this exact shape — no markdown, no prose:\n")
	b.WriteString(schema)
	return b.String()
}

func serializeRecords(entityType EntityType, records []RecordSnapshot) string {
	items := make([]map[string]any, 0, len(records))
	for _, r := range records {
		item := map[string]any{
			"id":          r.ID,
			"name":        r.Name,
			"slug":        r.Slug,
			"description": r.Description,
		}
		switch entityType {
		case EntityCategory:
			if r.ParentID == nil {
				item["parentId"] = nil
			} else {
				item["parentId"] = *r.ParentID
			}
		case EntityTechnique:
			if r.CategoryIDs == nil {
				item["categoryIds"] = []string{}
			} else {
				item["categoryIds"] = r.CategoryIDs
			}
		}
		items = append(items, item)
	}
	out, _ := json.MarshalIndent(items, "", "  ")
	return string(out)
}

func outputSchema(entityType EntityType) string {
	afterCategory := `{ "name": "...", "slug": "...", "description": "...", "parentId": "<existing id or null>" }`
	afterTechnique := `{ "name": "...", "slug": "...", "description": "...", "categoryIds": ["<existing id>", "..."] }`

	afterShape := afterCategory
	if entityType == EntityTechnique {
		afterShape = afterTechnique
	}

	return fmt.Sprintf(`{
  "actions": [
    {
      "action":    "update",
      "id":        "<existing input id>",
      "after":     %s,
      "rationale": "..."
    },
    {
      "action":    "delete",
      "id":        "<existing input id>",
      "mergeInto": "<another id from the input>",
      "rationale": "..."
    }
  ]
}`, afterShape)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/cleanup/ -run TestBuildPrompt -v`
Expected: PASS on both subtests.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/cleanup/prompt.go backend/internal/cleanup/prompt_test.go
git commit -m "feat(cleanup): add prompt builder for categories and techniques"
```

---

## Task 3: LLM response parser (TDD)

**Files:**
- Create: `backend/internal/cleanup/parser.go`
- Create: `backend/internal/cleanup/parser_test.go`

- [ ] **Step 1: Write failing tests**

```go
// backend/internal/cleanup/parser_test.go
package cleanup

import (
	"strings"
	"testing"
)

func TestParseResponse_Valid(t *testing.T) {
	raw := `{"actions":[
	  {"action":"update","id":"cat_1","after":{"name":"Closed Guard","slug":"closed-guard","description":"x","parentId":null},"rationale":"cleanup"},
	  {"action":"delete","id":"cat_2","mergeInto":"cat_1","rationale":"dup"}
	]}`
	got, err := ParseResponse(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got.Actions) != 2 {
		t.Fatalf("want 2 actions, got %d", len(got.Actions))
	}
	if got.Actions[0].Action != ActionUpdate || got.Actions[0].ID != "cat_1" {
		t.Errorf("first action wrong: %+v", got.Actions[0])
	}
	if got.Actions[1].MergeInto != "cat_1" {
		t.Errorf("second action mergeInto wrong: %+v", got.Actions[1])
	}
}

func TestParseResponse_StripsMarkdownFence(t *testing.T) {
	raw := "```json\n{\"actions\":[]}\n```"
	got, err := ParseResponse(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got.Actions) != 0 {
		t.Errorf("want empty actions")
	}
}

func TestParseResponse_InvalidJSON(t *testing.T) {
	_, err := ParseResponse("not json at all")
	if err == nil {
		t.Fatal("expected error")
	}
	if !strings.Contains(err.Error(), "parse") {
		t.Errorf("error should mention parsing: %v", err)
	}
}

func TestParseResponse_UnknownAction(t *testing.T) {
	raw := `{"actions":[{"action":"merge","id":"cat_1","rationale":"x"}]}`
	_, err := ParseResponse(raw)
	if err == nil {
		t.Fatal("expected error for unknown action type")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/cleanup/ -run TestParseResponse -v`
Expected: FAIL — `ParseResponse` undefined.

- [ ] **Step 3: Implement parser.go**

```go
// backend/internal/cleanup/parser.go
package cleanup

import (
	"encoding/json"
	"fmt"
	"strings"
)

// ParseResponse parses Gemini's raw JSON response into an LLMResponse.
// It tolerates markdown code fences (```json ... ```) since models sometimes
// ignore the "no markdown" directive.
func ParseResponse(raw string) (*LLMResponse, error) {
	clean := stripFences(raw)
	var resp LLMResponse
	if err := json.Unmarshal([]byte(clean), &resp); err != nil {
		return nil, fmt.Errorf("parse: %w", err)
	}
	for i, a := range resp.Actions {
		if a.Action != ActionUpdate && a.Action != ActionDelete {
			return nil, fmt.Errorf("unknown action %q at index %d", a.Action, i)
		}
	}
	return &resp, nil
}

func stripFences(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "```") {
		// remove opening fence (```json or ```)
		if i := strings.Index(s, "\n"); i >= 0 {
			s = s[i+1:]
		}
		s = strings.TrimSuffix(strings.TrimSpace(s), "```")
	}
	return strings.TrimSpace(s)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/cleanup/ -run TestParseResponse -v`
Expected: all subtests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/cleanup/parser.go backend/internal/cleanup/parser_test.go
git commit -m "feat(cleanup): parse Gemini JSON responses with fence tolerance"
```

---

## Task 4: Action validator (TDD)

**Files:**
- Create: `backend/internal/cleanup/validator.go`
- Create: `backend/internal/cleanup/validator_test.go`

- [ ] **Step 1: Write failing tests**

```go
// backend/internal/cleanup/validator_test.go
package cleanup

import (
	"testing"
	"time"
)

func TestValidate_DropsUnknownIDs(t *testing.T) {
	input := []RecordSnapshot{{ID: "a", Name: "A", Slug: "a", UpdatedAt: time.Unix(0, 0)}}
	actions := []LLMAction{
		{Action: ActionUpdate, ID: "a", After: &ProposedFields{Name: "A2", Slug: "a", Description: "d"}, Rationale: "r"},
		{Action: ActionUpdate, ID: "ghost", After: &ProposedFields{Name: "x", Slug: "x", Description: "y"}, Rationale: "r"},
	}
	proposals, warnings := Validate(EntityCategory, input, actions)
	if len(proposals) != 1 || proposals[0].TargetID != "a" {
		t.Errorf("expected 1 proposal for 'a', got %+v", proposals)
	}
	if len(warnings) == 0 {
		t.Errorf("expected warning about unknown id 'ghost'")
	}
}

func TestValidate_RejectsDeleteMergingIntoSelf(t *testing.T) {
	input := []RecordSnapshot{{ID: "a", UpdatedAt: time.Unix(0, 0)}}
	actions := []LLMAction{
		{Action: ActionDelete, ID: "a", MergeInto: "a", Rationale: "r"},
	}
	proposals, warnings := Validate(EntityCategory, input, actions)
	if len(proposals) != 0 {
		t.Errorf("self-merge must be rejected: %+v", proposals)
	}
	if len(warnings) == 0 {
		t.Errorf("expected warning about self-merge")
	}
}

func TestValidate_RejectsDeleteMergingIntoMissingID(t *testing.T) {
	input := []RecordSnapshot{{ID: "a", UpdatedAt: time.Unix(0, 0)}}
	actions := []LLMAction{
		{Action: ActionDelete, ID: "a", MergeInto: "nowhere", Rationale: "r"},
	}
	proposals, warnings := Validate(EntityCategory, input, actions)
	if len(proposals) != 0 {
		t.Errorf("merge into unknown id must be rejected")
	}
	if len(warnings) == 0 {
		t.Errorf("expected warning")
	}
}

func TestValidate_RejectsDeleteMergingIntoAnotherDelete(t *testing.T) {
	input := []RecordSnapshot{
		{ID: "a", UpdatedAt: time.Unix(0, 0)},
		{ID: "b", UpdatedAt: time.Unix(0, 0)},
	}
	actions := []LLMAction{
		{Action: ActionDelete, ID: "a", MergeInto: "b", Rationale: "r"},
		{Action: ActionDelete, ID: "b", MergeInto: "a", Rationale: "r"},
	}
	proposals, warnings := Validate(EntityCategory, input, actions)
	if len(proposals) != 0 {
		t.Errorf("both deletes merging into each other must all be rejected")
	}
	if len(warnings) == 0 {
		t.Errorf("expected warning")
	}
}

func TestValidate_RejectsSameIDUpdatedAndDeleted(t *testing.T) {
	input := []RecordSnapshot{
		{ID: "a", UpdatedAt: time.Unix(0, 0)},
		{ID: "b", UpdatedAt: time.Unix(0, 0)},
	}
	actions := []LLMAction{
		{Action: ActionUpdate, ID: "a", After: &ProposedFields{Name: "x", Slug: "x", Description: "y"}, Rationale: "r"},
		{Action: ActionDelete, ID: "a", MergeInto: "b", Rationale: "r"},
	}
	proposals, warnings := Validate(EntityCategory, input, actions)
	if len(proposals) != 0 {
		t.Errorf("conflicting update+delete on same id must be rejected")
	}
	if len(warnings) == 0 {
		t.Errorf("expected warning")
	}
}

func TestValidate_RejectsInvalidSlugFormat(t *testing.T) {
	input := []RecordSnapshot{{ID: "a", UpdatedAt: time.Unix(0, 0)}}
	actions := []LLMAction{
		{Action: ActionUpdate, ID: "a", After: &ProposedFields{Name: "x", Slug: "Invalid Slug!", Description: "y"}, Rationale: "r"},
	}
	proposals, _ := Validate(EntityCategory, input, actions)
	if len(proposals) != 0 {
		t.Errorf("invalid slug must be rejected")
	}
}

func TestValidate_RejectsCategoryParentCycle(t *testing.T) {
	a, b := "a", "b"
	input := []RecordSnapshot{
		{ID: "a", ParentID: nil, UpdatedAt: time.Unix(0, 0)},
		{ID: "b", ParentID: &a, UpdatedAt: time.Unix(0, 0)},
	}
	actions := []LLMAction{
		// a now parents b, b's parent would become a's child → cycle if a.parent = b
		{Action: ActionUpdate, ID: "a", After: &ProposedFields{Name: "A", Slug: "a", Description: "x", ParentID: &b}, Rationale: "r"},
	}
	proposals, warnings := Validate(EntityCategory, input, actions)
	if len(proposals) != 0 {
		t.Errorf("cycle in parentId must be rejected")
	}
	if len(warnings) == 0 {
		t.Errorf("expected cycle warning")
	}
}

func TestValidate_TechniqueCategoryIDsDedupe(t *testing.T) {
	input := []RecordSnapshot{{ID: "t", UpdatedAt: time.Unix(0, 0)}}
	actions := []LLMAction{
		{Action: ActionUpdate, ID: "t",
			After:     &ProposedFields{Name: "T", Slug: "t", Description: "d", CategoryIDs: []string{"c1", "c1", "c2"}},
			Rationale: "r"},
	}
	proposals, _ := Validate(EntityTechnique, input, actions)
	if len(proposals) != 1 {
		t.Fatalf("want 1 proposal, got %d", len(proposals))
	}
	got := proposals[0].After.CategoryIDs
	if len(got) != 2 || got[0] != "c1" || got[1] != "c2" {
		t.Errorf("categoryIds should be deduped preserving order: %+v", got)
	}
}
```

- [ ] **Step 2: Run tests — they fail**

Run: `cd backend && go test ./internal/cleanup/ -run TestValidate -v`
Expected: FAIL — `Validate` undefined.

- [ ] **Step 3: Implement validator.go**

```go
// backend/internal/cleanup/validator.go
package cleanup

import (
	"fmt"
	"regexp"
)

var slugPattern = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

// Validate turns raw LLM actions into reviewable Proposals.
// Invalid actions are dropped and reported as warnings (kept in rawLlmResponse
// notes on the Job).
func Validate(entityType EntityType, input []RecordSnapshot, actions []LLMAction) ([]Proposal, []string) {
	// Index input for O(1) lookup.
	byID := make(map[string]*RecordSnapshot, len(input))
	for i := range input {
		byID[input[i].ID] = &input[i]
	}

	// Count deletes and updates per id to detect conflicts.
	deletes := map[string]bool{}
	updates := map[string]bool{}
	for _, a := range actions {
		switch a.Action {
		case ActionDelete:
			deletes[a.ID] = true
		case ActionUpdate:
			updates[a.ID] = true
		}
	}

	var proposals []Proposal
	var warnings []string
	index := 0

	for _, a := range actions {
		rec, ok := byID[a.ID]
		if !ok {
			warnings = append(warnings, fmt.Sprintf("action references unknown id %q (dropped)", a.ID))
			continue
		}

		// Conflict: same id is both updated and deleted.
		if updates[a.ID] && deletes[a.ID] {
			warnings = append(warnings, fmt.Sprintf("id %q is both updated and deleted (both dropped)", a.ID))
			continue
		}

		switch a.Action {
		case ActionDelete:
			if err := validateDelete(a, input, deletes); err != nil {
				warnings = append(warnings, err.Error())
				continue
			}
			proposals = append(proposals, Proposal{
				Index:     index,
				Action:    ActionDelete,
				TargetID:  a.ID,
				Before:    *rec,
				MergeInto: a.MergeInto,
				Rationale: a.Rationale,
				Approved:  true,
			})
			index++

		case ActionUpdate:
			if a.After == nil {
				warnings = append(warnings, fmt.Sprintf("update for %q missing 'after' (dropped)", a.ID))
				continue
			}
			after, err := validateUpdate(entityType, *rec, *a.After, byID)
			if err != nil {
				warnings = append(warnings, fmt.Sprintf("update %q invalid: %v (dropped)", a.ID, err))
				continue
			}
			proposals = append(proposals, Proposal{
				Index:     index,
				Action:    ActionUpdate,
				TargetID:  a.ID,
				Before:    *rec,
				After:     &after,
				Rationale: a.Rationale,
				Approved:  true,
			})
			index++
		}
	}
	return proposals, warnings
}

func validateDelete(a LLMAction, input []RecordSnapshot, deletes map[string]bool) error {
	if a.MergeInto == "" {
		return fmt.Errorf("delete of %q missing mergeInto (dropped)", a.ID)
	}
	if a.MergeInto == a.ID {
		return fmt.Errorf("delete of %q cannot merge into itself (dropped)", a.ID)
	}
	// Target must exist in input.
	found := false
	for _, r := range input {
		if r.ID == a.MergeInto {
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("delete of %q merges into unknown id %q (dropped)", a.ID, a.MergeInto)
	}
	// Target must not itself be deleted in this job.
	if deletes[a.MergeInto] {
		return fmt.Errorf("delete of %q merges into %q which is also being deleted (dropped)", a.ID, a.MergeInto)
	}
	return nil
}

func validateUpdate(entityType EntityType, before RecordSnapshot, after ProposedFields, byID map[string]*RecordSnapshot) (ProposedFields, error) {
	if !slugPattern.MatchString(after.Slug) {
		return ProposedFields{}, fmt.Errorf("slug %q fails format", after.Slug)
	}
	if after.Name == "" {
		return ProposedFields{}, fmt.Errorf("name empty")
	}

	switch entityType {
	case EntityCategory:
		if after.ParentID != nil && *after.ParentID != "" {
			if err := checkCategoryCycle(before.ID, *after.ParentID, byID, after); err != nil {
				return ProposedFields{}, err
			}
		} else {
			after.ParentID = nil
		}
		after.CategoryIDs = nil // not applicable
	case EntityTechnique:
		// Dedupe categoryIds, preserving order.
		seen := map[string]bool{}
		unique := make([]string, 0, len(after.CategoryIDs))
		for _, id := range after.CategoryIDs {
			if seen[id] {
				continue
			}
			seen[id] = true
			unique = append(unique, id)
		}
		after.CategoryIDs = unique
		after.ParentID = nil // not applicable
	}
	return after, nil
}

// checkCategoryCycle walks the proposed parent chain. If we see `selfID`
// anywhere up the chain, we have a cycle.
// Proposed edges: the new after.ParentID overrides byID[selfID].ParentID.
func checkCategoryCycle(selfID, proposedParentID string, byID map[string]*RecordSnapshot, proposed ProposedFields) error {
	if proposedParentID == selfID {
		return fmt.Errorf("cycle: parent of %q is itself", selfID)
	}
	current := proposedParentID
	seen := map[string]bool{selfID: true}
	for current != "" {
		if seen[current] {
			return fmt.Errorf("cycle detected at %q", current)
		}
		seen[current] = true
		rec, ok := byID[current]
		if !ok {
			// Parent is outside the input set; we assume it's not part of a cycle
			// with selfID — conservative, since selfID is guaranteed in input.
			return nil
		}
		if rec.ParentID == nil {
			return nil
		}
		current = *rec.ParentID
	}
	return nil
}
```

- [ ] **Step 4: Run tests**

Run: `cd backend && go test ./internal/cleanup/ -run TestValidate -v`
Expected: all subtests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/cleanup/validator.go backend/internal/cleanup/validator_test.go
git commit -m "feat(cleanup): validate LLM actions into reviewable proposals"
```

---

## Task 5: Reference-rewrite helpers (TDD with fakes)

**Files:**
- Create: `backend/internal/cleanup/refs.go`
- Create: `backend/internal/cleanup/refs_test.go`

The real Firestore-backed rewrite functions will be called from the executor (Task 8). This task isolates the pure "which writes need to happen" decisions into a testable form: given a list of `existing` records of one type and a `{from: X, to: Y}` rewrite, return the list of (record id → new field value) writes needed.

- [ ] **Step 1: Write failing tests**

```go
// backend/internal/cleanup/refs_test.go
package cleanup

import (
	"testing"
)

func TestPlanCategoryParentRewrites(t *testing.T) {
	p1 := "X"
	p2 := "other"
	records := []CategoryRef{
		{ID: "c1", ParentID: &p1},    // should rewrite to Y
		{ID: "c2", ParentID: &p2},    // skip
		{ID: "c3", ParentID: nil},    // skip
	}
	got := PlanCategoryParentRewrites(records, "X", "Y")
	if len(got) != 1 {
		t.Fatalf("want 1 rewrite, got %d", len(got))
	}
	if got[0].ID != "c1" || got[0].NewParentID == nil || *got[0].NewParentID != "Y" {
		t.Errorf("wrong rewrite: %+v", got[0])
	}
}

func TestPlanCategoryIDsRewrites_ReplaceAndDedupe(t *testing.T) {
	records := []CategoryIDsRef{
		{ID: "t1", CategoryIDs: []string{"X", "Z"}},       // X → Y: result {Y,Z}
		{ID: "t2", CategoryIDs: []string{"X", "Y"}},       // X → Y, Y already present: result {Y}
		{ID: "t3", CategoryIDs: []string{"A", "B"}},       // no X: skip
		{ID: "t4", CategoryIDs: []string{"X", "X", "Z"}},  // duplicate X, all removed except one Y
	}
	got := PlanCategoryIDsRewrites(records, "X", "Y")

	byID := map[string][]string{}
	for _, r := range got {
		byID[r.ID] = r.NewCategoryIDs
	}

	if v, ok := byID["t1"]; !ok || !equalStrings(v, []string{"Y", "Z"}) {
		t.Errorf("t1 wrong: %v", byID["t1"])
	}
	if v, ok := byID["t2"]; !ok || !equalStrings(v, []string{"Y"}) {
		t.Errorf("t2 wrong: %v", byID["t2"])
	}
	if _, ok := byID["t3"]; ok {
		t.Errorf("t3 should not be rewritten")
	}
	if v, ok := byID["t4"]; !ok || !equalStrings(v, []string{"Y", "Z"}) {
		t.Errorf("t4 wrong: %v", byID["t4"])
	}
}

func TestPlanTechniqueIDRewritesOnElements(t *testing.T) {
	refX, refY, refOther := "X", "Y", "other"
	elements := []ElementRef{
		{CurriculumID: "c1", ElementID: "e1", TechniqueID: &refX},
		{CurriculumID: "c1", ElementID: "e2", TechniqueID: &refOther},
		{CurriculumID: "c2", ElementID: "e3", TechniqueID: &refY}, // already Y
		{CurriculumID: "c2", ElementID: "e4", TechniqueID: nil},
	}
	got := PlanElementTechniqueRewrites(elements, "X", "Y")
	if len(got) != 1 {
		t.Fatalf("want 1 rewrite, got %d", len(got))
	}
	if got[0].CurriculumID != "c1" || got[0].ElementID != "e1" {
		t.Errorf("wrong rewrite target: %+v", got[0])
	}
}

func equalStrings(a, b []string) bool {
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
```

- [ ] **Step 2: Run tests — they fail**

Run: `cd backend && go test ./internal/cleanup/ -run TestPlan -v`
Expected: FAIL — types/functions undefined.

- [ ] **Step 3: Implement refs.go**

```go
// backend/internal/cleanup/refs.go
package cleanup

// CategoryRef is a minimal view of a Category doc for parent rewrites.
type CategoryRef struct {
	ID       string
	ParentID *string
}

// CategoryIDsRef is a minimal view of a Technique or Asset doc for
// categoryIds[] rewrites.
type CategoryIDsRef struct {
	ID          string
	CategoryIDs []string
}

// TechniqueIDsRef is a minimal view of an Asset for techniqueIds[] rewrites.
type TechniqueIDsRef struct {
	ID           string
	TechniqueIDs []string
}

// ElementRef is a minimal view of a CurriculumElement (subcollection).
type ElementRef struct {
	CurriculumID string
	ElementID    string
	TechniqueID  *string
}

// ParentRewrite describes a single-field update on a Category.
type ParentRewrite struct {
	ID          string
	NewParentID *string
}

// ArrayRewrite describes an array-field update on a Technique or Asset.
type ArrayRewrite struct {
	ID              string
	NewCategoryIDs  []string
	NewTechniqueIDs []string
}

// ElementRewrite describes a single-field update on a CurriculumElement.
type ElementRewrite struct {
	CurriculumID   string
	ElementID      string
	NewTechniqueID *string
}

// PlanCategoryParentRewrites returns one rewrite per record whose ParentID == from.
func PlanCategoryParentRewrites(records []CategoryRef, from, to string) []ParentRewrite {
	var out []ParentRewrite
	for _, r := range records {
		if r.ParentID != nil && *r.ParentID == from {
			toCopy := to
			out = append(out, ParentRewrite{ID: r.ID, NewParentID: &toCopy})
		}
	}
	return out
}

// PlanCategoryIDsRewrites replaces from-> to in each CategoryIDs array,
// deduping occurrences of to after replacement. Records without `from`
// are skipped.
func PlanCategoryIDsRewrites(records []CategoryIDsRef, from, to string) []ArrayRewrite {
	var out []ArrayRewrite
	for _, r := range records {
		if !contains(r.CategoryIDs, from) {
			continue
		}
		rewritten := replaceAndDedupe(r.CategoryIDs, from, to)
		out = append(out, ArrayRewrite{ID: r.ID, NewCategoryIDs: rewritten})
	}
	return out
}

// PlanTechniqueIDsRewrites replaces from -> to in each TechniqueIDs array.
func PlanTechniqueIDsRewrites(records []TechniqueIDsRef, from, to string) []ArrayRewrite {
	var out []ArrayRewrite
	for _, r := range records {
		if !contains(r.TechniqueIDs, from) {
			continue
		}
		rewritten := replaceAndDedupe(r.TechniqueIDs, from, to)
		out = append(out, ArrayRewrite{ID: r.ID, NewTechniqueIDs: rewritten})
	}
	return out
}

// PlanElementTechniqueRewrites finds curriculum elements whose TechniqueID == from.
func PlanElementTechniqueRewrites(elements []ElementRef, from, to string) []ElementRewrite {
	var out []ElementRewrite
	for _, e := range elements {
		if e.TechniqueID != nil && *e.TechniqueID == from {
			toCopy := to
			out = append(out, ElementRewrite{
				CurriculumID:   e.CurriculumID,
				ElementID:      e.ElementID,
				NewTechniqueID: &toCopy,
			})
		}
	}
	return out
}

func contains(s []string, v string) bool {
	for _, x := range s {
		if x == v {
			return true
		}
	}
	return false
}

// replaceAndDedupe rewrites occurrences of from to `to` and removes duplicates
// while preserving first-seen ordering.
func replaceAndDedupe(xs []string, from, to string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(xs))
	for _, x := range xs {
		if x == from {
			x = to
		}
		if seen[x] {
			continue
		}
		seen[x] = true
		out = append(out, x)
	}
	return out
}
```

- [ ] **Step 4: Run tests**

Run: `cd backend && go test ./internal/cleanup/ -run TestPlan -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/cleanup/refs.go backend/internal/cleanup/refs_test.go
git commit -m "feat(cleanup): planning helpers for reference rewrites on merge"
```

---

## Task 6: Record fetcher (Firestore-backed)

**Files:**
- Create: `backend/internal/cleanup/fetcher.go`

No unit test here — this is a thin Firestore adapter that wraps queries. It is exercised end-to-end via the service and executor tasks below.

- [ ] **Step 1: Implement fetcher.go**

```go
// backend/internal/cleanup/fetcher.go
package cleanup

import (
	"context"
	"fmt"
	"strings"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
)

// LoadRecords fetches all records of `entityType` for `disciplineID`, applying
// an optional filter. Returns a snapshot slice suitable for the prompt and
// proposal `before` payloads.
func LoadRecords(ctx context.Context, fs *firestore.Client, disciplineID string, entityType EntityType, filter Filter) ([]RecordSnapshot, error) {
	collection := ""
	switch entityType {
	case EntityCategory:
		collection = "categories"
	case EntityTechnique:
		collection = "techniques"
	default:
		return nil, fmt.Errorf("unsupported entity type %q", entityType)
	}

	query := fs.Collection(collection).Where("disciplineId", "==", disciplineID)

	// Apply filters that the store supports natively.
	switch entityType {
	case EntityCategory:
		if filter.ParentID != nil && *filter.ParentID != "" {
			query = query.Where("parentId", "==", *filter.ParentID)
		}
	case EntityTechnique:
		if filter.CategoryID != nil && *filter.CategoryID != "" {
			query = query.Where("categoryIds", "array-contains", *filter.CategoryID)
		}
	}

	iter := query.Documents(ctx)
	defer iter.Stop()

	var out []RecordSnapshot
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("list %s: %w", collection, err)
		}

		var snap RecordSnapshot
		if err := doc.DataTo(&snap); err != nil {
			return nil, fmt.Errorf("parse %s doc: %w", collection, err)
		}
		snap.ID = doc.Ref.ID

		// Client-side filter for search substring (case-insensitive name match).
		if filter.Search != nil && *filter.Search != "" {
			if !strings.Contains(strings.ToLower(snap.Name), strings.ToLower(*filter.Search)) {
				continue
			}
		}
		out = append(out, snap)
	}
	return out, nil
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && go build ./internal/cleanup/...`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/cleanup/fetcher.go
git commit -m "feat(cleanup): Firestore record loader with filter"
```

---

## Task 7: Template CRUD against Firestore

**Files:**
- Create: `backend/internal/cleanup/templates.go`

- [ ] **Step 1: Implement templates.go**

```go
// backend/internal/cleanup/templates.go
package cleanup

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const templatesCollection = "cleanupPromptTemplates"

type TemplateStore struct {
	fs *firestore.Client
}

func NewTemplateStore(fs *firestore.Client) *TemplateStore {
	return &TemplateStore{fs: fs}
}

func (s *TemplateStore) Create(ctx context.Context, t Template) (*Template, error) {
	if t.DisciplineID == "" || !t.EntityType.IsValid() || t.Name == "" || t.PromptBody == "" {
		return nil, fmt.Errorf("template missing required fields")
	}
	now := time.Now().UTC()
	t.CreatedAt = now
	t.UpdatedAt = now
	ref, _, err := s.fs.Collection(templatesCollection).Add(ctx, t)
	if err != nil {
		return nil, fmt.Errorf("create template: %w", err)
	}
	t.ID = ref.ID
	return &t, nil
}

func (s *TemplateStore) Get(ctx context.Context, id string) (*Template, error) {
	doc, err := s.fs.Collection(templatesCollection).Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, fmt.Errorf("template not found")
		}
		return nil, fmt.Errorf("get template: %w", err)
	}
	var t Template
	if err := doc.DataTo(&t); err != nil {
		return nil, fmt.Errorf("parse template: %w", err)
	}
	t.ID = doc.Ref.ID
	return &t, nil
}

func (s *TemplateStore) List(ctx context.Context, disciplineID string, entityType EntityType) ([]Template, error) {
	iter := s.fs.Collection(templatesCollection).
		Where("disciplineId", "==", disciplineID).
		Where("entityType", "==", string(entityType)).
		Documents(ctx)
	defer iter.Stop()

	var out []Template
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("list templates: %w", err)
		}
		var t Template
		if err := doc.DataTo(&t); err != nil {
			return nil, fmt.Errorf("parse template: %w", err)
		}
		t.ID = doc.Ref.ID
		out = append(out, t)
	}
	return out, nil
}

// Update sets name/description/promptBody on the template; other fields are
// immutable after creation.
func (s *TemplateStore) Update(ctx context.Context, id string, name, description, body string) (*Template, error) {
	updates := []firestore.Update{
		{Path: "name", Value: name},
		{Path: "description", Value: description},
		{Path: "promptBody", Value: body},
		{Path: "updatedAt", Value: time.Now().UTC()},
	}
	if _, err := s.fs.Collection(templatesCollection).Doc(id).Update(ctx, updates); err != nil {
		return nil, fmt.Errorf("update template: %w", err)
	}
	return s.Get(ctx, id)
}

func (s *TemplateStore) Delete(ctx context.Context, id string) error {
	if _, err := s.fs.Collection(templatesCollection).Doc(id).Delete(ctx); err != nil {
		return fmt.Errorf("delete template: %w", err)
	}
	return nil
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && go build ./internal/cleanup/...`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/cleanup/templates.go
git commit -m "feat(cleanup): template Firestore CRUD"
```

---

## Task 8: Service orchestrator

**Files:**
- Create: `backend/internal/cleanup/service.go`

- [ ] **Step 1: Implement service.go**

```go
// backend/internal/cleanup/service.go
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
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && go build ./internal/cleanup/...`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/cleanup/service.go
git commit -m "feat(cleanup): orchestrator — run analysis + persist jobs"
```

---

## Task 9: Executor (Firestore-backed)

**Files:**
- Create: `backend/internal/cleanup/executor.go`

- [ ] **Step 1: Implement executor.go**

```go
// backend/internal/cleanup/executor.go
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
		if err := e.applyUpdate(ctx, job.EntityType, p.TargetID, *p.After); err != nil {
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
// Firestore batches of up to 450 (safely under the 500 limit).
func applyBatches(ctx context.Context, fs *firestore.Client, iter *firestore.DocumentIterator, updatesFor func(*firestore.DocumentRef) []firestore.Update) error {
	const batchSize = 450
	bulk := fs.BulkWriter(ctx)
	defer bulk.End()
	pending := 0
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return err
		}
		if _, err := bulk.Update(doc.Ref, updatesFor(doc.Ref)); err != nil {
			return err
		}
		pending++
		if pending >= batchSize {
			bulk.Flush()
			pending = 0
		}
	}
	bulk.Flush()
	return nil
}

// applyArrayRewrite rewrites a slice field by reading current value and writing
// back the deduped replacement. Done via BulkWriter with per-doc Set.
func applyArrayRewrite(ctx context.Context, fs *firestore.Client, iter *firestore.DocumentIterator, field, from, to string) error {
	const batchSize = 450
	bulk := fs.BulkWriter(ctx)
	defer bulk.End()
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
		if _, err := bulk.Update(doc.Ref, []firestore.Update{
			{Path: field, Value: next},
			{Path: "updatedAt", Value: time.Now().UTC()},
		}); err != nil {
			return err
		}
		pending++
		if pending >= batchSize {
			bulk.Flush()
			pending = 0
		}
	}
	bulk.Flush()
	return nil
}

func (e *Executor) applyUpdate(ctx context.Context, entityType EntityType, id string, after ProposedFields) error {
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
		var parentVal interface{} = nil
		if after.ParentID != nil {
			parentVal = *after.ParentID
		}
		updates = append(updates, firestore.Update{Path: "parentId", Value: parentVal})
	case EntityTechnique:
		updates = append(updates, firestore.Update{Path: "categoryIds", Value: after.CategoryIDs})
	}
	_, err := e.fs.Collection(collection).Doc(id).Update(ctx, updates)
	return err
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && go build ./internal/cleanup/...`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/cleanup/executor.go
git commit -m "feat(cleanup): four-pass executor with ref rewrites"
```

---

## Task 10: HTTP handlers + wire into main.go

**Files:**
- Create: `backend/internal/handler/admin_cleanup.go`
- Modify: `backend/main.go`

- [ ] **Step 1: Create admin_cleanup.go**

```go
// backend/internal/handler/admin_cleanup.go
package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"cloud.google.com/go/firestore"
	"github.com/go-chi/chi/v5"
	"github.com/thomas/skillhive-api/internal/cleanup"
	"github.com/thomas/skillhive-api/internal/llm"
	"github.com/thomas/skillhive-api/internal/middleware"
)

type AdminCleanupHandler struct {
	templates *cleanup.TemplateStore
	service   *cleanup.Service
	executor  *cleanup.Executor
}

// NewAdminCleanupHandler wires the cleanup feature. Returns a disabled handler
// (all routes return 503) if llmClient is nil.
func NewAdminCleanupHandler(fs *firestore.Client, llmClient llm.Client) *AdminCleanupHandler {
	templates := cleanup.NewTemplateStore(fs)
	var svc *cleanup.Service
	if llmClient != nil {
		svc = cleanup.NewService(fs, llmClient, templates)
	}
	return &AdminCleanupHandler{
		templates: templates,
		service:   svc,
		executor:  cleanup.NewExecutor(fs),
	}
}

func (h *AdminCleanupHandler) llmRequired(w http.ResponseWriter) bool {
	if h.service == nil {
		writeError(w, http.StatusServiceUnavailable, "LLM client not configured (GEMINI_API_KEY missing)")
		return true
	}
	return false
}

// --- Templates ---

func (h *AdminCleanupHandler) ListTemplates(w http.ResponseWriter, r *http.Request) {
	disciplineID := r.URL.Query().Get("disciplineId")
	entityType := cleanup.EntityType(r.URL.Query().Get("entityType"))
	if disciplineID == "" || !entityType.IsValid() {
		writeError(w, http.StatusBadRequest, "disciplineId and entityType (category|technique) required")
		return
	}
	if err := middleware.RequireAdmin(r.Context(), disciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}
	out, err := h.templates.List(r.Context(), disciplineID, entityType)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if out == nil {
		out = []cleanup.Template{}
	}
	writeJSON(w, http.StatusOK, out)
}

type createTemplateReq struct {
	DisciplineID string              `json:"disciplineId"`
	EntityType   cleanup.EntityType  `json:"entityType"`
	Name         string              `json:"name"`
	Description  string              `json:"description"`
	PromptBody   string              `json:"promptBody"`
}

func (h *AdminCleanupHandler) CreateTemplate(w http.ResponseWriter, r *http.Request) {
	var req createTemplateReq
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := middleware.RequireAdmin(r.Context(), req.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}
	t, err := h.templates.Create(r.Context(), cleanup.Template{
		DisciplineID: req.DisciplineID,
		EntityType:   req.EntityType,
		Name:         req.Name,
		Description:  req.Description,
		PromptBody:   req.PromptBody,
		CreatedBy:    middleware.GetUserUID(r.Context()),
	})
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

type updateTemplateReq struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	PromptBody  string `json:"promptBody"`
}

func (h *AdminCleanupHandler) UpdateTemplate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	existing, err := h.templates.Get(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	if err := middleware.RequireAdmin(r.Context(), existing.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}
	var req updateTemplateReq
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	updated, err := h.templates.Update(r.Context(), id, req.Name, req.Description, req.PromptBody)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (h *AdminCleanupHandler) DeleteTemplate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	existing, err := h.templates.Get(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	if err := middleware.RequireAdmin(r.Context(), existing.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}
	if err := h.templates.Delete(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- Jobs ---

type createJobReq struct {
	DisciplineID string             `json:"disciplineId"`
	EntityType   cleanup.EntityType `json:"entityType"`
	TemplateID   string             `json:"templateId"`
	Filter       cleanup.Filter     `json:"filter"`
}

func (h *AdminCleanupHandler) CreateJob(w http.ResponseWriter, r *http.Request) {
	if h.llmRequired(w) {
		return
	}
	var req createJobReq
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := middleware.RequireAdmin(r.Context(), req.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}
	actor := middleware.GetUserUID(r.Context())
	job, err := h.service.RunAnalysis(r.Context(), req.DisciplineID, req.EntityType, req.TemplateID, req.Filter, actor)
	if err != nil {
		if errors.Is(err, cleanup.ErrBudgetExceeded) {
			writeError(w, http.StatusRequestEntityTooLarge, "prompt exceeds token budget — narrow the filter")
			return
		}
		slog.Error("create cleanup job failed", "error", err)
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, job)
}

func (h *AdminCleanupHandler) ListJobs(w http.ResponseWriter, r *http.Request) {
	if h.llmRequired(w) {
		return
	}
	disciplineID := r.URL.Query().Get("disciplineId")
	entityType := cleanup.EntityType(r.URL.Query().Get("entityType"))
	statusFilter := cleanup.JobStatus(r.URL.Query().Get("status"))
	if disciplineID == "" || !entityType.IsValid() {
		writeError(w, http.StatusBadRequest, "disciplineId and entityType required")
		return
	}
	if err := middleware.RequireAdmin(r.Context(), disciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}
	jobs, err := h.service.ListJobs(r.Context(), disciplineID, entityType, statusFilter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if jobs == nil {
		jobs = []cleanup.Job{}
	}
	writeJSON(w, http.StatusOK, jobs)
}

func (h *AdminCleanupHandler) GetJob(w http.ResponseWriter, r *http.Request) {
	if h.llmRequired(w) {
		return
	}
	id := chi.URLParam(r, "id")
	job, err := h.service.GetJob(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	if err := middleware.RequireAdmin(r.Context(), job.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}
	writeJSON(w, http.StatusOK, job)
}

type patchProposalReq struct {
	After    *cleanup.ProposedFields `json:"after,omitempty"`
	Approved *bool                   `json:"approved,omitempty"`
}

func (h *AdminCleanupHandler) PatchProposal(w http.ResponseWriter, r *http.Request) {
	if h.llmRequired(w) {
		return
	}
	jobID := chi.URLParam(r, "id")
	idxStr := chi.URLParam(r, "index")
	idx, err := strconv.Atoi(idxStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "index must be integer")
		return
	}
	job, err := h.service.GetJob(r.Context(), jobID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	if err := middleware.RequireAdmin(r.Context(), job.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}
	var req patchProposalReq
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	updated, err := h.service.UpdateProposal(r.Context(), jobID, idx, req.After, req.Approved)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (h *AdminCleanupHandler) ApplyJob(w http.ResponseWriter, r *http.Request) {
	if h.llmRequired(w) {
		return
	}
	jobID := chi.URLParam(r, "id")
	job, err := h.service.GetJob(r.Context(), jobID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	if err := middleware.RequireAdmin(r.Context(), job.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}
	actor := middleware.GetUserUID(r.Context())
	applied, err := h.executor.Apply(r.Context(), jobID, actor)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, applied)
}

func (h *AdminCleanupHandler) DiscardJob(w http.ResponseWriter, r *http.Request) {
	if h.llmRequired(w) {
		return
	}
	jobID := chi.URLParam(r, "id")
	job, err := h.service.GetJob(r.Context(), jobID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	if err := middleware.RequireAdmin(r.Context(), job.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}
	if err := h.service.Discard(r.Context(), jobID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// decodeJSON local alias to preserve existing pattern in this package.
// The helper with the same name already exists in handler/helpers.go — if so,
// remove this shim during integration.
var _ = json.Unmarshal // keep the import in case helpers.go lacks decodeJSON
```

> Note: `decodeJSON`, `writeJSON`, and `writeError` are already defined in `backend/internal/handler/helpers.go` (used throughout the other handlers). The shim at the bottom of the file keeps imports honest if you add a helper inline — delete the `var _ = json.Unmarshal` line if you don't need it.

- [ ] **Step 2: Wire into main.go**

Edit `backend/main.go`:

Add import (alphabetically with existing imports if that's the file convention, otherwise anywhere in the import block):

```go
// no new imports needed — handler package is already imported
```

In `main()` after the existing `adminHandler := handler.NewAdminHandler(...)` line (around line 79), add:

```go
	// LLM client for cleanup admin (may be nil if Gemini not configured).
	var cleanupLLM llm.Client
	if cfg.GeminiAPIKey != "" {
		cleanupLLM, _ = llm.NewClient(llm.ProviderGemini, cfg.GeminiModel, cfg.GeminiAPIKey)
	}
	adminCleanupHandler := handler.NewAdminCleanupHandler(clients.Firestore, cleanupLLM)
```

Inside the `r.Route("/admin", func(r chi.Router) { ... })` block, after the existing `r.Patch("/assets/{id}/status", adminHandler.UpdateAssetStatus)` line, add:

```go
			// Cleanup — templates
			r.Get("/cleanup/templates", adminCleanupHandler.ListTemplates)
			r.Post("/cleanup/templates", adminCleanupHandler.CreateTemplate)
			r.Patch("/cleanup/templates/{id}", adminCleanupHandler.UpdateTemplate)
			r.Delete("/cleanup/templates/{id}", adminCleanupHandler.DeleteTemplate)

			// Cleanup — jobs
			r.Post("/cleanup/jobs", adminCleanupHandler.CreateJob)
			r.Get("/cleanup/jobs", adminCleanupHandler.ListJobs)
			r.Get("/cleanup/jobs/{id}", adminCleanupHandler.GetJob)
			r.Patch("/cleanup/jobs/{id}/proposals/{index}", adminCleanupHandler.PatchProposal)
			r.Post("/cleanup/jobs/{id}/apply", adminCleanupHandler.ApplyJob)
			r.Post("/cleanup/jobs/{id}/discard", adminCleanupHandler.DiscardJob)
```

- [ ] **Step 3: Verify build**

Run: `cd backend && go build ./...`
Expected: no output, exit 0.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/handler/admin_cleanup.go backend/main.go
git commit -m "feat(cleanup): HTTP handlers and router wiring"
```

---

## Task 11: Frontend TypeScript types

**Files:**
- Create: `frontend/src/types/cleanup.ts`

- [ ] **Step 1: Create the file**

```ts
// frontend/src/types/cleanup.ts

export type CleanupEntityType = 'category' | 'technique'

export type CleanupActionType = 'update' | 'delete'

export type CleanupJobStatus = 'proposed' | 'applied' | 'discarded' | 'failed'

export interface CleanupTemplate {
  id: string
  disciplineId: string
  entityType: CleanupEntityType
  name: string
  description: string
  promptBody: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface CleanupFilter {
  parentId?: string
  categoryId?: string
  tagSlug?: string
  search?: string
}

export interface CleanupRecordSnapshot {
  id: string
  name: string
  slug: string
  description: string
  parentId?: string | null
  categoryIds?: string[]
  updatedAt: string
}

export interface CleanupProposedFields {
  name: string
  slug: string
  description: string
  parentId?: string | null
  categoryIds?: string[]
}

export interface CleanupProposal {
  index: number
  action: CleanupActionType
  targetId: string
  before: CleanupRecordSnapshot
  after?: CleanupProposedFields
  mergeInto?: string
  rationale: string
  approved: boolean
}

export interface CleanupAppliedResult {
  updated: number
  deleted: number
  skipped: { index: number; reason: string }[]
}

export interface CleanupJob {
  id: string
  disciplineId: string
  entityType: CleanupEntityType
  templateId: string
  templateName: string
  filter: CleanupFilter
  recordCount: number
  status: CleanupJobStatus
  proposals: CleanupProposal[]
  rawLlmResponse: string
  error?: string
  createdBy: string
  createdAt: string
  appliedBy?: string
  appliedAt?: string
  appliedResult?: CleanupAppliedResult
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd frontend && npx vue-tsc -b`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/cleanup.ts
git commit -m "feat(cleanup): add TypeScript types"
```

---

## Task 12: Pinia store

**Files:**
- Create: `frontend/src/stores/cleanup.ts`

- [ ] **Step 1: Create the store**

```ts
// frontend/src/stores/cleanup.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '../composables/useApi'
import type {
  CleanupEntityType,
  CleanupFilter,
  CleanupJob,
  CleanupJobStatus,
  CleanupProposedFields,
  CleanupTemplate,
} from '../types/cleanup'

export const useCleanupStore = defineStore('cleanup', () => {
  const api = useApi()

  const templates = ref<CleanupTemplate[]>([])
  const jobs = ref<CleanupJob[]>([])
  const activeJob = ref<CleanupJob | null>(null)
  const loading = ref(false)

  async function listTemplates(disciplineId: string, entityType: CleanupEntityType) {
    loading.value = true
    try {
      templates.value = await api.get<CleanupTemplate[]>(
        `/api/v1/admin/cleanup/templates?disciplineId=${disciplineId}&entityType=${entityType}`,
      )
    } finally {
      loading.value = false
    }
  }

  async function createTemplate(payload: {
    disciplineId: string
    entityType: CleanupEntityType
    name: string
    description: string
    promptBody: string
  }): Promise<CleanupTemplate> {
    const t = await api.post<CleanupTemplate>('/api/v1/admin/cleanup/templates', payload)
    templates.value = [t, ...templates.value]
    return t
  }

  async function updateTemplate(
    id: string,
    payload: { name: string; description: string; promptBody: string },
  ): Promise<CleanupTemplate> {
    const t = await api.patch<CleanupTemplate>(`/api/v1/admin/cleanup/templates/${id}`, payload)
    templates.value = templates.value.map((x) => (x.id === id ? t : x))
    return t
  }

  async function deleteTemplate(id: string): Promise<void> {
    await api.del(`/api/v1/admin/cleanup/templates/${id}`)
    templates.value = templates.value.filter((x) => x.id !== id)
  }

  async function listJobs(
    disciplineId: string,
    entityType: CleanupEntityType,
    status?: CleanupJobStatus,
  ) {
    loading.value = true
    try {
      let url = `/api/v1/admin/cleanup/jobs?disciplineId=${disciplineId}&entityType=${entityType}`
      if (status) url += `&status=${status}`
      jobs.value = await api.get<CleanupJob[]>(url)
    } finally {
      loading.value = false
    }
  }

  async function getJob(id: string): Promise<CleanupJob> {
    const j = await api.get<CleanupJob>(`/api/v1/admin/cleanup/jobs/${id}`)
    activeJob.value = j
    return j
  }

  async function runAnalysis(payload: {
    disciplineId: string
    entityType: CleanupEntityType
    templateId: string
    filter: CleanupFilter
  }): Promise<CleanupJob> {
    const j = await api.post<CleanupJob>('/api/v1/admin/cleanup/jobs', payload)
    jobs.value = [{ ...j, proposals: [] }, ...jobs.value]
    return j
  }

  async function updateProposal(
    jobId: string,
    index: number,
    payload: { after?: CleanupProposedFields; approved?: boolean },
  ): Promise<CleanupJob> {
    const j = await api.patch<CleanupJob>(
      `/api/v1/admin/cleanup/jobs/${jobId}/proposals/${index}`,
      payload,
    )
    activeJob.value = j
    return j
  }

  async function applyJob(jobId: string): Promise<CleanupJob> {
    const j = await api.post<CleanupJob>(`/api/v1/admin/cleanup/jobs/${jobId}/apply`, {})
    activeJob.value = j
    return j
  }

  async function discardJob(jobId: string): Promise<void> {
    await api.post(`/api/v1/admin/cleanup/jobs/${jobId}/discard`, {})
    if (activeJob.value?.id === jobId) {
      activeJob.value = { ...activeJob.value, status: 'discarded' }
    }
  }

  return {
    templates,
    jobs,
    activeJob,
    loading,
    listTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    listJobs,
    getJob,
    runAnalysis,
    updateProposal,
    applyJob,
    discardJob,
  }
})
```

- [ ] **Step 2: Verify typecheck**

Run: `cd frontend && npx vue-tsc -b`
Expected: exit 0. If `api.post` / `api.patch` / `api.del` signatures complain, check `frontend/src/composables/useApi.ts` and align method names (the existing `AdminView.vue` uses `api.get`, `api.put`, `api.del` — use whatever names that composable actually exports; adjust the store accordingly. If `patch` is not present, add it by copying the `put` method in `useApi.ts` and using the `PATCH` HTTP verb.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/stores/cleanup.ts
# if useApi.ts was edited to add patch:
git add frontend/src/composables/useApi.ts
git commit -m "feat(cleanup): Pinia store for templates and jobs"
```

---

## Task 13: Templates admin view

**Files:**
- Create: `frontend/src/views/AdminCleanupTemplatesView.vue`

- [ ] **Step 1: Create the view**

```vue
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useDisciplineStore } from '../stores/discipline'
import { useCleanupStore } from '../stores/cleanup'
import type { CleanupEntityType, CleanupTemplate } from '../types/cleanup'

const router = useRouter()
const disciplineStore = useDisciplineStore()
const cleanupStore = useCleanupStore()
const confirm = useConfirm()
const toast = useToast()

const { activeDisciplineId } = storeToRefs(disciplineStore)
const { templates, loading } = storeToRefs(cleanupStore)

const entityType = ref<CleanupEntityType>('category')
const entityOptions = [
  { label: 'Categories', value: 'category' },
  { label: 'Techniques', value: 'technique' },
]

const editOpen = ref(false)
const editing = ref<Partial<CleanupTemplate>>({})
const isNew = computed(() => !editing.value.id)

async function refresh() {
  if (!activeDisciplineId.value) return
  await cleanupStore.listTemplates(activeDisciplineId.value, entityType.value)
}

onMounted(refresh)
watch([activeDisciplineId, entityType], refresh)

function openNew() {
  editing.value = {
    disciplineId: activeDisciplineId.value || '',
    entityType: entityType.value,
    name: '',
    description: '',
    promptBody: '',
  }
  editOpen.value = true
}

function openEdit(t: CleanupTemplate) {
  editing.value = { ...t }
  editOpen.value = true
}

async function save() {
  const e = editing.value
  if (!e.name || !e.promptBody) {
    toast.add({ severity: 'warn', summary: 'Missing fields', detail: 'Name and prompt body are required', life: 3000 })
    return
  }
  try {
    if (isNew.value) {
      await cleanupStore.createTemplate({
        disciplineId: e.disciplineId!,
        entityType: e.entityType as CleanupEntityType,
        name: e.name!,
        description: e.description || '',
        promptBody: e.promptBody!,
      })
    } else {
      await cleanupStore.updateTemplate(e.id!, {
        name: e.name!,
        description: e.description || '',
        promptBody: e.promptBody!,
      })
    }
    toast.add({ severity: 'success', summary: 'Saved', life: 2000 })
    editOpen.value = false
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Save failed', detail: err.message, life: 5000 })
  }
}

function askDelete(t: CleanupTemplate) {
  confirm.require({
    header: 'Delete template?',
    message: `Delete "${t.name}"? This cannot be undone.`,
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await cleanupStore.deleteTemplate(t.id)
        toast.add({ severity: 'success', summary: 'Deleted', life: 2000 })
      } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Delete failed', detail: err.message, life: 5000 })
      }
    },
  })
}
</script>

<template>
  <div class="view-padded">
    <div class="flex items-start justify-between mb-4">
      <div>
        <h1 class="text-2xl font-bold">Cleanup prompt templates</h1>
        <p class="text-sm text-gray-400">Reusable prompt variants for AI-driven cleanup runs.</p>
      </div>
      <Button label="Back to Cleanup" icon="pi pi-arrow-left" severity="secondary" @click="router.push({ name: 'admin-cleanup' })" />
    </div>

    <div class="flex gap-3 items-end mb-4">
      <div>
        <label class="block text-sm text-gray-400 mb-1">Entity type</label>
        <Select v-model="entityType" :options="entityOptions" option-label="label" option-value="value" class="min-w-[180px]" />
      </div>
      <Button label="New template" icon="pi pi-plus" @click="openNew" />
    </div>

    <DataTable :value="templates" :loading="loading" data-key="id" striped-rows>
      <template #empty>
        <div class="text-center py-4 text-gray-400">No templates for this entity type yet.</div>
      </template>
      <Column field="name" header="Name" sortable />
      <Column field="description" header="Description" />
      <Column header="" :style="{ width: '180px' }">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button icon="pi pi-pencil" severity="secondary" text @click="openEdit(data)" />
            <Button icon="pi pi-trash" severity="danger" text @click="askDelete(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="editOpen" :header="isNew ? 'New template' : 'Edit template'" modal :style="{ width: '640px' }">
      <div class="flex flex-col gap-3">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Name</label>
          <InputText v-model="editing.name" class="w-full" />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Description</label>
          <InputText v-model="editing.description" class="w-full" />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Prompt body</label>
          <Textarea v-model="editing.promptBody" :rows="12" class="w-full font-mono text-sm" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" @click="editOpen = false" />
        <Button label="Save" icon="pi pi-check" @click="save" />
      </template>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>

<style scoped>
.view-padded { padding: 1.5rem; }
</style>
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx vue-tsc -b`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/AdminCleanupTemplatesView.vue
git commit -m "feat(cleanup): admin templates view"
```

---

## Task 14: New analysis dialog + jobs landing view

**Files:**
- Create: `frontend/src/components/admin/NewCleanupJobDialog.vue`
- Create: `frontend/src/views/AdminCleanupView.vue`

- [ ] **Step 1: Create NewCleanupJobDialog.vue**

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useCleanupStore } from '../../stores/cleanup'
import type { CleanupEntityType, CleanupTemplate } from '../../types/cleanup'

const props = defineProps<{
  visible: boolean
  disciplineId: string
  entityType: CleanupEntityType
}>()
const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'created', jobId: string): void
}>()

const store = useCleanupStore()
const toast = useToast()

const selectedTemplateId = ref<string | null>(null)
const parentId = ref<string>('')
const categoryId = ref<string>('')
const search = ref<string>('')
const running = ref(false)

const templates = ref<CleanupTemplate[]>([])

async function loadTemplates() {
  if (!props.disciplineId) return
  await store.listTemplates(props.disciplineId, props.entityType)
  templates.value = store.templates
  selectedTemplateId.value = templates.value[0]?.id ?? null
}

watch(() => [props.visible, props.entityType], ([v]) => {
  if (v) loadTemplates()
})

async function run() {
  if (!selectedTemplateId.value) {
    toast.add({ severity: 'warn', summary: 'Pick a template first', life: 3000 })
    return
  }
  running.value = true
  try {
    const job = await store.runAnalysis({
      disciplineId: props.disciplineId,
      entityType: props.entityType,
      templateId: selectedTemplateId.value,
      filter: {
        parentId: parentId.value || undefined,
        categoryId: categoryId.value || undefined,
        search: search.value || undefined,
      },
    })
    toast.add({ severity: 'success', summary: 'Analysis complete', detail: `${job.proposals.length} proposals`, life: 3000 })
    emit('created', job.id)
    emit('update:visible', false)
  } catch (err: any) {
    const msg = err?.message || 'Analysis failed'
    const severity = msg.includes('413') ? 'warn' : 'error'
    toast.add({ severity, summary: 'Analysis failed', detail: msg, life: 6000 })
  } finally {
    running.value = false
  }
}
</script>

<template>
  <Dialog
    :visible="visible" @update:visible="$emit('update:visible', $event)"
    header="New cleanup analysis" modal :style="{ width: '520px' }"
    :closable="!running"
  >
    <div class="flex flex-col gap-3">
      <div>
        <label class="block text-sm text-gray-400 mb-1">Template</label>
        <Select v-model="selectedTemplateId" :options="templates" option-label="name" option-value="id" class="w-full" placeholder="Pick a template" />
      </div>
      <div v-if="entityType === 'category'">
        <label class="block text-sm text-gray-400 mb-1">Only under parent ID (optional)</label>
        <InputText v-model="parentId" class="w-full" placeholder="e.g. cat_xxx" />
      </div>
      <div v-else>
        <label class="block text-sm text-gray-400 mb-1">Only in category ID (optional)</label>
        <InputText v-model="categoryId" class="w-full" placeholder="e.g. cat_xxx" />
      </div>
      <div>
        <label class="block text-sm text-gray-400 mb-1">Name contains (optional)</label>
        <InputText v-model="search" class="w-full" />
      </div>
    </div>
    <template #footer>
      <Button label="Cancel" severity="secondary" :disabled="running" @click="$emit('update:visible', false)" />
      <Button label="Run analysis" icon="pi pi-play" :loading="running" @click="run" />
    </template>
  </Dialog>
</template>
```

- [ ] **Step 2: Create AdminCleanupView.vue**

```vue
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import SelectButton from 'primevue/selectbutton'
import { useDisciplineStore } from '../stores/discipline'
import { useCleanupStore } from '../stores/cleanup'
import NewCleanupJobDialog from '../components/admin/NewCleanupJobDialog.vue'
import type { CleanupEntityType, CleanupJobStatus } from '../types/cleanup'

const router = useRouter()
const disciplineStore = useDisciplineStore()
const cleanupStore = useCleanupStore()

const { activeDisciplineId } = storeToRefs(disciplineStore)
const { jobs, loading } = storeToRefs(cleanupStore)

const entityType = ref<CleanupEntityType>('category')
const entityOptions = [
  { label: 'Categories', value: 'category' },
  { label: 'Techniques', value: 'technique' },
]

const newJobOpen = ref(false)

async function refresh() {
  if (!activeDisciplineId.value) return
  await cleanupStore.listJobs(activeDisciplineId.value, entityType.value)
}

onMounted(refresh)
watch([activeDisciplineId, entityType], refresh)

function onJobCreated(id: string) {
  router.push({ name: 'admin-cleanup-job', params: { id } })
}

function statusSeverity(s: CleanupJobStatus) {
  switch (s) {
    case 'proposed': return 'info'
    case 'applied': return 'success'
    case 'discarded': return 'warn'
    case 'failed': return 'danger'
    default: return 'secondary'
  }
}
</script>

<template>
  <div class="view-padded">
    <div class="view-header">
      <div>
        <h1 class="text-2xl font-bold">Cleanup</h1>
        <p class="text-sm text-gray-400">AI-driven deduplication and restructuring.</p>
      </div>
      <div class="flex gap-2">
        <Button label="Manage templates" icon="pi pi-file-edit" severity="secondary"
                @click="router.push({ name: 'admin-cleanup-templates' })" />
        <Button label="New analysis" icon="pi pi-play" :disabled="!activeDisciplineId" @click="newJobOpen = true" />
      </div>
    </div>

    <div class="mb-4">
      <SelectButton v-model="entityType" :options="entityOptions" option-label="label" option-value="value" />
    </div>

    <DataTable :value="jobs" :loading="loading" data-key="id" striped-rows>
      <template #empty>
        <div class="text-center py-4 text-gray-400">No jobs yet. Run a new analysis to get started.</div>
      </template>
      <Column field="createdAt" header="Created" sortable>
        <template #body="{ data }">{{ new Date(data.createdAt).toLocaleString() }}</template>
      </Column>
      <Column field="templateName" header="Template" />
      <Column field="recordCount" header="Records" :style="{ width: '100px' }" />
      <Column field="status" header="Status" :style="{ width: '140px' }">
        <template #body="{ data }">
          <Tag :value="data.status" :severity="statusSeverity(data.status)" />
        </template>
      </Column>
      <Column header="" :style="{ width: '120px' }">
        <template #body="{ data }">
          <Button label="Open" icon="pi pi-arrow-right" icon-pos="right" text
                  @click="router.push({ name: 'admin-cleanup-job', params: { id: data.id } })" />
        </template>
      </Column>
    </DataTable>

    <NewCleanupJobDialog
      v-if="activeDisciplineId"
      v-model:visible="newJobOpen"
      :discipline-id="activeDisciplineId"
      :entity-type="entityType"
      @created="onJobCreated"
    />
  </div>
</template>

<style scoped>
.view-padded { padding: 1.5rem; }
.view-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
</style>
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx vue-tsc -b`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/AdminCleanupView.vue frontend/src/components/admin/NewCleanupJobDialog.vue
git commit -m "feat(cleanup): admin cleanup landing view and new-job dialog"
```

---

## Task 15: Diff component + proposal row + job detail view

**Files:**
- Create: `frontend/src/components/admin/CleanupDiff.vue`
- Create: `frontend/src/components/admin/CleanupProposalRow.vue`
- Create: `frontend/src/views/AdminCleanupJobView.vue`

- [ ] **Step 1: Create CleanupDiff.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { CleanupProposedFields, CleanupRecordSnapshot } from '../../types/cleanup'

const props = defineProps<{
  before: CleanupRecordSnapshot
  after?: CleanupProposedFields | null
  entityType: 'category' | 'technique'
}>()

interface Row { label: string; before: string; after: string; changed: boolean }

const rows = computed<Row[]>(() => {
  const b = props.before
  const a = props.after
  const out: Row[] = []
  const push = (label: string, bVal: string, aVal: string) => {
    out.push({ label, before: bVal, after: aVal, changed: bVal !== aVal })
  }
  const str = (v: unknown) => {
    if (v === undefined || v === null) return '—'
    if (Array.isArray(v)) return v.join(', ') || '—'
    return String(v)
  }
  push('name',        str(b.name),        str(a?.name        ?? b.name))
  push('slug',        str(b.slug),        str(a?.slug        ?? b.slug))
  push('description', str(b.description), str(a?.description ?? b.description))
  if (props.entityType === 'category') {
    push('parentId',  str(b.parentId),    str(a?.parentId    ?? b.parentId))
  } else {
    push('categoryIds', str(b.categoryIds), str(a?.categoryIds ?? b.categoryIds))
  }
  return out
})
</script>

<template>
  <table class="diff-table">
    <thead>
      <tr><th>Field</th><th>Before</th><th>After</th></tr>
    </thead>
    <tbody>
      <tr v-for="r in rows" :key="r.label" :class="{ changed: r.changed }">
        <td class="field">{{ r.label }}</td>
        <td class="before">{{ r.before }}</td>
        <td class="after">{{ r.after }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.diff-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.diff-table th, .diff-table td { padding: 0.4rem 0.6rem; text-align: left; vertical-align: top; border-bottom: 1px solid var(--surface-border); }
.diff-table th { color: var(--text-color-secondary); font-weight: 500; }
.diff-table .field { color: var(--text-color-secondary); width: 120px; }
.diff-table tr.changed .after { color: #5eead4; font-weight: 500; }
</style>
```

- [ ] **Step 2: Create CleanupProposalRow.vue**

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import Checkbox from 'primevue/checkbox'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import CleanupDiff from './CleanupDiff.vue'
import type { CleanupProposal, CleanupEntityType, CleanupProposedFields } from '../../types/cleanup'

const props = defineProps<{
  proposal: CleanupProposal
  entityType: CleanupEntityType
  mergeTargetName?: string
}>()
const emit = defineEmits<{
  (e: 'approveToggle', index: number, next: boolean): void
  (e: 'saveAfter', index: number, after: CleanupProposedFields): void
}>()

const editing = ref(false)
const draft = ref<CleanupProposedFields>({ name: '', slug: '', description: '' })

watch(() => props.proposal, (p) => {
  if (p.after) {
    draft.value = {
      name: p.after.name,
      slug: p.after.slug,
      description: p.after.description,
      parentId: p.after.parentId ?? null,
      categoryIds: p.after.categoryIds ? [...p.after.categoryIds] : [],
    }
  }
}, { immediate: true })

function save() {
  emit('saveAfter', props.proposal.index, draft.value)
  editing.value = false
}
</script>

<template>
  <div class="row">
    <div class="row-header">
      <Tag v-if="proposal.action === 'update'" value="UPDATE" severity="info" />
      <Tag v-else value="MERGE" severity="warn" />
      <span class="target">{{ proposal.before.name }} <span class="slug">({{ proposal.before.slug }})</span></span>
      <span v-if="proposal.action === 'delete'" class="merge-into">
        → merge into <strong>{{ mergeTargetName || proposal.mergeInto }}</strong>
      </span>
      <div class="grow" />
      <div class="approve">
        <Checkbox :modelValue="proposal.approved" :binary="true"
                  @update:modelValue="emit('approveToggle', proposal.index, $event as boolean)" />
        <span>Approve</span>
      </div>
    </div>

    <div class="rationale">{{ proposal.rationale }}</div>

    <div v-if="proposal.action === 'update' && !editing">
      <CleanupDiff :before="proposal.before" :after="proposal.after" :entity-type="entityType" />
      <div class="mt-2">
        <Button label="Edit after" icon="pi pi-pencil" size="small" text @click="editing = true" />
      </div>
    </div>

    <div v-else-if="proposal.action === 'update' && editing" class="edit-form">
      <div class="form-row">
        <label>name</label>
        <InputText v-model="draft.name" />
      </div>
      <div class="form-row">
        <label>slug</label>
        <InputText v-model="draft.slug" />
      </div>
      <div class="form-row">
        <label>description</label>
        <Textarea v-model="draft.description" :rows="4" />
      </div>
      <div v-if="entityType === 'category'" class="form-row">
        <label>parentId</label>
        <InputText :modelValue="draft.parentId ?? ''" @update:modelValue="draft.parentId = ($event || null)" />
      </div>
      <div v-else class="form-row">
        <label>categoryIds (comma separated)</label>
        <InputText
          :modelValue="(draft.categoryIds ?? []).join(',')"
          @update:modelValue="draft.categoryIds = String($event).split(',').map(s => s.trim()).filter(Boolean)"
        />
      </div>
      <div class="flex gap-2 mt-2">
        <Button label="Cancel" severity="secondary" size="small" @click="editing = false" />
        <Button label="Save" icon="pi pi-check" size="small" @click="save" />
      </div>
    </div>

    <div v-else>
      <CleanupDiff :before="proposal.before" :after="null" :entity-type="entityType" />
    </div>
  </div>
</template>

<style scoped>
.row { padding: 0.75rem 1rem; border: 1px solid var(--surface-border); border-radius: 6px; margin-bottom: 0.75rem; }
.row-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; }
.target { font-weight: 500; }
.slug { color: var(--text-color-secondary); font-weight: 400; }
.merge-into { color: var(--text-color-secondary); margin-left: 0.5rem; }
.grow { flex: 1; }
.approve { display: inline-flex; align-items: center; gap: 0.35rem; }
.rationale { color: var(--text-color-secondary); font-style: italic; margin-bottom: 0.5rem; }
.edit-form { display: flex; flex-direction: column; gap: 0.5rem; }
.form-row { display: flex; flex-direction: column; gap: 0.25rem; }
.form-row label { font-size: 0.75rem; color: var(--text-color-secondary); }
</style>
```

- [ ] **Step 3: Create AdminCleanupJobView.vue**

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import ConfirmDialog from 'primevue/confirmdialog'
import Message from 'primevue/message'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useCleanupStore } from '../stores/cleanup'
import CleanupProposalRow from '../components/admin/CleanupProposalRow.vue'
import type { CleanupJobStatus, CleanupProposedFields } from '../types/cleanup'

const route = useRoute()
const router = useRouter()
const store = useCleanupStore()
const confirm = useConfirm()
const toast = useToast()

const { activeJob } = storeToRefs(store)
const working = ref(false)
const jobId = String(route.params.id)

onMounted(() => store.getJob(jobId))

const approvedCount = computed(() => activeJob.value?.proposals.filter(p => p.approved).length ?? 0)

const mergeTargetNameById = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const p of activeJob.value?.proposals ?? []) {
    map[p.targetId] = p.before.name
  }
  return map
})

function statusSeverity(s: CleanupJobStatus) {
  switch (s) {
    case 'proposed': return 'info'
    case 'applied': return 'success'
    case 'discarded': return 'warn'
    case 'failed': return 'danger'
    default: return 'secondary'
  }
}

async function toggleApprove(index: number, next: boolean) {
  try {
    await store.updateProposal(jobId, index, { approved: next })
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Update failed', detail: err.message, life: 5000 })
  }
}

async function saveAfter(index: number, after: CleanupProposedFields) {
  try {
    await store.updateProposal(jobId, index, { after })
    toast.add({ severity: 'success', summary: 'Saved', life: 2000 })
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Save failed', detail: err.message, life: 5000 })
  }
}

function confirmApply() {
  confirm.require({
    header: 'Apply approved proposals?',
    message: `Apply ${approvedCount.value} approved proposals? This cannot be undone.`,
    acceptClass: 'p-button-danger',
    accept: async () => {
      working.value = true
      try {
        const res = await store.applyJob(jobId)
        toast.add({
          severity: 'success', summary: 'Applied',
          detail: `${res.appliedResult?.updated ?? 0} updated, ${res.appliedResult?.deleted ?? 0} deleted, ${res.appliedResult?.skipped.length ?? 0} skipped`,
          life: 8000,
        })
      } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Apply failed', detail: err.message, life: 6000 })
      } finally {
        working.value = false
      }
    },
  })
}

function confirmDiscard() {
  confirm.require({
    header: 'Discard job?',
    message: 'Mark this job as discarded? Proposals will no longer be applicable.',
    acceptClass: 'p-button-warning',
    accept: async () => {
      working.value = true
      try {
        await store.discardJob(jobId)
        toast.add({ severity: 'info', summary: 'Discarded', life: 3000 })
      } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Discard failed', detail: err.message, life: 5000 })
      } finally {
        working.value = false
      }
    },
  })
}
</script>

<template>
  <div class="view-padded">
    <Button label="Back to jobs" icon="pi pi-arrow-left" severity="secondary" text class="mb-3" @click="router.push({ name: 'admin-cleanup' })" />

    <div v-if="activeJob" class="job-header">
      <div>
        <h1 class="text-2xl font-bold">Cleanup job</h1>
        <div class="meta">
          <Tag :value="activeJob.status" :severity="statusSeverity(activeJob.status)" />
          <span class="sep">·</span>
          <span>{{ activeJob.entityType }}</span>
          <span class="sep">·</span>
          <span>template: <strong>{{ activeJob.templateName }}</strong></span>
          <span class="sep">·</span>
          <span>{{ activeJob.recordCount }} records</span>
          <span class="sep">·</span>
          <span>{{ new Date(activeJob.createdAt).toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <Message v-if="activeJob?.status === 'failed'" severity="error" :closable="false" class="mt-3">
      {{ activeJob.error }}
    </Message>

    <Message v-if="activeJob?.status === 'applied'" severity="success" :closable="false" class="mt-3">
      Applied {{ activeJob.appliedResult?.updated ?? 0 }} updates, {{ activeJob.appliedResult?.deleted ?? 0 }} deletes,
      {{ activeJob.appliedResult?.skipped.length ?? 0 }} skipped.
    </Message>

    <div v-if="activeJob?.proposals?.length" class="proposals">
      <CleanupProposalRow
        v-for="p in activeJob.proposals" :key="p.index"
        :proposal="p"
        :entity-type="activeJob.entityType"
        :merge-target-name="p.mergeInto ? mergeTargetNameById[p.mergeInto] : undefined"
        @approve-toggle="toggleApprove"
        @save-after="saveAfter"
      />
    </div>

    <div v-if="activeJob?.status === 'proposed'" class="footer-bar">
      <Button label="Discard" icon="pi pi-times" severity="warning" :disabled="working" @click="confirmDiscard" />
      <Button :label="`Apply approved (${approvedCount})`" icon="pi pi-check"
              :disabled="working || approvedCount === 0" @click="confirmApply" />
    </div>

    <ConfirmDialog />
  </div>
</template>

<style scoped>
.view-padded { padding: 1.5rem; }
.job-header { margin-bottom: 1rem; }
.meta { color: var(--text-color-secondary); font-size: 0.875rem; margin-top: 0.25rem; }
.sep { margin: 0 0.4rem; opacity: 0.5; }
.proposals { margin-top: 1.5rem; }
.footer-bar { position: sticky; bottom: 0; display: flex; gap: 0.5rem; justify-content: flex-end; padding: 0.75rem 0; background: var(--surface-ground); border-top: 1px solid var(--surface-border); }
</style>
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx vue-tsc -b`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/admin/CleanupDiff.vue \
        frontend/src/components/admin/CleanupProposalRow.vue \
        frontend/src/views/AdminCleanupJobView.vue
git commit -m "feat(cleanup): job review view with inline-edit and apply flow"
```

---

## Task 16: Wire routes and AdminView nav tab

**Files:**
- Modify: `frontend/src/router/index.ts`
- Modify: `frontend/src/views/AdminView.vue`

- [ ] **Step 1: Edit router**

Edit `frontend/src/router/index.ts`. After the existing `admin/assets/:id` route (around line 117), insert these three routes as siblings:

```ts
        {
          path: 'admin/cleanup',
          name: 'admin-cleanup',
          component: () => import('../views/AdminCleanupView.vue'),
          meta: { requiresRole: 'admin' },
        },
        {
          path: 'admin/cleanup/templates',
          name: 'admin-cleanup-templates',
          component: () => import('../views/AdminCleanupTemplatesView.vue'),
          meta: { requiresRole: 'admin' },
        },
        {
          path: 'admin/cleanup/jobs/:id',
          name: 'admin-cleanup-job',
          component: () => import('../views/AdminCleanupJobView.vue'),
          meta: { requiresRole: 'admin' },
        },
```

- [ ] **Step 2: Edit AdminView.vue to add Cleanup tab**

In `frontend/src/views/AdminView.vue`, inside the `.admin-nav` block (around line 294-312), add a new button after the existing Tags button:

```vue
      <Button
        label="Cleanup"
        icon="pi pi-sparkles"
        class="admin-nav-btn"
        @click="router.push({ name: 'admin-cleanup' })"
      />
```

- [ ] **Step 3: Build frontend to verify**

Run: `cd frontend && npm run build`
Expected: exit 0. `vue-tsc -b` step must pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/router/index.ts frontend/src/views/AdminView.vue
git commit -m "feat(cleanup): wire routes and add Cleanup tab to admin nav"
```

---

## Task 17: End-to-end smoke test against emulators

This is a manual verification task, not automated, because it exercises the emulator + Gemini round-trip.

- [ ] **Step 1: Start emulators and backend**

```bash
# Terminal A
cd /Users/thomas/projects/skillhive && npx firebase-tools emulators:start

# Terminal B
cd /Users/thomas/projects/skillhive/backend && FIRESTORE_EMULATOR_HOST=localhost:8181 GCLOUD_PROJECT=skillhive go run .

# Terminal C
cd /Users/thomas/projects/skillhive/frontend && npm run dev
```

- [ ] **Step 2: Seed duplicate categories**

In the SkillHive UI (logged in as admin on a test discipline), manually create three nearly-duplicate categories:
- "Closed Guard" (slug `closed-guard`)
- "closed-guard" (slug `closed-guard-2`)
- "Closed-Guard" (slug `closed-guard-3`)

Then navigate to `/admin/cleanup`.

- [ ] **Step 3: Create a template**

Go to "Manage templates", create one named "Dedupe duplicates":
```
You are cleaning up a taxonomy of BJJ categories. Identify records that are
duplicates of each other (same concept, different spelling or casing).
For each group of duplicates, keep the one with the best name and description.
Emit `delete` actions with mergeInto pointing at the keeper, and emit `update`
actions on the keeper only if its description needs improvement.
```

- [ ] **Step 4: Run analysis**

Back on `/admin/cleanup`, click "New analysis". Pick Categories + the template, click Run.

Expected: navigate to the job view with at least 2 proposals (1 update + 2 merges, or similar).

- [ ] **Step 5: Review and apply**

Reject any proposal that looks wrong, then click "Apply approved (N)". Confirm.

Expected: toast "X updated, Y deleted". Categories page should now show only one "Closed Guard" entry, and any technique/asset that had a duplicate in its `categoryIds` now has just the surviving id.

- [ ] **Step 6: Verify status persisted**

Refresh the job page → status `applied`, success banner visible.

- [ ] **Step 7: Commit anything polish-related, then done**

If you discover issues during the smoke test, fix them in the relevant task file with a follow-up commit.

---

## Self-Review Checklist (done)

**Spec coverage:**
- §1 Problem/Goal → whole plan
- §2 Decisions → Tasks 4, 5, 8, 9 (validation + executor cover each decision explicitly)
- §3 Flow → Tasks 8, 9, 10 + Tasks 14, 15
- §4 Schema → Tasks 1, 7, 8 (model + template store + job persistence)
- §5 API → Task 10
- §6 Go package layout → Tasks 1-9
- §7 Prompt shape → Task 2
- §8 Post-response validation → Task 4
- §9 Executor (Passes 1-4) → Task 9
- §10 Frontend → Tasks 11-16
- §11 Safety & audit → Task 10 (RequireAdmin on every route, slog.Info after apply in Task 9)
- §12 Error handling → Task 10 (413, 502, 503 when LLM missing), Task 9 (skipped rows)
- §13 Testing plan → Tasks 2, 3, 4, 5 (unit tests); Task 17 (manual E2E)
- §14 Out of scope → respected (no asset flows)

**Placeholder scan:** none found. Every step has runnable code or an exact command.

**Type consistency:** `ProposedFields`, `RecordSnapshot`, `Proposal`, `Job`, `Template` all use consistent field names across Go and TS. `CategoryIDs`/`categoryIds`, `ParentID`/`parentId` — tagging matches.
