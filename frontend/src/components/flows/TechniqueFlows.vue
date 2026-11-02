<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Message from 'primevue/message'
import { useConfirm } from 'primevue/useconfirm'
import FlowCanvas from './FlowCanvas.vue'
import MarkdownEditor from '../common/MarkdownEditor.vue'
import MarkdownRenderer from '../common/MarkdownRenderer.vue'
import { useApi } from '../../composables/useApi'
import { useAuthStore } from '../../stores/auth'
import type { Asset } from '../../types'
import { stepTypes, type FlowDiagram, type FlowNode, type FlowStepType, type TechniqueFlows } from '../../types/flows'

const props = defineProps<{ techniqueId: string; disciplineId: string }>()
const api = useApi()
const auth = useAuthStore()
const router = useRouter()
const confirm = useConfirm()
const flows = ref<TechniqueFlows>({ revision: 0, diagrams: [] })
const baseline = ref('[]')
const loading = ref(true)
const saving = ref(false)
const loaded = ref(false)
const error = ref('')
const mediaError = ref('')
const status = ref('')
const assets = ref<Asset[]>([])
const diagramId = ref('')
const nodeId = ref('')
const edgeId = ref('')
const sourceId = ref('')
const targetId = ref('')
const condition = ref('')
let loadSequence = 0
const canEdit = computed(() => ['editor', 'admin'].includes(auth.getRoleForDiscipline(props.disciplineId)))
const editable = computed(() => canEdit.value && loaded.value && !loading.value && !saving.value)
const dirty = computed(() => JSON.stringify(flows.value.diagrams) !== baseline.value)
const diagram = computed(() => flows.value.diagrams.find(d => d.id === diagramId.value))
const node = computed(() => diagram.value?.nodes.find(n => n.id === nodeId.value))
const edge = computed(() => diagram.value?.edges.find(e => e.id === edgeId.value))
const media = computed(() => assets.value.find(a => a.id === node.value?.assetId))
const transitionOptions = computed(() => diagram.value?.edges.map(e => ({
  id: e.id, name: `${diagram.value?.nodes.find(n => n.id === e.source)?.name} → ${diagram.value?.nodes.find(n => n.id === e.target)?.name}${e.condition ? ` · ${e.condition}` : ''}`,
})) ?? [])

function ask(message: string): Promise<boolean> {
  return new Promise(resolve => confirm.require({ header: 'Flow diagrams', message, icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Continue', rejectLabel: 'Cancel', accept: () => resolve(true), reject: () => resolve(false), onHide: () => resolve(false),
  }))
}
const removeGuard = router.beforeEach(async () => {
  if (saving.value) return false
  return !dirty.value || await ask('Discard unsaved diagram changes and leave this page?')
})
function beforeUnload(event: BeforeUnloadEvent) {
  if (dirty.value || saving.value) { event.preventDefault(); event.returnValue = '' }
}
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => { loadSequence++; removeGuard(); window.removeEventListener('beforeunload', beforeUnload) })

watch(diagramId, () => { nodeId.value = ''; edgeId.value = ''; sourceId.value = ''; targetId.value = ''; condition.value = '' })
watch(dirty, value => { if (value) status.value = '' })

async function load() {
  const sequence = ++loadSequence
  loading.value = true
  loaded.value = false
  error.value = ''
  mediaError.value = ''
  const path = `/api/v1/techniques/${encodeURIComponent(props.techniqueId)}/flows`
  const [flowResult, assetResult] = await Promise.allSettled([
    api.get<TechniqueFlows>(path),
    api.get<Asset[]>(`/api/v1/assets?disciplineId=${encodeURIComponent(props.disciplineId)}`),
  ])
  if (sequence !== loadSequence) return
  if (flowResult.status === 'fulfilled') {
    flows.value = { ...flowResult.value, diagrams: (flowResult.value.diagrams ?? []).map(d => ({ ...d, nodes: d.nodes ?? [], edges: d.edges ?? [] })) }
    baseline.value = JSON.stringify(flows.value.diagrams)
    diagramId.value = flows.value.diagrams.some(d => d.id === diagramId.value) ? diagramId.value : flows.value.diagrams[0]?.id ?? ''
    nodeId.value = ''; edgeId.value = ''
    loaded.value = true
  } else error.value = flowResult.reason instanceof Error ? flowResult.reason.message : 'Could not load diagrams.'
  if (assetResult.status === 'fulfilled') {
    assets.value = assetResult.value.filter(a => a.active && (a.type === 'video' || a.type === 'image'))
  } else {
    assets.value = []
    mediaError.value = assetResult.reason instanceof Error ? assetResult.reason.message : 'Could not load media.'
  }
  loading.value = false
}
watch(() => [props.techniqueId, props.disciplineId], () => { void load() }, { immediate: true })

