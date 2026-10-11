<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ConceptLayout, ConceptNode } from '../../types/concepts'

const props = defineProps<{
  node: ConceptNode
  nodes: ConceptNode[]
  selectedId: string
  editable: boolean
  orientation?: ConceptLayout['orientation']
}>()
const emit = defineEmits<{
  select: [id: string]
  move: [id: string, parentId: string]
  edit: [node: ConceptNode]
}>()
const collapsed = ref(false)
const dragOver = ref(false)
const children = computed(() => props.nodes.filter(n => n.parentId === props.node.id))

function startDrag(event: DragEvent) {
  if (!props.editable) return
  event.dataTransfer?.setData('application/x-skillhive-concept', props.node.id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}
function drop(event: DragEvent) {
  dragOver.value = false
  const id = event.dataTransfer?.getData('application/x-skillhive-concept')
  if (props.editable && id) emit('move', id, props.node.id)
}
</script>

<template>
  <li class="branch" :class="{ horizontal: orientation === 'horizontal' }">
    <div class="node-wrapper">
      <button
        class="concept-card"
        :class="{ selected: selectedId === node.id, family: !node.parentId, 'drop-target': dragOver }"
        :draggable="editable"
        :aria-pressed="selectedId === node.id"
        @click="emit('select', node.id)"
        @dragstart.stop="startDrag"
        @dragover.prevent.stop="dragOver = editable"
        @dragleave="dragOver = false"
        @drop.prevent.stop="drop"
      >
        <span class="kind"><i :class="!node.parentId ? 'pi pi-sitemap' : children.length ? 'pi pi-folder' : 'pi pi-circle'" />
          {{ !node.parentId ? 'Family' : children.length ? 'Node' : 'Leaf' }}
        </span>
        <strong>{{ node.name }}</strong>
        <span v-if="node.description" class="description">{{ node.description }}</span>
        <span class="counts">{{ node.techniqueIds.length }} techniques · {{ node.assetIds.length }} assets</span>
      </button>
      <button v-if="editable" class="edit-element" :aria-label="`Edit ${node.name}`" @click="emit('edit', node)">
        <i class="pi pi-pencil" /> Edit
      </button>
      <button v-if="children.length" class="branch-toggle" :aria-label="`${collapsed ? 'Expand' : 'Collapse'} ${node.name}`" :aria-expanded="!collapsed" @click="collapsed = !collapsed">
        <i :class="collapsed ? 'pi pi-plus' : 'pi pi-minus'" /> {{ children.length }}
      </button>
    </div>
    <ul v-if="children.length && !collapsed" class="children">
      <ConceptBranch v-for="child in children" :key="child.id" :node="child" :nodes="nodes" :selected-id="selectedId" :editable="editable" :orientation="orientation" @select="emit('select', $event)" @move="(id, parentId) => emit('move', id, parentId)" @edit="emit('edit', $event)" />
    </ul>
  </li>
</template>

<style scoped>
.branch { display: flex; flex-direction: column; align-items: center; position: relative; padding: 1.5rem .65rem 0; }
.node-wrapper { display: flex; align-items: center; flex-direction: column; position: relative; }
.edit-element { position: absolute; top: .65rem; right: .6rem; display: flex; gap: .25rem; align-items: center; color: var(--p-primary-color, #34d399); background: #202027; border: 1px solid #555; border-radius: 4px; padding: .2rem .35rem; font-size: .65rem; cursor: pointer; }
.edit-element i { font-size: .65rem; }
.concept-card { width: 210px; min-height: 120px; text-align: left; display: flex; flex-direction: column; gap: .5rem; padding: 1rem; border: 1px solid #41414b; border-radius: 10px; background: #202027; color: #f4f4f5; cursor: pointer; }
.concept-card[draggable=true] { cursor: grab; }
.concept-card:hover, .concept-card.selected { border-color: var(--p-primary-color, #34d399); box-shadow: 0 0 0 2px color-mix(in srgb, var(--p-primary-color, #34d399) 20%, transparent); }
.concept-card.family { border-top: 3px solid var(--p-primary-color, #34d399); }
.concept-card.drop-target { outline: 3px dashed var(--p-primary-color, #34d399); }
.kind { text-transform: uppercase; letter-spacing: .09em; font-size: .65rem; color: #b4b4bf; display: flex; gap: .4rem; align-items: center; padding-right: 3rem; }
strong { font-size: .95rem; overflow-wrap: anywhere; }
.description { font-size: .75rem; color: #b4b4bf; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.counts { font-size: .7rem; color: #b4b4bf; margin-top: auto; }
.branch-toggle { background: #292931; color: #ddd; border: 1px solid #555; border-radius: 12px; font-size: .65rem; padding: .2rem .45rem; margin-top: .35rem; cursor: pointer; }
.branch-toggle i { font-size: .55rem; }
.children { display: flex; list-style: none; margin: 0; padding: 1.5rem 0 0; position: relative; }
.children::before { content: ''; position: absolute; height: 1.5rem; top: 0; left: 50%; border-left: 1px solid #62626e; }
.children > .branch::before { content: ''; position: absolute; top: 0; left: 0; right: 0; border-top: 1px solid #62626e; }
.children > .branch::after { content: ''; position: absolute; top: 0; height: 1.5rem; left: 50%; border-left: 1px solid #62626e; }
.children > .branch:first-child::before { left: 50%; }
.children > .branch:last-child::before { right: 50%; }
.branch.horizontal { flex-direction: row; padding: .65rem 0 .65rem 1.5rem; }
.horizontal > .children { flex-direction: column; padding: 0 0 0 1.5rem; }
.horizontal > .children::before { height: 0; width: 1.5rem; top: 50%; left: 0; border-left: 0; border-top: 1px solid #62626e; }
.horizontal > .children > .branch::before { left: 0; right: auto; top: 0; bottom: 0; border-top: 0; border-left: 1px solid #62626e; }
.horizontal > .children > .branch::after { left: 0; top: 50%; width: 1.5rem; height: 0; border-left: 0; border-top: 1px solid #62626e; }
.horizontal > .children > .branch:first-child::before { top: 50%; }
.horizontal > .children > .branch:last-child::before { bottom: 50%; }
</style>
