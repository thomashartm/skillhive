<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import type { CategoryTree } from '../../types'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()

interface Props {
  categories: CategoryTree[]
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  edit: [category: CategoryTree]
  delete: [category: CategoryTree]
  view: [category: CategoryTree]
}>()

interface FlatRow {
  category: CategoryTree
  depth: number
  hasChildren: boolean
}

const flatRows = computed<FlatRow[]>(() => {
  const rows: FlatRow[] = []
  const walk = (list: CategoryTree[], depth: number) => {
    for (const cat of list) {
      const hasChildren = cat.children && cat.children.length > 0
      rows.push({ category: cat, depth, hasChildren })
      if (hasChildren) {
        walk(cat.children, depth + 1)
      }
    }
  }
  walk(props.categories, 0)
  return rows
})
</script>

<template>
  <div class="category-list">
    <!-- Rows -->
    <template v-if="!loading && flatRows.length > 0">
      <div
        v-for="row in flatRows"
        :key="row.category.id"
        class="cat-row"
        :class="{ 'cat-row-alt': flatRows.indexOf(row) % 2 === 1 }"
      >
        <div class="cat-row-inner" :style="{ paddingLeft: (row.depth * 1.5) + 'rem' }">
          <i
            class="pi text-xs text-slate-500"
            :class="row.hasChildren ? 'pi-folder' : 'pi-file'"
          ></i>
          <div class="cat-info" @click="emit('view', row.category)">
            <span class="cat-name">{{ row.category.name }}</span>
            <span v-if="row.category.description" class="cat-desc">{{ row.category.description }}</span>
          </div>
          <div v-if="authStore.canEdit" class="cat-actions">
            <Button
              icon="pi pi-pencil"
              severity="secondary"
              size="small"
              text
              @click.stop="emit('edit', row.category)"
              v-tooltip.top="'Edit'"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              size="small"
              text
              @click.stop="emit('delete', row.category)"
              v-tooltip.top="'Delete'"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center py-12 text-slate-400">
      <i class="pi pi-spin pi-spinner text-2xl"></i>
      <span class="ml-3">Loading categories...</span>
    </div>

    <!-- Empty state -->
    <div
      v-if="!loading && flatRows.length === 0"
      class="text-center py-8 text-slate-400"
    >
      No categories found. Create your first category to get started.
    </div>
  </div>
</template>

<style scoped>
.cat-row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.cat-row-alt {
  background: rgba(255, 255, 255, 0.02);
}

.cat-row-inner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  min-height: 2.5rem;
}

.cat-info {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  cursor: pointer;
  min-width: 0;
}

.cat-info:hover .cat-name {
  color: var(--primary-color);
}

.cat-name {
  font-size: 0.875rem;
  font-weight: 400;
  color: #e2e8f0;
  transition: color 0.15s ease;
}

.cat-desc {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.35);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cat-actions {
  display: flex;
  gap: 0.125rem;
  flex-shrink: 0;
}
</style>
