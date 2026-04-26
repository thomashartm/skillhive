# AI-Driven Cleanup Admin — Design

**Date:** 2026-04-24
**Status:** Approved for implementation planning
**Scope (v1):** Categories and Techniques only. Assets are explicitly out of scope for v1 because they already have an enrichment pipeline that owns most AI-derived fields; mixing a second LLM writer in would create a two-source-of-truth conflict.

## 1. Problem & Goal

The SkillHive taxonomy (categories, techniques) accumulates duplicates and mis-placed entries over time. Admins currently have no scalable way to clean this up.

Build an admin feature that:

1. Lets a discipline admin send the full list of entity records (with descriptions) to Gemini along with a prompt
2. Receives back proposed **updates** and **deletes** as structured JSON
3. Shows the proposed changes in a review table so the admin can approve/reject/edit individual proposals
4. On apply, executes the approved changes with full referential integrity (no orphaned references)
5. Retains the job as an audit record

## 2. Architectural Decisions (from brainstorming)

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Every `delete` action must include a `mergeInto` target | Referential integrity: executor rewrites references from deleted record to the winner before deleting. No orphans. |
| 2 | Updates may touch `name`, `slug`, `description`, `parentId` (categories) / `categoryIds[]` (techniques) | User requested broad updates to enable hierarchy restructuring. Slug changes are treated as renames — references use Firestore doc IDs so they're unaffected, but any slug-based links would need separate handling. |
| 3 | Jobs are persisted to Firestore as `cleanupJobs/{id}` | LLM calls are expensive and review can take time; losing a batch to a browser refresh is unacceptable. Also provides an audit trail for destructive operations. |
| 4 | Prompt templates are saved per discipline + entity type in `cleanupPromptTemplates` | Admins can maintain named variants ("conservative merge", "aggressive restructure"). Templates referenced by ID from each job; name is snapshotted onto the job for historical stability. |
| 5 | One entity type per job; selection is "all records or filtered subset" | Per-type prompts can be tuned independently. Mixing types in one call muddies Gemini's required response schema. |
| 6 | Fail loudly on token-budget overflow | `gemini-2.0-flash` has ~1M input tokens; text-only entity lists are unlikely to exceed it. Chunking would weaken dedup quality (can't find cross-chunk duplicates). Re-evaluate only if this becomes a real problem. |
| 7 | v1 scope = categories + techniques only | Assets have an enrichment pipeline owning many fields. Avoid two-writer conflicts in v1. |

## 3. End-to-End Flow

```
┌─ Admin UI ────────────────────────────────────────────┐
│  1. Pick entity type (category | technique)           │
│  2. Pick a prompt template (or create one)            │
│  3. Pick records (all / filtered subset)              │
│  4. Click "Run analysis"                              │
└───────────────────────────────────────────────────────┘
                         │
                         ▼
┌─ Backend service ─────────────────────────────────────┐
│  • Fetch records in scope                             │
│  • Build prompt = template body + serialized records  │
│  • Pre-flight token estimate (fail 413 if over)       │
│  • Call Gemini with responseMimeType: application/json│
│  • Parse + validate response                          │
│  • Write cleanupJobs/{id} with status="proposed"      │
└───────────────────────────────────────────────────────┘
                         │
                         ▼
┌─ Admin review ────────────────────────────────────────┐
│  • Table of proposals (update / merge)                │
│  • Inline-edit `after` for update rows                │
│  • Approve/reject per row                             │
│  • "Apply approved"  |  "Discard"                     │
└───────────────────────────────────────────────────────┘
                         │
                         ▼
┌─ Executor (pass 1–4) ─────────────────────────────────┐
│  1. Concurrency check (before.updatedAt vs current)   │
│  2. Deletes+merges: rewrite refs, then delete         │
│  3. Updates: apply field changes, validate cycles     │
│  4. Finalize job: status="applied", result counts     │
└───────────────────────────────────────────────────────┘
```

## 4. Firestore Schema

### `cleanupPromptTemplates/{id}`

```
id:           string
disciplineId: string
entityType:   "category" | "technique"
name:         string     // e.g. "Conservative merge"
description:  string     // admin-facing note
promptBody:   string     // the actual prompt text the admin authors
createdBy:    string (uid)
createdAt:    timestamp
updatedAt:    timestamp
```

### `cleanupJobs/{id}`

```
id:            string
disciplineId:  string
entityType:    "category" | "technique"
templateId:    string
templateName:  string             // snapshotted (template may change/be deleted later)
filter: {
  parentId?:  string              // categories only
  categoryId?: string             // techniques only
  tagSlug?:   string
  search?:    string              // substring on name
}
recordCount:   number
status:        "proposed" | "applied" | "discarded" | "failed"
proposals: [
  {
    index:     number             // stable ordinal for PATCH
    action:    "update" | "delete"
    targetId:  string
    before: {
      name:        string
      slug:        string
      description: string
      parentId?:   string         // categories only (single field, nullable)
      categoryIds?: string[]      // techniques only (array)
      updatedAt:   timestamp      // for Pass 1 concurrency check
    }
    after?: {                     // action=update only; mirrors `before` shape (minus updatedAt)
      name, slug, description, parentId?, categoryIds?
    }
    mergeInto?: string            // action=delete only; must be another targetId in this job
    rationale: string             // Gemini's reason for the action
    approved:  boolean            // admin toggle; defaults to true
  }
]
rawLlmResponse: string            // audit/debug
error?:        string             // populated when status=failed
createdBy:     string (uid)
createdAt:     timestamp
appliedBy?:    string (uid)
appliedAt?:    timestamp
appliedResult?: {
  updated: number
  deleted: number
  skipped: [
    { index: number, reason: string }
  ]
}
```

## 5. Backend API

All routes protected by `middleware.RequireAdmin(disciplineID)`. Added under the existing `/api/v1/admin` subrouter in `main.go`.

| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/admin/cleanup/templates?disciplineId=X&entityType=Y` | List templates |
| POST   | `/admin/cleanup/templates` | Create template |
| PATCH  | `/admin/cleanup/templates/{id}` | Update template |
| DELETE | `/admin/cleanup/templates/{id}` | Delete template |
| POST   | `/admin/cleanup/jobs` | Run analysis → creates job in `proposed` or `failed` state |
| GET    | `/admin/cleanup/jobs?disciplineId=X&entityType=Y&status=Z` | List jobs |
| GET    | `/admin/cleanup/jobs/{id}` | Get one job with full proposals array |
| PATCH  | `/admin/cleanup/jobs/{id}/proposals/{index}` | Edit `after` fields and/or toggle `approved` |
| POST   | `/admin/cleanup/jobs/{id}/apply` | Execute approved proposals |
| POST   | `/admin/cleanup/jobs/{id}/discard` | Mark job `discarded` |

`POST /admin/cleanup/jobs` request body:
```json
{
  "disciplineId": "...",
  "entityType":   "category",
  "templateId":   "...",
  "filter":       { "parentId": "...", "search": "..." }
}
```

Responses:
- `201 Created` with job payload → proposals ready for review
- `413 Payload Too Large` → token budget exceeded; ask admin to narrow filter
- `502 Bad Gateway` → Gemini call failed; job persisted with `status=failed` and `error` populated so admin can see it

## 6. Backend Go Package Layout

```
backend/internal/cleanup/
  model.go       // Job, Proposal, Template Go structs with firestore tags
  service.go     // Orchestrator: load records, call LLM, validate, persist job
  prompt.go      // Compose final prompt from template body + records
  parser.go      // Parse Gemini JSON response into proposals
  validator.go   // Cross-check IDs, mergeInto targets, parent cycles, slug format
  executor.go    // Apply approved proposals (Pass 1–4)
  templates.go   // Template CRUD against Firestore
  refs.go        // Reference-rewrite helpers (parentId, categoryId, curricula elements)

backend/internal/handler/
  admin_cleanup.go   // HTTP handlers for the routes above
```

LLM call reuses existing `internal/llm.GeminiClient` — no new client code. The existing `responseMimeType: "application/json"` setting is what we need.

## 7. Prompt Shape

Final prompt sent to Gemini = admin-authored `promptBody` + appended input records + required output schema.

**Category input/output:**
```
<promptBody from template>

INPUT RECORDS (JSON):
[
  {"id": "cat_1", "name": "Closed Guard",   "slug": "closed-guard",   "description": "...", "parentId": null},
  {"id": "cat_2", "name": "closed-guard",    "slug": "closed-guard-2", "description": "...", "parentId": null},
  {"id": "cat_3", "name": "Half Guard",      "slug": "half-guard",     "description": "...", "parentId": "cat_1"}
]

Respond ONLY with valid JSON in this exact shape — no markdown, no prose:
{
  "actions": [
    { "action": "update", "id": "<id>",
      "after": { "name": "...", "slug": "...", "description": "...", "parentId": "<id or null>" },
      "rationale": "..." },
    { "action": "delete", "id": "<id>", "mergeInto": "<another id>", "rationale": "..." }
  ]
}
```

**Technique input/output** — record shape and `after` shape both use `categoryIds: string[]` instead of `parentId`:
```
INPUT RECORDS (JSON):
[
  {"id": "tech_1", "name": "Armbar from Guard", "slug": "armbar-from-guard",
   "description": "...", "categoryIds": ["cat_1", "cat_4"]},
  ...
]

{ "action": "update", "id": "<id>",
  "after": { "name": "...", "slug": "...", "description": "...", "categoryIds": ["<id>", ...] },
  "rationale": "..." }
```

Template body is stored unmodified; the backend appends the records block and schema block every call. This keeps templates portable across runs even as the record set changes.

## 8. Post-Response Validation (before persisting the job)

- Every `id` referenced in an action exists in the input set (else drop action, record in `job.rawLlmResponse` notes)
- Every `mergeInto` target exists in the input set and is **not** itself being deleted in the same job
- No record is both `update`d and `delete`d
- For category updates, proposed `parentId` doesn't create a cycle (walk parent chain; abort if we see the record itself)
- For technique updates, every id in `categoryIds` exists in the discipline and the array has no duplicates
- Slug format valid (`^[a-z0-9-]+$`)
- If no valid actions remain → job status = `failed` with descriptive error

## 9. Executor (Apply Phase)

### Pass 1 — Concurrency check (read-only)

For each approved proposal:
- Load `/{collection}/{targetId}` from Firestore
- Compare `currentRecord.updatedAt` against `proposal.before.updatedAt`
- Mismatch → skip, record `{index, reason: "stale: record changed since analysis"}` in `appliedResult.skipped`
- For `delete`: also verify `mergeInto` target still exists and is not itself approved for deletion in this job

### Pass 2 — Deletes + merges

For each surviving approved `{action: "delete", id: X, mergeInto: Y}`:

In one Firestore transaction (or batched writes if >500 refs):
- **If entityType == "category":**
  - `categories` where `parentId == X` → set `parentId = Y` (single-field write)
  - `techniques` where `categoryIds` array-contains `X` → replace X with Y in the array; if Y already present, just remove X; preserve array ordering
  - `assets` where `categoryIds` array-contains `X` → same array rewrite as above
  - (curricula elements do not reference categories directly, so no rewrites there)
- **If entityType == "technique":**
  - `curriculumElements` where `techniqueId == X` → set `techniqueId = Y` (single-pointer field, stored as subcollection under each curriculum)
  - `assets` where `techniqueIds` array-contains `X` → replace X with Y in the array, dedupe if needed
- Delete `/{collection}/{X}`

Because `curriculumElements` live in subcollections under each curriculum, the executor uses a `CollectionGroup` query on `elements` (scoped to the discipline — each curriculum document has `disciplineId`, so the executor can filter by joining on the parent curriculum). If that turns out to be impractical, fall back to iterating all curricula in the discipline and filtering their elements client-side.

If reference count would exceed Firestore's 500-write transaction limit (e.g., a root category with hundreds of children), fall back to batched writes with a `slog.Warn`. Each batch is independent; on batch-level failure the job transitions to `status=failed` with a descriptive error, and `appliedResult` reports partial progress.

### Pass 3 — Updates

For each surviving approved `{action: "update", id: X, after: {...}}`:
- Re-validate no cycle in proposed `parentId` (another entity may have been deleted in Pass 2, changing the graph)
- Apply update via Firestore write (batched, chunked by 500)
- `slug` change is just a field write; internal refs use doc IDs and are unaffected

### Pass 4 — Finalize

Update `cleanupJobs/{id}`:
```
status        = "applied"
appliedBy     = <actor uid>
appliedAt     = now
appliedResult = { updated, deleted, skipped[] }
```

Emit `slog.Info` with: `jobId`, `entityType`, `actor`, `updated`, `deleted`, `skippedCount`.

## 10. Frontend

### New views

- **`frontend/src/views/AdminCleanupView.vue`**
  - Entity-type tabs (Categories / Techniques)
  - List of recent jobs for that type with status badges
  - "New Analysis" button → modal picking template + filter, then `POST /admin/cleanup/jobs`
  - "Manage Templates" button → routes to `AdminCleanupTemplatesView`

- **`frontend/src/views/AdminCleanupJobView.vue`**
  - Header block: entity type, template snapshot name, `createdBy`, `createdAt`, record count, status badge
  - Proposal table with columns: Action badge, Target (name + slug), Before, After (inline-editable for `update`), Rationale, Approved checkbox
  - Inline-edit uses `InputText` / `Textarea`; merge rows (`action=delete`) show the mergeInto target's name and are not field-editable
  - Footer: `Apply Approved (N)` button + `Discard` button, both guarded by `ConfirmDialog`
  - After apply: result banner showing `updated`, `deleted`, `skipped[]` with links to affected records

- **`frontend/src/views/AdminCleanupTemplatesView.vue`**
  - Table of templates per entity type
  - Create/edit via `Dialog` with a large `Textarea` for `promptBody`

### New components

- `components/admin/CleanupProposalRow.vue` — row-level inline-edit state
- `components/admin/CleanupDiff.vue` — before/after field-by-field diff

### Pinia store

`frontend/src/stores/cleanup.ts` exposing:
- State: `jobs`, `activeJob`, `templates`
- Actions: `listJobs`, `getJob`, `runAnalysis`, `updateProposal`, `applyJob`, `discardJob`, template CRUD

### AdminView nav wiring

Add a new "Cleanup" button to the existing `.admin-nav` in `AdminView.vue` (same pattern as the existing Asset Processing / Tags buttons). Routes: `admin-cleanup`, `admin-cleanup-job`, `admin-cleanup-templates`.

## 11. Safety & Audit

- All routes require `RequireAdmin(disciplineID)` — existing middleware
- Destructive actions (Apply, Discard) confirmed via `ConfirmDialog` with counts
- Jobs are never hard-deleted by the system; `discarded` is the terminal state for rejection
- `rawLlmResponse` retained on every job for troubleshooting
- Structured slog on every apply for audit
- No direct Firestore writes from frontend — every change goes through the API

## 12. Error Handling

| Failure | Behavior |
|---------|----------|
| Gemini returns invalid JSON | Job persisted with `status=failed`, raw response stored, `error` set; admin sees it in the jobs list |
| Gemini returns unknown `id` | Action dropped silently during validation; note appended to `rawLlmResponse` audit |
| Gemini returns `mergeInto` cycle | Action dropped in validation |
| Token budget exceeded pre-flight | `413 Payload Too Large`, nothing written, clear admin error message |
| Stale record at apply time | Proposal skipped, recorded in `appliedResult.skipped[]`, apply continues for others |
| Firestore transaction limit (>500 writes) | Fall back to batched writes with `slog.Warn` |

## 13. Testing Plan

- **Unit** (Go):
  - `prompt.go` — golden file test for final prompt assembly
  - `parser.go` — valid JSON, malformed JSON, missing fields, extra fields
  - `validator.go` — table-driven: unknown IDs, cycles, self-merge, double-delete, missing mergeInto
  - `refs.go` — reference-rewrite functions with fake Firestore state (before/after tables)
- **Integration** (Firestore emulator):
  - Seed 3 duplicate categories with 2 children each, run a canned "Gemini response" through the executor, assert children reparented and duplicates gone
  - Technique merge scenario with curricula elements referencing the deleted technique
  - Concurrency: mutate a record between analysis and apply, assert it's skipped with reason
- **Frontend**:
  - Component test for `CleanupProposalRow` (approve toggle, inline edit)
  - Store action happy-path for `runAnalysis` → `updateProposal` → `applyJob`

## 14. Out of Scope for v1

- Asset cleanup (deferred — see decision table row 7)
- Mixing entity types in one job
- Token-budget chunking
- Cross-discipline cleanup jobs
- Bulk template import/export
- Custom LLM provider selection per job (uses whatever `llm.NewClient` is configured with)
