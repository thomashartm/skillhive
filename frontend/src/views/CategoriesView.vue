<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Message from 'primevue/message'
import CategoryTree from '../components/categories/CategoryTree.vue'
import CategoryForm from '../components/categories/CategoryForm.vue'
import { useCategoryStore } from '../stores/categories'
import { useDisciplineStore } from '../stores/discipline'
import { useAuthStore } from '../stores/auth'
import type { Category, CategoryTree as CategoryTreeType } from '../types'
import type { CategoryFormData } from '../validation/schemas'

/**
 * CategoriesView - Main view for managing hierarchical categories
 *
 * Features:
 * - Tree view of categories with parent-child relationships
 * - Create new categories (top-level or as children)
 * - Edit existing categories
 * - Delete categories with confirmation
 * - Auto-refresh when discipline changes
 * - Prevents circular references in parent selection
 */

const router = useRouter()
const authStore = useAuthStore()
const categoryStore = useCategoryStore()
const disciplineStore = useDisciplineStore()
const { categories, tree, loading, error } = storeToRefs(categoryStore)
const { activeDisciplineId } = storeToRefs(disciplineStore)

const toast = useToast()
const confirm = useConfirm()

// Dialog state
const showDialog = ref(false)
const editingCategory = ref<Category | null>(null)

// Search
const searchTerm = ref('')

function filterTree(nodes: CategoryTreeType[], query: string): CategoryTreeType[] {
  const lower = query.toLowerCase()
  const result: CategoryTreeType[] = []
  for (const node of nodes) {
    const filteredChildren = node.children ? filterTree(node.children, query) : []
    const nameMatch = node.name.toLowerCase().includes(lower)
    const descMatch = node.description?.toLowerCase().includes(lower) ?? false
    if (nameMatch || descMatch || filteredChildren.length > 0) {
      result.push({ ...node, children: filteredChildren.length > 0 ? filteredChildren : node.children && nameMatch ? node.children : filteredChildren })
    }
  }
  return result
}

const filteredTree = computed(() => {
  if (!searchTerm.value.trim()) return tree.value
  return filterTree(tree.value, searchTerm.value.trim())
})

// Fetch categories on mount and when discipline changes
onMounted(() => {
  if (activeDisciplineId.value) {
    fetchData()
  }
})

watch(activeDisciplineId, (newDisciplineId) => {
  if (newDisciplineId) {
    fetchData()
  }
})

/**
 * Fetch both flat list (for form) and tree structure (for display)
 */
const fetchData = async () => {
  await Promise.all([
    categoryStore.fetchCategories(),
    categoryStore.fetchTree(),
  ])
}

// Create new category
const handleNew = () => {
  editingCategory.value = null
  showDialog.value = true
}

// Edit existing category
const handleEdit = (category: Category) => {
  editingCategory.value = category
  showDialog.value = true
}

// Save category (create or update)
const handleSave = async (data: CategoryFormData) => {
  try {
    if (editingCategory.value) {
      // Update existing category
      await categoryStore.updateCategory(editingCategory.value.id, data)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Category updated successfully',
        life: 3000,
      })
    } else {
      // Create new category
      await categoryStore.createCategory(data)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Category created successfully',
        life: 3000,
      })
    }

    // Refresh tree view
    await fetchData()

    showDialog.value = false
    editingCategory.value = null
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save category',
      life: 5000,
    })
  }
}

// Delete category with confirmation
const handleDelete = (category: Category) => {
  const hasChildren = category.children && category.children.length > 0

  confirm.require({
    message: hasChildren
      ? `"${category.name}" has child categories. Deleting it will also delete all its children. This action cannot be undone.`
      : `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await categoryStore.deleteCategory(category.id)
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Category deleted successfully',
          life: 3000,
        })

        // Refresh tree view
        await fetchData()
      } catch (error: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to delete category',
          life: 5000,
        })
      }
    },
  })
}

// Navigate to category detail
const handleView = (category: Category) => {
  router.push(`/categories/${category.id}`)
}

// Close dialog
const handleCloseDialog = () => {
  showDialog.value = false
  editingCategory.value = null
}
</script>

<template>
  <div class="categories-view">
    <!-- Header -->
    <div class="view-header">
      <h1 class="view-title">Categories</h1>
      <Button
        v-if="authStore.canEdit"
        label="New Category"
        icon="pi pi-plus"
        size="small"
        @click="handleNew"
        :disabled="!activeDisciplineId"
      />
    </div>

    <!-- No discipline selected message -->
    <div
      v-if="!activeDisciplineId"
      class="bg-yellow-900/20 border border-yellow-700/40 p-4 mb-6"
    >
      <div class="flex items-center gap-2">
        <i class="pi pi-info-circle text-yellow-400"></i>
        <span class="text-yellow-300">Please select a discipline to view categories.</span>
      </div>
    </div>

    <!-- Error state -->
    <Message v-if="error" severity="error" :closable="false" class="mb-4">
      {{ error }}
    </Message>

    <!-- Search -->
    <div v-if="activeDisciplineId" class="filter-bar">
      <InputText
        v-model="searchTerm"
        placeholder="Search categories..."
        class="filter-search"
      />
    </div>

    <!-- Category tree -->
    <CategoryTree
      v-if="activeDisciplineId"
      :categories="filteredTree"
      :loading="loading"
      @edit="handleEdit"
      @delete="handleDelete"
      @view="handleView"
    />

    <!-- Category form dialog -->
    <CategoryForm
      :visible="showDialog"
      :category="editingCategory"
      :categories="categories"
      @save="handleSave"
      @close="handleCloseDialog"
    />
  </div>
</template>

<style scoped>
.categories-view {
}

.filter-bar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.filter-search {
  width: 16rem;
}
</style>
