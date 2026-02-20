package model

import "time"

type Curriculum struct {
	ID           string    `json:"id" firestore:"-"`
	DisciplineID string    `json:"disciplineId" firestore:"disciplineId"`
	Title        string    `json:"title" firestore:"title"`
	Description  string    `json:"description" firestore:"description"`
	IsPublic     bool      `json:"isPublic" firestore:"isPublic"`
	OwnerUID     string    `json:"ownerUid" firestore:"ownerUid"`
	CreatedAt    time.Time `json:"createdAt" firestore:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt" firestore:"updatedAt"`
	ElementCount int       `json:"elementCount,omitempty" firestore:"-"`
}

type ElementType string

const (
	ElementTypeTechnique ElementType = "technique"
	ElementTypeAsset     ElementType = "asset"
	ElementTypeText      ElementType = "text"
	ElementTypeImage     ElementType = "image"
	ElementTypeList      ElementType = "list"
)

type CurriculumElement struct {
	ID          string      `json:"id" firestore:"-"`
	Type        ElementType `json:"type" firestore:"type"`
	TechniqueID *string     `json:"techniqueId" firestore:"techniqueId,omitempty"`
	AssetID     *string     `json:"assetId" firestore:"assetId,omitempty"`
	Title       *string     `json:"title" firestore:"title,omitempty"`
	Details     *string     `json:"details" firestore:"details,omitempty"`
	ImageURL    *string     `json:"imageUrl,omitempty" firestore:"imageUrl,omitempty"`
	Duration    *string     `json:"duration,omitempty" firestore:"duration,omitempty"`
	Items       []string    `json:"items,omitempty" firestore:"items,omitempty"`
	Ord         int         `json:"ord" firestore:"ord"`
	Snapshot    *Snapshot   `json:"snapshot,omitempty" firestore:"snapshot,omitempty"`
	CreatedAt   time.Time   `json:"createdAt" firestore:"createdAt"`
	UpdatedAt   time.Time   `json:"updatedAt" firestore:"updatedAt"`
}

type Snapshot struct {
	Name         string `json:"name,omitempty" firestore:"name,omitempty"`
	ThumbnailURL string `json:"thumbnailUrl,omitempty" firestore:"thumbnailUrl,omitempty"`
	URL          string `json:"url,omitempty" firestore:"url,omitempty"`
}

type CreateCurriculumRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	IsPublic    bool   `json:"isPublic"`
}

type UpdateCurriculumRequest struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	IsPublic    *bool   `json:"isPublic"`
}

type CreateElementRequest struct {
	Type        string   `json:"type"`
	TechniqueID *string  `json:"techniqueId"`
	AssetID     *string  `json:"assetId"`
	Title       *string  `json:"title"`
	Details     *string  `json:"details"`
	ImageURL    *string  `json:"imageUrl"`
	Duration    *string  `json:"duration"`
	Items       []string `json:"items"`
}

type ReorderElementsRequest struct {
	OrderedIDs []string `json:"orderedIds"`
}