async function reload() {
  if (saving.value || loading.value) return
  if (dirty.value && !await ask('Discard your unsaved diagram changes and reload the saved diagrams?')) return
  status.value = ''
  await load()
}
async function save() {
  if (!editable.value || !dirty.value) return
  saving.value = true
  error.value = ''
  const sequence = loadSequence
  try {
    const result = await api.put<TechniqueFlows>(`/api/v1/techniques/${encodeURIComponent(props.techniqueId)}/flows`, JSON.parse(JSON.stringify(flows.value)))
    if (sequence !== loadSequence) return
    flows.value = result
    baseline.value = JSON.stringify(result.diagrams)
    status.value = 'Saved'
  } catch (e) {
    if (sequence === loadSequence) error.value = e instanceof Error ? e.message : 'Could not save diagrams. Your edits are kept here.'
  } finally { if (sequence === loadSequence) saving.value = false }
}
function addDiagram() {
  if (!editable.value || flows.value.diagrams.length >= 20) return
  const start: FlowNode = { id: crypto.randomUUID(), type: 'start', name: 'Start', label: '', description: '', assetId: '', position: { x: 60, y: 140 } }
  const next: FlowDiagram = { id: crypto.randomUUID(), name: `Flow ${flows.value.diagrams.length + 1}`, nodes: [start], edges: [] }
  flows.value.diagrams.push(next)
  diagramId.value = next.id
}
async function deleteDiagram() {
  const id = diagramId.value
  if (!editable.value || !await ask('Delete this diagram and all its steps? Save diagrams to apply the deletion.')) return
  if (!editable.value) return
  flows.value.diagrams = flows.value.diagrams.filter(d => d.id !== id)
  diagramId.value = flows.value.diagrams[0]?.id ?? ''
}
function selectNode(id: string) { nodeId.value = id; edgeId.value = ''; sourceId.value = id }
function selectEdge(id: string) { edgeId.value = id; nodeId.value = '' }
function addStep(type: FlowStepType) {
  if (!editable.value || !diagram.value || diagram.value.nodes.length >= 200) return
  const count = diagram.value.nodes.length
  const next: FlowNode = { id: crypto.randomUUID(), type, name: stepTypes.find(t => t.value === type)!.label,
    label: '', description: '', assetId: '', position: { x: 60 + count % 3 * 300, y: 140 + Math.floor(count / 3) * 180 } }
  diagram.value.nodes.push(next)
  selectNode(next.id)
}
function moveStep(id: string, position: FlowNode['position']) {
  if (!editable.value) return
  const step = diagram.value?.nodes.find(n => n.id === id)
  if (step) step.position = position
}
function connect(connection: { source: string | null; target: string | null }, label = '') {
  const d = diagram.value
  if (!editable.value || !d || d.edges.length >= 400) return
  if (!d.nodes.some(n => n.id === connection.source) || !d.nodes.some(n => n.id === connection.target)) return
  const next = { id: crypto.randomUUID(), source: connection.source!, target: connection.target!, condition: label }
  d.edges.push(next)
  selectEdge(next.id)
  condition.value = ''
}
async function deleteStep() {
  const d = diagram.value
  const id = nodeId.value
  if (!editable.value || !d || !await ask('Delete this step and its incoming and outgoing transitions?')) return
  if (!editable.value) return
  d.nodes = d.nodes.filter(n => n.id !== id)
  d.edges = d.edges.filter(e => e.source !== id && e.target !== id)
  nodeId.value = ''; edgeId.value = ''; sourceId.value = ''; targetId.value = ''
}
function deleteTransition() {
  if (!editable.value || !diagram.value) return
  diagram.value.edges = diagram.value.edges.filter(e => e.id !== edgeId.value)
  edgeId.value = ''
}
function safeMediaURL(url: string | null | undefined) {
  if (!url) return undefined
  try { const parsed = new URL(url); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : undefined } catch { return undefined }
}
</script>

