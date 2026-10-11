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
		{"self parent", []model.ConceptNode{{ID: "a", Name: "A", ParentID: "a"}}, "descendants"},
		{"cycle", []model.ConceptNode{{ID: "a", Name: "A", ParentID: "b"}, {ID: "b", Name: "B", ParentID: "c"}, {ID: "c", Name: "C", ParentID: "a"}}, "descendants"},
		{"missing parent", []model.ConceptNode{{ID: "a", Name: "A", ParentID: "missing"}}, "parent node"},
		{"duplicate", []model.ConceptNode{{ID: "a", Name: "A"}, {ID: "a", Name: "B"}}, "duplicate node"},
		{"empty sanitized name", []model.ConceptNode{{ID: "a", Name: "<b> </b>"}}, "name"},
		{"bad reference", []model.ConceptNode{{ID: "a", Name: "A", AssetIDs: []string{"bad/path"}}}, "link ID"},
		{"duplicate reference", []model.ConceptNode{{ID: "a", Name: "A", TechniqueIDs: []string{"x", "x"}}}, "link ID"},
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
		{ID: "a", Name: "Family A"}, {ID: "b", Name: "Family B"},
		{ID: "branch", Name: "Branch", ParentID: "a", TechniqueIDs: []string{id}},
		{ID: "leaf", Name: "Leaf", ParentID: "branch", AssetIDs: []string{id}},
	}
	assertStatus(call(http.MethodGet, 0, nil, "viewer"), 200)
	assertStatus(call(http.MethodPut, 0, nodes, "admin"), 200)
	// Move a whole branch across families, preserving its child's links.
	nodes[2].ParentID = "b"
	assertStatus(call(http.MethodPut, 1, nodes, "admin"), 200)
	var saved model.ConceptTree
	w := call(http.MethodGet, 0, nil, "viewer")
	assertStatus(w, 200)
	if err := json.Unmarshal(w.Body.Bytes(), &saved); err != nil {
		t.Fatal(err)
	}
	if saved.Revision != 2 || saved.Nodes[2].ParentID != "b" || saved.Nodes[3].ParentID != "branch" || saved.Nodes[3].AssetIDs[0] != id {
		t.Fatalf("bad persisted move: %+v", saved)
	}
	assertStatus(call(http.MethodPut, 1, nodes, "admin"), 409)
	nodes[1].ParentID = "leaf"
	assertStatus(call(http.MethodPut, 2, nodes, "admin"), 400)
	nodes[1].ParentID = ""
	nodes[3].AssetIDs = []string{id + "_foreign"}
	assertStatus(call(http.MethodPut, 2, nodes, "admin"), 400)
	nodes[3].AssetIDs = []string{"missing"}
	assertStatus(call(http.MethodPut, 2, nodes, "admin"), 400)
	nodes[3].AssetIDs = []string{id}
	// External asset deletion does not make the entire tree uneditable.
	if _, err := fs.Collection("assets").Doc(id).Delete(ctx); err != nil {
		t.Fatal(err)
	}
	nodes[3].Name = "Renamed leaf"
	assertStatus(call(http.MethodPut, 2, nodes, "admin"), 200)
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
	if _, err := fs.Collection("techniques").Doc(id).Get(ctx); err != nil {
		t.Fatalf("linked technique was removed: %v", err)
	}
}
