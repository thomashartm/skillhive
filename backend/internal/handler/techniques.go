package handler

import (
	"log/slog"
	"net/http"
	"strconv"
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

type TechniqueHandler struct {
	fs *firestore.Client
}

func NewTechniqueHandler(fs *firestore.Client) *TechniqueHandler {
	return &TechniqueHandler{fs: fs}
}

func (h *TechniqueHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	disciplineID := r.URL.Query().Get("disciplineId")

	if disciplineID == "" {
		writeError(w, http.StatusBadRequest, "disciplineId query parameter is required")
		return
	}

	query := h.fs.Collection("techniques").
		Where("disciplineId", "==", disciplineID)

	// Filter by category (array-contains)
	categoryID := r.URL.Query().Get("categoryId")
	tagID := r.URL.Query().Get("tagId")

	if categoryID != "" {
		query = query.Where("categoryIds", "array-contains", categoryID)
	} else if tagID != "" {
		// Can't combine two array-contains, so only one at a time
		query = query.Where("tagIds", "array-contains", tagID)
	}

	query = query.OrderBy("name", firestore.Asc)

	// Pagination (optional - no limit by default, returns all)
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			query = query.Limit(parsed)
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed > 0 {
			query = query.Offset(parsed)
		}
	}

	iter := query.Documents(ctx)
	defer iter.Stop()

	techniques := []model.Technique{}
	searchQuery := r.URL.Query().Get("q")

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			slog.Error("failed to list techniques", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to list techniques")
			return
		}

		var t model.Technique
		if err := doc.DataTo(&t); err != nil {
			slog.Error("failed to parse technique", "docID", doc.Ref.ID, "error", err)
			continue
		}
		t.ID = doc.Ref.ID

		// Normalize nil slices to empty arrays for JSON
		if t.CategoryIDs == nil {
			t.CategoryIDs = []string{}
		}
		if t.TagIDs == nil {
			t.TagIDs = []string{}
		}

		// Client-side text filter if search query provided
		if searchQuery != "" {
			lower := validate.GenerateSlug(searchQuery)
			slugMatch := len(lower) > 0 && len(t.Slug) >= len(lower) && t.Slug[:len(lower)] == lower
			if !slugMatch {
				continue
			}
		}

		// Client-side filter for tagId when categoryId was used with array-contains
		if categoryID != "" && tagID != "" {
			found := false
			for _, tid := range t.TagIDs {
				if tid == tagID {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}

		techniques = append(techniques, t)
	}

	writeJSON(w, http.StatusOK, techniques)
}

func (h *TechniqueHandler) Get(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	doc, err := h.fs.Collection("techniques").Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "technique not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get technique")
		return
	}

	var t model.Technique
	if err := doc.DataTo(&t); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to parse technique")
		return
	}
	t.ID = doc.Ref.ID

	// Normalize nil slices
	if t.CategoryIDs == nil {
		t.CategoryIDs = []string{}
	}
	if t.TagIDs == nil {
		t.TagIDs = []string{}
	}

	// Resolve categories
	if len(t.CategoryIDs) > 0 {
		t.Categories = []model.Category{}
		for _, catID := range t.CategoryIDs {
			catDoc, err := h.fs.Collection("categories").Doc(catID).Get(ctx)
			if err != nil {
				continue
			}
			var cat model.Category
			if err := catDoc.DataTo(&cat); err == nil {
				cat.ID = catDoc.Ref.ID
				t.Categories = append(t.Categories, cat)
			}
		}
	}

	// Resolve tags
	if len(t.TagIDs) > 0 {
		t.Tags = []model.Tag{}
		for _, tagID := range t.TagIDs {
			tagDoc, err := h.fs.Collection("tags").Doc(tagID).Get(ctx)
			if err != nil {
				continue
			}
			var tag model.Tag
			if err := tagDoc.DataTo(&tag); err == nil {
				tag.ID = tagDoc.Ref.ID
				t.Tags = append(t.Tags, tag)
			}
		}
	}

	writeJSON(w, http.StatusOK, t)
}

