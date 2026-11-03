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

export const stepTypes: { label: string; value: FlowStepType; icon: string }[] = [
  { label: 'Start', value: 'start', icon: 'pi pi-play' },
  { label: 'Action', value: 'action', icon: 'pi pi-bolt' },
  { label: 'Decision', value: 'decision', icon: 'pi pi-share-alt' },
  { label: 'Finish', value: 'finish', icon: 'pi pi-flag' },
]
