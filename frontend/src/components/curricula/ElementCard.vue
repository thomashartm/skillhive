<template>
  <div
    class="flex items-start gap-3 p-4 bg-white/5 border border-white/10 transition-colors hover:bg-white/8"
    :draggable="editable"
  >
    <div v-if="editable" class="cursor-move text-slate-500 hover:text-slate-300 mt-1">
      <i class="pi pi-bars"></i>
    </div>

    <div class="flex-shrink-0 mt-1">
      <i v-if="element.type === 'technique'" class="pi pi-bookmark text-blue-400 text-xl"></i>
      <i v-else-if="element.type === 'text'" class="pi pi-align-left text-purple-400 text-xl"></i>
      <img
        v-else-if="element.type === 'asset' && element.snapshot?.thumbnailUrl"
        :src="element.snapshot.thumbnailUrl"
        alt="Asset thumbnail"
        class="w-16 h-16 object-cover rounded"
      />
      <i v-else class="pi pi-video text-green-400 text-xl"></i>
    </div>

    <div class="flex-1 min-w-0">
      <div class="font-medium text-slate-100 truncate">
        {{ getElementTitle() }}
        <a
          v-if="element.type === 'asset' && element.snapshot?.url"
          :href="element.snapshot.url"
          target="_blank"
          rel="noopener noreferrer"
          class="ml-2 text-blue-400 hover:text-blue-300"
        >
          <i class="pi pi-external-link text-sm"></i>
        </a>
      </div>
      <div v-if="element.details" class="text-sm text-slate-400 mt-1 truncate">
        {{ element.details }}
      </div>
      <div class="text-xs text-slate-500 mt-1">
        {{ element.type === 'technique' ? 'Technique' : element.type === 'asset' ? 'Asset' : 'Text Note' }}
      </div>
    </div>

    <div v-if="editable" class="flex gap-2 flex-shrink-0">
      <Button
        icon="pi pi-pencil"
        severity="secondary"
        size="small"
        text
        @click="$emit('edit', element)"
        title="Edit"
      />
      <Button
        icon="pi pi-trash"
        severity="danger"
        size="small"
        text
        @click="$emit('delete', element.id)"
        title="Delete"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import type { CurriculumElement } from '../../types'

const props = withDefaults(
  defineProps<{
    element: CurriculumElement
    editable?: boolean
  }>(),
  {
    editable: true
  }
)

defineEmits<{
  edit: [element: CurriculumElement]
  delete: [id: string]
}>()

const getElementTitle = () => {
  if (props.element.type === 'technique' || props.element.type === 'asset') {
    return props.element.snapshot?.name || 'Untitled'
  }
  return props.element.title || 'Untitled Note'
}
</script>
