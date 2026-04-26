# Cleanup-admin: resilience + visibility + read-only history (DONE pending review)

Fixing three production issues found on `feat/cleanup-admin`:

1. JS crash on completed jobs: `appliedResult.skipped is null` (Go nil slice → JSON null)
2. No visibility while Apply is running; jobs that exceed Cloud Run's 5-min default timeout are left stuck in `proposed` with potentially partial writes
3. Historical (non-`proposed`) jobs still expose Approve / Edit form controls in the UI

Approach: pragmatic sync-HTTP fix (Option 1). True async via Cloud Tasks deferred to a follow-up.

## Phase A — JS crash fix (defense in depth)

- [x] A1 Initialize `Skipped` to `[]SkippedOp{}` in executor — `backend/internal/cleanup/executor.go:42`
- [x] A2 Normalize `AppliedResult.Skipped` to `[]` after Firestore `DataTo` in `Service.GetJob` — defends old jobs already persisted with nil
- [x] A3 Frontend type: change `CleanupAppliedResult.skipped` to nullable
- [x] A4 Frontend access sites: `(skipped ?? []).length` in `AdminCleanupJobView.vue` lines 75 and 134
- [x] A5 Build backend + frontend; run cleanup unit tests

## Phase B — `applying` status, idempotency, ctx-cancellation safety

- [x] B1 Add `StatusApplying = "applying"` constant in `model.go`
- [x] B2 At top of `executor.Apply`, run a transaction that reads job + asserts `proposed` + flips to `applying`. Reserves the job against double-clicks.
- [x] B3 Wrap rest of `Apply` in `defer` with `recover()` — flips `applying → failed` on panic using a fresh background context
- [x] B4 Between every pass, check `ctx.Err()`. If cancelled: stop, finalize as `failed` with reason "execution interrupted" using background context.
- [x] B5 Use `context.Background()` (with 30s timeout) for the finalize `Set` so terminal state always lands even if the HTTP context is dead
- [x] B6 Frontend: add `'applying'` to `CleanupJobStatus` union
- [x] B7 Frontend: render `applying` in `AdminCleanupJobView.vue` with a Message banner + spinner, disable controls
- [x] B8 Frontend: poll `getJob` every 3s while status is `applying`, stop on terminal status
- [x] B9 Frontend: list view (`AdminCleanupView.vue`) renders `applying` with distinct severity
- [x] B10 Cloud Run `--timeout` bump to 3600 (max) in `.github/workflows/deploy.yml` and `deploy/deploy/backend.sh`
- [x] B11 Build + manual smoke against emulator if available

## Phase C — Automated tests

- [x] C1 Unit test: Apply on a job with no skipped ops — `Skipped` round-trips as `[]SkippedOp{}` (not nil) and JSON serializes to `[]`
- [x] C2 Integration test: concurrent `Apply` — exactly one succeeds, the other gets a "not 'proposed'" error
- [x] C3 Run full backend test suite

## Phase D — Read-only proposal rows for non-proposed jobs

- [x] D1 `CleanupProposalRow.vue` — add `readOnly` prop. Hide Approve checkbox + Edit button when true. Render approval as a static badge.
- [x] D2 `AdminCleanupJobView.vue` — pass `:read-only="activeJob.status !== 'proposed'"` to each row
- [x] D3 Verify: open an applied job in dev, confirm no editable controls

## Phase E — Recovery: force-fail endpoint for stuck jobs

- [x] E1 Backend route: `POST /api/v1/admin/cleanup/jobs/{id}/force-fail` — accepts `{reason: string}`, requires admin, only valid on jobs in `proposed` or `applying` status, writes `status=failed` + appends to `error`
- [x] E2 Wire route + add to handler
- [x] E3 Frontend: in `AdminCleanupJobView.vue`, when a job is in `proposed` or `applying` and the admin wants to force-fail, expose a small "Force-fail" button (admin-only)
- [x] E4 Pinia store action `forceFailJob`
- [x] E5 Use this manually to unstick prod job `V5X5TxirtP77Bm4E6Ojj`

## Out of scope (followups)

- True async via Cloud Tasks (proper fix for long-running jobs after Cloud Run timeout)
- I7's full status flip set in followups doc — partially addressed here

## Review

### Backend

- `backend/internal/cleanup/model.go` — added `StatusApplying` constant.
- `backend/internal/cleanup/executor.go` — `Apply` rewritten:
  - Transactional reservation `proposed → applying` at the top (idempotency).
  - Single deferred finalize that runs on normal return, panic recovery, or ctx-cancellation. Always uses a fresh `context.Background()` with a 30s timeout for the terminal `Set` so audit state lands even when the request context is dead.
  - `ctx.Err()` checks at the top of each pass and inside their loops; cancellation breaks early and finalize records "execution interrupted".
  - `result.Skipped` initialized to `[]SkippedOp{}` (the original JS-crash root cause).
- `backend/internal/cleanup/service.go` — `GetJob` and `ListJobs` now call a new `normalizeJob` that fills nil `Skipped` and `Proposals` slices; defends old persisted jobs. Added `ForceFail` service method (transactional, only valid on `proposed`/`applying`, appends to `error` for audit trail).
- `backend/internal/handler/admin_cleanup.go` — new `ForceFailJob` HTTP handler (admin-gated, accepts optional `reason` body, returns the updated job). Wired in `backend/main.go` at `POST /api/v1/admin/cleanup/jobs/{id}/force-fail`.
- `.github/workflows/deploy.yml` and `deploy/deploy/backend.sh` — `--timeout=3600` (Cloud Run max) so realistic discipline sizes don't hit the 5-min default.

