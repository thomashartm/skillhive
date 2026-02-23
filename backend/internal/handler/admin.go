package handler

import (
	"context"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"cloud.google.com/go/firestore"
	"firebase.google.com/go/v4/auth"
	"github.com/go-chi/chi/v5"
	"github.com/thomas/skillhive-api/internal/enrich"
	"github.com/thomas/skillhive-api/internal/middleware"
	"github.com/thomas/skillhive-api/internal/model"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

var validRoles = map[string]bool{
	"viewer": true,
	"editor": true,
	"admin":  true,
}

type AdminHandler struct {
	authClient *auth.Client
	fs         *firestore.Client
	pipeline   *enrich.Pipeline
	enrichCtx  context.Context
}

func NewAdminHandler(authClient *auth.Client, fs *firestore.Client, pipeline *enrich.Pipeline, enrichCtx context.Context) *AdminHandler {
	return &AdminHandler{authClient: authClient, fs: fs, pipeline: pipeline, enrichCtx: enrichCtx}
}

// ListUsers returns all users with optional role filtering and pagination.
// GET /api/v1/admin/users?disciplineId=X&role=Y&pageSize=Z&pageToken=T
// role: "all" (default), "admin", "editor", "viewer", "none" (no role in discipline)
func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	disciplineID := r.URL.Query().Get("disciplineId")
	if disciplineID == "" {
		writeError(w, http.StatusBadRequest, "disciplineId query parameter is required")
		return
	}

	// Layer 2: require admin for this specific discipline
	if err := middleware.RequireAdmin(ctx, disciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}

	// Parse pagination params
	pageSize := 20
	if ps := r.URL.Query().Get("pageSize"); ps != "" {
		if parsed, err := strconv.Atoi(ps); err == nil && parsed > 0 && parsed <= 100 {
			pageSize = parsed
		}
	}
	pageToken := r.URL.Query().Get("pageToken")

	// Parse role filter: "all", "admin", "editor", "viewer", "none"
	roleFilter := r.URL.Query().Get("role")
	if roleFilter == "" {
		roleFilter = "all"
	}

	// Iterate Firebase Auth users with pagination
	var users []model.UserInfo
	iter := h.authClient.Users(ctx, pageToken)

	// We need to fetch more than pageSize to account for filtering
	// Firebase doesn't support server-side filtering on custom claims
	fetchLimit := pageSize * 3 // Fetch extra to handle filtering
	if roleFilter == "all" {
		fetchLimit = pageSize
	}

	fetched := 0
	var nextPageToken string

	for len(users) < pageSize {
		u, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			slog.Error("failed to iterate users", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to list users")
			return
		}

		fetched++
		roles := extractRoles(u.CustomClaims)
		userRole, hasRole := roles[disciplineID]

		// Apply role filter
		include := false
		switch roleFilter {
		case "all":
			include = true
		case "none":
			include = !hasRole
		case "admin", "editor", "viewer":
			include = hasRole && userRole == roleFilter
		}

		if include {
			users = append(users, model.UserInfo{
				UID:         u.UID,
				Email:       u.Email,
				DisplayName: u.DisplayName,
				Roles:       roles,
			})
		}

		// Safety limit to prevent infinite loops when filtering
		if fetched >= fetchLimit*2 {
			break
		}
	}

	// Get next page token if there are more users
	if pi := iter.PageInfo(); pi != nil && pi.Token != "" {
		nextPageToken = pi.Token
	}

	if users == nil {
		users = []model.UserInfo{}
	}

	writeJSON(w, http.StatusOK, model.UsersListResponse{
		Users:         users,
		NextPageToken: nextPageToken,
	})
}

// SearchUsers finds a user by exact email.
// GET /api/v1/admin/users/search?email=X
func (h *AdminHandler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	email := r.URL.Query().Get("email")
	if email == "" {
		writeError(w, http.StatusBadRequest, "email query parameter is required")
		return
	}

	u, err := h.authClient.GetUserByEmail(r.Context(), email)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	roles := extractRoles(u.CustomClaims)
	writeJSON(w, http.StatusOK, model.UserInfo{
		UID:         u.UID,
		Email:       u.Email,
		DisplayName: u.DisplayName,
		Roles:       roles,
	})
}