<template>
  <section class="technique-flows mt-8" aria-labelledby="flows-heading">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
      <div>
        <h2 id="flows-heading" class="text-xl font-semibold">Flow diagrams</h2>
        <p class="text-sm text-slate-400">Follow the actions, decisions, and conditions that lead to applying this technique.</p>
      </div>
      <div class="flex items-center gap-2">
        <span role="status" class="text-sm" :class="dirty ? 'text-amber-300' : 'text-emerald-300'">{{ dirty ? 'Unsaved changes' : status }}</span>
        <Button label="Reload" severity="secondary" size="small" :disabled="loading || saving" @click="reload" />
        <Button v-if="canEdit" label="Save diagrams" aria-label="Save diagrams" icon="pi pi-save" size="small" :loading="saving" :disabled="!editable || !dirty" @click="save" />
      </div>
    </div>
    <Message v-if="error" severity="error" class="mb-3" :closable="false">{{ error }}</Message>
    <Message v-if="mediaError" severity="warn" class="mb-3" :closable="false">{{ mediaError }}. Diagrams remain available; reload to retry the media library.</Message>
    <p v-if="loading" role="status">Loading diagrams…</p>
    <template v-else-if="loaded">
      <div class="flex flex-wrap gap-3 items-end mb-4">
        <div v-if="flows.diagrams.length" class="min-w-48">
          <label for="flow-selector" class="field-label">Diagram</label>
          <Select v-model="diagramId" input-id="flow-selector" :options="flows.diagrams" option-label="name" option-value="id" class="w-full" :disabled="saving" />
        </div>
        <Button v-if="canEdit" label="New diagram" icon="pi pi-plus" severity="secondary" :disabled="!editable || flows.diagrams.length >= 20" @click="addDiagram" />
        <span v-if="!canEdit" class="text-sm text-slate-400">Read-only view</span>
      </div>
      <p v-if="!diagram" class="empty-flow">No flow diagrams yet. <span v-if="canEdit">Create one to map out this technique.</span></p>
      <template v-else>
        <div v-if="canEdit" class="flex flex-wrap items-end gap-3 mb-3">
          <div class="grow">
            <label for="flow-name" class="field-label">Diagram name</label>
            <InputText id="flow-name" v-model="diagram.name" :disabled="!editable" :maxlength="100" class="w-full" />
          </div>
          <Button label="Delete diagram" severity="danger" text :disabled="!editable" @click="deleteDiagram" />
        </div>
        <div v-if="canEdit" class="flex flex-wrap gap-2 mb-2" role="group" aria-label="Add a step">
          <Button v-for="type in stepTypes" :key="type.value" :label="`Add ${type.label.toLowerCase()}`" icon="pi pi-plus" severity="secondary" size="small"
            :disabled="!editable || diagram.nodes.length >= 200" @click="addStep(type.value)" />
        </div>
        <p class="text-xs text-slate-400 mb-3">{{ canEdit ? 'Drag steps to arrange them. Connect the right dot to a left dot, then select the arrow to set its condition. Loops are allowed.' : 'Select a step to read its instructions and open its media. Select an arrow to read its condition.' }}</p>
        <div class="flow-workspace">
          <FlowCanvas :key="diagram.id" :diagram="diagram" :editable="editable" :selected-node="nodeId" :selected-edge="edgeId"
            @select-node="selectNode" @select-edge="selectEdge" @move="moveStep" @connect="connect" />
          <aside class="flow-details" aria-label="Flow details">
            <div class="grid grid-cols-2 gap-2 mb-4">
              <div>
                <label for="step-selector" class="field-label">Step</label>
                <Select :model-value="nodeId" input-id="step-selector" :options="diagram.nodes" option-label="name" option-value="id" placeholder="Select step" class="w-full" @update:model-value="selectNode" />
              </div>
              <div>
                <label for="transition-selector" class="field-label">Transition</label>
                <Select :model-value="edgeId" input-id="transition-selector" :options="transitionOptions" option-label="name" option-value="id" placeholder="Select arrow" class="w-full" @update:model-value="selectEdge" />
              </div>
            </div>
            <div v-if="node" class="space-y-3">
              <template v-if="canEdit">
                <div><label for="step-type" class="field-label">Step type</label><Select v-model="node.type" input-id="step-type" :options="stepTypes" option-label="label" option-value="value" :disabled="!editable" class="w-full" /></div>
                <div><label for="step-name" class="field-label">Name</label><InputText id="step-name" v-model="node.name" :maxlength="100" :disabled="!editable" class="w-full" /></div>
                <div><label for="step-label" class="field-label">Label</label><InputText id="step-label" v-model="node.label" :maxlength="100" :disabled="!editable" placeholder="Short label shown on the canvas" class="w-full" /></div>
                <div><label for="step-description" class="field-label">Description</label><MarkdownEditor id="step-description" v-model="node.description" :disabled="!editable" /></div>
                <div><label for="step-media" class="field-label">Video or picture</label><Select v-model="node.assetId" input-id="step-media" :options="[{ id: '', title: 'No linked media' }, ...assets]" option-label="title" option-value="id" filter :disabled="!editable" placeholder="Link media from the library" class="w-full" /></div>
                <Button v-if="node.assetId && !media" label="Remove unavailable media link" severity="secondary" size="small" :disabled="!editable" @click="node.assetId = ''" />
              </template>
              <template v-else>
                <h3 class="font-semibold text-lg">{{ node.name }}</h3>
                <p v-if="node.label" class="text-slate-300">{{ node.label }}</p>
                <MarkdownRenderer v-if="node.description" :content="node.description" />
              </template>
              <div v-if="media" class="linked-media">
                <img v-if="safeMediaURL(media.type === 'image' ? media.url : media.thumbnailUrl)" :src="safeMediaURL(media.type === 'image' ? media.url : media.thumbnailUrl)" :alt="media.title" class="w-full max-h-52 object-contain mb-2" />
                <RouterLink :to="`/assets/${media.id}`" class="text-sky-400 underline">{{ media.title }}</RouterLink>
                <a v-if="safeMediaURL(media.url)" :href="safeMediaURL(media.url)" target="_blank" rel="noopener noreferrer" class="block mt-1 text-sky-400 underline">{{ media.type === 'video' ? 'Watch video' : 'Open picture' }} ↗</a>
              </div>
              <p v-else-if="node.assetId" class="text-sm text-amber-300">Linked media is unavailable.</p>
              <Button v-if="canEdit" label="Delete step" aria-label="Delete step" severity="danger" text :disabled="!editable" @click="deleteStep" />
            </div>
            <div v-else-if="edge" class="space-y-3">
              <h3 class="font-semibold">Transition</h3>
              <template v-if="canEdit">
                <div><label for="edge-source" class="field-label">From step</label><Select v-model="edge.source" input-id="edge-source" :options="diagram.nodes" option-label="name" option-value="id" :disabled="!editable" class="w-full" /></div>
                <div><label for="edge-target" class="field-label">To step</label><Select v-model="edge.target" input-id="edge-target" :options="diagram.nodes" option-label="name" option-value="id" :disabled="!editable" class="w-full" /></div>
                <div><label for="flow-condition" class="field-label">Condition</label><InputText id="flow-condition" v-model="edge.condition" :maxlength="300" :disabled="!editable" placeholder="e.g. If the grip is lost" class="w-full" /></div>
                <p class="text-xs text-slate-400">Leave empty for an unconditional transition. Conditions describe what to check while performing the technique.</p>
                <Button label="Delete transition" severity="danger" text :disabled="!editable" @click="deleteTransition" />
              </template>
              <template v-else>
                <p>{{ diagram.nodes.find(n => n.id === edge?.source)?.name }} → {{ diagram.nodes.find(n => n.id === edge?.target)?.name }}</p>
                <p>{{ edge.condition || 'Continue unconditionally' }}</p>
              </template>
            </div>
            <p v-else class="text-sm text-slate-400">Select a step or transition to see its details.</p>
            <form v-if="canEdit && diagram.nodes.length" class="transition-form" @submit.prevent="connect({ source: sourceId, target: targetId }, condition)">
              <h3 class="font-semibold mb-3">Add transition</h3>
              <label for="new-source" class="field-label">From step</label>
              <Select v-model="sourceId" input-id="new-source" :options="diagram.nodes" option-label="name" option-value="id" :disabled="!editable" placeholder="Choose starting step" class="w-full mb-2" />
              <label for="new-target" class="field-label">To step</label>
              <Select v-model="targetId" input-id="new-target" :options="diagram.nodes" option-label="name" option-value="id" :disabled="!editable" placeholder="Choose next or earlier step" class="w-full mb-2" />
              <label for="new-condition" class="field-label">Condition (optional)</label>
              <InputText id="new-condition" v-model="condition" :maxlength="300" :disabled="!editable" class="w-full mb-3" placeholder="e.g. Opponent resists" />
              <Button type="submit" label="Add transition" severity="secondary" size="small" :disabled="!editable || !sourceId || !targetId || diagram.edges.length >= 400" />
            </form>
          </aside>
        </div>
      </template>
    </template>
  </section>
</template>

<style scoped>
.field-label { display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.35rem; }
.flow-workspace { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 1rem; }
.flow-details { padding: 1rem; border: 1px solid #334155; min-width: 0; max-height: 720px; overflow: auto; overflow-wrap: anywhere; }
.transition-form { border-top: 1px solid #334155; margin-top: 1.25rem; padding-top: 1rem; }
.empty-flow { padding: 2rem; border: 1px dashed #475569; color: #94a3b8; text-align: center; }
.linked-media { padding: 0.75rem; background: #0f172a; }
@media (max-width: 1100px) { .flow-workspace { grid-template-columns: 1fr; } .flow-details { max-height: none; } }
</style>
