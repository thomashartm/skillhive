package handler

import (
	"log/slog"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/go-chi/chi/v5"
	"github.com/thomas/skillhive-api/internal/middleware"
	"github.com/thomas/skillhive-api/internal/model"
	"github.com/thomas/skillhive-api/internal/validate"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type ElementHandler struct {
	fs *firestore.Client
}

func NewElementHandler(fs *firestore.Client) *ElementHandler {
	return &ElementHandler{fs: fs}
}

// verifyCurriculumOwner checks if the authenticated user owns the curriculum
func (h *ElementHandler) verifyCurriculumOwner(w http.ResponseWriter, r *http.Request) (string, bool) {
	ctx := r.Context()
	uid := middleware.GetUserUID(ctx)
	curriculumID := chi.URLParam(r, "id")

	doc, err := h.fs.Collection("curricula").Doc(curriculumID).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "curriculum not found")
		} else {
			writeError(w, http.StatusInternalServerError, "failed to get curriculum")
		}
		return "", false
	}

	ownerUID, _ := doc.DataAt("ownerUid")
	isPublic, _ := doc.DataAt("isPublic")

	ownerStr, _ := ownerUID.(string)
	publicBool, _ := isPublic.(bool)

	if ownerStr != uid && !publicBool {
		writeError(w, http.StatusNotFound, "curriculum not found")
		return "", false
	}

	return curriculumID, true
}

func (h *ElementHandler) ListElements(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	curriculumID, ok := h.verifyCurriculumOwner(w, r)
	if !ok {
		return
	}

	iter := h.fs.Collection("curricula").Doc(curriculumID).
		Collection("elements").
		OrderBy("ord", firestore.Asc).
		Documents(ctx)
	defer iter.Stop()

	elements := []model.CurriculumElement{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			slog.Error("failed to list elements", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to list elements")
			return
		}

		var e model.CurriculumElement
		if err := doc.DataTo(&e); err != nil {
			slog.Error("failed to parse element", "docID", doc.Ref.ID, "error", err)
			continue
		}
		e.ID = doc.Ref.ID
		elements = append(elements, e)
	}

	writeJSON(w, http.StatusOK, elements)
}

func (h *ElementHandler) CreateElement(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := middleware.GetUserUID(ctx)
	curriculumID := chi.URLParam(r, "id")

	// Verify ownership (not just read access)
	doc, err := h.fs.Collection("curricula").Doc(curriculumID).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "curriculum not found")
		} else {
			writeError(w, http.StatusInternalServerError, "failed to get curriculum")
		}
		return
	}

	ownerUID, _ := doc.DataAt("ownerUid")
	if ownerUID != uid {
		writeError(w, http.StatusForbidden, "not authorized to modify this curriculum")
		return
	}

	var req model.CreateElementRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := validate.EnumWhitelist("type", req.Type, []string{"technique", "asset", "text"}); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Find max ord
	elemColl := h.fs.Collection("curricula").Doc(curriculumID).Collection("elements")
	maxOrd := 0
	ordIter := elemColl.OrderBy("ord", firestore.Desc).Limit(1).Documents(ctx)
	if lastDoc, err := ordIter.Next(); err == nil {
		if ord, err := lastDoc.DataAt("ord"); err == nil {
			if ordInt, ok := ord.(int64); ok {
				maxOrd = int(ordInt)
			}
		}
	}
	ordIter.Stop()

	// Build snapshot if technique or asset reference
	var snapshot *model.Snapshot
	if req.Type == "technique" && req.TechniqueID != nil {
		techDoc, err := h.fs.Collection("techniques").Doc(*req.TechniqueID).Get(ctx)
		if err == nil {
			name, _ := techDoc.DataAt("name")
			if nameStr, ok := name.(string); ok {
				snapshot = &model.Snapshot{Name: nameStr}
			}
		}
	} else if req.Type == "asset" && req.AssetID != nil {
		assetDoc, err := h.fs.Collection("assets").Doc(*req.AssetID).Get(ctx)
		if err == nil {
			s := &model.Snapshot{}
			if name, _ := assetDoc.DataAt("title"); name != nil {
				if nameStr, ok := name.(string); ok {
					s.Name = nameStr
				}
			}
			if thumb, _ := assetDoc.DataAt("thumbnailUrl"); thumb != nil {
				if thumbStr, ok := thumb.(string); ok {
					s.ThumbnailURL = thumbStr
				}
			}
			if u, _ := assetDoc.DataAt("url"); u != nil {
				if uStr, ok := u.(string); ok {
					s.URL = uStr
				}
			}
			snapshot = s
		}
	}

	now := time.Now()
	data := map[string]interface{}{
		"type":        req.Type,
		"techniqueId": req.TechniqueID,
		"assetId":     req.AssetID,
		"title":       req.Title,
		"details":     req.Details,
		"ord":         maxOrd + 1,
		"snapshot":    snapshot,
		"createdAt":   now,
		"updatedAt":   now,
	}

	ref, _, err := elemColl.Add(ctx, data)
	if err != nil {
		slog.Error("failed to create element", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to create element")
		return
	}

	// Update curriculum updatedAt
	h.fs.Collection("curricula").Doc(curriculumID).Update(ctx, []firestore.Update{
		{Path: "updatedAt", Value: now},
	})

	elem := model.CurriculumElement{
		ID:          ref.ID,
		Type:        model.ElementType(req.Type),
		TechniqueID: req.TechniqueID,
		AssetID:     req.AssetID,
		Title:       req.Title,
		Details:     req.Details,
		Ord:         maxOrd + 1,
		Snapshot:    snapshot,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	writeJSON(w, http.StatusCreated, elem)
}

func (h *ElementHandler) UpdateElement(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := middleware.GetUserUID(ctx)
	curriculumID := chi.URLParam(r, "id")
	elemID := chi.URLParam(r, "elemId")

	// Verify ownership
	cDoc, err := h.fs.Collection("curricula").Doc(curriculumID).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "curriculum not found")
		} else {
			writeError(w, http.StatusInternalServerError, "failed to get curriculum")
		}
		return
	}
	ownerUID, _ := cDoc.DataAt("ownerUid")
	if ownerUID != uid {
		writeError(w, http.StatusForbidden, "not authorized")
		return
	}

	ref := h.fs.Collection("curricula").Doc(curriculumID).Collection("elements").Doc(elemID)
	_, err = ref.Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "element not found")
		} else {
			writeError(w, http.StatusInternalServerError, "failed to get element")
		}
		return
	}

	var req model.CreateElementRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	updates := []firestore.Update{
		{Path: "updatedAt", Value: time.Now()},
	}

	if req.Title != nil {
		updates = append(updates, firestore.Update{Path: "title", Value: req.Title})
	}
	if req.Details != nil {
		updates = append(updates, firestore.Update{Path: "details", Value: req.Details})
	}

	if _, err := ref.Update(ctx, updates); err != nil {
		slog.Error("failed to update element", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to update element")
		return
	}

	updatedDoc, err := ref.Get(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get updated element")
		return
	}

	var updated model.CurriculumElement
	if err := updatedDoc.DataTo(&updated); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to parse updated element")
		return
	}
	updated.ID = elemID

	writeJSON(w, http.StatusOK, updated)
}

