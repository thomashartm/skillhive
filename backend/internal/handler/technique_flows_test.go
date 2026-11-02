package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/go-chi/chi/v5"
	"github.com/thomas/skillhive-api/internal/middleware"
	"github.com/thomas/skillhive-api/internal/model"
)

func flowFixture() model.TechniqueFlows {
	return model.TechniqueFlows{Diagrams: []model.FlowDiagram{{ID: "flow", Name: "Apply technique",
		Nodes: []model.FlowNode{
			{ID: "start", Type: "start", Name: "Establish grip"},
			{ID: "check", Type: "decision", Name: "Grip secure?", Description: "**Check** the grip", AssetID: "video"},
			{ID: "finish", Type: "finish", Name: "Apply technique"},
		},
		Edges: []model.FlowEdge{
			{ID: "a", Source: "start", Target: "check"},
			{ID: "b", Source: "check", Target: "start", Condition: "Grip lost"},
			{ID: "c", Source: "check", Target: "finish", Condition: "Secure"},
			{ID: "d", Source: "check", Target: "check", Condition: "Keep checking"},
		},
	}}}
}

func TestValidateTechniqueFlows(t *testing.T) {
	tests := []struct {
		name string
		edit func(*model.TechniqueFlows)
		want string
	}{
		{"branches loops and self loops", func(*model.TechniqueFlows) {}, ""},
		{"negative revision", func(f *model.TechniqueFlows) { f.Revision = -1 }, "revision"},
		{"duplicate diagrams", func(f *model.TechniqueFlows) { f.Diagrams = append(f.Diagrams, f.Diagrams[0]) }, "diagram ID"},
		{"duplicate steps", func(f *model.TechniqueFlows) {
			f.Diagrams[0].Nodes = append(f.Diagrams[0].Nodes, f.Diagrams[0].Nodes[0])
		}, "step ID"},
		{"duplicate transitions", func(f *model.TechniqueFlows) {
			f.Diagrams[0].Edges = append(f.Diagrams[0].Edges, f.Diagrams[0].Edges[0])
		}, "transition ID"},
		{"missing target", func(f *model.TechniqueFlows) { f.Diagrams[0].Edges[0].Target = "missing" }, "endpoint"},
		{"missing source", func(f *model.TechniqueFlows) { f.Diagrams[0].Edges[0].Source = "missing" }, "endpoint"},
		{"invalid type", func(f *model.TechniqueFlows) { f.Diagrams[0].Nodes[0].Type = "script" }, "type"},
		{"empty name", func(f *model.TechniqueFlows) { f.Diagrams[0].Nodes[0].Name = "<b> </b>" }, "name"},
		{"bad media ID", func(f *model.TechniqueFlows) { f.Diagrams[0].Nodes[0].AssetID = "x/y" }, "asset ID"},
		{"non finite coordinate", func(f *model.TechniqueFlows) { f.Diagrams[0].Nodes[0].Position.X = math.Inf(1) }, "position"},
		{"huge coordinate", func(f *model.TechniqueFlows) { f.Diagrams[0].Nodes[0].Position.Y = 1e9 }, "position"},
		{"long label", func(f *model.TechniqueFlows) { f.Diagrams[0].Nodes[0].Label = strings.Repeat("x", 101) }, "label"},
		{"long description", func(f *model.TechniqueFlows) { f.Diagrams[0].Nodes[0].Description = strings.Repeat("x", 10001) }, "description"},
		{"long condition", func(f *model.TechniqueFlows) { f.Diagrams[0].Edges[0].Condition = strings.Repeat("x", 301) }, "condition"},
		{"too many diagrams", func(f *model.TechniqueFlows) { f.Diagrams = make([]model.FlowDiagram, 21) }, "20"},
		{"too many nodes", func(f *model.TechniqueFlows) { f.Diagrams[0].Nodes = make([]model.FlowNode, 201) }, "200"},
		{"too many edges", func(f *model.TechniqueFlows) { f.Diagrams[0].Edges = make([]model.FlowEdge, 401) }, "400"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			f := flowFixture()
			tc.edit(&f)
			err := validateTechniqueFlows(&f)
			if tc.want == "" && err != nil {
				t.Fatal(err)
			}
			if tc.want != "" && (err == nil || !strings.Contains(err.Error(), tc.want)) {
				t.Fatalf("want %q, got %v", tc.want, err)
			}
		})
	}
}

func TestTechniqueFlowsNormalizeAndBoundSize(t *testing.T) {
	f := model.TechniqueFlows{Diagrams: []model.FlowDiagram{{ID: "empty", Name: " Draft "}}}
	if err := validateTechniqueFlows(&f); err != nil {
		t.Fatal(err)
	}
	if f.Diagrams[0].Nodes == nil || f.Diagrams[0].Edges == nil || f.Diagrams[0].Name != "Draft" {
		t.Fatalf("not normalized: %+v", f)
	}
	for i := 0; i < 70; i++ {
		f.Diagrams[0].Nodes = append(f.Diagrams[0].Nodes, model.FlowNode{ID: fmt.Sprint(i), Type: "action", Name: "Action", Description: strings.Repeat("x", 10000)})
	}
	if err := validateTechniqueFlows(&f); err == nil || !strings.Contains(err.Error(), "large") {
		t.Fatalf("expected size limit, got %v", err)
	}
}

