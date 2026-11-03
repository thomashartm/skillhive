<script setup lang="ts">
import { computed } from 'vue'
import { VueFlow, Handle, Position, ConnectionMode, MarkerType, Panel, type Node, type Edge, type NodeChange, type EdgeChange, type NodeDragEvent, type EdgeUpdateEvent, type Connection, type VueFlowStore } from '@vue-flow/core'
import Button from 'primevue/button'
import FlowTransitionEdge from './FlowTransitionEdge.vue'
import type { FlowDiagram, FlowNode } from '../../types/flows'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

const props = defineProps<{ diagram: FlowDiagram; editable: boolean; selectedNode: string; selectedEdge: string }>()
const emit = defineEmits<{
  'select-node': [id: string]
  'select-edge': [id: string]
  move: [id: string, position: { x: number; y: number }]
  connect: [connection: Connection]
  reconnect: [id: string, connection: Connection]
  'delete-edge': [id: string]
}>()
let canvas: VueFlowStore | undefined
const nodes = computed<Node<FlowNode>[]>(() => props.diagram.nodes.map(node => ({
  id: node.id, type: 'step', position: { ...node.position }, data: node,
  selected: node.id === props.selectedNode, ariaLabel: `${node.type}: ${node.name}`,
})))
const edges = computed<Edge[]>(() => {
  const lanes = new Map<string, number>()
  return props.diagram.edges.map(edge => {
    const source = props.diagram.nodes.find(n => n.id === edge.source)
    const target = props.diagram.nodes.find(n => n.id === edge.target)
    const returning = source && target && target.position.x <= source.position.x + 190
    const key = returning ? `return/${edge.source}` : `${edge.source}/${edge.target}`
    const lane = lanes.get(key) ?? 0
    lanes.set(key, lane + 1)
    return { id: edge.id, source: edge.source, target: edge.target, type: 'transition',
      data: { condition: edge.condition, lane }, selected: edge.id === props.selectedEdge,
      updatable: props.editable && edge.id === props.selectedEdge,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }, ariaLabel: edge.condition || 'Transition',
    }
  })
})
function move(changes: NodeChange[]) {
  for (const change of changes) {
    if (change.type === 'select' && change.selected) emit('select-node', change.id)
    // Let Vue Flow own the active drag; persist keyboard movement immediately.
    if (props.editable && change.type === 'position' && !change.dragging && change.position) emit('move', change.id, { ...change.position })
  }
}
function selectTransition(changes: EdgeChange[]) {
  for (const change of changes) {
    if (change.type === 'select' && change.selected) emit('select-edge', change.id)
  }
}
function dragStopped(event: NodeDragEvent) {
  if (!props.editable) return
  for (const node of event.nodes) emit('move', node.id, { ...node.position })
}
function fit() {
  if (!canvas || !canvas.getNodes.value.length) return
  const graphNodes = canvas.getNodes.value
  const margin = 120 + Math.max(0, ...edges.value.map(e => e.data?.lane ?? 0)) * 45
  const x = Math.min(...graphNodes.map(n => n.position.x)) - 100
  const y = Math.min(...graphNodes.map(n => n.position.y)) - margin
  const right = Math.max(...graphNodes.map(n => n.position.x + n.dimensions.width)) + 100
  const bottom = Math.max(...graphNodes.map(n => n.position.y + n.dimensions.height)) + 60
  void canvas.fitBounds({ x, y, width: right - x, height: bottom - y }, { padding: 0.15 })
}
function connect(connection: Connection) {
  if (props.editable) emit('connect', connection)
}
function reconnect(event: EdgeUpdateEvent) {
  if (props.editable) emit('reconnect', event.edge.id, event.connection)
}
function deleteSelected(event?: KeyboardEvent) {
  if (!props.editable || !props.selectedEdge) return
  if (event) {
    if (!['Delete', 'Backspace'].includes(event.key)) return
    if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return
    event.preventDefault()
  }
  emit('delete-edge', props.selectedEdge)
}
</script>

