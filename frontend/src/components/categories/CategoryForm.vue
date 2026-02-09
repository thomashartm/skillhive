<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Button from 'primevue/button'
import type { Category } from '../../types'
import { categorySchema, type CategoryFormData } from '../../validation/schemas'

/**
 * CategoryForm - Dialog for creating/editing categories
 *
 * Prevents circular references by excluding self and descendants from parent picker
 *
 * @example
 * <CategoryForm
 *   :visible="showDialog"
 *   :category="editingCategory"
 *   :categories="categories"
 *   @save="handleSave"
 *   @close="showDialog = false"
 * />
 */

interface Props {
  visible: boolean
  category: Category | null
  categories: Category[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  save: [data: CategoryFormData]
  close: []
}>()

// Form state
const formData = ref<CategoryFormData>({
  name: '',
  description: '',
  parentId: null,
})

const errors = ref<Record<string, string>>({})

/**
 * Get all descendant IDs of a category
 * Used to prevent circular references
 */
const getDescendantIds = (categoryId: string, allCategories: Category[]): string[] => {
  const descendants: string[] = []
  const children = allCategories.filter((c) => c.parentId === categoryId)

  children.forEach((child) => {
    descendants.push(child.id)
    descendants.push(...getDescendantIds(child.id, allCategories))
  })

  return descendants
}

/**
 * Filter out self and descendants from parent options
 * Prevents circular references
 */
const parentOptions = computed(() => {
  if (!props.category) {
    // Creating new category - all categories are valid parents
    return [
      { label: 'None (Top Level)', value: null },
      ...props.categories.map((c) => ({ label: c.name, value: c.id })),
    ]
  }

  // Editing existing category - exclude self and descendants
  const excludedIds = [props.category.id, ...getDescendantIds(props.category.id, props.categories)]
  const validParents = props.categories.filter((c) => !excludedIds.includes(c.id))

  return [
    { label: 'None (Top Level)', value: null },
    ...validParents.map((c) => ({ label: c.name, value: c.id })),
  ]
})

const resetForm = () => {
  formData.value = {
    name: '',
    description: '',
    parentId: null,
  }
  errors.value = {}
}

// Watch for category changes (edit mode)
watch(
  () => props.category,
  (newCategory) => {
    if (newCategory) {
      formData.value = {
        name: newCategory.name,
        description: newCategory.description || '',
        parentId: newCategory.parentId || null,
      }
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

const dialogTitle = computed(() => (props.category ? 'Edit Category' : 'New Category'))

const validateForm = (): boolean => {
  try {
    categorySchema.parse(formData.value)
    errors.value = {}
    return true
  } catch (err: any) {
    errors.value = {}
    if (err.errors) {
      err.errors.forEach((error: any) => {
        const field = error.path[0]
        errors.value[field] = error.message
      })
    }
    return false
  }
}

const handleSave = () => {
  if (!validateForm()) {
    return
  }

  emit('save', formData.value)
  resetForm()
}

const handleClose = () => {
  resetForm()
  emit('close')
}
</script>

<template>
  <Dialog
    :visible="visible"
    :header="dialogTitle"
    :modal="true"
    :closable="true"
    :style="{ width: '500px' }"
    @update:visible="handleClose"
  >
    <div class="flex flex-col gap-4 py-4">
      <!-- Name field -->
      <div class="flex flex-col gap-2">
        <label for="category-name" class="font-semibold">Name *</label>
        <InputText
          id="category-name"
          v-model="formData.name"
          placeholder="Enter category name"
          :invalid="!!errors.name"
        />
        <small v-if="errors.name" class="text-red-500">{{ errors.name }}</small>
      </div>

      <!-- Description field -->
      <div class="flex flex-col gap-2">
        <label for="category-description" class="font-semibold">Description</label>
        <Textarea
          id="category-description"
          v-model="formData.description"
          placeholder="Enter category description"
          :rows="3"
          :invalid="!!errors.description"
        />
        <small v-if="errors.description" class="text-red-500">{{ errors.description }}</small>
      </div>

      <!-- Parent category picker -->
      <div class="flex flex-col gap-2">
        <label for="category-parent" class="font-semibold">Parent Category</label>
        <Select
          id="category-parent"
          v-model="formData.parentId"
          :options="parentOptions"
          option-label="label"
          option-value="value"
          placeholder="Select parent category"
          class="w-full"
        />
        <small class="text-slate-400">
          Leave empty to create a top-level category
        </small>
        <small v-if="errors.parentId" class="text-red-500">{{ errors.parentId }}</small>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" @click="handleClose" />
        <Button label="Save" @click="handleSave" />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
/* Tailwind classes handle most styling */
</style>
