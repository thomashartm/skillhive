package model

import "time"

type Category struct {
	ID           string     `json:"id" firestore:"-"`
	DisciplineID string     `json:"disciplineId" firestore:"disciplineId"`
	Name         string     `json:"name" firestore:"name"`
	Slug         string     `json:"slug" firestore:"slug"`
	Description  string     `json:"description" firestore:"description"`
	ParentID     *string    `json:"parentId" firestore:"parentId"`
	OwnerUID     string     `json:"ownerUid" firestore:"ownerUid"`
	CreatedAt    time.Time  `json:"createdAt" firestore:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt" firestore:"updatedAt"`
	Children     []Category `json:"children,omitempty" firestore:"-"`
}

type CreateCategoryRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	ParentID    *string `json:"parentId"`
}

type UpdateCategoryRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	ParentID    *string `json:"parentId"`
}