func (h *ElementHandler) DeleteElement(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := middleware.GetUserUID(ctx)
	curriculumID := chi.URLParam(r, "id")
	elemID := chi.URLParam(r, "elemId")

	// Verify ownership
	cDoc, err := h.fs.Collection("curricula").Doc(curriculumID).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "curriculum not found")
		} else {
			writeError(w, http.StatusInternalServerError, "failed to get curriculum")
		}
		return
	}
	ownerUID, _ := cDoc.DataAt("ownerUid")
	if ownerUID != uid {
		writeError(w, http.StatusForbidden, "not authorized")
		return
	}

	ref := h.fs.Collection("curricula").Doc(curriculumID).Collection("elements").Doc(elemID)
	if _, err := ref.Delete(ctx); err != nil {
		slog.Error("failed to delete element", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to delete element")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ElementHandler) ReorderElements(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := middleware.GetUserUID(ctx)
	curriculumID := chi.URLParam(r, "id")

	// Verify ownership
	cDoc, err := h.fs.Collection("curricula").Doc(curriculumID).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "curriculum not found")
		} else {
			writeError(w, http.StatusInternalServerError, "failed to get curriculum")
		}
		return
	}
	ownerUID, _ := cDoc.DataAt("ownerUid")
	if ownerUID != uid {
		writeError(w, http.StatusForbidden, "not authorized")
		return
	}

	var req model.ReorderElementsRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if len(req.OrderedIDs) == 0 {
		writeError(w, http.StatusBadRequest, "orderedIds must not be empty")
		return
	}

	elemColl := h.fs.Collection("curricula").Doc(curriculumID).Collection("elements")
	batch := h.fs.Batch()
	now := time.Now()

	for i, elemID := range req.OrderedIDs {
		ref := elemColl.Doc(elemID)
		batch.Update(ref, []firestore.Update{
			{Path: "ord", Value: i + 1},
			{Path: "updatedAt", Value: now},
		})
	}

	// Also update curriculum updatedAt
	batch.Update(h.fs.Collection("curricula").Doc(curriculumID), []firestore.Update{
		{Path: "updatedAt", Value: now},
	})

	if _, err := batch.Commit(ctx); err != nil {
		slog.Error("failed to reorder elements", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to reorder elements")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
