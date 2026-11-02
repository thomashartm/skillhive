package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/go-chi/chi/v5"
	"github.com/thomas/skillhive-api/internal/middleware"
	"github.com/thomas/skillhive-api/internal/model"
	"github.com/thomas/skillhive-api/internal/validate"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type TechniqueFlowHandler struct{ fs *firestore.Client }

func NewTechniqueFlowHandler(fs *firestore.Client) *TechniqueFlowHandler {
	return &TechniqueFlowHandler{fs: fs}
}

type techniqueWithFlows struct {
	DisciplineID string               `firestore:"disciplineId"`
	OwnerUID     string               `firestore:"ownerUid"`
	Flows        model.TechniqueFlows `firestore:"flows"`
}

func (h *TechniqueFlowHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if !conceptID.MatchString(id) {
		writeError(w, http.StatusBadRequest, "invalid technique ID")
		return
	}
	doc, err := h.fs.Collection("techniques").Doc(id).Get(r.Context())
	if status.Code(err) == codes.NotFound {
		writeError(w, http.StatusNotFound, "technique not found")
		return
	}
	var stored techniqueWithFlows
	if err == nil {
		err = doc.DataTo(&stored)
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load flow diagrams")
		return
	}
	normalizeTechniqueFlows(&stored.Flows)
	writeJSON(w, http.StatusOK, stored.Flows)
}

