package handler

import (
	"context"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/go-chi/chi/v5"
	"github.com/thomas/skillhive-api/internal/enrich"
	"github.com/thomas/skillhive-api/internal/middleware"
	"github.com/thomas/skillhive-api/internal/model"
	"github.com/thomas/skillhive-api/internal/validate"
	"github.com/thomas/skillhive-api/internal/youtube"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AssetHandler struct {
	fs        *firestore.Client
	pipeline  *enrich.Pipeline
	enrichCtx context.Context
}

func NewAssetHandler(fs *firestore.Client, pipeline *enrich.Pipeline, enrichCtx context.Context) *AssetHandler {
	return &AssetHandler{fs: fs, pipeline: pipeline, enrichCtx: enrichCtx}
}

// normalizeAsset normalizes an asset read from Firestore for backward compatibility.
// Existing assets have no "active" field; Firestore returns false for missing booleans.
// If processingStatus is empty (legacy asset) and active is false, normalize to true.
func normalizeAsset(a *model.Asset) {
	if a.TechniqueIDs == nil {
		a.TechniqueIDs = []string{}
	}
	if a.CategoryIDs == nil {
		a.CategoryIDs = []string{}
	}
	if a.TagIDs == nil {
		a.TagIDs = []string{}
	}
	// Backward compat: legacy assets (no processingStatus) should be treated as active
	if a.ProcessingStatus == "" && !a.Active {
		a.Active = true
	}
}

func (h *AssetHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	disciplineID := r.URL.Query().Get("disciplineId")

	if disciplineID == "" {
		writeError(w, http.StatusBadRequest, "disciplineId query parameter is required")
		return
	}

	query := h.fs.Collection("assets").
		Where("disciplineId", "==", disciplineID)

	techniqueID := r.URL.Query().Get("techniqueId")
	categoryID := r.URL.Query().Get("categoryId")
	tagID := r.URL.Query().Get("tagId")

	if techniqueID != "" {
		query = query.Where("techniqueIds", "array-contains", techniqueID)
	} else if categoryID != "" {
		query = query.Where("categoryIds", "array-contains", categoryID)
	} else if tagID != "" {
		query = query.Where("tagIds", "array-contains", tagID)
	}

	query = query.OrderBy("createdAt", firestore.Desc)

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

	// Check if admin wants to include inactive assets
	includeInactive := r.URL.Query().Get("includeInactive") == "true"
	isAdmin := middleware.GetUserRole(ctx, disciplineID) == "admin"

	assets := []model.Asset{}
	searchQuery := r.URL.Query().Get("q")

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			slog.Error("failed to list assets", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to list assets")
			return
		}

		var a model.Asset
		if err := doc.DataTo(&a); err != nil {
			slog.Error("failed to parse asset", "docID", doc.Ref.ID, "error", err)
			continue
		}
		a.ID = doc.Ref.ID
		normalizeAsset(&a)

		// Filter out inactive assets for non-admin users
		if !a.Active && !(isAdmin && includeInactive) {
			continue
		}

		// Client-side title search
		if searchQuery != "" {
			slug := validate.GenerateSlug(searchQuery)
			titleSlug := validate.GenerateSlug(a.Title)
			if len(slug) > 0 && (len(titleSlug) < len(slug) || titleSlug[:len(slug)] != slug) {
				continue
			}
		}

		assets = append(assets, a)
	}

	writeJSON(w, http.StatusOK, assets)
}

func (h *AssetHandler) Get(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	doc, err := h.fs.Collection("assets").Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "asset not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get asset")
		return
	}

	var a model.Asset
	if err := doc.DataTo(&a); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to parse asset")
		return
	}
	a.ID = doc.Ref.ID
	normalizeAsset(&a)

	// Non-admin users cannot see inactive assets
	if !a.Active {
		isAdmin := middleware.GetUserRole(ctx, a.DisciplineID) == "admin"
		if !isAdmin {
			writeError(w, http.StatusNotFound, "asset not found")
			return
		}
	}

	writeJSON(w, http.StatusOK, a)
}

