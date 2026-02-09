package middleware

import "net/http"

// RequireAnyAdmin is route-level middleware that rejects any user who is not
// admin for at least one discipline. Applied to the /api/v1/admin route group.
func RequireAnyAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		roles := GetUserRoles(r.Context())
		for _, role := range roles {
			if role == "admin" {
				next.ServeHTTP(w, r)
				return
			}
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte(`{"error":"admin access required"}`))
	})
}
