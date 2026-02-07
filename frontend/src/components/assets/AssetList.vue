<template>
  <DataTable
    :value="assets"
    :loading="loading"
    striped-rows
    paginator
    :rows="10"
    :rows-per-page-options="[10, 25, 50]"
    data-key="id"
    class="asset-list"
  >
    <template #empty>
      <div class="text-center py-8 text-surface-500">
        <i class="pi pi-inbox text-4xl mb-3 block" />
        <p>No assets found</p>
      </div>
    </template>

    <Column header="Thumbnail" style="width: 100px">
      <template #body="{ data }">
        <img
          v-if="data.thumbnailUrl"
          :src="data.thumbnailUrl"
          :alt="data.title"
          class="w-16 h-16 object-cover rounded"
        />
        <div v-else class="w-16 h-16 bg-surface-100 dark:bg-surface-800 rounded flex items-center justify-center">
          <i class="pi pi-link text-surface-400" />
        </div>
      </template>
    </Column>

    <Column field="title" header="Title" sortable style="min-width: 250px">
      <template #body="{ data }">
        <div class="flex flex-col gap-1">
          <span class="font-semibold">{{ data.title }}</span>
          <a
            :href="data.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs text-primary-500 hover:text-primary-600 truncate"
          >
            {{ data.url }}
          </a>
        </div>
      </template>
    </Column>

    <Column field="type" header="Type" sortable style="width: 120px">
      <template #body="{ data }">
        <Tag :value="data.type" severity="info" />
      </template>
    </Column>

    <Column field="videoType" header="Video Type" sortable style="width: 140px">
      <template #body="{ data }">
        <Tag v-if="data.videoType" :value="data.videoType" severity="secondary" />
        <span v-else class="text-surface-400">-</span>
      </template>
    </Column>

    <Column field="originator" header="Originator" sortable style="min-width: 150px">
      <template #body="{ data }">
        <span v-if="data.originator">{{ data.originator }}</span>
        <span v-else class="text-surface-400">-</span>
      </template>
    </Column>

    <Column header="Actions" style="width: 150px">
      <template #body="{ data }">
        <div class="flex gap-2">
          <Button
            icon="pi pi-pencil"
            severity="secondary"
            size="small"
            text
            rounded
            @click="emit('edit', data)"
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            size="small"
            text
            rounded
            @click="emit('delete', data)"
          />
        </div>
      </template>
    </Column>
  </DataTable>
</template>

<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import type { Asset } from '../../types'

interface Props {
  assets: Asset[]
  loading?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  edit: [asset: Asset]
  delete: [asset: Asset]
}>()
</script>

<style scoped>
.asset-list :deep(.p-datatable-wrapper) {
  overflow-x: auto;
}
</style>
