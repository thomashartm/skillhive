<template>
  <DataTable
    :value="techniques"
    :loading="loading"
    paginator
    :first="first"
    :rows="rows"
    :sort-field="sortField"
    :sort-order="sortOrder"
    :rows-per-page-options="[10, 25, 50]"
    responsive-layout="scroll"
    class="technique-list"
    @page="emit('page', $event)"
    @sort="emit('sort', $event)"
  >
    <template #empty>
      <div class="text-center py-8 text-slate-400">
        <p>No techniques found</p>
        <p class="text-sm mt-2">Try another letter or adjust your search.</p>
      </div>
    </template>

    <Column field="name" header="Name" sortable>
      <template #body="{ data }">
        <a
          :href="`/techniques/${data.id}`"
          class="technique-name"
          @click.exact.prevent="emit('view', data)"
        >
          {{ data.name }}
        </a>
        <p v-if="data.description" class="technique-description">{{ data.description }}</p>
        <div v-if="data.categoryIds?.length" class="technique-categories">
          <button
            v-for="cat in resolveCategories(data.categoryIds)"
            :key="cat.id"
            type="button"
            class="category-chip"
            :aria-label="`Filter by ${cat.name}`"
            @click.stop="emit('filterCategory', cat.id)"
          >
            {{ cat.name }}
          </button>
        </div>
      </template>
    </Column>

    <Column v-if="authStore.canEdit" header="" class="technique-actions-column">
      <template #body="{ data }">
        <div class="technique-actions">
          <Button
            label="Edit"
            :aria-label="`Edit ${data.name}`"
            severity="secondary"
            size="small"
            text
            @click="emit('edit', data)"
          />
          <Button
            label="Delete"
            :aria-label="`Delete ${data.name}`"
            severity="danger"
            size="small"
            text
            @click="emit('delete', data)"
          />
        </div>
      </template>
    </Column>
  </DataTable>
</template>

<script setup lang="ts">
import DataTable, { type DataTablePageEvent, type DataTableSortEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import type { Technique, Category } from '../../types'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()

interface Props {
  techniques: Technique[]
  categories: Category[]
  loading?: boolean
  first: number
  rows: number
  sortField?: string
  sortOrder?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  edit: [technique: Technique]
  delete: [technique: Technique]
  view: [technique: Technique]
  filterCategory: [categoryId: string]
  page: [event: DataTablePageEvent]
  sort: [event: DataTableSortEvent]
}>()

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
  font-weight: 600;
  font-size: 1rem;
  color: #e2e8f0;
  cursor: pointer;
  text-decoration: none;
}

.technique-name:hover, .technique-name:focus-visible {
  color: var(--primary-color);
}

.technique-description {
  color: #a1a1aa;
  font-size: 0.875rem;
  line-height: 1.6;
  max-width: 80ch;
  margin-top: 0.25rem;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.technique-categories { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.5rem; }
.category-chip {
  padding: 0;
  font: inherit;
  font-size: 0.75rem;
  color: #94a3b8;
  background: none;
  border: 0;
  cursor: pointer;
  text-align: left;
}

.category-chip:hover, .category-chip:focus-visible {
  color: var(--primary-color);
  text-decoration: underline;
}

.technique-actions { display: flex; justify-content: flex-end; }
:deep(.technique-actions-column) { width: 8rem; }
:deep(.p-datatable-thead > tr > th) {
  background: transparent;
  color: #a1a1aa;
  font-weight: 400;
  font-size: 0.8rem;
  padding: 0.5rem 0.25rem;
  border-color: #27272a;
}
:deep(.p-datatable-tbody > tr) { background: transparent; }
:deep(.p-datatable-tbody > tr > td) {
  padding: 1rem 0.25rem;
  vertical-align: top;
  border-color: #27272a;
}
:deep(.p-paginator) { background: transparent; padding-top: 1rem; }
@media (max-width: 600px) {
  .technique-actions { flex-direction: column; align-items: flex-end; }
  :deep(.technique-actions-column) { width: 4rem; }
}
</style>
