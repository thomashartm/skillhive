package handler

import (
	"context"
	"log/slog"
	"net/http"
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

// ListUsers returns users with explicit roles for a given discipline.
// GET /api/v1/admin/users?disciplineId=X
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

	// Iterate all Firebase Auth users and filter by those with roles for this discipline.
	// For small user bases this is fine; for large ones, consider a Firestore user-roles collection.
	var users []model.UserInfo
	iter := h.authClient.Users(ctx, "")
	for {
		u, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			slog.Error("failed to iterate users", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to list users")
			return
		}

		roles := extractRoles(u.CustomClaims)
		if _, ok := roles[disciplineID]; ok {
			users = append(users, model.UserInfo{
				UID:         u.UID,
				Email:       u.Email,
				DisplayName: u.DisplayName,
				Roles:       roles,
			})
		}
	}

	if users == nil {
		users = []model.UserInfo{}
	}
	writeJSON(w, http.StatusOK, users)
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

	if req.Role == "viewer" {
		// Viewer is default — remove explicit entry
		delete(roles, req.DisciplineID)
	} else {
		roles[req.DisciplineID] = req.Role
	}

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

	if h.pipeline == nil {
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
