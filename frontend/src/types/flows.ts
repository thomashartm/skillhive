export type FlowStepType = 'start' | 'action' | 'decision' | 'finish'

export interface FlowNode {
  id: string
  type: FlowStepType
  name: string
  label: string
  description: string
  assetId: string
  position: { x: number; y: number }
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  condition: string
}

export interface FlowDiagram {
  id: string
  name: string
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export interface TechniqueFlows {
  revision: number
  diagrams: FlowDiagram[]
}

export const stepTypes: { label: string; value: FlowStepType }[] = [
  { label: 'Start', value: 'start' },
  { label: 'Action', value: 'action' },
  { label: 'Decision', value: 'decision' },
  { label: 'Finish', value: 'finish' },
]
