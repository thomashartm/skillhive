package middleware

import (
	"context"
	"net/http"
	"strings"

	"firebase.google.com/go/v4/auth"
)

type contextKey string

const UserUIDKey contextKey = "userUID"
const UserRolesKey contextKey = "userRoles"

func FirebaseAuth(authClient *auth.Client) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"error":"missing authorization header"}`, http.StatusUnauthorized)
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
				http.Error(w, `{"error":"invalid authorization format"}`, http.StatusUnauthorized)
				return
			}

			token, err := authClient.VerifyIDToken(r.Context(), parts[1])
			if err != nil {
				http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserUIDKey, token.UID)

			// Parse roles from custom claims
			roles := make(map[string]string)
			if claimRoles, ok := token.Claims["roles"].(map[string]interface{}); ok {
				for k, v := range claimRoles {
					if roleStr, ok := v.(string); ok {
						roles[k] = roleStr
					}
				}
			}
			ctx = context.WithValue(ctx, UserRolesKey, roles)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUserUID(ctx context.Context) string {
	uid, _ := ctx.Value(UserUIDKey).(string)
	return uid
}

func GetUserRoles(ctx context.Context) map[string]string {
	roles, _ := ctx.Value(UserRolesKey).(map[string]string)
	if roles == nil {
		return map[string]string{}
	}
	return roles
}

func GetUserRole(ctx context.Context, disciplineID string) string {
	roles := GetUserRoles(ctx)
	if role, ok := roles[disciplineID]; ok {
		return role
	}
	return "viewer"
}
