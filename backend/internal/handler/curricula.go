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

type CurriculumHandler struct {
	fs *firestore.Client
}

func NewCurriculumHandler(fs *firestore.Client) *CurriculumHandler {
	return &CurriculumHandler{fs: fs}
}

func (h *CurriculumHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	disciplineID := r.URL.Query().Get("disciplineId")

	query := h.fs.Collection("curricula").OrderBy("updatedAt", firestore.Desc)
	if disciplineID != "" {
		query = h.fs.Collection("curricula").
			Where("disciplineId", "==", disciplineID).
			OrderBy("updatedAt", firestore.Desc)
	}

	iter := query.Documents(ctx)
	defer iter.Stop()

	curricula := []model.Curriculum{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			slog.Error("failed to list curricula", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to list curricula")
			return
		}

		var c model.Curriculum
		if err := doc.DataTo(&c); err != nil {
			slog.Error("failed to parse curriculum", "docID", doc.Ref.ID, "error", err)
			continue
		}
		c.ID = doc.Ref.ID

		// Count elements
		elemIter := doc.Ref.Collection("elements").Documents(ctx)
		count := 0
		for {
			_, err := elemIter.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				break
			}
			count++
		}
		elemIter.Stop()
		c.ElementCount = count

		curricula = append(curricula, c)
	}

	writeJSON(w, http.StatusOK, curricula)
}

func (h *CurriculumHandler) ListPublic(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	query := h.fs.Collection("curricula").
		Where("isPublic", "==", true).
		OrderBy("updatedAt", firestore.Desc)

	iter := query.Documents(ctx)
	defer iter.Stop()

	curricula := []model.Curriculum{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			slog.Error("failed to list public curricula", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to list public curricula")
			return
		}

		var c model.Curriculum
		if err := doc.DataTo(&c); err != nil {
			slog.Error("failed to parse curriculum", "docID", doc.Ref.ID, "error", err)
			continue
		}
		c.ID = doc.Ref.ID
		curricula = append(curricula, c)
	}

	writeJSON(w, http.StatusOK, curricula)
}

func (h *CurriculumHandler) Get(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	doc, err := h.fs.Collection("curricula").Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "curriculum not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get curriculum")
		return
	}

	var c model.Curriculum
	if err := doc.DataTo(&c); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to parse curriculum")
		return
	}
	c.ID = doc.Ref.ID

	writeJSON(w, http.StatusOK, c)
}

func (h *CurriculumHandler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := middleware.GetUserUID(ctx)
	disciplineID := r.URL.Query().Get("disciplineId")

	if disciplineID == "" {
		writeError(w, http.StatusBadRequest, "disciplineId query parameter is required")
		return
	}

	if err := middleware.RequireEditor(ctx, disciplineID); err != nil {
		writeError(w, http.StatusForbidden, "editor role required")
		return
	}

	var req model.CreateCurriculumRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := validate.Required("title", req.Title); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := validate.StringLength("title", req.Title, 1, 200); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	now := time.Now()
	data := map[string]interface{}{
		"disciplineId": disciplineID,
		"title":        validate.StripAllHTML(req.Title),
		"description":  validate.StripAllHTML(req.Description),
		"isPublic":     req.IsPublic,
		"ownerUid":     uid,
		"createdAt":    now,
		"updatedAt":    now,
	}

	ref, _, err := h.fs.Collection("curricula").Add(ctx, data)
	if err != nil {
		slog.Error("failed to create curriculum", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to create curriculum")
		return
	}

	c := model.Curriculum{
		ID:           ref.ID,
		DisciplineID: disciplineID,
		Title:        data["title"].(string),
		Description:  data["description"].(string),
		IsPublic:     req.IsPublic,
		OwnerUID:     uid,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	writeJSON(w, http.StatusCreated, c)
}

func (h *CurriculumHandler) Update(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	ref := h.fs.Collection("curricula").Doc(id)
	doc, err := ref.Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "curriculum not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get curriculum")
		return
	}

	var existing model.Curriculum
	if err := doc.DataTo(&existing); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to parse curriculum")
		return
	}

	if err := middleware.RequireEditor(ctx, existing.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "editor role required")
		return
	}

	var req model.UpdateCurriculumRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	updates := []firestore.Update{
		{Path: "updatedAt", Value: time.Now()},
	}

	if req.Title != nil {
		title := validate.StripAllHTML(*req.Title)
		if err := validate.StringLength("title", title, 1, 200); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		updates = append(updates, firestore.Update{Path: "title", Value: title})
	}
	if req.Description != nil {
		updates = append(updates, firestore.Update{Path: "description", Value: validate.StripAllHTML(*req.Description)})
	}
	if req.IsPublic != nil {
		updates = append(updates, firestore.Update{Path: "isPublic", Value: *req.IsPublic})
	}

	if _, err := ref.Update(ctx, updates); err != nil {
		slog.Error("failed to update curriculum", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to update curriculum")
		return
	}

	updatedDoc, err := ref.Get(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get updated curriculum")
		return
	}

	var updated model.Curriculum
	if err := updatedDoc.DataTo(&updated); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to parse updated curriculum")
		return
	}
	updated.ID = id

	writeJSON(w, http.StatusOK, updated)
}

func (h *CurriculumHandler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	ref := h.fs.Collection("curricula").Doc(id)
	doc, err := ref.Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "curriculum not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get curriculum")
		return
	}

	var existing model.Curriculum
	if err := doc.DataTo(&existing); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to parse curriculum")
		return
	}

	if err := middleware.RequireEditor(ctx, existing.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "editor role required")
		return
	}

	// Delete all elements in subcollection first (no cascade in Firestore)
	elemIter := ref.Collection("elements").Documents(ctx)
	defer elemIter.Stop()

	batch := h.fs.Batch()
	batchCount := 0
	for {
		elemDoc, err := elemIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			slog.Error("failed to iterate elements", "error", err)
			break
		}
		batch.Delete(elemDoc.Ref)
		batchCount++

		// Firestore batch limit is 500
		if batchCount >= 499 {
			if _, err := batch.Commit(ctx); err != nil {
				slog.Error("failed to delete elements batch", "error", err)
			}
			batch = h.fs.Batch()
			batchCount = 0
		}
	}

	batch.Delete(ref)

	if _, err := batch.Commit(ctx); err != nil {
		slog.Error("failed to delete curriculum", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to delete curriculum")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
