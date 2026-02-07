<template>
  <Card class="technique-card">
    <template #title>
      <div class="flex justify-between items-start">
        <span class="text-lg font-semibold">{{ technique.name }}</span>
        <div class="flex gap-2">
          <Button
            icon="pi pi-eye"
            severity="secondary"
            text
            rounded
            @click="emit('view', technique)"
            aria-label="View technique"
          />
          <Button
            icon="pi pi-pencil"
            severity="info"
            text
            rounded
            @click="emit('edit', technique)"
            aria-label="Edit technique"
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            text
            rounded
            @click="emit('delete', technique)"
            aria-label="Delete technique"
          />
        </div>
      </div>
    </template>
    <template #content>
      <div class="flex flex-col gap-3">
        <p class="text-sm text-gray-600 line-clamp-3">
          {{ technique.description || 'No description' }}
        </p>
        <div class="flex gap-4 text-sm">
          <div class="flex items-center gap-2">
            <i class="pi pi-folder text-gray-500"></i>
            <span>{{ technique.categoryIds?.length || 0 }} categories</span>
          </div>
          <div class="flex items-center gap-2">
            <i class="pi pi-tags text-gray-500"></i>
            <span>{{ technique.tagIds?.length || 0 }} tags</span>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import Card from 'primevue/card'
import Button from 'primevue/button'
import type { Technique } from '../../types'

interface Props {
  technique: Technique
}

defineProps<Props>()

const emit = defineEmits<{
  edit: [technique: Technique]
  delete: [technique: Technique]
  view: [technique: Technique]
}>()
</script>

<style scoped>
.technique-card {
  height: 100%;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
