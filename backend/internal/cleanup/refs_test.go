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
