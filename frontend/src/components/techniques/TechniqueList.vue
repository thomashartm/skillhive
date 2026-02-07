<template>
  <DataTable
    :value="techniques"
    :loading="loading"
    striped-rows
    paginator
    :rows="10"
    :rows-per-page-options="[10, 25, 50]"
    responsive-layout="scroll"
    class="technique-list"
  >
    <template #empty>
      <div class="text-center py-8 text-gray-500">
        No techniques found
      </div>
    </template>

    <Column field="name" header="Name" sortable>
      <template #body="{ data }">
        <span class="font-semibold">{{ data.name }}</span>
      </template>
    </Column>

    <Column field="description" header="Description">
      <template #body="{ data }">
        <span class="text-sm text-gray-600">
          {{ truncateText(data.description, 100) }}
        </span>
      </template>
    </Column>

    <Column header="Categories" style="width: 120px">
      <template #body="{ data }">
        <span class="text-sm">
          {{ data.categoryIds?.length || 0 }}
        </span>
      </template>
    </Column>

    <Column header="Tags" style="width: 100px">
      <template #body="{ data }">
        <span class="text-sm">
          {{ data.tagIds?.length || 0 }}
        </span>
      </template>
    </Column>

    <Column header="Actions" style="width: 150px">
      <template #body="{ data }">
        <div class="flex gap-2">
          <Button
            icon="pi pi-eye"
            severity="secondary"
            size="small"
            @click="emit('view', data)"
            aria-label="View technique"
          />
          <Button
            icon="pi pi-pencil"
            severity="info"
            size="small"
            @click="emit('edit', data)"
            aria-label="Edit technique"
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            size="small"
            @click="emit('delete', data)"
            aria-label="Delete technique"
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
import type { Technique } from '../../types'

interface Props {
  techniques: Technique[]
  loading?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  edit: [technique: Technique]
  delete: [technique: Technique]
  view: [technique: Technique]
}>()

const truncateText = (text: string | undefined, maxLength: number): string => {
  if (!text) return 'No description'
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
</script>

<style scoped>
.technique-list {
  width: 100%;
}
</style>
