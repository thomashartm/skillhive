package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/thomas/skillhive-api/internal/middleware"
	"github.com/thomas/skillhive-api/internal/model"
)

func TestValidateConceptTree(t *testing.T) {
	tests := []struct {
		name  string
		nodes []model.ConceptNode
		want  string
	}{
		{"deep valid tree", []model.ConceptNode{{ID: "family", Name: "Family"}, {ID: "branch", Name: "Branch", ParentID: "family"}, {ID: "leaf", Name: "Leaf", ParentID: "branch", AssetIDs: []string{"asset"}}}, ""},
		{"invalid orientation", []model.ConceptNode{{ID: "a", Name: "A", Layout: &model.ConceptLayout{Orientation: "diagonal", Alignment: "center"}}}, "orientation"},
		{"invalid alignment", []model.ConceptNode{{ID: "a", Name: "A", Layout: &model.ConceptLayout{Orientation: "vertical", Alignment: "unknown"}}}, "alignment"},
		{"valid layout", []model.ConceptNode{{ID: "a", Name: "A", Layout: &model.ConceptLayout{Orientation: "horizontal", Alignment: "end"}}}, ""},
		{"self parent", []model.ConceptNode{{ID: "a", Name: "A", ParentID: "a"}}, "descendants"},
		{"cycle", []model.ConceptNode{{ID: "a", Name: "A", ParentID: "b"}, {ID: "b", Name: "B", ParentID: "c"}, {ID: "c", Name: "C", ParentID: "a"}}, "descendants"},
		{"missing parent", []model.ConceptNode{{ID: "a", Name: "A", ParentID: "missing"}}, "parent node"},
		{"duplicate", []model.ConceptNode{{ID: "a", Name: "A"}, {ID: "a", Name: "B"}}, "duplicate node"},
		{"empty sanitized name", []model.ConceptNode{{ID: "a", Name: "<b> </b>"}}, "name"},
		{"bad reference", []model.ConceptNode{{ID: "a", Name: "A", AssetIDs: []string{"bad/path"}}}, "link ID"},
		{"duplicate reference", []model.ConceptNode{{ID: "a", Name: "A", TechniqueIDs: []string{"x", "x"}}}, "link ID"},
		{"invalid curriculum", []model.ConceptNode{{ID: "a", Name: "A", CurriculumIDs: []string{"bad/path"}}}, "link ID"},
		{"duplicate curriculum", []model.ConceptNode{{ID: "a", Name: "A", CurriculumIDs: []string{"x", "x"}}}, "link ID"},
		{"too many curricula", []model.ConceptNode{{ID: "a", Name: "A", CurriculumIDs: make([]string, 101)}}, "100 curricula"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := model.SaveConceptTreeRequest{Nodes: tc.nodes}
			err := validateConceptTree(&req)
			if tc.want == "" && err != nil {
				t.Fatal(err)
			}
			if tc.want != "" && (err == nil || !strings.Contains(err.Error(), tc.want)) {
				t.Fatalf("want %q, got %v", tc.want, err)
			}
		})
	}
}

func TestConceptTreeWriteRequiresDisciplineAdmin(t *testing.T) {
	// A nil client proves authorization is checked before database access.
	h := NewConceptTreeHandler(nil)
	for _, role := range []string{"viewer", "editor", ""} {
		r := httptest.NewRequest(http.MethodPut, "/?disciplineId=bjj", strings.NewReader(`{"revision":0,"nodes":[]}`))
		ctx := context.WithValue(r.Context(), middleware.UserRolesKey, map[string]string{"bjj": role, "other": "admin"})
		w := httptest.NewRecorder()
		h.Save(w, r.WithContext(ctx))
		if w.Code != http.StatusForbidden {
			t.Fatalf("role %q got %d", role, w.Code)
		}
	}
}

