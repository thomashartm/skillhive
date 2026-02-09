package handler

import (
	"log/slog"
	"net/http"

	"cloud.google.com/go/firestore"
	"firebase.google.com/go/v4/auth"
	"github.com/go-chi/chi/v5"
	"github.com/thomas/skillhive-api/internal/middleware"
	"github.com/thomas/skillhive-api/internal/model"
	"google.golang.org/api/iterator"
)

var validRoles = map[string]bool{
	"viewer": true,
	"editor": true,
	"admin":  true,
}

type AdminHandler struct {
	authClient *auth.Client
	fs         *firestore.Client
}

func NewAdminHandler(authClient *auth.Client, fs *firestore.Client) *AdminHandler {
	return &AdminHandler{authClient: authClient, fs: fs}
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