// GetUser returns a user with all roles.
// GET /api/v1/admin/users/{uid}
func (h *AdminHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	uid := chi.URLParam(r, "uid")

	u, err := h.authClient.GetUser(r.Context(), uid)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	roles := extractRoles(u.CustomClaims)
	writeJSON(w, http.StatusOK, model.UserInfo{
		UID:         u.UID,
		Email:       u.Email,
		DisplayName: u.DisplayName,
		Roles:       roles,
	})
}

// SetRole sets a role for a user in a discipline.
// PUT /api/v1/admin/users/{uid}/role
func (h *AdminHandler) SetRole(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	targetUID := chi.URLParam(r, "uid")

	var req model.SetRoleRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.DisciplineID == "" {
		writeError(w, http.StatusBadRequest, "disciplineId is required")
		return
	}
	if !validRoles[req.Role] {
		writeError(w, http.StatusBadRequest, "role must be viewer, editor, or admin")
		return
	}

	// Layer 2: require admin for the target discipline
	if err := middleware.RequireAdmin(ctx, req.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}

	// Validate discipline exists
	_, err := h.fs.Collection("disciplines").Doc(req.DisciplineID).Get(ctx)
	if err != nil {
		writeError(w, http.StatusBadRequest, "discipline not found")
		return
	}

	// Self-protection: admin cannot revoke their own admin role
	callerUID := middleware.GetUserUID(ctx)
	if targetUID == callerUID && req.Role != "admin" {
		writeError(w, http.StatusBadRequest, "cannot change your own admin role")
		return
	}

	// Get target user
	u, err := h.authClient.GetUser(ctx, targetUID)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	// Merge role into existing claims
	claims := u.CustomClaims
	if claims == nil {
		claims = map[string]interface{}{}
	}

	roles, _ := claims["roles"].(map[string]interface{})
	if roles == nil {
		roles = map[string]interface{}{}
	}

	// Store the role (viewer, editor, or admin)
	// Note: "no access" is handled by RevokeRole, not SetRole
	roles[req.DisciplineID] = req.Role

	claims["roles"] = roles
	if err := h.authClient.SetCustomUserClaims(ctx, targetUID, claims); err != nil {
		slog.Error("failed to set custom claims", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to set role")
		return
	}

	// Return updated user info
	updatedRoles := extractRoles(claims)
	writeJSON(w, http.StatusOK, model.UserInfo{
		UID:         u.UID,
		Email:       u.Email,
		DisplayName: u.DisplayName,
		Roles:       updatedRoles,
	})
}

// RevokeRole removes a user's role for a discipline (reverts to viewer).
// DELETE /api/v1/admin/users/{uid}/role?disciplineId=X
func (h *AdminHandler) RevokeRole(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	targetUID := chi.URLParam(r, "uid")
	disciplineID := r.URL.Query().Get("disciplineId")

	if disciplineID == "" {
		writeError(w, http.StatusBadRequest, "disciplineId query parameter is required")
		return
	}

	// Layer 2: require admin for the target discipline
	if err := middleware.RequireAdmin(ctx, disciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}

	// Self-protection
	callerUID := middleware.GetUserUID(ctx)
	if targetUID == callerUID {
		writeError(w, http.StatusBadRequest, "cannot revoke your own admin role")
		return
	}

	u, err := h.authClient.GetUser(ctx, targetUID)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	claims := u.CustomClaims
	if claims == nil {
		claims = map[string]interface{}{}
	}

	roles, _ := claims["roles"].(map[string]interface{})
	if roles != nil {
		delete(roles, disciplineID)
		claims["roles"] = roles
	}

	if err := h.authClient.SetCustomUserClaims(ctx, targetUID, claims); err != nil {
		slog.Error("failed to set custom claims", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to revoke role")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ListAssets returns all assets for a discipline including inactive ones.
// GET /api/v1/admin/assets?disciplineId=X&status=Y
func (h *AdminHandler) ListAssets(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	disciplineID := r.URL.Query().Get("disciplineId")
	if disciplineID == "" {
		writeError(w, http.StatusBadRequest, "disciplineId query parameter is required")
		return
	}

	if err := middleware.RequireAdmin(ctx, disciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}

	query := h.fs.Collection("assets").
		Where("disciplineId", "==", disciplineID).
		OrderBy("createdAt", firestore.Desc)

	iter := query.Documents(ctx)
	defer iter.Stop()

	statusFilter := r.URL.Query().Get("status")

	assets := []model.Asset{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			slog.Error("failed to list admin assets", "error", err)
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

		// Apply status filter
		if statusFilter != "" && a.ProcessingStatus != statusFilter {
			continue
		}

		assets = append(assets, a)
	}

	writeJSON(w, http.StatusOK, assets)
}

// ToggleAssetActive sets the active field on an asset.
// PATCH /api/v1/admin/assets/{id}/active
func (h *AdminHandler) ToggleAssetActive(w http.ResponseWriter, r *http.Request) {
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

	if err := middleware.RequireAdmin(ctx, existing.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}

	var req struct {
		Active bool `json:"active"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if _, err := ref.Update(ctx, []firestore.Update{
		{Path: "active", Value: req.Active},
		{Path: "updatedAt", Value: time.Now()},
	}); err != nil {
		slog.Error("failed to toggle asset active", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to update asset")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"id":     id,
		"active": req.Active,
	})
}

// RetryEnrichment re-triggers enrichment for a failed asset.
// POST /api/v1/admin/assets/{id}/enrich
func (h *AdminHandler) RetryEnrichment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	slog.Info("RetryEnrichment handler called", "id", id, "path", r.URL.Path, "pipelineSet", h.pipeline != nil)

	if h.pipeline == nil {
		slog.Warn("RetryEnrichment: pipeline not configured")
		writeError(w, http.StatusServiceUnavailable, "enrichment pipeline not configured")
		return
	}

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

	if err := middleware.RequireAdmin(ctx, existing.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}

	// Reset status
	if _, err := ref.Update(ctx, []firestore.Update{
		{Path: "processingStatus", Value: "pending"},
		{Path: "processingError", Value: nil},
		{Path: "updatedAt", Value: time.Now()},
	}); err != nil {
		slog.Error("failed to reset asset for retry", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to reset asset")
		return
	}

	// Spawn enrichment
	go h.pipeline.EnrichAsset(h.enrichCtx, id, existing.URL, existing.DisciplineID, existing.OwnerUID)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"id":               id,
		"processingStatus": "pending",
	})
}

// UpdateAssetStatus manually sets the processing status on an asset.
// PATCH /api/v1/admin/assets/{id}/status
func (h *AdminHandler) UpdateAssetStatus(w http.ResponseWriter, r *http.Request) {
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

	if err := middleware.RequireAdmin(ctx, existing.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}

	var req struct {
		ProcessingStatus string  `json:"processingStatus"`
		ProcessingError  *string `json:"processingError"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Validate status against whitelist
	validStatuses := map[string]bool{
		"":          true,
		"pending":   true,
		"enriching": true,
		"completed": true,
		"failed":    true,
	}
	if !validStatuses[req.ProcessingStatus] {
		writeError(w, http.StatusBadRequest, "processingStatus must be one of: empty, pending, enriching, completed, failed")
		return
	}

	updates := []firestore.Update{
		{Path: "processingStatus", Value: req.ProcessingStatus},
		{Path: "updatedAt", Value: time.Now()},
	}
	if req.ProcessingError != nil {
		updates = append(updates, firestore.Update{Path: "processingError", Value: *req.ProcessingError})
	} else {
		updates = append(updates, firestore.Update{Path: "processingError", Value: nil})
	}

	if _, err := ref.Update(ctx, updates); err != nil {
		slog.Error("failed to update asset status", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to update asset status")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"id":               id,
		"processingStatus": req.ProcessingStatus,
	})
}

// extractRoles parses the roles map from custom claims.
func extractRoles(claims map[string]interface{}) map[string]string {
	roles := map[string]string{}
	if claims == nil {
		return roles
	}
	if r, ok := claims["roles"].(map[string]interface{}); ok {
		for k, v := range r {
			if s, ok := v.(string); ok {
				roles[k] = s
			}
		}
	}
	return roles
}