func (h *TechniqueHandler) Create(w http.ResponseWriter, r *http.Request) {
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

	var req model.CreateTechniqueRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := validate.Required("name", req.Name); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := validate.StringLength("name", req.Name, 1, 200); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	slug := validate.GenerateSlug(req.Name)

	// Check slug uniqueness
	existing := h.fs.Collection("techniques").
		Where("disciplineId", "==", disciplineID).
		Where("slug", "==", slug).
		Limit(1).
		Documents(ctx)
	defer existing.Stop()
	if doc, err := existing.Next(); err == nil && doc != nil {
		writeError(w, http.StatusConflict, "a technique with this name already exists in this discipline")
		return
	}

	if req.CategoryIDs == nil {
		req.CategoryIDs = []string{}
	}
	if req.TagIDs == nil {
		req.TagIDs = []string{}
	}

	now := time.Now()
	t := model.Technique{
		DisciplineID: disciplineID,
		Name:         validate.StripAllHTML(req.Name),
		Slug:         slug,
		Description:  validate.StripAllHTML(req.Description),
		CategoryIDs:  req.CategoryIDs,
		TagIDs:       req.TagIDs,
		OwnerUID:     uid,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	ref, _, err := h.fs.Collection("techniques").Add(ctx, map[string]interface{}{
		"disciplineId": t.DisciplineID,
		"name":         t.Name,
		"slug":         t.Slug,
		"description":  t.Description,
		"categoryIds":  t.CategoryIDs,
		"tagIds":       t.TagIDs,
		"ownerUid":     t.OwnerUID,
		"createdAt":    t.CreatedAt,
		"updatedAt":    t.UpdatedAt,
	})
	if err != nil {
		slog.Error("failed to create technique", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to create technique")
		return
	}

	t.ID = ref.ID
	writeJSON(w, http.StatusCreated, t)
}

func (h *TechniqueHandler) Update(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := middleware.GetUserUID(ctx)
	id := chi.URLParam(r, "id")

	ref := h.fs.Collection("techniques").Doc(id)
	doc, err := ref.Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "technique not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get technique")
		return
	}

	var existing model.Technique
	if err := doc.DataTo(&existing); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to parse technique")
		return
	}

	if err := middleware.RequireEditor(ctx, existing.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "editor role required")
		return
	}

	_ = uid // kept for ownership transfer below

	var req model.UpdateTechniqueRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	updates := []firestore.Update{
		{Path: "updatedAt", Value: time.Now()},
	}

	// Transfer ownership from system to user on edit
	if existing.OwnerUID == "system" {
		updates = append(updates, firestore.Update{Path: "ownerUid", Value: uid})
	}

	if req.Name != nil {
		name := validate.StripAllHTML(*req.Name)
		if err := validate.StringLength("name", name, 1, 200); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		updates = append(updates,
			firestore.Update{Path: "name", Value: name},
			firestore.Update{Path: "slug", Value: validate.GenerateSlug(name)},
		)
	}
	if req.Description != nil {
		updates = append(updates, firestore.Update{Path: "description", Value: validate.StripAllHTML(*req.Description)})
	}
	if req.CategoryIDs != nil {
		updates = append(updates, firestore.Update{Path: "categoryIds", Value: req.CategoryIDs})
	}
	if req.TagIDs != nil {
		updates = append(updates, firestore.Update{Path: "tagIds", Value: req.TagIDs})
	}

	if _, err := ref.Update(ctx, updates); err != nil {
		slog.Error("failed to update technique", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to update technique")
		return
	}

	updatedDoc, err := ref.Get(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get updated technique")
		return
	}

	var updated model.Technique
	if err := updatedDoc.DataTo(&updated); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to parse updated technique")
		return
	}
	updated.ID = id
	if updated.CategoryIDs == nil {
		updated.CategoryIDs = []string{}
	}
	if updated.TagIDs == nil {
		updated.TagIDs = []string{}
	}

	writeJSON(w, http.StatusOK, updated)
}

func (h *TechniqueHandler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	ref := h.fs.Collection("techniques").Doc(id)
	doc, err := ref.Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "technique not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get technique")
		return
	}

	var existing model.Technique
	if err := doc.DataTo(&existing); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to parse technique")
		return
	}

	if err := middleware.RequireEditor(ctx, existing.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "editor role required")
		return
	}

	if _, err := ref.Delete(ctx); err != nil {
		slog.Error("failed to delete technique", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to delete technique")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
