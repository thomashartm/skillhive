package cleanup

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"cloud.google.com/go/firestore"
)

// newEmulatorClient returns a Firestore client connected to the local
// emulator. Tests skip cleanly if FIRESTORE_EMULATOR_HOST is not set so the
// suite still runs in environments where the emulator isn't available.
//
// Run locally with:
//
//	FIRESTORE_EMULATOR_HOST=localhost:8181 GCLOUD_PROJECT=skillhive-test \
//	  go test ./internal/cleanup/ -run Integration -v
func newEmulatorClient(t *testing.T) (*firestore.Client, context.Context) {
	t.Helper()
	if os.Getenv("FIRESTORE_EMULATOR_HOST") == "" {
		t.Skip("FIRESTORE_EMULATOR_HOST not set; skipping integration test")
	}
	project := os.Getenv("GCLOUD_PROJECT")
	if project == "" {
		project = "skillhive-test"
	}
	ctx := context.Background()
	client, err := firestore.NewClient(ctx, project)
	if err != nil {
		t.Fatalf("connect emulator: %v", err)
	}
	t.Cleanup(func() { _ = client.Close() })
	return client, ctx
}

// uniqueSuffix returns a per-run suffix used to namespace test docs.
func uniqueSuffix() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

// TestIntegration_MergeCategoryWithChildrenAndReferences exercises the full
// executor merge path against the emulator: seed 3 categories (keeper,
// dup1, dup2), give dup1 two children, give a technique a categoryIds
// array containing dup1, then apply a job that merges dup1 → keeper.
// Asserts dup1 is deleted, its children are reparented to keeper, and the
// technique's categoryIds is rewritten + deduped.
func TestIntegration_MergeCategoryWithChildrenAndReferences(t *testing.T) {
	fs, ctx := newEmulatorClient(t)
	suffix := uniqueSuffix()
	disciplineID := "disc_" + suffix

	keeperID := "keeper_" + suffix
	dup1ID := "dup1_" + suffix
	child1ID := "child1_" + suffix
	child2ID := "child2_" + suffix
	techID := "tech_" + suffix
	jobID := "job_" + suffix

	now := time.Now().UTC()

	// Seed categories.
	cats := map[string]map[string]any{
		keeperID: {"disciplineId": disciplineID, "name": "Keeper", "slug": "keeper", "description": "kept", "parentId": nil, "updatedAt": now},
		dup1ID:   {"disciplineId": disciplineID, "name": "Dup", "slug": "dup", "description": "dup", "parentId": nil, "updatedAt": now},
		child1ID: {"disciplineId": disciplineID, "name": "Child 1", "slug": "child-1", "description": "", "parentId": dup1ID, "updatedAt": now},
		child2ID: {"disciplineId": disciplineID, "name": "Child 2", "slug": "child-2", "description": "", "parentId": dup1ID, "updatedAt": now},
	}
	for id, data := range cats {
		if _, err := fs.Collection("categories").Doc(id).Set(ctx, data); err != nil {
			t.Fatalf("seed category %s: %v", id, err)
		}
	}

	// Seed technique with categoryIds containing both dup1 (will be merged
	// away) and keeper (already present — verifies dedupe after rewrite).
	techData := map[string]any{
		"disciplineId": disciplineID,
		"name":         "Tech",
		"slug":         "tech",
		"description":  "",
		"categoryIds":  []string{dup1ID, keeperID},
		"updatedAt":    now,
	}
	if _, err := fs.Collection("techniques").Doc(techID).Set(ctx, techData); err != nil {
		t.Fatalf("seed technique: %v", err)
	}

	t.Cleanup(func() {
		ids := []struct {
			coll string
			id   string
		}{
			{"categories", keeperID}, {"categories", dup1ID},
			{"categories", child1ID}, {"categories", child2ID},
			{"techniques", techID}, {jobsCollection, jobID},
		}
		for _, x := range ids {
			_, _ = fs.Collection(x.coll).Doc(x.id).Delete(ctx)
		}
	})

	// Build a job document representing one approved merge proposal.
	mergeProposal := Proposal{
		Index:    0,
		Action:   ActionDelete,
		TargetID: dup1ID,
		Before: RecordSnapshot{
			ID: dup1ID, Name: "Dup", Slug: "dup", Description: "dup",
			ParentID: nil, UpdatedAt: now,
		},
		MergeInto: keeperID,
		Rationale: "duplicate",
		Approved:  true,
	}
	job := Job{
		DisciplineID: disciplineID,
		EntityType:   EntityCategory,
		Status:       StatusProposed,
		Proposals:    []Proposal{mergeProposal},
		CreatedAt:    now,
	}
	if _, err := fs.Collection(jobsCollection).Doc(jobID).Set(ctx, job); err != nil {
		t.Fatalf("seed job: %v", err)
	}

	// Apply.
	executor := NewExecutor(fs)
	applied, err := executor.Apply(ctx, jobID, "test-actor")
	if err != nil {
		t.Fatalf("Apply: %v", err)
	}
	if applied.Status != StatusApplied {
		t.Errorf("want StatusApplied, got %q (error: %s)", applied.Status, applied.Error)
	}
	if applied.AppliedResult == nil || applied.AppliedResult.Deleted != 1 {
		t.Errorf("want Deleted=1, got %+v", applied.AppliedResult)
	}

	// Assert dup1 is deleted.
	if _, err := fs.Collection("categories").Doc(dup1ID).Get(ctx); err == nil {
		t.Errorf("expected dup1 to be deleted")
	}

	// Assert children's parentId is now keeperID.
	for _, childID := range []string{child1ID, child2ID} {
		doc, err := fs.Collection("categories").Doc(childID).Get(ctx)
		if err != nil {
			t.Fatalf("read child %s: %v", childID, err)
		}
		got, _ := doc.Data()["parentId"].(string)
		if got != keeperID {
			t.Errorf("child %s parentId: want %q, got %q", childID, keeperID, got)
		}
	}

	// Assert technique categoryIds rewritten and deduped to just [keeper].
	techDoc, err := fs.Collection("techniques").Doc(techID).Get(ctx)
	if err != nil {
		t.Fatalf("read technique: %v", err)
	}
	rawCats, _ := techDoc.Data()["categoryIds"].([]interface{})
	got := make([]string, 0, len(rawCats))
	for _, v := range rawCats {
		if s, ok := v.(string); ok {
			got = append(got, s)
		}
	}
	if len(got) != 1 || got[0] != keeperID {
		t.Errorf("technique categoryIds: want [%s], got %v", keeperID, got)
	}
}
