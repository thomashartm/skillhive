<template>
  <DataTable
    :value="curricula"
    :loading="loading"
    :paginator="true"
    :rows="10"
    :rowsPerPageOptions="[5, 10, 20, 50]"
    sortField="updatedAt"
    :sortOrder="-1"
    class="curriculum-list"
  >
    <template #empty>
      <div class="text-center py-8 text-slate-400">
        No curricula found. Create your first curriculum to get started.
      </div>
    </template>

    <Column field="title" header="Title" :sortable="true" style="min-width: 200px">
      <template #body="{ data }">
        <a class="curriculum-name" @click.prevent="$emit('view', data.id)">{{ data.title }}</a>
      </template>
    </Column>

    <Column field="description" header="Description" style="min-width: 300px">
      <template #body="{ data }">
        <div class="description-cell">
          <MarkdownRenderer v-if="data.description" :content="data.description" class="text-sm text-slate-400" />
          <span v-else class="text-sm text-slate-400">-</span>
        </div>
      </template>
    </Column>

    <Column field="elementCount" header="Elements" :sortable="true" style="width: 100px">
      <template #body="{ data }">
        <div class="text-center text-sm text-slate-400">{{ data.elementCount || 0 }}</div>
      </template>
    </Column>

    <Column field="isPublic" header="Public" :sortable="true" style="width: 80px">
      <template #body="{ data }">
        <div class="text-center">
          <i v-if="data.isPublic" class="pi pi-globe text-green-600" title="Public"></i>
          <i v-else class="pi pi-lock text-slate-500" title="Private"></i>
        </div>
      </template>
    </Column>

    <Column field="updatedAt" header="Updated" :sortable="true" style="width: 150px">
      <template #body="{ data }">
        <div class="text-sm">{{ formatDate(data.updatedAt) }}</div>
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
            @click="$emit('edit', data)"
            v-tooltip.top="'Edit'"
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            size="small"
            text
            @click="$emit('delete', data.id)"
            v-tooltip.top="'Delete'"
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
import MarkdownRenderer from '../common/MarkdownRenderer.vue'
import type { Curriculum } from '../../types'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()

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

<style scoped>
.curriculum-list {
  width: 100%;
}

.curriculum-name {
  font-weight: 400;
  font-size: 0.875rem;
  color: #e2e8f0;
  cursor: pointer;
}

.curriculum-name:hover {
  color: var(--primary-color);
}

.description-cell {
  max-height: 3rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.description-cell :deep(p) {
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.description-cell :deep(ul),
.description-cell :deep(ol),
.description-cell :deep(h1),
.description-cell :deep(h2),
.description-cell :deep(h3) {
  display: none;
}
</style>