func (h *TechniqueFlowHandler) Save(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if !conceptID.MatchString(id) {
		writeError(w, http.StatusBadRequest, "invalid technique ID")
		return
	}
	var req model.TechniqueFlows
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := validateTechniqueFlows(&req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	ref := h.fs.Collection("techniques").Doc(id)
	saved := req
	saved.Revision++
	err := h.fs.RunTransaction(r.Context(), func(ctx context.Context, tx *firestore.Transaction) error {
		doc, err := tx.Get(ref)
		if err != nil {
			return err
		}
		var stored techniqueWithFlows
		if err := doc.DataTo(&stored); err != nil {
			return err
		}
		if middleware.RequireEditor(ctx, stored.DisciplineID) != nil {
			return status.Error(codes.PermissionDenied, "editor role required for this technique's discipline")
		}
		if stored.Flows.Revision != req.Revision {
			return status.Error(codes.FailedPrecondition, "These diagrams were changed by another editor. Your edits are kept here; reload to discard them and load the latest version.")
		}
		oldLinks := flowMediaLinks(stored.Flows)
		for step, assetID := range flowMediaLinks(req) {
			// Previously linked media can be removed without blocking other edits.
			if oldLinks[step] == assetID {
				continue
			}
			doc, err := tx.Get(h.fs.Collection("assets").Doc(assetID))
			if status.Code(err) == codes.NotFound {
				return status.Error(codes.InvalidArgument, "linked media no longer exists")
			}
			if err != nil {
				return err
			}
			var asset model.Asset
			if err := doc.DataTo(&asset); err != nil {
				return err
			}
			normalizeAsset(&asset)
			if asset.DisciplineID != stored.DisciplineID || !asset.Active || (asset.Type != model.AssetTypeImage && asset.Type != model.AssetTypeVideo) {
				return status.Error(codes.InvalidArgument, "link an active video or image from this technique's discipline")
			}
		}
		updates := []firestore.Update{{Path: "flows", Value: saved}, {Path: "updatedAt", Value: time.Now().UTC()}}
		// Authoring a flow is a user edit, just like editing technique text.
		if stored.OwnerUID == "system" {
			updates = append(updates, firestore.Update{Path: "ownerUid", Value: middleware.GetUserUID(ctx)})
		}
		return tx.Update(ref, updates)
	})
	if err != nil {
		switch status.Code(err) {
		case codes.NotFound:
			writeError(w, http.StatusNotFound, "technique not found")
		case codes.PermissionDenied:
			writeError(w, http.StatusForbidden, status.Convert(err).Message())
		case codes.FailedPrecondition:
			writeError(w, http.StatusConflict, status.Convert(err).Message())
		case codes.InvalidArgument:
			writeError(w, http.StatusBadRequest, status.Convert(err).Message())
		default:
			writeError(w, http.StatusInternalServerError, "failed to save flow diagrams")
		}
		return
	}
	writeJSON(w, http.StatusOK, saved)
}

func flowMediaLinks(flows model.TechniqueFlows) map[string]string {
	links := map[string]string{}
	for _, d := range flows.Diagrams {
		for _, n := range d.Nodes {
			if n.AssetID != "" {
				links[d.ID+"/"+n.ID] = n.AssetID
			}
		}
	}
	return links
}

func normalizeTechniqueFlows(flows *model.TechniqueFlows) {
	if flows.Diagrams == nil {
		flows.Diagrams = []model.FlowDiagram{}
	}
	for i := range flows.Diagrams {
		if flows.Diagrams[i].Nodes == nil {
			flows.Diagrams[i].Nodes = []model.FlowNode{}
		}
		if flows.Diagrams[i].Edges == nil {
			flows.Diagrams[i].Edges = []model.FlowEdge{}
		}
	}
}

func validateTechniqueFlows(flows *model.TechniqueFlows) error {
	if flows.Revision < 0 || flows.Revision >= 9007199254740991 {
		return fmt.Errorf("invalid revision")
	}
	if len(flows.Diagrams) > 20 {
		return fmt.Errorf("a technique can have at most 20 diagrams")
	}
	normalizeTechniqueFlows(flows)
	diagrams := map[string]bool{}
	for i := range flows.Diagrams {
		d := &flows.Diagrams[i]
		if !conceptID.MatchString(d.ID) || diagrams[d.ID] {
			return fmt.Errorf("invalid or duplicate diagram ID")
		}
		diagrams[d.ID] = true
		d.Name = validate.StripAllHTML(d.Name)
		if err := validate.StringLength("diagram name", d.Name, 1, 100); err != nil {
			return err
		}
		if len(d.Nodes) > 200 {
			return fmt.Errorf("a diagram can have at most 200 steps")
		}
		if len(d.Edges) > 400 {
			return fmt.Errorf("a diagram can have at most 400 transitions")
		}
		nodes := map[string]bool{}
		for j := range d.Nodes {
			n := &d.Nodes[j]
			if !conceptID.MatchString(n.ID) || nodes[n.ID] {
				return fmt.Errorf("invalid or duplicate step ID")
			}
			nodes[n.ID] = true
			switch n.Type {
			case "start", "action", "decision", "finish":
			default:
				return fmt.Errorf("invalid step type")
			}
			n.Name = validate.StripAllHTML(n.Name)
			n.Label = validate.StripAllHTML(n.Label)
			if err := validate.StringLength("step name", n.Name, 1, 100); err != nil {
				return err
			}
			if err := validate.StringLength("step label", n.Label, 0, 100); err != nil {
				return err
			}
			if err := validate.StringLength("description", n.Description, 0, 10000); err != nil {
				return err
			}
			if n.AssetID != "" && !conceptID.MatchString(n.AssetID) {
				return fmt.Errorf("invalid asset ID")
			}
			for _, coord := range []float64{n.Position.X, n.Position.Y} {
				if math.IsNaN(coord) || math.IsInf(coord, 0) || math.Abs(coord) > 100000 {
					return fmt.Errorf("invalid step position")
				}
			}
		}
		edges := map[string]bool{}
		for j := range d.Edges {
			e := &d.Edges[j]
			if !conceptID.MatchString(e.ID) || edges[e.ID] {
				return fmt.Errorf("invalid or duplicate transition ID")
			}
			edges[e.ID] = true
			if !nodes[e.Source] || !nodes[e.Target] {
				return fmt.Errorf("transition endpoint does not exist")
			}
			e.Condition = validate.StripAllHTML(e.Condition)
			if err := validate.StringLength("condition", e.Condition, 0, 300); err != nil {
				return err
			}
		}
	}
	encoded, err := json.Marshal(flows)
	if err != nil {
		return fmt.Errorf("invalid diagram data: %w", err)
	}
	if len(encoded) > 600000 {
		return fmt.Errorf("flow diagrams are too large; shorten descriptions or remove steps")
	}
	return nil
}
