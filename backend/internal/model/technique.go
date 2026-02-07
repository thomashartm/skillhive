package model

import "time"

type Technique struct {
	ID           string    `json:"id" firestore:"-"`
	DisciplineID string    `json:"disciplineId" firestore:"disciplineId"`
	Name         string    `json:"name" firestore:"name"`
	Slug         string    `json:"slug" firestore:"slug"`
	Description  string    `json:"description" firestore:"description"`
	CategoryIDs  []string  `json:"categoryIds" firestore:"categoryIds"`
	TagIDs       []string  `json:"tagIds" firestore:"tagIds"`
	OwnerUID     string    `json:"ownerUid" firestore:"ownerUid"`
	CreatedAt    time.Time `json:"createdAt" firestore:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt" firestore:"updatedAt"`

	// Resolved relations (not stored in Firestore)
	Categories []Category `json:"categories,omitempty" firestore:"-"`
	Tags       []Tag      `json:"tags,omitempty" firestore:"-"`
}

type CreateTechniqueRequest struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	CategoryIDs []string `json:"categoryIds"`
	TagIDs      []string `json:"tagIds"`
}

type UpdateTechniqueRequest struct {
	Name        *string  `json:"name"`
	Description *string  `json:"description"`
	CategoryIDs []string `json:"categoryIds"`
	TagIDs      []string `json:"tagIds"`
}
