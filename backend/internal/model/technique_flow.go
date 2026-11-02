package model

// Flows live inside their technique, but are loaded and saved separately.
type TechniqueFlows struct {
	Revision int64         `json:"revision" firestore:"revision"`
	Diagrams []FlowDiagram `json:"diagrams" firestore:"diagrams"`
}

type FlowDiagram struct {
	ID    string     `json:"id" firestore:"id"`
	Name  string     `json:"name" firestore:"name"`
	Nodes []FlowNode `json:"nodes" firestore:"nodes"`
	Edges []FlowEdge `json:"edges" firestore:"edges"`
}

type FlowPosition struct {
	X float64 `json:"x" firestore:"x"`
	Y float64 `json:"y" firestore:"y"`
}

type FlowNode struct {
	ID          string       `json:"id" firestore:"id"`
	Type        string       `json:"type" firestore:"type"`
	Name        string       `json:"name" firestore:"name"`
	Label       string       `json:"label" firestore:"label"`
	Description string       `json:"description" firestore:"description"`
	AssetID     string       `json:"assetId" firestore:"assetId"`
	Position    FlowPosition `json:"position" firestore:"position"`
}

type FlowEdge struct {
	ID        string `json:"id" firestore:"id"`
	Source    string `json:"source" firestore:"source"`
	Target    string `json:"target" firestore:"target"`
	Condition string `json:"condition" firestore:"condition"`
}
