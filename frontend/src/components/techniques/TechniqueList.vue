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
      <div class="text-center py-8 text-slate-400">
        No techniques found
      </div>
    </template>

    <Column field="name" header="Name" sortable>
      <template #body="{ data }">
        <a
          class="technique-name"
          @click.prevent="emit('view', data)"
        >
          {{ data.name }}
        </a>
      </template>
    </Column>

    <Column field="description" header="Description">
      <template #body="{ data }">
        <span class="text-sm text-slate-400">
          {{ truncateText(data.description, 80) }}
        </span>
      </template>
    </Column>

    <Column header="Categories" style="width: 200px">
      <template #body="{ data }">
        <div class="flex flex-wrap gap-1">
          <span
            v-for="cat in resolveCategories(data.categoryIds)"
            :key="cat.id"
            class="category-chip"
            @click.stop="emit('filterCategory', cat.id)"
          >
            {{ cat.name }}
          </span>
          <span v-if="!data.categoryIds?.length" class="text-xs text-slate-500">&mdash;</span>
        </div>
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
            @click="emit('edit', data)"
            v-tooltip.top="'Edit'"
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            size="small"
            text
            @click="emit('delete', data)"
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
import type { Technique, Category } from '../../types'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()

interface Props {
  techniques: Technique[]
  categories: Category[]
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  edit: [technique: Technique]
  delete: [technique: Technique]
  view: [technique: Technique]
  filterCategory: [categoryId: string]
}>()

const truncateText = (text: string | undefined, maxLength: number): string => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const resolveCategories = (categoryIds: string[] | undefined): Category[] => {
  if (!categoryIds || !categoryIds.length) return []
  return props.categories.filter(c => categoryIds.includes(c.id))
}
</script>

<style scoped>
.technique-list {
  width: 100%;
}

.technique-name {
  font-weight: 400;
  font-size: 0.875rem;
  color: #e2e8f0;
  cursor: pointer;
  text-decoration: none;
}

.technique-name:hover {
  color: var(--primary-color);
}

.category-chip {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease;
}

.category-chip:hover {
  background: rgba(255, 255, 255, 0.15);
  color: var(--primary-color);
}
</style>