<template>
  <div class="flow-canvas" role="region" tabindex="0" aria-label="Technique flow diagram" @keydown="deleteSelected">
    <VueFlow :id="diagram.id" :nodes="nodes" :edges="edges" :nodes-draggable="editable" :nodes-connectable="editable"
      :connection-mode="ConnectionMode.Strict" :edges-updatable="editable" :edge-updater-radius="12" :delete-key-code="null" :min-zoom="0.15" :max-zoom="2"
      :node-extent="[[-100000, -100000], [100000, 100000]]" @init="canvas = $event" @nodes-initialized="fit" @nodes-change="move" @edges-change="selectTransition" @node-drag-stop="dragStopped" @selection-drag-stop="dragStopped" @connect="connect"
      @node-click="emit('select-node', $event.node.id)" @edge-click="emit('select-edge', $event.edge.id)" @edge-update="reconnect" @pane-click="emit('select-edge', '')">
      <template #node-step="{ data, connectable }">
        <div class="flow-step" :class="`step-${data.type}`">
          <Handle type="target" :position="Position.Left" :connectable="connectable" :title="editable ? 'Drop a connection here' : undefined" :aria-label="`Connect to ${data.name}`" />
          <span class="step-type">{{ data.type }}</span>
          <div class="step-name">{{ data.name }}</div>
          <div v-if="data.label" class="step-label">{{ data.label }}</div>
          <i v-if="data.assetId" class="pi pi-image step-media" aria-label="Linked media" />
          <Handle type="source" :position="Position.Right" :connectable="connectable" :title="editable ? 'Drag to connect to another step' : undefined" :aria-label="`Connect from ${data.name}`" />
        </div>
      </template>
      <template #edge-transition="edgeProps"><FlowTransitionEdge v-bind="edgeProps" /></template>
      <Panel v-if="editable && selectedEdge" position="top-right">
        <Button icon="pi pi-trash" label="Delete transition" severity="danger" size="small" @click="deleteSelected()" />
      </Panel>
      <Panel position="bottom-left" class="flex gap-1">
        <Button icon="pi pi-plus" aria-label="Zoom in" severity="secondary" size="small" @click="canvas?.zoomIn()" />
        <Button icon="pi pi-minus" aria-label="Zoom out" severity="secondary" size="small" @click="canvas?.zoomOut()" />
        <Button icon="pi pi-expand" label="Fit" aria-label="Fit diagram" severity="secondary" size="small" @click="fit" />
      </Panel>
    </VueFlow>
  </div>
</template>

<style scoped>
.flow-canvas { height: 580px; min-width: 0; background: #0b1220; border: 1px solid #334155; background-image: radial-gradient(#334155 1px, transparent 1px); background-size: 20px 20px; }
.flow-step { position: relative; width: 190px; padding: 12px 16px; color: #e2e8f0; background: #172334; border: 2px solid #64748b; }
.step-start { border-color: #34d399; border-radius: 28px; }
.step-decision { border-color: #fbbf24; border-radius: 14px 0; }
.step-finish { border-color: #c084fc; border-radius: 28px; }
.step-type { display: block; text-transform: uppercase; letter-spacing: 0.08em; font-size: 10px; color: #94a3b8; }
.step-name { font-weight: 600; overflow-wrap: anywhere; }
.step-label { color: #cbd5e1; font-size: 12px; overflow-wrap: anywhere; }
.step-media { position: absolute; right: 8px; top: 10px; font-size: 12px; color: #7dd3fc; }
:deep(.vue-flow__node.selected .flow-step), :deep(.vue-flow__node:focus-visible .flow-step) { outline: 3px solid #38bdf8; outline-offset: 3px; }
:deep(.vue-flow__handle) { width: 18px; height: 18px; background: #e2e8f0; border: 2px solid #0f172a; }
:deep(.vue-flow__handle.source) { background: #38bdf8; }
:deep(.vue-flow__handle.connectable:hover), :deep(.vue-flow__handle.valid) { box-shadow: 0 0 0 4px #38bdf866; }
:deep(.vue-flow__edgeupdater) { fill: #0f172a; stroke: #38bdf8; stroke-width: 2; cursor: grab; }
:deep(.vue-flow__edgeupdater:hover) { fill: #38bdf8; }
:deep(.vue-flow__edge-textbg) { opacity: 1; }
@media (max-width: 700px) { .flow-canvas { height: 420px; } }
</style>
