package cleanup

import (
	"encoding/json"
	"strings"
	"sync"
	"testing"
	"time"
)

// TestAppliedResultJSON_EmptySkippedSerializesAsArray covers the production
// regression where the frontend crashed on `appliedResult.skipped.length`
// because Go's nil slice marshalled as JSON null. The executor now seeds
// Skipped as an empty (non-nil) slice, so a fresh AppliedResult round-trips
// to `"skipped":[]`.
func TestAppliedResultJSON_EmptySkippedSerializesAsArray(t *testing.T) {
	r := AppliedResult{Skipped: []SkippedOp{}}
	b, err := json.Marshal(r)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if !strings.Contains(string(b), `"skipped":[]`) {
		t.Errorf("expected skipped to serialize as []; got %s", b)
	}
	if strings.Contains(string(b), `"skipped":null`) {
		t.Errorf("skipped must never be null in JSON; got %s", b)
	}
}

// TestNormalizeJob_FillsNilSkipped defends old jobs that were persisted
// before the executor seeded Skipped to []. After GetJob → DataTo →
// normalizeJob, downstream serialization must produce [] not null.
func TestNormalizeJob_FillsNilSkipped(t *testing.T) {
	j := &Job{
		Status:        StatusApplied,
		AppliedResult: &AppliedResult{Updated: 3, Deleted: 1, Skipped: nil},
	}
	normalizeJob(j)
	if j.AppliedResult.Skipped == nil {
		t.Fatal("normalizeJob must replace nil Skipped with empty slice")
	}
	if len(j.AppliedResult.Skipped) != 0 {
		t.Errorf("expected empty Skipped, got %v", j.AppliedResult.Skipped)
	}
	if j.Proposals == nil {
		t.Error("normalizeJob must replace nil Proposals with empty slice")
	}
}

// TestIntegration_ConcurrentApplyOnlyOneWins verifies the transactional
// reservation in Apply: when two callers race against the same proposed
// job, exactly one flips it to applying/applied and the other sees a
// non-proposed status and errors out. Catches the I7 double-click /
// retry case.
func TestIntegration_ConcurrentApplyOnlyOneWins(t *testing.T) {
	fs, ctx := newEmulatorClient(t)
	suffix := uniqueSuffix()
	disciplineID := "disc_" + suffix
	keeperID := "keeper_" + suffix
	dupID := "dup_" + suffix
	jobID := "job_" + suffix
	now := time.Now().UTC()

	// Seed two categories: a keeper and a duplicate to merge into it.
	cats := map[string]map[string]any{
		keeperID: {"disciplineId": disciplineID, "name": "Keeper", "slug": "keeper", "description": "kept", "parentId": nil, "updatedAt": now},
		dupID:    {"disciplineId": disciplineID, "name": "Dup", "slug": "dup", "description": "dup", "parentId": nil, "updatedAt": now},
	}
	for id, data := range cats {
		if _, err := fs.Collection("categories").Doc(id).Set(ctx, data); err != nil {
			t.Fatalf("seed category %s: %v", id, err)
		}
	}
	t.Cleanup(func() {
		for _, id := range []string{keeperID, dupID} {
			_, _ = fs.Collection("categories").Doc(id).Delete(ctx)
		}
		_, _ = fs.Collection(jobsCollection).Doc(jobID).Delete(ctx)
	})

	// One approved merge proposal.
	job := Job{
		DisciplineID: disciplineID,
		EntityType:   EntityCategory,
		Status:       StatusProposed,
		CreatedAt:    now,
		Proposals: []Proposal{{
			Index:    0,
			Action:   ActionDelete,
			TargetID: dupID,
			Before: RecordSnapshot{
				ID: dupID, Name: "Dup", Slug: "dup", Description: "dup",
				ParentID: nil, UpdatedAt: now,
			},
			MergeInto: keeperID,
			Approved:  true,
		}},
	}
	if _, err := fs.Collection(jobsCollection).Doc(jobID).Set(ctx, job); err != nil {
		t.Fatalf("seed job: %v", err)
	}

	executor := NewExecutor(fs)
	var wg sync.WaitGroup
	results := make([]error, 2)
	wg.Add(2)
	for i := 0; i < 2; i++ {
		go func(i int) {
			defer wg.Done()
			_, err := executor.Apply(ctx, jobID, "actor")
			results[i] = err
		}(i)
	}
	wg.Wait()

	// Exactly one caller succeeds, exactly one fails with a non-proposed
	// status error.
	successes := 0
	failures := 0
	for _, err := range results {
		if err == nil {
			successes++
			continue
		}
		failures++
		if !strings.Contains(err.Error(), "not 'proposed'") {
			t.Errorf("loser error should report non-proposed status; got %v", err)
		}
	}
	if successes != 1 || failures != 1 {
		t.Fatalf("want exactly 1 success + 1 failure, got %d successes / %d failures: %v",
			successes, failures, results)
	}

	// Final state must be applied (not still applying).
	doc, err := fs.Collection(jobsCollection).Doc(jobID).Get(ctx)
	if err != nil {
		t.Fatalf("read job: %v", err)
	}
	got, _ := doc.Data()["status"].(string)
	if got != string(StatusApplied) {
		t.Errorf("final status: want %q, got %q", StatusApplied, got)
	}
}

// TestIntegration_ForceFailFromApplyingFlipsStatus exercises the recovery
// path: a job stuck in `applying` (because the executor's terminal write
// never landed) can be force-failed by the admin to unstick it.
func TestIntegration_ForceFailFromApplyingFlipsStatus(t *testing.T) {
	fs, ctx := newEmulatorClient(t)
	suffix := uniqueSuffix()
	jobID := "job_" + suffix
	disciplineID := "disc_" + suffix

	// Seed a job already in StatusApplying as if a prior Apply was killed
	// before finalizing.
	job := Job{
		DisciplineID: disciplineID,
		EntityType:   EntityCategory,
		Status:       StatusApplying,
		CreatedAt:    time.Now().UTC(),
	}
	if _, err := fs.Collection(jobsCollection).Doc(jobID).Set(ctx, job); err != nil {
		t.Fatalf("seed job: %v", err)
	}
	t.Cleanup(func() {
		_, _ = fs.Collection(jobsCollection).Doc(jobID).Delete(ctx)
	})

	svc := NewService(fs, nil, nil)
	if err := svc.ForceFail(ctx, jobID, "stuck after deploy timeout", "admin-uid"); err != nil {
		t.Fatalf("ForceFail: %v", err)
	}

	doc, err := fs.Collection(jobsCollection).Doc(jobID).Get(ctx)
	if err != nil {
		t.Fatalf("read job: %v", err)
	}
	if got, _ := doc.Data()["status"].(string); got != string(StatusFailed) {
		t.Errorf("status: want %q, got %q", StatusFailed, got)
	}
	if got, _ := doc.Data()["error"].(string); !strings.Contains(got, "stuck after deploy timeout") {
		t.Errorf("error: want reason captured; got %q", got)
	}

	// Calling again on a terminal job must fail with a clear message.
	err = svc.ForceFail(ctx, jobID, "again", "admin-uid")
	if err == nil || !strings.Contains(err.Error(), "cannot force-fail") {
		t.Errorf("second force-fail must reject; got %v", err)
	}
}
