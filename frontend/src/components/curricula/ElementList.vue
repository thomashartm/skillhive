<template>
  <div class="space-y-3">
    <div v-if="elements.length === 0" class="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
      No elements yet. Add techniques, assets, or text notes to build your curriculum.
    </div>
    <div
      v-for="(element, index) in sortedElements"
      :key="element.id"
      @dragstart="handleDragStart(index, $event)"
      @dragover.prevent="handleDragOver(index)"
      @drop="handleDrop(index)"
      @dragend="handleDragEnd"
    >
      <ElementCard
        :element="element"
        :editable="editable"
        @edit="$emit('edit-element', $event)"
        @delete="$emit('delete-element', $event)"
      />
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

const handleDragStart = (index: number, event: DragEvent) => {
  if (!props.editable) return
  draggedIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

const handleDragOver = (index: number) => {
  if (!props.editable || draggedIndex.value === null) return
  dragOverIndex.value = index
}

const handleDrop = (dropIndex: number) => {
  if (!props.editable || draggedIndex.value === null) return

  const items = [...sortedElements.value]
  const draggedItem = items[draggedIndex.value]

  items.splice(draggedIndex.value, 1)
  items.splice(dropIndex, 0, draggedItem)

  const orderedIds = items.map(item => item.id)
  emit('reorder', orderedIds)

  draggedIndex.value = null
  dragOverIndex.value = null
}

const handleDragEnd = () => {
  draggedIndex.value = null
  dragOverIndex.value = null
}
</script>
