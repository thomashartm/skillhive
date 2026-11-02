# Technique Flows Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Author and view multiple conditional, looping flow diagrams for each technique.

**Architecture:** Store revisioned diagram graphs within the owning technique; expose dedicated GET/PUT endpoints. A Vue Flow canvas and PrimeVue details panel reuse assets and Markdown rendering.

**Tech Stack:** Go, Firestore, Vue 3, TypeScript, PrimeVue, Vue Flow, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-02-technique-flows-design.md`

## Global Constraints

- Preserve unrelated untracked Cloud SQL documents and existing technique contracts.
- Conditions are human-readable instructions; cycles and self-loops are valid.
- Respect the owning technique's discipline for editing and media links.
- Explicit saves, revision conflicts, and navigation protection prevent silent data loss.
- Use the limits in the spec; no new dependency except Vue Flow.

## Review Focus

- Stale saves and late responses must not overwrite a different technique or newer draft.
- Empty arrays after Firestore decoding must still render correctly.
- Deleted/inactive media must not break unrelated edits or expose hidden media.
- Keyboard editing and self-loops must work without relying solely on dragging.
- Technique deletion, direct Firestore writes, and automated merges must respect flow data.

### Task 1: Persistence and validation

Files: new `backend/internal/model/technique_flow.go`, `backend/internal/handler/technique_flows.go` and tests; modify `backend/main.go`, Firestore index/rule files, and technique merge safeguards.

Interface: GET/PUT `/api/v1/techniques/{id}/flows` with `{revision,diagrams}`. Diagram `{id,name,nodes,edges}`; node `{id,type,name,label,description,assetId,position:{x,y}}`; edge `{id,source,target,condition}`.

- [x] Write failing graph-validation and emulator lifecycle tests, including cycles, missing endpoints, permissions, media, revision conflicts, deletion, and unrelated updates.
- [x] Implement atomic storage and validate new media references; add route and index/rule changes.
- [x] Protect automated merges from losing source diagrams and cover the guard.
- [x] Run `go test ./...` against an isolated Firestore emulator; expect all tests to pass.

### Task 2: Authoring and viewing

Files: new `frontend/src/types/flows.ts`, `frontend/src/components/flows/*`, `frontend/src/components/common/MarkdownEditor.vue`, associated tests; integrate in `TechniqueDetailView.vue`.

Interface: `TechniqueFlows` receives techniqueId and disciplineId; `FlowCanvas` receives diagram and editable and emits edits/selection. MarkdownEditor uses a string v-model.

- [x] Write failing component tests for formatting/preview, conditional transitions, save failures, and viewer permissions.
- [x] Implement diagram CRUD, draggable graph, step details, media selector, conditional edge editing, and unsaved-change protection.
- [x] Verify `npm run test:run` and `npm run build`.

### Task 3: Review and acceptance

- [x] Exercise create/edit/save/reload, loopback rendering, media links, and read-only mode in a browser.
- [x] Run Aikido scan and review the complete diff; fix findings and rerun affected checks.
- [x] Record validation and any remaining limitations. Leave publication/deployment for a separate request.

## Validation — 2026-11-02

- `FIRESTORE_EMULATOR_HOST=127.0.0.1:8285 go test ./...`: passed, including flow lifecycle/concurrency and cleanup preservation integration tests.
- `npm run test:run`: 78 tests passed across 8 files.
- `npm run build`: passed (TypeScript and Vite).
- Real Chromium against local Firebase Auth/Firestore and the Go API: multiple diagrams; step names/labels/Markdown preview; video/image linking; conditional loops and self-loops; mouse movement and handle-to-handle connections; keyboard movement; save/reload; viewer mode; mobile layout all passed. Scratch script and screenshots: `/tmp/skillhive-flow-check/`.
- Firestore rules compiled in the emulator; ordinary owner text updates succeeded, direct client flow creation/update returned 403.
- Independent review found the missing system-ownership transfer on flow edits. Fixed transactionally and verified with a regression test; follow-up review found no blockers.
- Browser testing found that mirroring every drag frame into projected nodes prevented smooth visual movement. Vue Flow now owns active drags and final positions persist on release; keyboard changes persist immediately. Return-arrow lanes and fitted bounds include loop geometry.
- Aikido scanned all 19 initial changed files, then final changed files: one existing `fmt.Sprintf("update failed: %v", err)` in cleanup was incorrectly classified as SQL injection. It constructs an error message and executes no SQL. New feature code scanned without findings; no files skipped.
- `npm audit` reports the same 26 package advisories as the baseline lockfile (1 low, 4 moderate, 17 high, 4 critical); no advisory packages introduced by Vue Flow. Existing dependency upgrades remain separate work.

## Delivery notes

Implemented on `feature/technique-flows`. Existing untracked Cloud SQL planning documents were preserved. Prepared for pull-request review; no deployment performed. Deploy the Firestore rules/index exemption with the feature. Automated duplicate merges skip techniques containing diagrams to prevent data loss; flow authoring transfers system ownership using the existing technique-edit convention. The enrichment tool's pre-existing stale-read deletion race is outside this change.
