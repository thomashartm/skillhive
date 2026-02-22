package middleware

import (
	"log/slog"
	"net/http"
)

// RequireAnyAdmin is route-level middleware that rejects any user who is not
// admin for at least one discipline. Applied to the /api/v1/admin route group.
func RequireAnyAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		slog.Info("RequireAnyAdmin middleware called", "path", r.URL.Path, "method", r.Method)

		roles := GetUserRoles(r.Context())
		slog.Info("RequireAnyAdmin checking roles", "roles", roles)

		for _, role := range roles {
			if role == "admin" {
				slog.Info("RequireAnyAdmin passed, calling next handler")
				next.ServeHTTP(w, r)
				return
			}
		}
		slog.Info("RequireAnyAdmin denied, no admin role found")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte(`{"error":"admin access required"}`))
	})
}
