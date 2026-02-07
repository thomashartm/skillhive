<template>
  <Card class="asset-card">
    <template #header>
      <div class="asset-thumbnail">
        <img
          v-if="asset.thumbnailUrl"
          :src="asset.thumbnailUrl"
          :alt="asset.title"
          class="w-full h-48 object-cover"
        />
        <div v-else class="w-full h-48 bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
          <i class="pi pi-link text-4xl text-surface-400" />
        </div>
      </div>
    </template>
    <template #title>
      <div class="flex items-start justify-between gap-2">
        <span class="text-lg font-semibold line-clamp-2">{{ asset.title }}</span>
      </div>
    </template>
    <template #subtitle>
      <div class="flex flex-wrap gap-2 mt-2">
        <Tag :value="asset.type" severity="info" />
        <Tag v-if="asset.videoType && asset.type === 'video'" :value="asset.videoType" severity="secondary" />
      </div>
    </template>
    <template #content>
      <div class="space-y-2">
        <p v-if="asset.originator" class="text-sm text-surface-600 dark:text-surface-400">
          <i class="pi pi-user mr-1" />
          {{ asset.originator }}
        </p>
        <p v-if="asset.description" class="text-sm text-surface-700 dark:text-surface-300 line-clamp-3">
          {{ asset.description }}
        </p>
      </div>
    </template>
    <template #footer>
      <div class="flex gap-2 justify-end">
        <Button
          icon="pi pi-pencil"
          label="Edit"
          severity="secondary"
          size="small"
          @click="emit('edit', asset)"
        />
        <Button
          icon="pi pi-trash"
          label="Delete"
          severity="danger"
          size="small"
          @click="emit('delete', asset)"
        />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import Card from 'primevue/card'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import type { Asset } from '../../types'

interface Props {
  asset: Asset
}

defineProps<Props>()

const emit = defineEmits<{
  edit: [asset: Asset]
  delete: [asset: Asset]
}>()
</script>

<style scoped>
.asset-card {
  height: 100%;
}

.asset-thumbnail {
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
