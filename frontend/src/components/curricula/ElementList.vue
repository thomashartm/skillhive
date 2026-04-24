<template>
  <div class="space-y-3">
    <div v-if="sortedElements.length === 0" class="text-center py-8 text-slate-400 border-2 border-dashed border-white/10">
      No elements yet. Add techniques, assets, or text notes to build your curriculum.
    </div>
    <div
      v-for="(element, index) in sortedElements"
      :key="element.id"
      class="relative"
      :draggable="editable"
      @dragstart="handleDragStart(index, $event)"
      @dragover.prevent="handleDragOver(index, $event)"
      @dragleave="handleDragLeave(index)"
      @drop.prevent="handleDrop"
      @dragend="handleDragEnd"
    >
      <div
        v-if="showIndicator(index, 'before')"
        class="drop-indicator drop-indicator-before"
      ></div>
      <ElementCard
        :element="element"
        :editable="editable"
        :class="{ 'opacity-40': draggedIndex === index }"
        @edit="$emit('edit-element', $event)"
        @delete="$emit('delete-element', $event)"
      />
      <div
        v-if="showIndicator(index, 'after')"
        class="drop-indicator drop-indicator-after"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ElementCard from './ElementCard.vue'
import type { CurriculumElement } from '../../types'

const props = withDefaults(
  defineProps<{
    elements: CurriculumElement[]
    editable?: boolean
  }>(),
  {
    editable: true
  }
)

const emit = defineEmits<{
  reorder: [orderedIds: string[]]
  'edit-element': [element: CurriculumElement]
  'delete-element': [id: string]
}>()

const sortedElements = computed(() => {
  return [...props.elements].sort((a, b) => a.ord - b.ord)
})

const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)
const dropPosition = ref<'before' | 'after'>('before')

const showIndicator = (index: number, position: 'before' | 'after') => {
  if (dragOverIndex.value !== index) return false
  if (dropPosition.value !== position) return false
  if (draggedIndex.value === null) return false
  // Don't show an indicator that would produce a no-op drop (landing on self).
  if (index === draggedIndex.value) return false
  if (position === 'before' && index === draggedIndex.value + 1) return false
  if (position === 'after' && index === draggedIndex.value - 1) return false
  return true
}

const handleDragStart = (index: number, event: DragEvent) => {
  if (!props.editable) return
  draggedIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    // Firefox requires setData to actually initiate a drag.
    event.dataTransfer.setData('text/plain', String(index))
  }
}

const handleDragOver = (index: number, event: DragEvent) => {
  if (!props.editable || draggedIndex.value === null) return
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const midpoint = rect.top + rect.height / 2
  dropPosition.value = event.clientY < midpoint ? 'before' : 'after'
  dragOverIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const handleDragLeave = (index: number) => {
  if (dragOverIndex.value === index) {
    dragOverIndex.value = null
  }
}

const handleDrop = () => {
  if (!props.editable || draggedIndex.value === null || dragOverIndex.value === null) {
    resetDragState()
    return
  }

  const from = draggedIndex.value
  const overIndex = dragOverIndex.value
  let to = dropPosition.value === 'before' ? overIndex : overIndex + 1
  // When the source sits before the insertion point, removing it shifts the target left by one.
  if (from < to) to -= 1

  if (from === to) {
    resetDragState()
    return
  }

  const items = [...sortedElements.value]
  const [moved] = items.splice(from, 1)
  if (!moved) {
    resetDragState()
    return
  }
  items.splice(to, 0, moved)

  emit('reorder', items.map(item => item.id))
  resetDragState()
}

const handleDragEnd = () => {
  resetDragState()
}

const resetDragState = () => {
  draggedIndex.value = null
  dragOverIndex.value = null
}
</script>

<style scoped>
.drop-indicator {
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  background: rgb(59 130 246);
  border-radius: 2px;
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 0 8px rgb(59 130 246 / 0.6);
}
.drop-indicator-before {
  top: -7px;
}
.drop-indicator-after {
  bottom: -7px;
}
</style>
