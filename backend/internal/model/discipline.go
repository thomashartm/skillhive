package model

import "time"

type Discipline struct {
	ID          string    `json:"id" firestore:"-"`
	Name        string    `json:"name" firestore:"name"`
	Slug        string    `json:"slug" firestore:"slug"`
	Description string    `json:"description,omitempty" firestore:"description,omitempty"`
	CreatedAt   time.Time `json:"createdAt" firestore:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt" firestore:"updatedAt"`
}