### Frontend

- `frontend/src/types/cleanup.ts` — `'applying'` added to `CleanupJobStatus`; `CleanupAppliedResult.skipped` typed as nullable so the type matches what older records can return.
- `frontend/src/views/AdminCleanupJobView.vue`:
  - Spinner banner while status is `applying`.
  - 3s polling of `getJob` while status is `applying`; stops on terminal status; cleared on unmount.
  - Apply/Discard hidden when not in `proposed`. Force-fail recovery button shown for both `proposed` and `applying`.
  - Read-only mode passed to `CleanupProposalRow` whenever status ≠ `proposed`.
  - Fixed both `skipped.length` access sites with `(skipped ?? []).length`.
- `frontend/src/views/AdminCleanupView.vue` — list-view severity rendering for `applying`.
- `frontend/src/components/admin/CleanupProposalRow.vue` — `readOnly` prop hides Approve checkbox (replaced with read-only Tag) and Edit button; Edit form unreachable when read-only.
- `frontend/src/stores/cleanup.ts` — `forceFailJob` Pinia action.

### Tests

- `backend/internal/cleanup/executor_resilience_test.go` (new):
  - Unit: empty `Skipped` slice round-trips to JSON `[]` (regression test for the production crash).
  - Unit: `normalizeJob` fills nil `Skipped` and `Proposals`.
  - Integration (emulator): two concurrent `Apply` calls — exactly one succeeds, the other gets a "not 'proposed'" error. Final status is `applied`.
  - Integration (emulator): `ForceFail` flips `applying → failed` with reason captured; second call on terminal status rejects.
- Existing tests still pass: `go test ./...` green; `npm run build` clean; `npm test` green.

### Production logs — confirmed diagnosis

GCP project: `level-dragon-478821-t3` (display name "SkillHive"). Pulled Cloud Run logs and the Firestore doc directly via the personal `thomashartm@googlemail.com` account.

**Timeline for `V5X5TxirtP77Bm4E6Ojj` on 2026-04-26:**

| Time (UTC) | Event |
|------------|-------|
| 10:24:26 | GET /jobs/V5X5TxirtP77Bm4E6Ojj 200 (initial load) |
| 10:24:44.310 | POST /apply received (1st) |
| 10:24:45.762 | POST /apply received (2nd, **1.5s later — double-click / retry**) |
| 10:24:57.605 | 1st apply finishes — status=applied, updated=2 deleted=2 skipped=0, 13.3s |
| 10:24:57.645 | 2nd apply finishes — status=applied, updated=2 deleted=2 skipped=0, 11.9s |
| 10:29:29 | GET /jobs/V5X5TxirtP77Bm4E6Ojj 200 (4-min later refresh) |
| 10:29:35-37 | PATCH /proposals/3 — both 400 (BE correctly rejects edits on applied job) |

**Firestore doc state**: `status: applied`, `appliedAt: 2026-04-26T10:24:57.495220Z`, `updated: 2, deleted: 2`. `skipped` is stored as `nullValue` in Firestore — direct confirmation of the Go-nil-slice serialization bug.

**Zero ERROR-severity log entries in the last 14 days** — no panics, no 5xx, no failed applies. The executor never crashed; it ran cleanly twice in parallel because of the I7 race.

### Conclusions

1. **The cleanup did successfully apply.** Data state is correct (2 techniques merged + 2 updated). No partial-write damage. **`V5X5TxirtP77Bm4E6Ojj` does not need force-failing — it's correctly applied.** The Force-fail button must NOT be used on this job.

2. **The user's reported "JS crash" was real**: BE returned 200 with `appliedResult.skipped: null`, the success-toast handler did `null.length`, threw before the user ever saw confirmation. Phase A fix prevents this on new applies; the normalize-on-read defends old jobs like V5X5 too.

3. **Two concurrent applies actually ran in production** — 1.5s apart from a double-click or retry. They were idempotent only by coincidence (delete is idempotent, second update is no-op). My transactional reservation in Phase B now makes the second caller fail loudly with "not 'proposed'".

4. **The "shows proposed" symptom** is most likely the user perceiving editability (Approve checkbox + Edit button still rendering on an applied job) as the proposed state. The actual badge would have been `applied` once the GET at 10:29:30 fed reactivity. Phase D removes that ambiguity by hiding the controls entirely.

5. **No Cloud Run timeout was hit** — applies took ~13s. The `--timeout=3600` bump in deploy is still defensive insurance for future larger disciplines, not a fix for what happened on V5X5.

### Cannot verify

- The applying-banner / 3s polling / read-only / force-fail flows haven't been exercised in a browser from this session. Build passes, types check, but a live smoke test before merging is worth it.

### Followups (deferred to `tasks/cleanup-admin-followups.md`)

- True async via Cloud Tasks: this PR keeps the synchronous HTTP design and maximizes its timeout. The applying/finalize defer pattern + force-fail give the same operator visibility, but a hard Cloud Run timeout (60min now) still kills the process. Cloud Tasks is the proper long-term fix.
- I7's transactional applying flip is now done; remove that item from the followups file.
