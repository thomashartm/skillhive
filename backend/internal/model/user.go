package model

// UserInfo represents a user with their role assignments.
type UserInfo struct {
	UID         string            `json:"uid"`
	Email       string            `json:"email"`
	DisplayName string            `json:"displayName"`
	Roles       map[string]string `json:"roles"`
}

// UsersListResponse is the paginated response for listing users.
type UsersListResponse struct {
	Users         []UserInfo `json:"users"`
	NextPageToken string     `json:"nextPageToken,omitempty"`
}

// SetRoleRequest is the body for PUT /admin/users/{uid}/role.
type SetRoleRequest struct {
	DisciplineID string `json:"disciplineId"`
	Role         string `json:"role"` // "viewer", "editor", "admin"
}
