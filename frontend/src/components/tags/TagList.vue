<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import type { Tag } from '../../types'

/**
 * TagList - DataTable displaying all tags
 *
 * @example
 * <TagList
 *   :tags="tags"
 *   :loading="loading"
 *   @edit="handleEdit"
 *   @delete="handleDelete"
 * />
 */

interface Props {
  tags: Tag[]
  loading?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  edit: [tag: Tag]
  delete: [tag: Tag]
}>()

const handleEdit = (tag: Tag) => {
  emit('edit', tag)
}

const handleDelete = (tag: Tag) => {
  emit('delete', tag)
}
</script>

<template>
  <DataTable
    :value="tags"
    :loading="loading"
    striped-rows
    paginator
    :rows="10"
    data-key="id"
    class="p-datatable-sm"
  >
    <template #empty>
      <div class="text-center py-8 text-gray-500">
        No tags found. Create your first tag to get started.
      </div>
    </template>

    <Column field="name" header="Name" sortable>
      <template #body="{ data }">
        <span class="font-semibold">{{ data.name }}</span>
      </template>
    </Column>

    <Column field="color" header="Color" style="width: 120px">
      <template #body="{ data }">
        <div class="flex items-center gap-2">
          <div
            class="w-6 h-6 rounded-full border border-gray-300"
            :style="{ backgroundColor: data.color || '#6B7280' }"
          />
          <span class="text-xs text-gray-600">{{ data.color || '#6B7280' }}</span>
        </div>
      </template>
    </Column>

    <Column field="description" header="Description">
      <template #body="{ data }">
        <span class="text-gray-600 text-sm">
          {{ data.description || '—' }}
        </span>
      </template>
    </Column>

    <Column header="Actions" style="width: 120px">
      <template #body="{ data }">
        <div class="flex gap-2">
          <Button
            icon="pi pi-pencil"
            severity="info"
            size="small"
            text
            rounded
            @click="handleEdit(data)"
            v-tooltip.top="'Edit tag'"
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            size="small"
            text
            rounded
            @click="handleDelete(data)"
            v-tooltip.top="'Delete tag'"
          />
        </div>
      </template>
    </Column>
  </DataTable>
</template>

<style scoped>
/* PrimeVue DataTable handles styling */
</style>
