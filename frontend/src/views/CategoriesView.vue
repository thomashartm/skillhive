<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import CategoryTree from '../components/categories/CategoryTree.vue'
import CategoryForm from '../components/categories/CategoryForm.vue'
import { useCategoryStore } from '../stores/categories'
import { useDisciplineStore } from '../stores/discipline'
import type { Category } from '../types'
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

const categoryStore = useCategoryStore()
const disciplineStore = useDisciplineStore()
const { categories, tree, loading } = storeToRefs(categoryStore)
const { activeDisciplineId } = storeToRefs(disciplineStore)

const toast = useToast()
const confirm = useConfirm()

// Dialog state
const showDialog = ref(false)
const editingCategory = ref<Category | null>(null)

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

// Close dialog
const handleCloseDialog = () => {
  showDialog.value = false
  editingCategory.value = null
}
</script>

<template>
  <div class="categories-view">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-3xl font-bold text-gray-900">Categories</h2>
      <Button
        label="New Category"
        icon="pi pi-plus"
        @click="handleNew"
        :disabled="!activeDisciplineId"
      />
    </div>

    <!-- No discipline selected message -->
    <div
      v-if="!activeDisciplineId"
      class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6"
    >
      <div class="flex items-center gap-2">
        <i class="pi pi-info-circle text-yellow-600"></i>
        <span class="text-yellow-800">Please select a discipline to view categories.</span>
      </div>
    </div>

    <!-- Category tree -->
    <CategoryTree
      v-if="activeDisciplineId"
      :categories="tree"
      :loading="loading"
      @edit="handleEdit"
      @delete="handleDelete"
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
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
