# Cleanup Admin — Follow-up Items

> Pick up these items in any future Claude Code session. Each item is self-contained: what it is, where the code lives, why it matters, how to fix, how to verify.

## Context for whoever picks this up

A new admin feature was built on branch `feat/cleanup-admin`: AI-driven deduplication and restructuring for the SkillHive category and technique taxonomies. Gemini proposes update/merge actions, the admin reviews them, then the executor applies the approved ones with full reference-rewrite cascade.

- **Design spec:** `docs/superpowers/specs/2026-04-24-ai-cleanup-admin-design.md`
- **Implementation plan:** `docs/superpowers/plans/2026-04-24-ai-cleanup-admin.md`
- **Branch:** `feat/cleanup-admin` (22 commits beyond `main`)
- **Code review report:** captured in the conversation that produced this branch — the items below are the ones the user opted to defer

The 5 critical and 1 important issue surfaced during review have already been fixed (commits `c1b7185` through `a0fa29c`). What's left is the long tail: 6 important issues, 9 minor items, 2 spec-coverage gaps in tests, and 1 manual smoke test.

Backend Go module: `github.com/thomas/skillhive-api`. All cleanup code is in `backend/internal/cleanup/` and `backend/internal/handler/admin_cleanup.go`. Frontend types/store/views are in `frontend/src/types/cleanup.ts`, `frontend/src/stores/cleanup.ts`, and `frontend/src/{views,components/admin}/`.

Run backend tests with `cd backend && go test ./internal/cleanup/...`. The integration test skips unless `FIRESTORE_EMULATOR_HOST=localhost:8181` is set. Run frontend with `cd frontend && npm run build` (typecheck + bundle) or `npm run test:run`.

---

## Important — known runtime bugs, fix before heavy use

### [ ] I1 — Replace string-compare iterator-end check with `errors.Is`

**Where:** `backend/internal/cleanup/service.go:139`
```go
if err.Error() == "no more items in iterator" {
    break
}
```

**Why this is wrong:** Brittle and inconsistent. The rest of the codebase (including `fetcher.go` and `templates.go` in this very package) uses `errors.Is(err, iterator.Done)`. If the underlying SDK changes the error message, this `ListJobs` loop will silently iterate forever or panic.

**Fix:**
1. Add `"google.golang.org/api/iterator"` to imports if not already present.
2. Replace the conditional with `if errors.Is(err, iterator.Done) { break }`.
3. Move the `if err != nil` check that follows so it doesn't trigger on `iterator.Done`. Pattern to copy from `fetcher.go:54`:
   ```go
   doc, err := iter.Next()
   if err == iterator.Done {
       break
   }
   if err != nil {
       return nil, fmt.Errorf("list jobs: %w", err)
   }
   ```

**Verify:** `go test ./internal/cleanup/...` still passes. Manual: `ListJobs` with no jobs returns empty slice without spinning.

---

### [ ] I2 — `UpdateProposal` writes admin edits without re-validating

**Where:** `backend/internal/cleanup/service.go:158-188` (`Service.UpdateProposal`)

**Why this is wrong:** When the admin uses the "Edit after" button on a proposal row in `AdminCleanupJobView`, the frontend posts the new `after` payload to `PATCH /admin/cleanup/jobs/{id}/proposals/{index}`. The handler calls `Service.UpdateProposal`, which writes the new `after` straight to Firestore inside a transaction. Nothing checks slug format, whether the name is empty, whether `parentId` would create a cycle, or whether `categoryIds` references deleted records. So an admin can save an `after` with `slug = "I am invalid!"` and the executor will then write it.

**Fix:** Inside the `RunTransaction` in `UpdateProposal`, after the bounds check and before the proposal mutation, run a subset of `validateUpdate`:

```go
if after != nil && p.Action == ActionUpdate {
    // Build the deletes set from current proposals so the cross-check is
    // accurate against the current state of the job.
    deletes := map[string]bool{}
    for _, q := range j.Proposals {
        if q.Action == ActionDelete {
            deletes[q.TargetID] = true
        }
    }
    // byID is harder to reconstruct here (we don't keep input snapshots
    // beyond the proposal.before for each action). Pass an empty map or a
    // map of {targetId -> &before} so cycle checks work for ids in the job.
    byID := map[string]*RecordSnapshot{}
    for i := range j.Proposals {
        byID[j.Proposals[i].TargetID] = &j.Proposals[i].Before
    }
    validated, err := validateUpdate(EntityType(j.EntityType), p.Before, *after, byID, deletes)
    if err != nil {
        return fmt.Errorf("admin edit invalid: %w", err)
    }
    p.After = &validated
}
```

