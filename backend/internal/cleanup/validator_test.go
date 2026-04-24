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
