export interface ConceptLayout {
  orientation: 'vertical' | 'horizontal'
  alignment: 'start' | 'center' | 'end'
}

export interface ConceptNode {
  id: string
  parentId: string
  name: string
  description: string
  techniqueIds: string[]
  assetIds: string[]
  curriculumIds: string[]
  layout?: ConceptLayout
}

export interface ConceptTree {
  disciplineId: string
  revision: number
  nodes: ConceptNode[]
  updatedAt: string
}
