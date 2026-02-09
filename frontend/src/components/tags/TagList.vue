<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import type { Tag } from '../../types'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()

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
    class="tag-list"
  >
    <template #empty>
      <div class="text-center py-8 text-slate-400">
        No tags found. Create your first tag to get started.
      </div>
    </template>

    <Column field="name" header="Name" sortable>
      <template #body="{ data }">
        <span class="text-sm">{{ data.name }}</span>
      </template>
    </Column>

    <Column field="color" header="Color" style="width: 60px">
      <template #body="{ data }">
        <div
          class="w-5 h-5 border border-white/20"
          :style="{ backgroundColor: data.color || '#6B7280' }"
          v-tooltip.top="data.color || '#6B7280'"
        />
      </template>
    </Column>

    <Column field="description" header="Description">
      <template #body="{ data }">
        <span class="text-slate-400 text-sm">
          {{ data.description || '—' }}
        </span>
      </template>
    </Column>

    <Column v-if="authStore.canEdit" header="" style="width: 80px">
      <template #body="{ data }">
        <div class="flex gap-1 justify-end">
          <Button
            icon="pi pi-pencil"
            severity="secondary"
            size="small"
            text
            @click="handleEdit(data)"
            v-tooltip.top="'Edit'"
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            size="small"
            text
            @click="handleDelete(data)"
            v-tooltip.top="'Delete'"
          />
        </div>
      </template>
    </Column>
  </DataTable>
</template>

<style scoped>
.tag-list {
  width: 100%;
}
</style>
