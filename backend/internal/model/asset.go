package model

import "time"

type AssetType string

const (
	AssetTypeVideo AssetType = "video"
	AssetTypeWeb   AssetType = "web"
	AssetTypeImage AssetType = "image"
)

type VideoType string

const (
	VideoTypeShort         VideoType = "short"
	VideoTypeFull          VideoType = "full"
	VideoTypeInstructional VideoType = "instructional"
	VideoTypeSeminar       VideoType = "seminar"
)

type Asset struct {
	ID           string    `json:"id" firestore:"-"`
	DisciplineID string    `json:"disciplineId" firestore:"disciplineId"`
	URL          string    `json:"url" firestore:"url"`
	Title        string    `json:"title" firestore:"title"`
	Description  string    `json:"description" firestore:"description"`
	Type         AssetType `json:"type" firestore:"type"`
	VideoType    *string   `json:"videoType" firestore:"videoType,omitempty"`
	Originator   *string   `json:"originator" firestore:"originator,omitempty"`
	ThumbnailURL *string   `json:"thumbnailUrl" firestore:"thumbnailUrl,omitempty"`
	TechniqueIDs []string  `json:"techniqueIds" firestore:"techniqueIds"`
	CategoryIDs  []string  `json:"categoryIds" firestore:"categoryIds"`
	TagIDs       []string  `json:"tagIds" firestore:"tagIds"`
	OwnerUID     string    `json:"ownerUid" firestore:"ownerUid"`
	CreatedAt    time.Time `json:"createdAt" firestore:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt" firestore:"updatedAt"`
}

type CreateAssetRequest struct {
	URL          string   `json:"url"`
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	Type         string   `json:"type"`
	VideoType    *string  `json:"videoType"`
	Originator   *string  `json:"originator"`
	ThumbnailURL *string  `json:"thumbnailUrl"`
	TechniqueIDs []string `json:"techniqueIds"`
	CategoryIDs  []string `json:"categoryIds"`
	TagIDs       []string `json:"tagIds"`
}

type UpdateAssetRequest struct {
	URL          *string  `json:"url"`
	Title        *string  `json:"title"`
	Description  *string  `json:"description"`
	Type         *string  `json:"type"`
	VideoType    *string  `json:"videoType"`
	Originator   *string  `json:"originator"`
	ThumbnailURL *string  `json:"thumbnailUrl"`
	TechniqueIDs []string `json:"techniqueIds"`
	CategoryIDs  []string `json:"categoryIds"`
	TagIDs       []string `json:"tagIds"`
}

type OEmbedResponse struct {
	Type            string `json:"type"`
	Version         string `json:"version"`
	Title           string `json:"title"`
	AuthorName      string `json:"author_name,omitempty"`
	AuthorURL       string `json:"author_url,omitempty"`
	ProviderName    string `json:"provider_name,omitempty"`
	ProviderURL     string `json:"provider_url,omitempty"`
	ThumbnailURL    string `json:"thumbnail_url,omitempty"`
	ThumbnailWidth  int    `json:"thumbnail_width,omitempty"`
	ThumbnailHeight int    `json:"thumbnail_height,omitempty"`
	HTML            string `json:"html,omitempty"`
	Width           int    `json:"width,omitempty"`
	Height          int    `json:"height,omitempty"`
}
