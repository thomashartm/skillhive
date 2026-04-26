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
