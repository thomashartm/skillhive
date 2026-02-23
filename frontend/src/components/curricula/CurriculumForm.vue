<template>
  <Dialog
    :visible="visible"
    :header="curriculum ? 'Edit Curriculum' : 'New Curriculum'"
    :modal="true"
    :closable="true"
    :style="{ width: '500px' }"
    @update:visible="$emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label for="title" class="block text-sm font-medium mb-2">
          Title <span class="text-red-500">*</span>
        </label>
        <InputText
          id="title"
          v-model="formData.title"
          :class="{ 'p-invalid': errors.title }"
          class="w-full"
          placeholder="Enter curriculum title"
        />
        <small v-if="errors.title" class="text-red-500">{{ errors.title }}</small>
      </div>

      <div>
        <label for="description" class="block text-sm font-medium mb-2">Description</label>
        <Textarea
          id="description"
          v-model="formData.description"
          :class="{ 'p-invalid': errors.description }"
          class="w-full"
          rows="5"
          placeholder="Enter curriculum description"
        />
        <small v-if="errors.description" class="text-red-500">{{ errors.description }}</small>
      </div>

      <div>
        <label for="duration" class="block text-sm font-medium mb-2">Duration</label>
        <InputText
          id="duration"
          v-model="formData.duration"
          class="w-full"
          placeholder="e.g., 1h 30m, 45 min"
        />
      </div>

      <div class="flex items-center gap-2">
        <ToggleSwitch v-model="formData.isPublic" inputId="isPublic" />
        <label for="isPublic" class="text-sm font-medium">Public Curriculum</label>
      </div>

      <div class="flex justify-end gap-2 mt-6">
        <Button label="Cancel" severity="secondary" @click="$emit('close')" type="button" />
        <Button label="Save" type="submit" :loading="saving" />
      </div>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import { curriculumSchema, type CurriculumFormData } from '../../validation/schemas'
import type { Curriculum } from '../../types'

const props = defineProps<{
  visible: boolean
  curriculum: Curriculum | null
}>()

const emit = defineEmits<{
  save: [data: CurriculumFormData]
  close: []
}>()

const formData = ref<CurriculumFormData>({
  title: '',
  description: '',
  duration: '',
  isPublic: false
})

const errors = ref<Record<string, string>>({})
const saving = ref(false)

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      if (props.curriculum) {
        formData.value = {
          title: props.curriculum.title,
          description: props.curriculum.description || '',
          duration: props.curriculum.duration || '',
          isPublic: props.curriculum.isPublic
        }
      } else {
        formData.value = {
          title: '',
          description: '',
          duration: '',
          isPublic: false
        }
      }
      errors.value = {}
    }
  }
)

const handleSubmit = async () => {
  errors.value = {}

  try {
    const validated = curriculumSchema.parse(formData.value)
    saving.value = true
    emit('save', validated)
  } catch (error: any) {
    if (error.errors) {
      error.errors.forEach((err: any) => {
        errors.value[err.path[0]] = err.message
      })
    }
  } finally {
    saving.value = false
  }
}
</script>
