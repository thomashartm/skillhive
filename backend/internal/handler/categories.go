package handler

import (
	"context"
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

type CategoryHandler struct {
	fs *firestore.Client
}

func NewCategoryHandler(fs *firestore.Client) *CategoryHandler {
	return &CategoryHandler{fs: fs}
}

func (h *CategoryHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := middleware.GetUserUID(ctx)
	disciplineID := r.URL.Query().Get("disciplineId")
	asTree := r.URL.Query().Get("tree") == "true"

	if disciplineID == "" {
		writeError(w, http.StatusBadRequest, "disciplineId query parameter is required")
		return
	}

	query := h.fs.Collection("categories").
		Where("disciplineId", "==", disciplineID).
		Where("ownerUid", "in", []string{uid, "system"}).
		OrderBy("name", firestore.Asc)

	iter := query.Documents(ctx)
	defer iter.Stop()

	categories := []model.Category{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			slog.Error("failed to list categories", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to list categories")
			return
		}

		var c model.Category
		if err := doc.DataTo(&c); err != nil {
			slog.Error("failed to parse category", "docID", doc.Ref.ID, "error", err)
			continue
		}
		c.ID = doc.Ref.ID
		categories = append(categories, c)
	}

	if asTree {
		tree := buildCategoryTree(categories)
		writeJSON(w, http.StatusOK, tree)
		return
	}

	writeJSON(w, http.StatusOK, categories)
}

func buildCategoryTree(flat []model.Category) []model.Category {
	byID := make(map[string]*model.Category)
	for i := range flat {
		flat[i].Children = []model.Category{}
		byID[flat[i].ID] = &flat[i]
	}

	var roots []model.Category
	for i := range flat {
		if flat[i].ParentID == nil || *flat[i].ParentID == "" {
			roots = append(roots, flat[i])
		} else {
			parent, ok := byID[*flat[i].ParentID]
			if ok {
				parent.Children = append(parent.Children, flat[i])
			} else {
				roots = append(roots, flat[i])
			}
		}
	}

	if roots == nil {
		roots = []model.Category{}
	}
	return roots
}

func (h *CategoryHandler) Get(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := middleware.GetUserUID(ctx)
	id := chi.URLParam(r, "id")

	doc, err := h.fs.Collection("categories").Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "category not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get category")
		return
	}

	var c model.Category
	if err := doc.DataTo(&c); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to parse category")
		return
	}
	c.ID = doc.Ref.ID

	if c.OwnerUID != uid && c.OwnerUID != "system" {
		writeError(w, http.StatusNotFound, "category not found")
		return
	}

	writeJSON(w, http.StatusOK, c)
}

