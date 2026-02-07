package model

import "time"

type Tag struct {
	ID           string    `json:"id" firestore:"-"`
	DisciplineID string    `json:"disciplineId" firestore:"disciplineId"`
	Name         string    `json:"name" firestore:"name"`
	Slug         string    `json:"slug" firestore:"slug"`
	Description  string    `json:"description" firestore:"description"`
	Color        *string   `json:"color" firestore:"color,omitempty"`
	OwnerUID     string    `json:"ownerUid" firestore:"ownerUid"`
	CreatedAt    time.Time `json:"createdAt" firestore:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt" firestore:"updatedAt"`
}

type CreateTagRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Color       *string `json:"color"`
}

type UpdateTagRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Color       *string `json:"color"`
}
