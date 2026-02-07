<template>
  <Dialog
    :visible="visible"
    :header="technique ? 'Edit Technique' : 'New Technique'"
    :modal="true"
    :closable="true"
    :style="{ width: '600px' }"
    @update:visible="emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="flex flex-col gap-4 pt-4">
      <div class="flex flex-col gap-2">
        <label for="name" class="font-semibold">
          Name <span class="text-red-500">*</span>
        </label>
        <InputText
          id="name"
          v-model="formData.name"
          placeholder="Enter technique name"
          :class="{ 'p-invalid': errors.name }"
        />
        <small v-if="errors.name" class="text-red-500">
          {{ errors.name }}
        </small>
      </div>

      <div class="flex flex-col gap-2">
        <label for="description" class="font-semibold">Description</label>
        <Textarea
          id="description"
          v-model="formData.description"
          placeholder="Enter technique description"
          rows="4"
          :class="{ 'p-invalid': errors.description }"
        />
        <small v-if="errors.description" class="text-red-500">
          {{ errors.description }}
        </small>
      </div>

      <div class="flex flex-col gap-2">
        <label for="categories" class="font-semibold">Categories</label>
        <MultiSelect
          id="categories"
          v-model="formData.categoryIds"
          :options="categories"
          option-label="name"
          option-value="id"
          placeholder="Select categories"
          display="chip"
          :class="{ 'p-invalid': errors.categoryIds }"
        />
        <small v-if="errors.categoryIds" class="text-red-500">
          {{ errors.categoryIds }}
        </small>
      </div>

      <div class="flex flex-col gap-2">
        <label for="tags" class="font-semibold">Tags</label>
        <MultiSelect
          id="tags"
          v-model="formData.tagIds"
          :options="tags"
          option-label="name"
          option-value="id"
          placeholder="Select tags"
          display="chip"
          :class="{ 'p-invalid': errors.tagIds }"
        />
        <small v-if="errors.tagIds" class="text-red-500">
          {{ errors.tagIds }}
        </small>
      </div>

      <div class="flex justify-end gap-2 mt-4">
        <Button
          type="button"
          label="Cancel"
          severity="secondary"
          @click="emit('close')"
        />
        <Button type="submit" :label="technique ? 'Update' : 'Create'" />
      </div>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import MultiSelect from 'primevue/multiselect'
import Button from 'primevue/button'
import { techniqueSchema, type TechniqueFormData } from '../../validation/schemas'
import type { Technique, Category, Tag } from '../../types'

interface Props {
  visible: boolean
  technique?: Technique | null
  categories: Category[]
  tags: Tag[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  save: [data: TechniqueFormData]
  close: []
}>()

const formData = ref<TechniqueFormData>({
  name: '',
  description: '',
  categoryIds: [],
  tagIds: [],
})

const errors = ref<Record<string, string>>({})

const resetForm = () => {
  formData.value = {
    name: '',
    description: '',
    categoryIds: [],
    tagIds: [],
  }
  errors.value = {}
}

const handleSubmit = () => {
  errors.value = {}

  try {
    const validated = techniqueSchema.parse(formData.value)
    emit('save', validated)
    resetForm()
  } catch (error: any) {
    if (error.errors) {
      error.errors.forEach((err: any) => {
        const field = err.path[0]
        errors.value[field] = err.message
      })
    }
  }
}

watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible && props.technique) {
      formData.value = {
        name: props.technique.name,
        description: props.technique.description || '',
        categoryIds: props.technique.categoryIds || [],
        tagIds: props.technique.tagIds || [],
      }
      errors.value = {}
    } else if (!newVisible) {
      resetForm()
    }
  }
)

watch(
  () => props.technique,
  (newTechnique) => {
    if (props.visible && newTechnique) {
      formData.value = {
        name: newTechnique.name,
        description: newTechnique.description || '',
        categoryIds: newTechnique.categoryIds || [],
        tagIds: newTechnique.tagIds || [],
      }
      errors.value = {}
    }
  }
)
</script>

<style scoped>
.p-invalid {
  border-color: #ef4444;
}
</style>
