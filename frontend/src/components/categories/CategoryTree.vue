<script setup lang="ts">
import { computed } from 'vue'
import Tree from 'primevue/tree'
import Button from 'primevue/button'
import type { TreeNode } from 'primevue/tree'
import type { CategoryTree } from '../../types'

/**
 * CategoryTree - Tree component displaying hierarchical categories
 *
 * @example
 * <CategoryTree
 *   :categories="tree"
 *   :loading="loading"
 *   @edit="handleEdit"
 *   @delete="handleDelete"
 * />
 */

interface Props {
  categories: CategoryTree[]
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  edit: [category: CategoryTree]
  delete: [category: CategoryTree]
}>()

/**
 * Transform CategoryTree to PrimeVue TreeNode format
 * Recursively maps children and attaches original category data
 */
const treeNodes = computed<TreeNode[]>(() => {
  const transform = (category: CategoryTree): TreeNode => {
    return {
      key: category.id,
      label: category.name,
      data: category, // Attach original category for actions
      children: category.children?.map(transform) || [],
    }
  }

  return props.categories.map(transform)
})

const handleEdit = (node: TreeNode) => {
  if (node.data) {
    emit('edit', node.data)
  }
}

const handleDelete = (node: TreeNode) => {
  if (node.data) {
    emit('delete', node.data)
  }
}
</script>

<template>
  <div class="category-tree">
    <Tree
      v-if="!loading && treeNodes.length > 0"
      :value="treeNodes"
      class="w-full"
    >
      <template #default="{ node }">
        <div class="flex items-center justify-between w-full pr-2">
          <span class="font-medium">{{ node.label }}</span>
          <div class="flex gap-1">
            <Button
              icon="pi pi-pencil"
              severity="info"
              size="small"
              text
              rounded
              @click.stop="handleEdit(node)"
              v-tooltip.top="'Edit category'"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              size="small"
              text
              rounded
              @click.stop="handleDelete(node)"
              v-tooltip.top="'Delete category'"
            />
          </div>
        </div>
      </template>
    </Tree>

    <!-- Loading state -->
    <div
      v-if="loading"
      class="flex items-center justify-center py-12 text-gray-500"
    >
      <i class="pi pi-spin pi-spinner text-2xl"></i>
      <span class="ml-3">Loading categories...</span>
    </div>

    <!-- Empty state -->
    <div
      v-if="!loading && treeNodes.length === 0"
      class="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
    >
      <i class="pi pi-folder-open text-4xl mb-3 block"></i>
      <p class="text-lg font-medium">No categories found</p>
      <p class="text-sm mt-1">Create your first category to get started.</p>
    </div>
  </div>
</template>

<style scoped>
.category-tree {
  min-height: 200px;
}

/* Override PrimeVue Tree to allow full-width action buttons */
:deep(.p-tree-node-content) {
  width: 100%;
}

:deep(.p-tree-node-label) {
  width: 100%;
}
</style>
