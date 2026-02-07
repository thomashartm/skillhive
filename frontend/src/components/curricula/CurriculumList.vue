<template>
  <DataTable
    :value="curricula"
    :loading="loading"
    :paginator="true"
    :rows="10"
    :rowsPerPageOptions="[5, 10, 20, 50]"
    sortField="updatedAt"
    :sortOrder="-1"
    class="p-datatable-sm"
  >
    <template #empty>
      <div class="text-center py-8 text-gray-500">
        No curricula found. Create your first curriculum to get started.
      </div>
    </template>

    <Column field="title" header="Title" :sortable="true" style="min-width: 200px">
      <template #body="{ data }">
        <div class="font-medium">{{ data.title }}</div>
      </template>
    </Column>

    <Column field="description" header="Description" style="min-width: 300px">
      <template #body="{ data }">
        <div class="text-sm text-gray-600 truncate">{{ data.description || '-' }}</div>
      </template>
    </Column>

    <Column field="elementCount" header="Elements" :sortable="true" style="width: 100px">
      <template #body="{ data }">
        <div class="text-center">{{ data.elementCount || 0 }}</div>
      </template>
    </Column>

    <Column field="isPublic" header="Public" :sortable="true" style="width: 80px">
      <template #body="{ data }">
        <div class="text-center">
          <i v-if="data.isPublic" class="pi pi-globe text-green-600" title="Public"></i>
          <i v-else class="pi pi-lock text-gray-400" title="Private"></i>
        </div>
      </template>
    </Column>

    <Column field="updatedAt" header="Updated" :sortable="true" style="width: 150px">
      <template #body="{ data }">
        <div class="text-sm">{{ formatDate(data.updatedAt) }}</div>
      </template>
    </Column>

    <Column header="Actions" style="width: 150px">
      <template #body="{ data }">
        <div class="flex gap-2">
          <Button
            icon="pi pi-eye"
            severity="info"
            size="small"
            outlined
            @click="$emit('view', data.id)"
            title="View"
          />
          <Button
            icon="pi pi-pencil"
            severity="secondary"
            size="small"
            outlined
            @click="$emit('edit', data)"
            title="Edit"
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            size="small"
            outlined
            @click="$emit('delete', data.id)"
            title="Delete"
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
import type { Curriculum } from '../../types'

defineProps<{
  curricula: Curriculum[]
  loading: boolean
}>()

defineEmits<{
  view: [id: string]
  edit: [curriculum: Curriculum]
  delete: [id: string]
}>()

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}
</script>
