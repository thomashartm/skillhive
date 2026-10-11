package model

import "time"

// ConceptTree stores a discipline's forest atomically, so moving a branch can
// never leave a partial move or introduce a cycle through concurrent edits.
type ConceptTree struct {
	DisciplineID string        `json:"disciplineId" firestore:"disciplineId"`
	Revision     int64         `json:"revision" firestore:"revision"`
	Nodes        []ConceptNode `json:"nodes" firestore:"nodes"`
	UpdatedAt    time.Time     `json:"updatedAt" firestore:"updatedAt"`
}

type ConceptNode struct {
	ID           string   `json:"id" firestore:"id"`
	ParentID     string   `json:"parentId" firestore:"parentId"`
	Name         string   `json:"name" firestore:"name"`
	Description  string   `json:"description" firestore:"description"`
	TechniqueIDs []string `json:"techniqueIds" firestore:"techniqueIds"`
	AssetIDs     []string `json:"assetIds" firestore:"assetIds"`
}

type SaveConceptTreeRequest struct {
	Revision int64         `json:"revision"`
	Nodes    []ConceptNode `json:"nodes"`
}
