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
	ID            string         `json:"id" firestore:"id"`
	ParentID      string         `json:"parentId" firestore:"parentId"`
	Name          string         `json:"name" firestore:"name"`
	Description   string         `json:"description" firestore:"description"`
	TechniqueIDs  []string       `json:"techniqueIds" firestore:"techniqueIds"`
	AssetIDs      []string       `json:"assetIds" firestore:"assetIds"`
	CurriculumIDs []string       `json:"curriculumIds" firestore:"curriculumIds"`
	Layout        *ConceptLayout `json:"layout,omitempty" firestore:"layout,omitempty"`
}

// Layout belongs to a family; retaining it on a moved branch preserves the
// family's presentation if the branch is promoted back to the top level.
type ConceptLayout struct {
	Orientation string `json:"orientation" firestore:"orientation"`
	Alignment   string `json:"alignment" firestore:"alignment"`
}

type SaveConceptTreeRequest struct {
	Revision int64         `json:"revision"`
	Nodes    []ConceptNode `json:"nodes"`
}