(Note: the cycle check inside `validateUpdate` only walks `byID`, so it's best-effort here — that's fine; Pass 3's live cycle re-check is still the authoritative line of defense.)

**Verify:**
1. Add a unit test in `service_test.go` (file does not yet exist; create it). Test that `UpdateProposal` with an invalid slug returns an error. You'll need to seed a job in the emulator first — model the test on `executor_integration_test.go`.
2. Manual: in the UI, edit a proposal's slug to `"BAD slug"` and confirm the API returns 400.

---

### [ ] I4 — Curriculum element snapshots become stale after technique merge

**Where:** `backend/internal/cleanup/executor.go:226-254` (`rewriteElementTechniqueID`)

**Why this is wrong:** The `CurriculumElement` model (`backend/internal/model/curriculum.go:42-53`) embeds a `Snapshot` containing `name`, `thumbnailUrl`, `url`, `description`, and `tagIds`. When a technique X is merged into Y, we rewrite `element.techniqueId` from X to Y, but the embedded snapshot still shows X's name/thumbnail/etc. In the curriculum UI, students will see element rows pointing at technique Y but labeled with X's old metadata.

**Two options for the fix:**

**Option A (recommended): re-snapshot affected elements during the merge.**
1. Inside `rewriteElementTechniqueID`, after locating each matching element, fetch the merge target technique once at the top of the function (single `Get` outside the loop).
2. For each rewritten element, also overwrite `snapshot.name`, `snapshot.thumbnailUrl`, `snapshot.url`, `snapshot.description`, `snapshot.tagIds` from the target. Skip fields not present on the target (e.g., a category merge wouldn't touch elements at all — this only applies in the technique branch).

**Option B: document the known stale-snapshot behavior.** Add a note to the spec and a `slog.Warn` per affected element. This is cheaper but the UX is wrong — students see misleading metadata.

**Recommendation:** Option A. Use the existing pattern in `backend/internal/handler/curriculum_elements.go` for how snapshots are populated when an element is created (search for `Snapshot{` in that file).

**Verify:**
1. Extend `executor_integration_test.go` with a `TestIntegration_MergeTechniqueRefreshesElementSnapshots` test: seed two techniques with different names, seed a curriculum + element pointing at technique X with a snapshot of X's name, merge X into Y, assert the element's `snapshot.name` is now Y's name.
2. Manual: in the UI, set up a curriculum with a technique element, run a cleanup that merges that technique into another, reload the curriculum view — element label should show the merged target's name.

---

### [ ] I5 — `Filter.TagSlug` is dead code

**Where:**
- Backend: `backend/internal/cleanup/model.go:54` defines the field
- Frontend: `frontend/src/types/cleanup.ts:25` defines `tagSlug?: string`
- The `LoadRecords` function in `backend/internal/cleanup/fetcher.go` does not read it

**Why this is wrong:** Callers can set `filter.tagSlug = "some-slug"` and it gets stored on the job (in `filter` payload) but is silently ignored at fetch time. Confusing for whoever picks up the spec next.

**Two options:**

**Option A: implement tag filtering for techniques.**
- Tags are referenced via `Technique.TagIDs []string` (see `backend/internal/model/technique.go:13`).
- `tagSlug` is the slug, not the id; we'd need to first resolve `slug → tag.id` via a `tags` collection lookup, then add `query = query.Where("tagIds", "array-contains", tagID)`.
- Note that categories don't have tags, so `tagSlug` is only meaningful for techniques. Document this in the spec.

**Option B: remove the field.** Simpler. Drop `TagSlug` from `Filter` in both Go and TS, plus from the `NewCleanupJobDialog` UI if it's exposed there (it isn't currently).

**Recommendation:** B for now. The use case is narrow ("dedupe just the takedowns") and the search-by-name input already provides similar coverage. Revisit if a real user asks.

**Verify:** `go build ./...` and `npm run build` clean. Grep confirms no remaining references.

---

### [ ] I6 — `mergeInto` target's `UpdatedAt` is not concurrency-checked

**Where:** `backend/internal/cleanup/executor.go:64-69`

```go
if _, ok := fresh[p.MergeInto]; !ok {
    if cur, err := e.currentSnapshot(ctx, job.EntityType, p.MergeInto); err != nil || cur == nil {
        result.Skipped = append(result.Skipped, SkippedOp{...})
        continue
    }
}
```

**Why this is wrong:** Pass 1 ensures every record being deleted or updated still matches the proposal's `before.UpdatedAt`. But for each delete proposal's `mergeInto` target, we only check that it *exists*, not that it hasn't been edited since the admin reviewed the job. Concrete case: admin reviews a job where dup1 will merge into keeper. Between review and Apply, another admin renames keeper or restructures its `categoryIds`. The original admin's intent was to merge dup1 into the keeper they reviewed. They get the merge against a different keeper than expected.

**Fix:** In Pass 1, also compute a snapshot for every proposal's `mergeInto` target and compare its `UpdatedAt` against the snapshot stored on the *delete proposal's* `before` — but wait: the proposal's `before` is the source's snapshot, not the target's. We'd need to also snapshot the merge target at analysis time.

The cleanest path:
1. Extend `Proposal` (in `backend/internal/cleanup/model.go`) with an optional `MergeIntoBefore *RecordSnapshot` populated for delete actions.
2. Update `Validate` in `validator.go` to populate it from the input record set when building delete proposals.
3. In Pass 1, look up the target's current snapshot and compare its `UpdatedAt` against `MergeIntoBefore.UpdatedAt` if present. Stale → skip with a clear reason.

**Verify:**
1. Add `TestIntegration_StaleMergeTargetIsSkipped` to `executor_integration_test.go`. Seed dup + keeper, build a job with a `MergeIntoBefore` snapshot whose `UpdatedAt` is older than the live keeper. Apply. Assert the proposal is skipped with reason "stale: mergeInto target changed since analysis".
2. Existing `executor_integration_test.go` should still pass.

---

### [x] I7 — `Apply` is not idempotent against concurrent double-clicks (DONE in resilience PR)

**Where:** `backend/internal/cleanup/executor.go:24-29` and 89-97 (`Apply`)

**Why this is wrong:** `Apply` reads the job, checks `status == proposed`, runs Passes 1-3, then writes the entire job back via `Set`. Two concurrent `POST /apply` requests (admin double-clicks the button, network retries, two browser tabs) both pass the `status == proposed` check before either writes back. Both runs do the work; whichever finalizes second overwrites the first's `appliedResult`. Pass 1's stale check catches most of the second run's *writes* (because the first run advanced `updatedAt` on every touched record), but the audit trail is still corrupted.

**Fix:** Wrap the status flip in a transaction at the very start.

```go
// Replace the existing read-then-check at the top of Apply with:
err := e.fs.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
    snap, err := tx.Get(jobRef)
    if err != nil { return err }
    if err := snap.DataTo(&job); err != nil { return err }
    if job.Status != StatusProposed {
        return fmt.Errorf("job status %q is not 'proposed'", job.Status)
    }
    // Reserve the job by flipping to a transient state.
    return tx.Update(jobRef, []firestore.Update{
        {Path: "status", Value: "applying"},
    })
})
if err != nil { return nil, err }
```

Then continue with Passes 1-4 as before. `StatusApplying` should be added to `model.go` constants. The frontend should treat it as a busy state (no buttons enabled).

**Note:** This adds a new status value. Update the `JobStatus` TS union in `frontend/src/types/cleanup.ts`. Update `statusSeverity` in `AdminCleanupView.vue` and `AdminCleanupJobView.vue` to render it (use `'info'` or `'secondary'`).

**Verify:**
1. Add `TestIntegration_ApplyConcurrentRejectsSecond`: dispatch two goroutines calling `executor.Apply` on the same job, assert exactly one succeeds and the other returns `job status "applying" is not 'proposed'` (or similar).
2. Manual: open two browser tabs on the same job, click Apply in both — second one should error out.

---

## Important — test gaps from spec section 13

Three integration scenarios were specified. One is implemented (`TestIntegration_MergeCategoryWithChildrenAndReferences` in `executor_integration_test.go`). Two are still missing.

### [ ] T1 — Integration test: technique merge with curriculum elements

**Where:** add to `backend/internal/cleanup/executor_integration_test.go`

**Spec reference:** spec §13 — "Technique merge scenario with curricula elements referencing the deleted technique"

**Why this matters:** The `rewriteElementTechniqueID` path uses a `CollectionGroup`-style query (actually iterates curricula, then their `elements` subcollection) and is the most complex Firestore code in the executor. No automated test currently exercises it.

**Fix:** Write `TestIntegration_MergeTechniqueWithCurriculumElements`:
1. Seed two techniques (`tech_keep`, `tech_dup`) and one curriculum.
2. Seed two curriculum elements under that curriculum: one with `techniqueId = tech_dup`, one with `techniqueId = tech_keep` (the latter is a control — should be untouched).
3. Build a `Job` with one approved delete proposal: `tech_dup → tech_keep`.
4. Apply.
5. Assert: `tech_dup` is deleted, the first element now has `techniqueId = tech_keep`, and the second element is unchanged.

Use `executor_integration_test.go`'s existing `newEmulatorClient` + `uniqueSuffix` helpers. Curriculum elements live at `curricula/{curriculumId}/elements/{elementId}`.

**Verify:** Test passes against running emulator: `FIRESTORE_EMULATOR_HOST=localhost:8181 GCLOUD_PROJECT=skillhive-test go test ./internal/cleanup/ -run Integration -v`

---

### [ ] T2 — Integration test: stale-record concurrency skip

**Where:** add to `backend/internal/cleanup/executor_integration_test.go`

**Spec reference:** spec §13 — "Concurrency: mutate a record between analysis and apply, assert it's skipped with reason"

**Fix:** Write `TestIntegration_StaleRecordIsSkipped`:
1. Seed two categories: `keeper`, `dup`.
2. Build a `Job` with one delete proposal: `dup → keeper`. Set `proposal.before.updatedAt` to a fixed past timestamp like `time.Unix(1000, 0)`.
3. Update the live `dup` document's `updatedAt` to `time.Now()` directly via `fs.Collection("categories").Doc(dup).Update(ctx, ...)` to simulate a mid-flight edit.
4. Apply.
5. Assert: `dup` is NOT deleted, `appliedResult.Skipped` contains an entry with `Reason` matching `/stale: record changed since analysis/`, `Status` is `StatusApplied` (stale skips are not real errors per C5).

**Verify:** Same as T1.

---

## Minor — quality & polish

### [ ] M1 — Trim whitespace before checking empty name in validator

**Where:** `backend/internal/cleanup/validator.go:120`

```go
if after.Name == "" {
    return ProposedFields{}, fmt.Errorf("name empty")
}
```

A name of `"   "` passes. Change to `if strings.TrimSpace(after.Name) == ""`. Add `"strings"` to imports if not already present.

Add a test case to `validator_test.go`:
```go
func TestValidate_RejectsWhitespaceOnlyName(t *testing.T) {
    input := []RecordSnapshot{{ID: "a", UpdatedAt: time.Unix(0, 0)}}
    actions := []LLMAction{
        {Action: ActionUpdate, ID: "a", After: &ProposedFields{Name: "   ", Slug: "a", Description: "d"}, Rationale: "r"},
    }
    proposals, _ := Validate(EntityCategory, input, actions)
    if len(proposals) != 0 {
        t.Errorf("whitespace-only name must be rejected")
    }
}
```

---

### [ ] M2 — Validator should drop unknown ids in `after.parentId` / `after.categoryIds`

**Where:** `backend/internal/cleanup/validator.go` `validateUpdate` function

**Why:** The cycle-check helper conservatively returns nil when a parent id isn't in the input set. That's necessary (parent might be in a different filter scope), but it means Gemini can hallucinate any string as a parent id and we'll write garbage to Firestore in Pass 3.

**Fix:** Either (a) require the validator caller to pass a "known existing ids in the discipline" set (more invasive — needs `Service` to fetch all category ids first), or (b) accept the current best-effort behavior and instead defend at apply time: in `applyUpdate`, before writing `parentId` (or each entry of `categoryIds`), do a `fs.Collection(...).Doc(id).Get(ctx)` existence check and skip the field if missing. (b) is simpler.

**Recommendation:** (b). Extend `applyUpdate` in `executor.go` with a per-id existence check. If the proposed parent doesn't exist, return a "skip update" error so the proposal lands in `Skipped` and the job reflects that the change couldn't apply.

**Verify:** Add a unit test that constructs an `LLMAction` with `parentId = "nonexistent"`, runs Validate (which currently passes it through), then runs `applyUpdate` against the emulator and asserts the proposal is skipped.

---

### [ ] M3 — `lookupDiscipline` re-fetches a doc the executor already has

**Where:** `backend/internal/cleanup/executor.go:199` (`lookupDiscipline`), called from `applyMerge:166`

**Why:** Pass 1 already loaded each record into the `fresh` map. `applyMerge` then re-fetches the source record solely to read its `disciplineId`. One extra Firestore read per merge.

**Fix:** Add `DisciplineID string` to `RecordSnapshot` (model.go), populate it in `currentSnapshot`, then have `applyMerge` accept a `RecordSnapshot` instead of just an id. Drop `lookupDiscipline`.

Trivial perf win, but worth doing while you're in there for any of the bigger fixes.

---

### [ ] M4 — Bound `rawLlmResponse` size before persisting

**Where:** `backend/internal/cleanup/service.go:69` and `:86`

**Why:** Firestore documents have a 1MB limit. A category-heavy discipline with verbose Gemini output could push a single job document close to that. The `rawLlmResponse` is for audit; it doesn't need to be unbounded.

**Fix:** Truncate to e.g. 256KB before persist.

```go
const maxRawResponseBytes = 256 * 1024
if len(job.RawLLMResponse) > maxRawResponseBytes {
    job.RawLLMResponse = job.RawLLMResponse[:maxRawResponseBytes] + "\n...(truncated)"
}
```

Apply at the top of `Service.persist` so all paths (success + failed) get the truncation.

---

### [ ] M5 — Make `parser.stripFences` more permissive

**Where:** `backend/internal/cleanup/parser.go:26`

**Why:** Current implementation strips fences only if the response *starts* with backticks AND ends with them. Real Gemini output with `responseMimeType: application/json` configured shouldn't include fences at all, but if a future model deviates with leading prose, we'll fail.

**Fix:** Use a regex to extract the first valid JSON object: `regexp.MustCompile(`\{[\s\S]*\}`).FindString(s)`. Greedy match, finds the outermost JSON object.

Add tests for: (a) leading prose + JSON, (b) trailing prose, (c) markdown fences, (d) plain JSON. The existing `TestParseResponse_StripsMarkdownFence` should keep passing.

---

### [ ] M6 — Reset `NewCleanupJobDialog` filter inputs between opens

**Where:** `frontend/src/components/admin/NewCleanupJobDialog.vue` (top of `<script setup>`)

**Why:** `parentId`, `categoryId`, `search` are top-level `ref`s that never reset. Open the dialog, type "guard", close, reopen — "guard" is still there. UX papercut.

**Fix:** Add to the existing `watch` that loads templates:

```ts
watch(() => [props.visible, props.entityType], ([v]) => {
  if (v) {
    loadTemplates()
    parentId.value = ''
    categoryId.value = ''
    search.value = ''
  }
})
```

---

### [x] M7 — Normalize `ListJobs` empty-proposals to `[]` on the wire (DONE in resilience PR)

**Where:** `backend/internal/cleanup/service.go:150`

```go
j.Proposals = nil // Trim proposals in list view to avoid bloated payloads.
```

**Why:** Go's `json.Marshal` for a nil slice produces `null`, not `[]`. The TS type `CleanupJob.proposals` is `CleanupProposal[]` (required, not optional) — frontend code dereferencing `job.proposals.filter(...)` would explode if it landed in the list view (it doesn't currently, but the type lies).

