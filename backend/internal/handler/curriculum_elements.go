package handler

import (
	"log/slog"
	"net/http"
	"net/url"
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

// verifyCurriculumAccess checks if the curriculum exists and the user can view it.
// Returns (curriculumID, ok).
func (h *ElementHandler) verifyCurriculumAccess(w http.ResponseWriter, r *http.Request) (string, bool) {
	curriculumID := chi.URLParam(r, "id")

	doc, err := h.fs.Collection("curricula").Doc(curriculumID).Get(r.Context())
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "curriculum not found")
		} else {
			writeError(w, http.StatusInternalServerError, "failed to get curriculum")
		}
		return "", false
	}

	_ = doc // curriculum exists, any authenticated user can read
	return curriculumID, true
}

// verifyCurriculumEditor checks if the curriculum exists and the user has editor+ role.
// Returns (curriculumID, ok).
func (h *ElementHandler) verifyCurriculumEditor(w http.ResponseWriter, r *http.Request) (string, bool) {
	ctx := r.Context()
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

	disciplineID, _ := doc.DataAt("disciplineId")
	disciplineStr, _ := disciplineID.(string)

	if err := middleware.RequireEditor(ctx, disciplineStr); err != nil {
		writeError(w, http.StatusForbidden, "editor role required")
		return "", false
	}

	return curriculumID, true
}

func (h *ElementHandler) ListElements(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	curriculumID, ok := h.verifyCurriculumAccess(w, r)
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
		if e.Items == nil {
			e.Items = []string{}
		}
		elements = append(elements, e)
	}

	writeJSON(w, http.StatusOK, elements)
}

func (h *ElementHandler) CreateElement(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	curriculumID, ok := h.verifyCurriculumEditor(w, r)
	if !ok {
		return
	}

	var req model.CreateElementRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := validate.EnumWhitelist("type", req.Type, []string{"technique", "asset", "text", "image", "list"}); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Type-specific validation
	switch req.Type {
	case "image":
		if req.ImageURL == nil || *req.ImageURL == "" {
			writeError(w, http.StatusBadRequest, "imageUrl is required for image elements")
			return
		}
		if _, err := url.ParseRequestURI(*req.ImageURL); err != nil {
			writeError(w, http.StatusBadRequest, "imageUrl must be a valid URL")
			return
		}
	case "list":
		if req.Title == nil || *req.Title == "" {
			writeError(w, http.StatusBadRequest, "title is required for list elements")
			return
		}
	case "text":
		if req.Title == nil || *req.Title == "" {
			writeError(w, http.StatusBadRequest, "title is required for text elements")
			return
		}
	}

	// Sanitize inputs
	if req.Title != nil {
		s := validate.StripAllHTML(*req.Title)
		req.Title = &s
	}
	if req.Details != nil {
		if req.Type == "text" || req.Type == "list" {
			s := validate.SanitizeMarkdown(*req.Details)
			req.Details = &s
		} else {
			s := validate.StripAllHTML(*req.Details)
			req.Details = &s
		}
	}
	if req.Duration != nil {
		s := validate.StripAllHTML(*req.Duration)
		req.Duration = &s
	}
	for i, item := range req.Items {
		req.Items[i] = validate.StripAllHTML(item)
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
		"imageUrl":    req.ImageURL,
		"duration":    req.Duration,
		"items":       req.Items,
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
		ImageURL:    req.ImageURL,
		Duration:    req.Duration,
		Items:       req.Items,
		Ord:         maxOrd + 1,
		Snapshot:    snapshot,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	writeJSON(w, http.StatusCreated, elem)
}

func (h *ElementHandler) UpdateElement(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	curriculumID, ok := h.verifyCurriculumEditor(w, r)
	if !ok {
		return
	}
	elemID := chi.URLParam(r, "elemId")

	ref := h.fs.Collection("curricula").Doc(curriculumID).Collection("elements").Doc(elemID)
	existingDoc, err := ref.Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "element not found")
		} else {
			writeError(w, http.StatusInternalServerError, "failed to get element")
		}
		return
	}

	// Read element type for sanitization routing
	elemType, _ := existingDoc.DataAt("type")
	elemTypeStr, _ := elemType.(string)

	var req model.CreateElementRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	updates := []firestore.Update{
		{Path: "updatedAt", Value: time.Now()},
	}

	if req.Title != nil {
		s := validate.StripAllHTML(*req.Title)
		updates = append(updates, firestore.Update{Path: "title", Value: &s})
	}
	if req.Details != nil {
		if elemTypeStr == "text" || elemTypeStr == "list" {
			s := validate.SanitizeMarkdown(*req.Details)
			updates = append(updates, firestore.Update{Path: "details", Value: &s})
		} else {
			s := validate.StripAllHTML(*req.Details)
			updates = append(updates, firestore.Update{Path: "details", Value: &s})
		}
	}
	if req.Duration != nil {
		s := validate.StripAllHTML(*req.Duration)
		updates = append(updates, firestore.Update{Path: "duration", Value: &s})
	}
	if req.ImageURL != nil {
		if _, err := url.ParseRequestURI(*req.ImageURL); err != nil {
			writeError(w, http.StatusBadRequest, "imageUrl must be a valid URL")
			return
		}
		updates = append(updates, firestore.Update{Path: "imageUrl", Value: req.ImageURL})
	}
	if req.Items != nil {
		for i, item := range req.Items {
			req.Items[i] = validate.StripAllHTML(item)
		}
		updates = append(updates, firestore.Update{Path: "items", Value: req.Items})
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
	curriculumID, ok := h.verifyCurriculumEditor(w, r)
	if !ok {
		return
	}
	elemID := chi.URLParam(r, "elemId")

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
	curriculumID, ok := h.verifyCurriculumEditor(w, r)
	if !ok {
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
