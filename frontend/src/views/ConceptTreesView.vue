<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import Message from 'primevue/message'
import { useConfirm } from 'primevue/useconfirm'
import { useApi } from '../composables/useApi'
import { useAuthStore } from '../stores/auth'
import { useDisciplineStore } from '../stores/discipline'
import ConceptBranch from '../components/concepts/ConceptBranch.vue'
import type { Asset, Technique } from '../types'
import type { ConceptNode, ConceptTree } from '../types/concepts'
import { descendants, moveNode, nodePath } from '../utils/conceptTree'

const api = useApi()
const auth = useAuthStore()
const discipline = useDisciplineStore()
const confirm = useConfirm()
const tree = ref<ConceptTree | null>(null)
const techniques = ref<Technique[]>([])
const assets = ref<Asset[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const selectedId = ref('')
const familyId = ref('')
const zoom = ref(100)
const dialog = ref<'edit' | 'move' | null>(null)
const editingId = ref('')
const dialogDiscipline = ref('')
const draft = ref<ConceptNode>(blankNode())
const destination = ref('')
let loadSequence = 0

function blankNode(parentId = ''): ConceptNode {
  return { id: '', parentId, name: '', description: '', techniqueIds: [], assetIds: [] }
}
const nodes = computed(() => tree.value?.nodes ?? [])
const selected = computed(() => nodes.value.find(n => n.id === selectedId.value))
const roots = computed(() => nodes.value.filter(n => !n.parentId))
const visibleRoots = computed(() => roots.value.filter(n => !familyId.value || n.id === familyId.value))
const editable = computed(() => auth.isAdmin && !!tree.value && !loading.value && !saving.value)
const familyOptions = computed(() => [{ id: '', name: 'All families' }, ...roots.value])
const moveOptions = computed(() => {
  const excluded = descendants(nodes.value, editingId.value)
  return [{ id: '', name: 'Top level (new family)' }, ...nodes.value.filter(n => !excluded.has(n.id)).map(n => ({ id: n.id, name: nodePath(nodes.value, n) }))]
})
const techniqueOptions = computed(() => [
  ...techniques.value,
  ...draft.value.techniqueIds.filter(id => !techniques.value.some(t => t.id === id)).map(id => ({ id, name: `Unavailable technique (${id})` })),
])
const assetOptions = computed(() => [
  ...assets.value,
  ...draft.value.assetIds.filter(id => !assets.value.some(a => a.id === id)).map(id => ({ id, title: `Unavailable asset (${id})` })),
])

async function load() {
  const sequence = ++loadSequence
  const id = discipline.activeDisciplineId
  tree.value = null
  techniques.value = []
  assets.value = []
  selectedId.value = ''
  familyId.value = ''
  dialog.value = null
  error.value = ''
  loading.value = !!id
  if (!id) return
  try {
    const query = `?disciplineId=${encodeURIComponent(id)}`
    const [forest, techniqueData, assetData] = await Promise.all([
      api.get<ConceptTree>(`/api/v1/concept-trees${query}`),
      api.get<Technique[]>(`/api/v1/techniques${query}`),
      api.get<Asset[]>(`/api/v1/assets${query}`),
    ])
    if (sequence !== loadSequence) return
    tree.value = forest
    techniques.value = techniqueData
    assets.value = assetData
  } catch (e) {
    if (sequence === loadSequence) error.value = e instanceof Error ? e.message : 'Failed to load concept trees.'
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}
watch(() => discipline.activeDisciplineId, load, { immediate: true })

async function persist(next: ConceptNode[]): Promise<boolean> {
  if (!editable.value || !tree.value) return false
  const id = discipline.activeDisciplineId
  const sequence = loadSequence
  saving.value = true
  error.value = ''
  try {
    const updated = await api.put<ConceptTree>(`/api/v1/concept-trees?disciplineId=${encodeURIComponent(id)}`, { revision: tree.value.revision, nodes: next })
    if (id !== discipline.activeDisciplineId || sequence !== loadSequence) return false
    tree.value = updated
    if (familyId.value && !updated.nodes.some(n => n.id === familyId.value && !n.parentId)) familyId.value = ''
    return true
  } catch (e) {
    if (id === discipline.activeDisciplineId && sequence === loadSequence) error.value = e instanceof Error ? e.message : 'Failed to save concept trees.'
    return false
  } finally {
    saving.value = false
  }
}

function edit(node?: ConceptNode, parentId = '') {
  editingId.value = node?.id ?? ''
  draft.value = node ? { ...node, techniqueIds: [...node.techniqueIds], assetIds: [...node.assetIds] } : blankNode(parentId)
  dialogDiscipline.value = discipline.activeDisciplineId
  dialog.value = 'edit'
}
async function saveNode() {
  if (dialogDiscipline.value !== discipline.activeDisciplineId) return
  const node = { ...draft.value, id: editingId.value || crypto.randomUUID(), name: draft.value.name.trim() }
  if (!node.name) return
  const next = editingId.value ? nodes.value.map(n => n.id === node.id ? node : n) : [...nodes.value, node]
  if (await persist(next)) {
    if (!node.parentId) familyId.value = ''
    selectedId.value = node.id
    dialog.value = null
  }
}
function openMove() {
  if (!selected.value) return
  editingId.value = selected.value.id
  destination.value = selected.value.parentId
  dialogDiscipline.value = discipline.activeDisciplineId
  dialog.value = 'move'
}
async function move(id: string, parentId: string) {
  try {
    if (nodes.value.find(n => n.id === id)?.parentId === parentId) return
    if (await persist(moveNode(nodes.value, id, parentId))) {
      familyId.value = ''
      selectedId.value = id
      dialog.value = null
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to move branch.'
  }
}
function remove() {
  const node = selected.value
  if (!node || !editable.value) return
  const branch = descendants(nodes.value, node.id)
  const id = discipline.activeDisciplineId
  const revision = tree.value?.revision
  confirm.require({
    header: `Delete ${node.name}?`,
    message: `Delete this ${branch.size > 1 ? `branch and its ${branch.size - 1} descendants` : 'node'}? Linked techniques and assets will remain in the library.`,
    acceptLabel: 'Delete', rejectLabel: 'Cancel', acceptClass: 'p-button-danger',
    accept: async () => {
      if (id !== discipline.activeDisciplineId || revision !== tree.value?.revision) return
      if (await persist(nodes.value.filter(n => !branch.has(n.id)))) selectedId.value = ''
    },
  })
}
</script>

<template>
  <div class="concept-view">
    <div class="view-header">
      <div><h1 class="view-title">Concept trees</h1><p class="subtitle">Map technical families, explore techniques, and connect learning assets.</p></div>
      <Button v-if="auth.isAdmin" label="New family" icon="pi pi-plus" :disabled="!editable" @click="edit()" />
    </div>
    <Message v-if="error" severity="error" :closable="false" class="feedback">{{ error }}</Message>
    <Message v-if="!discipline.activeDisciplineId" severity="info" :closable="false">Select a discipline to explore its concept trees.</Message>
    <div v-else>
      <div class="toolbar">
        <Select v-model="familyId" :options="familyOptions" option-label="name" option-value="id" aria-label="Filter by family" placeholder="All families" :disabled="loading || saving" />
        <span class="tree-count">{{ roots.length }} families · {{ nodes.length }} elements</span>
        <div class="zoom-controls">
          <Button icon="pi pi-minus" text aria-label="Zoom out" :disabled="zoom <= 50" @click="zoom -= 10" />
          <span>{{ zoom }}%</span>
          <Button icon="pi pi-plus" text aria-label="Zoom in" :disabled="zoom >= 150" @click="zoom += 10" />
          <Button icon="pi pi-refresh" text label="Reload" :disabled="loading || saving" @click="load" />
        </div>
      </div>
      <p class="hint">Select an element to explore its links.<template v-if="auth.isAdmin"> Drag an element onto another to move its branch, or use Move in the details panel.</template></p>
      <div v-if="loading" class="empty" role="status"><i class="pi pi-spin pi-spinner" /> Loading concept trees…</div>
      <div v-else-if="tree && !nodes.length" class="empty">
        <i class="pi pi-sitemap empty-icon" /><h2>Start with a technical family</h2>
        <p>{{ auth.isAdmin ? 'Add a family, build its branches, then link techniques and assets at any level.' : 'An admin can add technical families and connect techniques and assets here.' }}</p>
        <Button v-if="auth.isAdmin" label="Create first family" icon="pi pi-plus" :disabled="!editable" @click="edit()" />
      </div>
      <div v-else-if="tree" class="workspace" :class="{ 'has-selection': selected }" :aria-busy="saving">
        <div class="chart-viewport" tabindex="0" role="region" aria-label="Concept tree chart; scroll to explore">
          <ul class="forest" :style="{ zoom: `${zoom}%` }">
            <ConceptBranch v-for="root in visibleRoots" :key="root.id" :node="root" :nodes="nodes" :selected-id="selectedId" :editable="editable" @select="selectedId = $event" @move="move" />
          </ul>
        </div>
        <aside v-if="selected" class="details" aria-label="Selected concept details">
          <div class="detail-heading"><span>{{ !selected.parentId ? 'Technical family' : nodes.some(n => n.parentId === selected!.id) ? 'Concept node' : 'Concept leaf' }}</span><Button icon="pi pi-times" text aria-label="Close details" @click="selectedId = ''" /></div>
          <h2>{{ selected.name }}</h2>
          <p class="breadcrumb">{{ nodePath(nodes, selected) }}</p>
          <p v-if="selected.description" class="node-description">{{ selected.description }}</p>
          <div v-if="auth.isAdmin" class="actions">
            <Button label="Add child" icon="pi pi-plus" size="small" :disabled="!editable" @click="edit(undefined, selected.id)" />
            <Button label="Edit / link" icon="pi pi-pencil" size="small" outlined :disabled="!editable" @click="edit(selected)" />
            <Button label="Move" icon="pi pi-arrows-alt" size="small" outlined :disabled="!editable" @click="openMove" />
            <Button label="Delete" icon="pi pi-trash" size="small" severity="danger" text :disabled="!editable" @click="remove" />
          </div>
          <h3>Techniques <span>{{ selected.techniqueIds.length }}</span></h3>
          <p v-if="!selected.techniqueIds.length" class="hint">No techniques linked yet.</p>
          <ul class="links">
            <li v-for="id in selected.techniqueIds" :key="id">
              <RouterLink v-if="techniques.some(t => t.id === id)" :to="`/techniques/${id}`"><i class="pi pi-bolt" /> {{ techniques.find(t => t.id === id)?.name }}</RouterLink>
              <span v-else class="hint">Unavailable technique</span>
            </li>
          </ul>
          <h3>Assets <span>{{ selected.assetIds.length }}</span></h3>
          <p v-if="!selected.assetIds.length" class="hint">No assets linked yet.</p>
          <ul class="links">
            <li v-for="id in selected.assetIds" :key="id">
              <RouterLink v-if="assets.some(a => a.id === id)" :to="`/assets/${id}`"><i class="pi pi-link" /> {{ assets.find(a => a.id === id)?.title }}</RouterLink>
              <span v-else class="hint">Unavailable asset</span>
            </li>
          </ul>
        </aside>
      </div>
      <p v-if="saving" role="status" class="hint">Saving changes…</p>
    </div>

    <Dialog :visible="dialog !== null" modal :header="dialog === 'move' ? 'Move branch' : editingId ? 'Edit concept and links' : draft.parentId ? 'Add child concept' : 'New technical family'" :style="{ width: '36rem', maxWidth: '95vw' }" :closable="!saving" @update:visible="value => { if (!value && !saving) dialog = null }">
      <Message v-if="error" severity="error" :closable="false" class="feedback">{{ error }}</Message>
      <form v-if="dialog === 'edit'" class="node-form" @submit.prevent="saveNode">
        <label for="concept-name">Name</label>
        <InputText id="concept-name" v-model="draft.name" autofocus required maxlength="100" :disabled="saving" />
        <label for="concept-description">Description</label>
        <Textarea id="concept-description" v-model="draft.description" rows="3" maxlength="2000" :disabled="saving" />
        <label for="concept-techniques">Techniques</label>
        <MultiSelect input-id="concept-techniques" v-model="draft.techniqueIds" :options="techniqueOptions" option-label="name" option-value="id" filter display="chip" placeholder="Link techniques" :disabled="saving" />
        <label for="concept-assets">Assets</label>
        <MultiSelect input-id="concept-assets" v-model="draft.assetIds" :options="assetOptions" option-label="title" option-value="id" filter display="chip" placeholder="Link assets" :disabled="saving" />
        <div class="form-actions"><Button label="Cancel" text :disabled="saving" @click="dialog = null" /><Button type="submit" label="Save" :loading="saving" :disabled="!editable || !draft.name.trim()" /></div>
      </form>
      <form v-else-if="dialog === 'move'" class="node-form" @submit.prevent="move(editingId, destination)">
        <p>The element, all descendants, and their links move together. Choose any node or make this branch a new family.</p>
        <label id="destination-label" for="concept-destination">Destination</label>
        <Select label-id="concept-destination" aria-labelledby="destination-label" placeholder="Top level (new family)" v-model="destination" :options="moveOptions" option-label="name" option-value="id" filter :disabled="saving" />
        <div class="form-actions"><Button label="Cancel" text :disabled="saving" @click="dialog = null" /><Button type="submit" label="Move branch" :loading="saving" :disabled="!editable || destination === nodes.find(n => n.id === editingId)?.parentId" /></div>
      </form>
    </Dialog>
  </div>
</template>

<style scoped>
.subtitle, .hint, .tree-count { color: #a1a1aa; font-size: .8rem; }
.subtitle { margin: .35rem 0 0; }
.feedback { margin-bottom: 1rem; }
.toolbar, .zoom-controls { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; }
.toolbar { margin: 1.25rem 0 .75rem; }
.zoom-controls { margin-left: auto; gap: .25rem; font-size: .8rem; }
.workspace { display: grid; grid-template-columns: minmax(0, 1fr); border: 1px solid #35353e; border-radius: 12px; overflow: hidden; margin-top: 1rem; }
.workspace.has-selection { grid-template-columns: minmax(0, 1fr) 320px; }
.chart-viewport { overflow: auto; min-height: 560px; max-height: 75vh; background-color: #16161c; background-image: radial-gradient(#35353e 1px, transparent 1px); background-size: 20px 20px; }
.forest { display: flex; justify-content: center; align-items: flex-start; width: max-content; min-width: 100%; padding: 1.5rem 1rem 3rem; margin: 0; list-style: none; }
.details { background: #1c1c22; padding: 1rem; border-left: 1px solid #35353e; overflow-y: auto; max-height: 75vh; }
.detail-heading { display: flex; align-items: center; justify-content: space-between; color: #aaa; font-size: .7rem; text-transform: uppercase; letter-spacing: .06em; }
.details h2 { font-size: 1.2rem; margin: .5rem 0; overflow-wrap: anywhere; }
.breadcrumb { color: #a1a1aa; font-size: .7rem; overflow-wrap: anywhere; }
.node-description { white-space: pre-wrap; font-size: .8rem; line-height: 1.6; overflow-wrap: anywhere; }
.actions { display: flex; flex-wrap: wrap; gap: .5rem; margin: 1.25rem 0; }
.details h3 { display: flex; justify-content: space-between; font-size: .9rem; margin: 1.5rem 0 .75rem; }
.details h3 span { color: #a1a1aa; }
.links { list-style: none; padding: 0; }
.links li { margin: .6rem 0; font-size: .8rem; }
.links a { color: var(--p-primary-color, #34d399); text-decoration: none; display: flex; gap: .5rem; align-items: baseline; overflow-wrap: anywhere; }
.links a:hover { text-decoration: underline; }
.empty { padding: 5rem 1rem; text-align: center; border: 1px dashed #444; border-radius: 12px; margin-top: 1rem; }
.empty-icon { font-size: 2rem; color: var(--p-primary-color, #34d399); }
.empty h2 { font-size: 1.25rem; margin: 1rem; }
.empty p { color: #a1a1aa; max-width: 32rem; margin: 1rem auto 1.5rem; }
.node-form { display: flex; flex-direction: column; gap: .65rem; }
.node-form label { margin-top: .5rem; font-size: .85rem; }
.node-form p { font-size: .85rem; line-height: 1.5; }
.form-actions { display: flex; justify-content: flex-end; gap: .5rem; margin-top: 1rem; }
@media (max-width: 900px) {
  .workspace.has-selection { grid-template-columns: minmax(0, 1fr); }
  .details { border-left: 0; border-top: 1px solid #35353e; max-height: none; }
  .chart-viewport { min-height: 350px; max-height: 55vh; }
  .zoom-controls { margin-left: 0; }
  .view-header { gap: 1rem; flex-wrap: wrap; }
}
</style>
