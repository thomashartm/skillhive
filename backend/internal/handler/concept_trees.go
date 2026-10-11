package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/thomas/skillhive-api/internal/middleware"
	"github.com/thomas/skillhive-api/internal/model"
	"github.com/thomas/skillhive-api/internal/validate"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type ConceptTreeHandler struct{ fs *firestore.Client }

func NewConceptTreeHandler(fs *firestore.Client) *ConceptTreeHandler {
	return &ConceptTreeHandler{fs: fs}
}

var conceptID = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,128}$`)

func (h *ConceptTreeHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("disciplineId")
	if !conceptID.MatchString(id) {
		writeError(w, http.StatusBadRequest, "valid disciplineId is required")
		return
	}
	tree := model.ConceptTree{DisciplineID: id, Nodes: []model.ConceptNode{}}
	doc, err := h.fs.Collection("conceptTrees").Doc(id).Get(r.Context())
	if status.Code(err) != codes.NotFound {
		if err == nil {
			err = doc.DataTo(&tree)
		}
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to load concept trees")
			return
		}
	}
	writeJSON(w, http.StatusOK, tree)
}

// Save replaces the forest at an expected revision. All CRUD and moves use the
// same validation and transaction, including moves between technical families.
func (h *ConceptTreeHandler) Save(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("disciplineId")
	if !conceptID.MatchString(id) {
		writeError(w, http.StatusBadRequest, "valid disciplineId is required")
		return
	}
	if middleware.RequireAdmin(r.Context(), id) != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}
	var req model.SaveConceptTreeRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := validateConceptTree(&req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	ref := h.fs.Collection("conceptTrees").Doc(id)
	tree := model.ConceptTree{DisciplineID: id, Nodes: req.Nodes, Revision: req.Revision + 1, UpdatedAt: time.Now().UTC()}
	err := h.fs.RunTransaction(r.Context(), func(ctx context.Context, tx *firestore.Transaction) error {
		if _, err := tx.Get(h.fs.Collection("disciplines").Doc(id)); err != nil {
			if status.Code(err) == codes.NotFound {
				return status.Error(codes.InvalidArgument, "discipline not found")
			}
			return err
		}
		var existing model.ConceptTree
		doc, err := tx.Get(ref)
		if err == nil {
			if err = doc.DataTo(&existing); err != nil {
				return err
			}
		} else if status.Code(err) != codes.NotFound {
			return err
		}
		if existing.Revision != req.Revision {
			return status.Error(codes.FailedPrecondition, "This tree was changed by another admin. Reload the trees before trying again.")
		}
		// Only new links need validating. A previously linked asset/technique may
		// since have been deleted; it must not prevent unrelated tree edits.
		oldLinks := conceptLinks(existing.Nodes)
		for key, link := range conceptLinks(req.Nodes) {
			if _, exists := oldLinks[key]; exists {
				continue
			}
			linked, err := tx.Get(h.fs.Collection(link.collection).Doc(link.id))
			if err != nil {
				if status.Code(err) == codes.NotFound {
					return status.Error(codes.InvalidArgument, "linked technique or asset no longer exists")
				}
				return err
			}
			discipline, _ := linked.DataAt("disciplineId")
			if discipline != id {
				return status.Error(codes.InvalidArgument, "links must belong to the same discipline")
			}
		}
		return tx.Set(ref, tree)
	})
	if err != nil {
		switch status.Code(err) {
		case codes.FailedPrecondition:
			writeError(w, http.StatusConflict, status.Convert(err).Message())
		case codes.InvalidArgument:
			writeError(w, http.StatusBadRequest, status.Convert(err).Message())
		default:
			writeError(w, http.StatusInternalServerError, "failed to save concept trees")
		}
		return
	}
	writeJSON(w, http.StatusOK, tree)
}

type conceptLink struct{ collection, id string }

func conceptLinks(nodes []model.ConceptNode) map[string]conceptLink {
	links := make(map[string]conceptLink)
	for _, node := range nodes {
		for _, id := range node.TechniqueIDs {
			links["techniques/"+id] = conceptLink{"techniques", id}
		}
		for _, id := range node.AssetIDs {
			links["assets/"+id] = conceptLink{"assets", id}
		}
	}
	return links
}

func validateConceptTree(req *model.SaveConceptTreeRequest) error {
	if req.Revision < 0 {
		return fmt.Errorf("revision must be non-negative")
	}
	if len(req.Nodes) > 500 {
		return fmt.Errorf("a discipline can contain at most 500 concept nodes")
	}
	if req.Nodes == nil {
		req.Nodes = []model.ConceptNode{}
	}
	parents := make(map[string]string)
	for i := range req.Nodes {
		n := &req.Nodes[i]
		if !conceptID.MatchString(n.ID) {
			return fmt.Errorf("invalid node ID")
		}
		if _, exists := parents[n.ID]; exists {
			return fmt.Errorf("duplicate node ID")
		}
		parents[n.ID] = n.ParentID
		n.Name = strings.TrimSpace(validate.StripAllHTML(n.Name))
		n.Description = strings.TrimSpace(validate.StripAllHTML(n.Description))
		if err := validate.StringLength("name", n.Name, 1, 100); err != nil {
			return err
		}
		if err := validate.StringLength("description", n.Description, 0, 2000); err != nil {
			return err
		}
		if n.TechniqueIDs == nil {
			n.TechniqueIDs = []string{}
		}
		if n.AssetIDs == nil {
			n.AssetIDs = []string{}
		}
		for _, ids := range [][]string{n.TechniqueIDs, n.AssetIDs} {
			if len(ids) > 100 {
				return fmt.Errorf("a node can link at most 100 techniques and 100 assets")
			}
			seen := map[string]bool{}
			for _, id := range ids {
				if !conceptID.MatchString(id) || seen[id] {
					return fmt.Errorf("invalid or duplicate link ID")
				}
				seen[id] = true
			}
		}
	}
	for _, n := range req.Nodes {
		seen := map[string]bool{n.ID: true}
		for parent := n.ParentID; parent != ""; parent = parents[parent] {
			if _, exists := parents[parent]; !exists {
				return fmt.Errorf("parent node does not exist")
			}
			if seen[parent] {
				return fmt.Errorf("a node cannot be moved under itself or its descendants")
			}
			seen[parent] = true
			if len(seen) > 50 {
				return fmt.Errorf("concept trees support up to 50 levels")
			}
		}
	}
	encoded, _ := json.Marshal(req.Nodes)
	if len(encoded) > 750000 {
		return fmt.Errorf("concept trees are too large; shorten descriptions or remove links")
	}
	return nil
}