func TestIntegrationConceptTreeLifecycle(t *testing.T) {
	if os.Getenv("FIRESTORE_EMULATOR_HOST") == "" {
		t.Skip("FIRESTORE_EMULATOR_HOST not set")
	}
	ctx := context.Background()
	fs, err := firestore.NewClient(ctx, "demo-skillhive-concepts")
	if err != nil {
		t.Fatal(err)
	}
	defer fs.Close()
	id := fmt.Sprintf("concept_test_%d", time.Now().UnixNano())
	for _, item := range []struct{ collection, id, discipline string }{
		{"disciplines", id, id}, {"assets", id, id}, {"techniques", id, id}, {"assets", id + "_foreign", "other"},
		{"curricula", id, id}, {"curricula", id + "_deleted", id}, {"curricula", id + "_foreign", "other"},
	} {
		ref := fs.Collection(item.collection).Doc(item.id)
		if _, err := ref.Set(ctx, map[string]any{"disciplineId": item.discipline}); err != nil {
			t.Fatal(err)
		}
		defer ref.Delete(ctx)
	}
	defer fs.Collection("conceptTrees").Doc(id).Delete(ctx)
	h := NewConceptTreeHandler(fs)
	call := func(method string, revision int64, nodes []model.ConceptNode, role string) *httptest.ResponseRecorder {
		body, _ := json.Marshal(model.SaveConceptTreeRequest{Revision: revision, Nodes: nodes})
		r := httptest.NewRequest(method, "/?disciplineId="+id, bytes.NewReader(body))
		r = r.WithContext(context.WithValue(r.Context(), middleware.UserRolesKey, map[string]string{id: role}))
		w := httptest.NewRecorder()
		if method == http.MethodGet {
			h.Get(w, r)
		} else {
			h.Save(w, r)
		}
		return w
	}
	assertStatus := func(w *httptest.ResponseRecorder, want int) {
		t.Helper()
		if w.Code != want {
			t.Fatalf("want %d got %d: %s", want, w.Code, w.Body.String())
		}
	}
	nodes := []model.ConceptNode{
		{ID: "a", Name: "Family A", CurriculumIDs: []string{id, id + "_deleted"}}, {ID: "b", Name: "Family B"},
		{ID: "branch", Name: "Branch", ParentID: "a", TechniqueIDs: []string{id}, CurriculumIDs: []string{id}},
		{ID: "leaf", Name: "Leaf", ParentID: "branch", AssetIDs: []string{id}, CurriculumIDs: []string{id}},
	}
	assertStatus(call(http.MethodGet, 0, nil, "viewer"), 200)
	assertStatus(call(http.MethodPut, 0, nodes, "admin"), 200)
	// Move a whole branch across families, preserving its child's links.
	nodes[2].ParentID = "b"
	nodes[1].Layout = &model.ConceptLayout{Orientation: "horizontal", Alignment: "end"}
	assertStatus(call(http.MethodPut, 1, nodes, "admin"), 200)
	var saved model.ConceptTree
	w := call(http.MethodGet, 0, nil, "viewer")
	assertStatus(w, 200)
	if err := json.Unmarshal(w.Body.Bytes(), &saved); err != nil {
		t.Fatal(err)
	}
	for _, node := range saved.Nodes {
		if node.AssetIDs == nil || node.TechniqueIDs == nil || node.CurriculumIDs == nil {
			t.Fatalf("reloaded node %s contains null link arrays", node.ID)
		}
	}
	for _, index := range []int{0, 2, 3} {
		if len(saved.Nodes[index].CurriculumIDs) == 0 || saved.Nodes[index].CurriculumIDs[0] != id {
			t.Fatalf("curriculum association lost on family, node, or leaf: %+v", saved.Nodes[index])
		}
	}
	if saved.Revision != 2 || saved.Nodes[2].ParentID != "b" || saved.Nodes[3].ParentID != "branch" || saved.Nodes[3].AssetIDs[0] != id {
		t.Fatalf("bad persisted move: %+v", saved)
	}
	if saved.Nodes[1].Layout == nil || *saved.Nodes[1].Layout != *nodes[1].Layout {
		t.Fatalf("layout was not persisted for read-only viewers: %+v", saved.Nodes[1])
	}
	assertStatus(call(http.MethodPut, 2, nodes, "viewer"), 403)
	assertStatus(call(http.MethodPut, 2, nodes, "editor"), 403)
	assertStatus(call(http.MethodPut, 1, nodes, "admin"), 409)
	nodes[1].ParentID = "leaf"
	assertStatus(call(http.MethodPut, 2, nodes, "admin"), 400)
	nodes[1].ParentID = ""
	nodes[3].AssetIDs = []string{id + "_foreign"}
	assertStatus(call(http.MethodPut, 2, nodes, "admin"), 400)
	nodes[3].AssetIDs = []string{"missing"}
	assertStatus(call(http.MethodPut, 2, nodes, "admin"), 400)
	nodes[3].AssetIDs = []string{id}
	for _, invalid := range []string{id + "_foreign", "missing"} {
		nodes[3].CurriculumIDs = []string{invalid}
		assertStatus(call(http.MethodPut, 2, nodes, "admin"), 400)
	}
	// Removing an association does not delete the curriculum itself.
	nodes[3].CurriculumIDs = []string{}
	if _, err := fs.Collection("curricula").Doc(id + "_deleted").Delete(ctx); err != nil {
		t.Fatal(err)
	}
	// External asset deletion does not make the entire tree uneditable.
	if _, err := fs.Collection("assets").Doc(id).Delete(ctx); err != nil {
		t.Fatal(err)
	}
	nodes[3].Name = "Renamed leaf"
	assertStatus(call(http.MethodPut, 2, nodes, "admin"), 200)
	var unlinked model.ConceptTree
	if err := json.Unmarshal(call(http.MethodGet, 0, nil, "viewer").Body.Bytes(), &unlinked); err != nil || len(unlinked.Nodes[3].CurriculumIDs) != 0 {
		t.Fatalf("curriculum association was not removed: %+v, %v", unlinked, err)
	}
	// Two writes at the same revision cannot silently overwrite one another.
	responses := make(chan int, 2)
	for range 2 {
		go func() { responses <- call(http.MethodPut, 3, nodes, "admin").Code }()
	}
	first, second := <-responses, <-responses
	if !((first == 200 && second == 409) || (first == 409 && second == 200)) {
		t.Fatalf("concurrent saves: %d, %d", first, second)
	}
	// Delete the branch and finally the families; linked library data remains.
	assertStatus(call(http.MethodPut, 4, nodes[:2], "admin"), 200)
	assertStatus(call(http.MethodPut, 5, []model.ConceptNode{}, "admin"), 200)
	var empty model.ConceptTree
	if err := json.Unmarshal(call(http.MethodGet, 0, nil, "viewer").Body.Bytes(), &empty); err != nil || empty.Nodes == nil {
		t.Fatalf("empty forest must render as an empty array: %+v, %v", empty, err)
	}
	if _, err := fs.Collection("techniques").Doc(id).Get(ctx); err != nil {
		t.Fatalf("linked technique was removed: %v", err)
	}
	if _, err := fs.Collection("curricula").Doc(id).Get(ctx); err != nil {
		t.Fatalf("linked curriculum was removed: %v", err)
	}
}
