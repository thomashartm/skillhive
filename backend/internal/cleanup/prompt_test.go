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