func (h *CategoryHandler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := middleware.GetUserUID(ctx)
	disciplineID := r.URL.Query().Get("disciplineId")

	if disciplineID == "" {
		writeError(w, http.StatusBadRequest, "disciplineId query parameter is required")
		return
	}

	var req model.CreateCategoryRequest
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

	slug := validate.GenerateSlug(req.Name)

	// Validate parent exists and belongs to same discipline
	if req.ParentID != nil && *req.ParentID != "" {
		parentDoc, err := h.fs.Collection("categories").Doc(*req.ParentID).Get(ctx)
		if err != nil {
			writeError(w, http.StatusBadRequest, "parent category not found")
			return
		}
		parentDiscipline, _ := parentDoc.DataAt("disciplineId")
		if parentDiscipline != disciplineID {
			writeError(w, http.StatusBadRequest, "parent category must belong to the same discipline")
			return
		}
	}

	// Check slug uniqueness
	existing := h.fs.Collection("categories").
		Where("disciplineId", "==", disciplineID).
		Where("ownerUid", "==", uid).
		Where("slug", "==", slug).
		Limit(1).
		Documents(ctx)
	defer existing.Stop()
	if doc, err := existing.Next(); err == nil && doc != nil {
		writeError(w, http.StatusConflict, "a category with this name already exists in this discipline")
		return
	}

	now := time.Now()
	data := map[string]interface{}{
		"disciplineId": disciplineID,
		"name":         validate.StripAllHTML(req.Name),
		"slug":         slug,
		"description":  validate.StripAllHTML(req.Description),
		"parentId":     req.ParentID,
		"ownerUid":     uid,
		"createdAt":    now,
		"updatedAt":    now,
	}

	ref, _, err := h.fs.Collection("categories").Add(ctx, data)
	if err != nil {
		slog.Error("failed to create category", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to create category")
		return
	}

	c := model.Category{
		ID:           ref.ID,
		DisciplineID: disciplineID,
		Name:         data["name"].(string),
		Slug:         slug,
		Description:  data["description"].(string),
		ParentID:     req.ParentID,
		OwnerUID:     uid,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	writeJSON(w, http.StatusCreated, c)
}

func (h *CategoryHandler) Update(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := middleware.GetUserUID(ctx)
	id := chi.URLParam(r, "id")

	ref := h.fs.Collection("categories").Doc(id)
	doc, err := ref.Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "category not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get category")
		return
	}

	var existing model.Category
	if err := doc.DataTo(&existing); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to parse category")
		return
	}

	if existing.OwnerUID != uid {
		writeError(w, http.StatusNotFound, "category not found")
		return
	}

	var req model.UpdateCategoryRequest
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
		updates = append(updates,
			firestore.Update{Path: "name", Value: name},
			firestore.Update{Path: "slug", Value: validate.GenerateSlug(name)},
		)
	}
	if req.Description != nil {
		updates = append(updates, firestore.Update{Path: "description", Value: validate.StripAllHTML(*req.Description)})
	}
	if req.ParentID != nil {
		// Prevent self-reference
		if *req.ParentID == id {
			writeError(w, http.StatusBadRequest, "category cannot be its own parent")
			return
		}
		// Prevent circular reference
		if *req.ParentID != "" {
			if isCircular(ctx, h.fs, id, *req.ParentID) {
				writeError(w, http.StatusBadRequest, "circular category reference detected")
				return
			}
		}
		updates = append(updates, firestore.Update{Path: "parentId", Value: req.ParentID})
	}

	if _, err := ref.Update(ctx, updates); err != nil {
		slog.Error("failed to update category", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to update category")
		return
	}

	updatedDoc, err := ref.Get(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get updated category")
		return
	}

	var updated model.Category
	if err := updatedDoc.DataTo(&updated); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to parse updated category")
		return
	}
	updated.ID = id

	writeJSON(w, http.StatusOK, updated)
}

func isCircular(ctx context.Context, fs *firestore.Client, targetID, parentID string) bool {
	// Walk up the parent chain; if we find targetID, it's circular
	visited := map[string]bool{targetID: true}
	current := parentID
	for i := 0; i < 20; i++ { // safety limit
		if current == "" {
			return false
		}
		if visited[current] {
			return true
		}
		visited[current] = true

		doc, err := fs.Collection("categories").Doc(current).Get(ctx)
		if err != nil {
			return false
		}
		pid, _ := doc.DataAt("parentId")
		if pid == nil {
			return false
		}
		pidStr, ok := pid.(string)
		if !ok || pidStr == "" {
			return false
		}
		current = pidStr
	}
	return true
}

func (h *CategoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := middleware.GetUserUID(ctx)
	id := chi.URLParam(r, "id")

	ref := h.fs.Collection("categories").Doc(id)
	doc, err := ref.Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "category not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get category")
		return
	}

	var existing model.Category
	if err := doc.DataTo(&existing); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to parse category")
		return
	}

	if existing.OwnerUID != uid {
		writeError(w, http.StatusNotFound, "category not found")
		return
	}

	// Reassign children to grandparent (or null)
	children := h.fs.Collection("categories").
		Where("parentId", "==", id).
		Documents(ctx)
	defer children.Stop()

	batch := h.fs.Batch()
	for {
		childDoc, err := children.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			slog.Error("failed to query children", "error", err)
			break
		}
		batch.Update(childDoc.Ref, []firestore.Update{
			{Path: "parentId", Value: existing.ParentID},
			{Path: "updatedAt", Value: time.Now()},
		})
	}

	batch.Delete(ref)

	if _, err := batch.Commit(ctx); err != nil {
		slog.Error("failed to delete category", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to delete category")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
