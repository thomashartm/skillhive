export interface ConceptNode {
  id: string
  parentId: string
  name: string
  description: string
  techniqueIds: string[]
  assetIds: string[]
}

export interface ConceptTree {
  disciplineId: string
  revision: number
  nodes: ConceptNode[]
  updatedAt: string
}
