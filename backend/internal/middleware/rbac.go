package middleware

import (
	"context"
	"errors"
)

var (
	ErrEditorRequired = errors.New("editor role required")
	ErrAdminRequired  = errors.New("admin role required")
)

// RequireEditor returns nil if the user has editor or admin role for the discipline.
func RequireEditor(ctx context.Context, disciplineID string) error {
	role := GetUserRole(ctx, disciplineID)
	if role == "editor" || role == "admin" {
		return nil
	}
	return ErrEditorRequired
}

// RequireAdmin returns nil if the user has admin role for the discipline.
func RequireAdmin(ctx context.Context, disciplineID string) error {
	role := GetUserRole(ctx, disciplineID)
	if role == "admin" {
		return nil
	}
	return ErrAdminRequired
}