func (h *AssetHandler) Create(w http.ResponseWriter, r *http.Request) {
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

	var req model.CreateAssetRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := validate.Required("url", req.URL); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Determine if this is a YouTube URL for enrichment
	isYouTube := youtube.IsYouTubeURL(req.URL)
	enrichmentEnabled := isYouTube && h.pipeline != nil

	// Title validation: optional for YouTube enrichment, required otherwise
	if !enrichmentEnabled {
		if err := validate.Required("title", req.Title); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
	}
	if req.Title != "" {
		if err := validate.StringLength("title", req.Title, 1, 300); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	if req.Type == "" {
		req.Type = "video"
	}
	if err := validate.EnumWhitelist("type", req.Type, []string{"video", "web", "image"}); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.TechniqueIDs == nil {
		req.TechniqueIDs = []string{}
	}
	if req.CategoryIDs == nil {
		req.CategoryIDs = []string{}
	}
	if req.TagIDs == nil {
		req.TagIDs = []string{}
	}

	now := time.Now()
	title := validate.StripAllHTML(req.Title)
	if enrichmentEnabled && title == "" {
		title = "Processing..."
	}

	// Determine active status and processing status
	active := true
	processingStatus := ""
	if enrichmentEnabled {
		active = false
		processingStatus = "pending"
	}

	data := map[string]interface{}{
		"disciplineId":     disciplineID,
		"url":              req.URL,
		"title":            title,
		"description":      validate.StripAllHTML(req.Description),
		"type":             req.Type,
		"videoType":        req.VideoType,
		"originator":       req.Originator,
		"thumbnailUrl":     req.ThumbnailURL,
		"techniqueIds":     req.TechniqueIDs,
		"categoryIds":      req.CategoryIDs,
		"tagIds":           req.TagIDs,
		"ownerUid":         uid,
		"active":           active,
		"processingStatus": processingStatus,
		"createdAt":        now,
		"updatedAt":        now,
	}

	ref, _, err := h.fs.Collection("assets").Add(ctx, data)
	if err != nil {
		slog.Error("failed to create asset", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to create asset")
		return
	}

	// Trigger async enrichment for YouTube URLs
	if enrichmentEnabled {
		go h.pipeline.EnrichAsset(h.enrichCtx, ref.ID, req.URL, disciplineID, uid)
	}

	a := model.Asset{
		ID:               ref.ID,
		DisciplineID:     disciplineID,
		URL:              req.URL,
		Title:            title,
		Description:      data["description"].(string),
		Type:             model.AssetType(req.Type),
		VideoType:        req.VideoType,
		Originator:       req.Originator,
		ThumbnailURL:     req.ThumbnailURL,
		TechniqueIDs:     req.TechniqueIDs,
		CategoryIDs:      req.CategoryIDs,
		TagIDs:           req.TagIDs,
		OwnerUID:         uid,
		Active:           active,
		ProcessingStatus: processingStatus,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	writeJSON(w, http.StatusCreated, a)
}

func (h *AssetHandler) Update(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	ref := h.fs.Collection("assets").Doc(id)
	doc, err := ref.Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "asset not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get asset")
		return
	}

	var existing model.Asset
	if err := doc.DataTo(&existing); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to parse asset")
		return
	}

	if err := middleware.RequireEditor(ctx, existing.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "editor role required")
		return
	}

	var req model.UpdateAssetRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	updates := []firestore.Update{
		{Path: "updatedAt", Value: time.Now()},
	}

	if req.URL != nil {
		updates = append(updates, firestore.Update{Path: "url", Value: *req.URL})
	}
	if req.Title != nil {
		title := validate.StripAllHTML(*req.Title)
		if err := validate.StringLength("title", title, 1, 300); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		updates = append(updates, firestore.Update{Path: "title", Value: title})
	}
	if req.Description != nil {
		updates = append(updates, firestore.Update{Path: "description", Value: validate.StripAllHTML(*req.Description)})
	}
	if req.Type != nil {
		if err := validate.EnumWhitelist("type", *req.Type, []string{"video", "web", "image"}); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		updates = append(updates, firestore.Update{Path: "type", Value: *req.Type})
	}
	if req.VideoType != nil {
		updates = append(updates, firestore.Update{Path: "videoType", Value: req.VideoType})
	}
	if req.Originator != nil {
		updates = append(updates, firestore.Update{Path: "originator", Value: req.Originator})
	}
	if req.ThumbnailURL != nil {
		updates = append(updates, firestore.Update{Path: "thumbnailUrl", Value: req.ThumbnailURL})
	}
	if req.TechniqueIDs != nil {
		updates = append(updates, firestore.Update{Path: "techniqueIds", Value: req.TechniqueIDs})
	}
	if req.CategoryIDs != nil {
		updates = append(updates, firestore.Update{Path: "categoryIds", Value: req.CategoryIDs})
	}
	if req.TagIDs != nil {
		updates = append(updates, firestore.Update{Path: "tagIds", Value: req.TagIDs})
	}

	if _, err := ref.Update(ctx, updates); err != nil {
		slog.Error("failed to update asset", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to update asset")
		return
	}

	updatedDoc, err := ref.Get(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get updated asset")
		return
	}

	var updated model.Asset
	if err := updatedDoc.DataTo(&updated); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to parse updated asset")
		return
	}
	updated.ID = id
	normalizeAsset(&updated)

	writeJSON(w, http.StatusOK, updated)
}

func (h *AssetHandler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	ref := h.fs.Collection("assets").Doc(id)
	doc, err := ref.Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			writeError(w, http.StatusNotFound, "asset not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get asset")
		return
	}

	var existing model.Asset
	if err := doc.DataTo(&existing); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to parse asset")
		return
	}

	if err := middleware.RequireEditor(ctx, existing.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "editor role required")
		return
	}

	if _, err := ref.Delete(ctx); err != nil {
		slog.Error("failed to delete asset", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to delete asset")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