func TestIntegrationTechniqueFlows(t *testing.T) {
	if os.Getenv("FIRESTORE_EMULATOR_HOST") == "" {
		t.Skip("FIRESTORE_EMULATOR_HOST not set")
	}
	ctx := context.Background()
	fs, err := firestore.NewClient(ctx, "demo-skillhive-flows")
	if err != nil {
		t.Fatal(err)
	}
	defer fs.Close()
	id := fmt.Sprintf("flows_%d", time.Now().UnixNano())
	ref := fs.Collection("techniques").Doc(id)
	if _, err := ref.Set(ctx, map[string]any{"name": "Technique", "disciplineId": id, "ownerUid": "system"}); err != nil {
		t.Fatal(err)
	}
	defer ref.Delete(ctx)
	for _, a := range []struct {
		id, discipline, kind string
		active               bool
	}{
		{"video", id, "video", true}, {"image", id, "image", true}, {"foreign", "other", "video", true}, {"web", id, "web", true}, {"inactive", id, "video", false},
	} {
		d := fs.Collection("assets").Doc(id + "_" + a.id)
		if _, err := d.Set(ctx, map[string]any{"disciplineId": a.discipline, "type": a.kind, "active": a.active, "processingStatus": "completed"}); err != nil {
			t.Fatal(err)
		}
		defer d.Delete(ctx)
	}
	h := NewTechniqueFlowHandler(fs)
	router := chi.NewRouter()
	router.Get("/techniques/{id}/flows", h.Get)
	router.Put("/techniques/{id}/flows", h.Save)
	router.Patch("/techniques/{id}", NewTechniqueHandler(fs).Update)
	router.Delete("/techniques/{id}", NewTechniqueHandler(fs).Delete)
	call := func(method, path, role string, body any) *httptest.ResponseRecorder {
		data, _ := json.Marshal(body)
		r := httptest.NewRequest(method, "/techniques/"+id+path, bytes.NewReader(data))
		ctx := context.WithValue(r.Context(), middleware.UserRolesKey, map[string]string{id: role, "other": "admin"})
		ctx = context.WithValue(ctx, middleware.UserUIDKey, "author")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, r.WithContext(ctx))
		return w
	}
	check := func(w *httptest.ResponseRecorder, code int) {
		t.Helper()
		if w.Code != code {
			t.Fatalf("want %d, got %d: %s", code, w.Code, w.Body.String())
		}
	}
	read := func() model.TechniqueFlows {
		w := call("GET", "/flows", "viewer", nil)
		check(w, 200)
		var f model.TechniqueFlows
		if err := json.Unmarshal(w.Body.Bytes(), &f); err != nil {
			t.Fatal(err)
		}
		return f
	}
	if f := read(); f.Revision != 0 || f.Diagrams == nil {
		t.Fatalf("invalid empty flows: %+v", f)
	}
	f := flowFixture()
	f.Diagrams[0].Nodes[1].AssetID = id + "_video"
	for _, role := range []string{"viewer", ""} {
		check(call("PUT", "/flows", role, f), 403)
	}
	check(call("PUT", "/flows", "editor", f), 200)
	owned, err := ref.Get(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if owner, _ := owned.DataAt("ownerUid"); owner != "author" {
		t.Fatalf("flow edit did not transfer system ownership: %v", owner)
	}
	check(call("PUT", "/flows", "admin", f), 409)
	f = read()
	if f.Revision != 1 || len(f.Diagrams[0].Edges) != 4 || f.Diagrams[0].Nodes[1].Description != "**Check** the grip" {
		t.Fatalf("round trip lost graph: %+v", f)
	}
	for _, asset := range []string{"foreign", "web", "inactive", "missing"} {
		bad := flowFixture()
		bad.Revision = f.Revision
		bad.Diagrams[0].Nodes[1].AssetID = id + "_" + asset
		check(call("PUT", "/flows", "editor", bad), 400)
	}
	check(call("PATCH", "", "editor", map[string]any{"description": "Updated technique"}), 200)
	if read().Revision != 1 {
		t.Fatal("ordinary technique edit erased flows")
	}
	if _, err := fs.Collection("assets").Doc(id + "_video").Delete(ctx); err != nil {
		t.Fatal(err)
	}
	f.Diagrams = append(f.Diagrams, model.FlowDiagram{ID: "second", Name: "Alternative", Nodes: []model.FlowNode{{ID: "image", Type: "action", Name: "Position", AssetID: id + "_image"}}})
	check(call("PUT", "/flows", "editor", f), 200)
	f = read()
	if len(f.Diagrams) != 2 || f.Diagrams[1].Edges == nil {
		t.Fatal("multiple/empty diagrams did not survive reload")
	}
	// Legacy media is considered active by the existing asset API.
	legacy := fs.Collection("assets").Doc(id + "_legacy")
	if _, err := legacy.Set(ctx, map[string]any{"disciplineId": id, "type": "image"}); err != nil {
		t.Fatal(err)
	}
	defer legacy.Delete(ctx)
	f.Diagrams[1].Nodes[0].AssetID = legacy.ID
	check(call("PUT", "/flows", "editor", f), 200)
	f = read()
	var wg sync.WaitGroup
	codes := make(chan int, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() { defer wg.Done(); codes <- call("PUT", "/flows", "editor", f).Code }()
	}
	wg.Wait()
	close(codes)
	counts := map[int]int{}
	for code := range codes {
		counts[code]++
	}
	if counts[200] != 1 || counts[409] != 1 {
		t.Fatalf("concurrent writes: %v", counts)
	}
	check(call("DELETE", "", "editor", nil), 204)
	check(call("GET", "/flows", "viewer", nil), 404)
	check(call("PUT", "/flows", "editor", f), 404)
}