**Fix:** Either:
- Backend: change `j.Proposals = nil` to `j.Proposals = []Proposal{}` (so JSON serializes as `[]`).
- Frontend: change the type to `proposals?: CleanupProposal[]` and add nullish-coalescing where dereferenced.

Pick one. Backend fix is more defensive.

---

### [ ] M8 — `llmRequired` shouldn't gate read-only routes

**Where:** `backend/internal/handler/admin_cleanup.go:38`, called from `:188` (`ListJobs`), `:214` (`GetJob`), and others

**Why:** If the deployment ever loses its `GEMINI_API_KEY`, admins can no longer view *historical* cleanup jobs. Reading and discarding don't need the LLM client.

**Fix:** Remove `llmRequired` calls from `ListJobs`, `GetJob`, `PatchProposal`, `DiscardJob`. Keep it on `CreateJob` (needs LLM to generate proposals) and `ApplyJob` (executor doesn't strictly need LLM, but `h.executor` is constructed regardless — actually `Apply` only needs Firestore, so this can be removed from `ApplyJob` too).

Audit each handler: only `CreateJob` actually invokes `h.service.RunAnalysis` which uses the LLM client.

---

### [ ] M9 — Replace comma-string `categoryIds` editor with MultiSelect

**Where:** `frontend/src/components/admin/CleanupProposalRow.vue:84-92`

**Why:** Currently the inline edit for technique `categoryIds` is a single comma-separated `InputText`. Admin can typo a category id and the executor will write it. UX is poor.

**Fix:** Replace with PrimeVue `MultiSelect` populated from the discipline's categories.

```vue
<MultiSelect v-model="draft.categoryIds" :options="categoryOptions"
             option-label="name" option-value="id" filter
             class="w-full" />
```

You'll need to fetch the discipline's categories. Either:
- Pass them as a prop from `AdminCleanupJobView.vue` (which uses the `useCategoriesStore`) — preferred, keeps the row component dumb.
- Fetch them inside the row via `useCategoriesStore` — more self-contained but does N fetches.

Use the existing `useCategoriesStore` from `frontend/src/stores/categories.ts`.

---

## Manual verification — Task 17 from the implementation plan

### [ ] E2E smoke test against running emulators + frontend

**Why:** No subagent can run this — it requires a live `GEMINI_API_KEY` and a human watching the UI. Spec §13 calls for it, plan Task 17 documents it, and the v1 release shouldn't ship without it.

**Setup:**
```bash
# Terminal A — Firebase emulators (Firestore on :8181 per project memory, Auth on :9099)
cd /Users/thomas/projects/skillhive
npx firebase-tools emulators:start

# Terminal B — backend
cd /Users/thomas/projects/skillhive/backend
FIRESTORE_EMULATOR_HOST=localhost:8181 \
  GCLOUD_PROJECT=skillhive \
  GEMINI_API_KEY=<real key> \
  GEMINI_MODEL=gemini-2.0-flash \
  go run .

# Terminal C — frontend
cd /Users/thomas/projects/skillhive/frontend
npm run dev
```

**Steps:**
1. Log in as a discipline admin in the UI at `http://localhost:5173`.
2. On the Categories page, manually create three near-duplicate categories: e.g., "Closed Guard" (slug `closed-guard`), "closed-guard" (slug `closed-guard-2`), "Closed-Guard" (slug `closed-guard-3`).
3. Navigate to `/admin/cleanup`.
4. Click "Manage templates" and create a template named "Dedupe duplicates" (entity type: Categories) with a body like:
   > You are cleaning up a taxonomy of BJJ categories. Identify records that are duplicates of each other (same concept, different spelling or casing). For each group, keep the one with the best name and description, emit `delete` actions with `mergeInto` pointing at the keeper, and emit `update` actions on the keeper only if its description needs improvement.
5. Back on `/admin/cleanup`, click "New analysis", pick Categories + the template, leave filters empty, click Run.
6. Expected: job view opens with at least 2 proposals (typically 1 update on the survivor + 2 merges).
7. Reject any proposal that looks wrong (uncheck Approve), click "Apply approved (N)", confirm the dialog.
8. Verify the toast shows updated/deleted counts and `skipped: 0`.
9. Refresh the categories page → only the surviving "Closed Guard" should remain.
10. Refresh the job page → `status: applied`, success banner shows correct counts.
11. Bonus: also seed a technique whose `categoryIds` contained one of the duplicates. After apply, that technique's `categoryIds` should reference only the survivor.

**If anything fails:** capture the failure — screenshot, console logs, network tab — and open a new task here describing what broke.

---

## How to work this list

- Items are roughly ordered by priority: I1–I7 are bugs that will surface in real use; T1–T2 are spec-mandated tests; M1–M9 are polish; E2E is the final gate before declaring v1 done.
- Each item is independent; pick whichever is hot. If two items touch the same file (e.g., M3 + I6 both modify `executor.go`), do them in one PR.
- The branch is `feat/cleanup-admin`. Continue committing there until merged, then start follow-up work on a fresh branch off `main`.
- Commit message convention used so far: `fix(cleanup): ...` for bug fixes, `test(cleanup): ...` for test-only commits, `feat(cleanup): ...` for new code. Keep it consistent.
- After a fix lands, check it off in this file with `[x]` and add a one-line note pointing at the commit SHA so future readers can find the work.

## What's already done (don't redo)

Critical fixes from the same review pass that produced this list:
- C1 — Firestore composite indexes (`c1b7185`)
- C2 — Validator cross-checks `after` fields against deletes (`3a5a96f`)
- C3 + I3 — Pass 3 cycle re-check + skip-unchanged-parentId in executor (`29bbf28`)
- C4 — `BulkWriter` → `WriteBatch.Commit` (`72a3c6f`)
- C5 — Real merge/update errors flip job to `StatusFailed` (`ac257d4`)
- I8 — `TestIntegration_MergeCategoryWithChildrenAndReferences` (`a0fa29c`)

The integration test runs green against a live emulator on `localhost:8181`.
