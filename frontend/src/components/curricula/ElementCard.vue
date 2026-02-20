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
        v-else-if="element.type === 'image' && element.imageUrl"
        :src="element.imageUrl"
        alt="Image"
        class="w-16 h-16 object-cover rounded"
      />
      <i v-else-if="element.type === 'image'" class="pi pi-image text-amber-400 text-xl"></i>
      <i v-else-if="element.type === 'list'" class="pi pi-list text-teal-400 text-xl"></i>
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
        <span
          v-if="element.duration"
          class="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700 text-xs text-slate-300"
        >
          <i class="pi pi-clock text-xs"></i>{{ element.duration }}
        </span>
      </div>
      <MarkdownRenderer
        v-if="element.details && (element.type === 'text' || element.type === 'list')"
        :content="element.details"
        class="text-sm text-slate-400 mt-1"
      />
      <div v-else-if="element.details" class="text-sm text-slate-400 mt-1 truncate">
        {{ element.details }}
      </div>
      <ul
        v-if="element.type === 'list' && element.items?.length"
        class="text-sm text-slate-400 mt-2 space-y-1"
      >
        <li v-for="(item, idx) in element.items" :key="idx" class="flex items-start gap-2">
          <i class="pi pi-check text-teal-400 text-xs mt-1"></i>
          <span>{{ item }}</span>
        </li>
      </ul>
      <div class="text-xs text-slate-500 mt-1">
        {{
          element.type === 'technique'
            ? 'Technique'
            : element.type === 'asset'
              ? 'Asset'
              : element.type === 'image'
                ? 'Image'
                : element.type === 'list'
                  ? 'List'
                  : 'Text Note'
        }}
      </div>
    </div>

    <div v-if="editable" class="flex gap-2 flex-shrink-0">
      <Button
        v-if="element.type === 'technique' && element.techniqueId"
        icon="pi pi-arrow-right"
        severity="secondary"
        size="small"
        text
        @click="router.push(`/techniques/${element.techniqueId}`)"
        title="View Technique"
      />
      <Button
        v-else-if="element.type === 'asset' && element.assetId"
        icon="pi pi-arrow-right"
        severity="secondary"
        size="small"
        text
        @click="router.push(`/assets/${element.assetId}`)"
        title="View Asset"
      />
      <template v-else>
        <Button
          icon="pi pi-pencil"
          severity="secondary"
          size="small"
          text
          @click="$emit('edit', element)"
          title="Edit"
        />
      </template>
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
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import MarkdownRenderer from '../common/MarkdownRenderer.vue'
import type { CurriculumElement } from '../../types'

const router = useRouter()

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
  if (props.element.type === 'image') {
    return props.element.title || 'Image'
  }
  if (props.element.type === 'list') {
    return props.element.title || 'Untitled List'
  }
  return props.element.title || 'Untitled Note'
}
</script>
