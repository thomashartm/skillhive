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

type TagHandler struct {
	fs *firestore.Client
}

func NewTagHandler(fs *firestore.Client) *TagHandler {
	return &TagHandler{fs: fs}
}

func (h *TagHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := middleware.GetUserUID(ctx)
	disciplineID := r.URL.Query().Get("disciplineId")

	if disciplineID == "" {
		writeError(w, http.StatusBadRequest, "disciplineId query parameter is required")
		return
	}

	query := h.fs.Collection("tags").
		Where("disciplineId", "==", disciplineID).
		Where("ownerUid", "==", uid).
		OrderBy("name", firestore.Asc)

	iter := query.Documents(ctx)
	defer iter.Stop()

	tags := []model.Tag{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			slog.Error("failed to list tags", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to list tags")
			return
		}

		var t model.Tag
		if err := doc.DataTo(&t); err != nil {
			slog.Error("failed to parse tag", "docID", doc.Ref.ID, "error", err)
			continue
		}
		t.ID = doc.Ref.ID
		tags = append(tags, t)
	}

	writeJSON(w, http.StatusOK, tags)
}

func (h *TagHandler) Get(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := middleware.GetUserUID(ctx)
	id := chi.URLParam(r, "id")

	doc, err := h.fs.Collection("tags").Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "tag not found")
			return
		}
		slog.Error("failed to get tag", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to get tag")
		return
	}

	var t model.Tag
	if err := doc.DataTo(&t); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to parse tag")
		return
	}
	t.ID = doc.Ref.ID

	if t.OwnerUID != uid {
		writeError(w, http.StatusNotFound, "tag not found")
		return
	}

	writeJSON(w, http.StatusOK, t)
}

func (h *TagHandler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := middleware.GetUserUID(ctx)
	disciplineID := r.URL.Query().Get("disciplineId")

	if disciplineID == "" {
		writeError(w, http.StatusBadRequest, "disciplineId query parameter is required")
		return
	}

	var req model.CreateTagRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := validate.Required("name", req.Name); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := validate.StringLength("name", req.Name, 1, 100); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := validate.MaxLength("description", req.Description, 500); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	slug := validate.GenerateSlug(req.Name)

	// Check slug uniqueness within discipline for this user
	existing := h.fs.Collection("tags").
		Where("disciplineId", "==", disciplineID).
		Where("ownerUid", "==", uid).
		Where("slug", "==", slug).
		Limit(1).
		Documents(ctx)
	defer existing.Stop()

	if doc, err := existing.Next(); err == nil && doc != nil {
		writeError(w, http.StatusConflict, "a tag with this name already exists in this discipline")
		return
	}

	now := time.Now()
	t := model.Tag{
		DisciplineID: disciplineID,
		Name:         validate.StripAllHTML(req.Name),
		Slug:         slug,
		Description:  validate.StripAllHTML(req.Description),
		Color:        req.Color,
		OwnerUID:     uid,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	ref, _, err := h.fs.Collection("tags").Add(ctx, map[string]interface{}{
		"disciplineId": t.DisciplineID,
		"name":         t.Name,
		"slug":         t.Slug,
		"description":  t.Description,
		"color":        t.Color,
		"ownerUid":     t.OwnerUID,
		"createdAt":    t.CreatedAt,
		"updatedAt":    t.UpdatedAt,
	})
	if err != nil {
		slog.Error("failed to create tag", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to create tag")
		return
	}

	t.ID = ref.ID
	writeJSON(w, http.StatusCreated, t)
}

func (h *TagHandler) Update(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := middleware.GetUserUID(ctx)
	id := chi.URLParam(r, "id")

	ref := h.fs.Collection("tags").Doc(id)
	doc, err := ref.Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "tag not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get tag")
		return
	}

	var existing model.Tag
	if err := doc.DataTo(&existing); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to parse tag")
		return
	}

	if existing.OwnerUID != uid {
		writeError(w, http.StatusNotFound, "tag not found")
		return
	}

	var req model.UpdateTagRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	updates := []firestore.Update{
		{Path: "updatedAt", Value: time.Now()},
	}

	if req.Name != nil {
		name := validate.StripAllHTML(*req.Name)
		if err := validate.StringLength("name", name, 1, 100); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		slug := validate.GenerateSlug(name)

		// Check slug uniqueness if name changed
		if slug != existing.Slug {
			check := h.fs.Collection("tags").
				Where("disciplineId", "==", existing.DisciplineID).
				Where("ownerUid", "==", uid).
				Where("slug", "==", slug).
				Limit(1).
				Documents(ctx)
			defer check.Stop()
			if d, err := check.Next(); err == nil && d != nil {
				writeError(w, http.StatusConflict, "a tag with this name already exists in this discipline")
				return
			}
		}

		updates = append(updates,
			firestore.Update{Path: "name", Value: name},
			firestore.Update{Path: "slug", Value: slug},
		)
	}
	if req.Description != nil {
		desc := validate.StripAllHTML(*req.Description)
		if err := validate.MaxLength("description", desc, 500); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		updates = append(updates, firestore.Update{Path: "description", Value: desc})
	}
	if req.Color != nil {
		updates = append(updates, firestore.Update{Path: "color", Value: req.Color})
	}

	if _, err := ref.Update(ctx, updates); err != nil {
		slog.Error("failed to update tag", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to update tag")
		return
	}

	// Fetch updated document
	updatedDoc, err := ref.Get(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get updated tag")
		return
	}

	var updated model.Tag
	if err := updatedDoc.DataTo(&updated); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to parse updated tag")
		return
	}
	updated.ID = id

	writeJSON(w, http.StatusOK, updated)
}

func (h *TagHandler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := middleware.GetUserUID(ctx)
	id := chi.URLParam(r, "id")

	ref := h.fs.Collection("tags").Doc(id)
	doc, err := ref.Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "tag not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get tag")
		return
	}

	var existing model.Tag
	if err := doc.DataTo(&existing); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to parse tag")
		return
	}

	if existing.OwnerUID != uid {
		writeError(w, http.StatusNotFound, "tag not found")
		return
	}

	if _, err := ref.Delete(ctx); err != nil {
		slog.Error("failed to delete tag", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to delete tag")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
