<template>
  <Dialog
    :visible="visible"
    :header="element ? 'Edit Image' : 'Add Image'"
    :modal="true"
    :closable="true"
    :style="{ width: '500px' }"
    @update:visible="$emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label for="imageUrl" class="block text-sm font-medium mb-2">
          Image URL <span class="text-red-500">*</span>
        </label>
        <InputText
          id="imageUrl"
          v-model="formData.imageUrl"
          :class="{ 'p-invalid': errors.imageUrl }"
          class="w-full"
          placeholder="https://..."
        />
        <small v-if="errors.imageUrl" class="text-red-500">{{ errors.imageUrl }}</small>
      </div>

      <div>
        <label for="title" class="block text-sm font-medium mb-2">Caption</label>
        <InputText
          id="title"
          v-model="formData.title"
          :class="{ 'p-invalid': errors.title }"
          class="w-full"
          placeholder="Image caption"
        />
        <small v-if="errors.title" class="text-red-500">{{ errors.title }}</small>
      </div>

      <div>
        <label for="details" class="block text-sm font-medium mb-2">Additional Notes</label>
        <Textarea
          id="details"
          v-model="formData.details"
          :class="{ 'p-invalid': errors.details }"
          class="w-full"
          rows="4"
          placeholder="Additional notes"
        />
        <small class="text-slate-400">Supports Markdown (bold, italic, links, lists)</small>
        <small v-if="errors.details" class="text-red-500">{{ errors.details }}</small>
      </div>

      <div>
        <label for="duration" class="block text-sm font-medium mb-2">Duration</label>
        <InputText
          id="duration"
          v-model="formData.duration"
          class="w-full"
          placeholder="e.g., 5:00, 1h 30m"
        />
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
import type { CurriculumElement } from '../../../types'

const props = defineProps<{
  visible: boolean
  element: CurriculumElement | null
}>()

const emit = defineEmits<{
  save: [data: { imageUrl: string; title: string; details: string; duration: string }]
  close: []
}>()

const formData = ref<{ imageUrl: string; title: string; details: string; duration: string }>({
  imageUrl: '',
  title: '',
  details: '',
  duration: ''
})

const errors = ref<Record<string, string>>({})
const saving = ref(false)

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      if (props.element) {
        formData.value = {
          imageUrl: props.element.imageUrl || '',
          title: props.element.title || '',
          details: props.element.details || '',
          duration: props.element.duration || ''
        }
      } else {
        formData.value = {
          imageUrl: '',
          title: '',
          details: '',
          duration: ''
        }
      }
      errors.value = {}
    }
  }
)

const isValidUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const handleSubmit = async () => {
  errors.value = {}

  if (!formData.value.imageUrl.trim()) {
    errors.value.imageUrl = 'Image URL is required'
    return
  }

  if (!isValidUrl(formData.value.imageUrl.trim())) {
    errors.value.imageUrl = 'Must be a valid URL (http:// or https://)'
    return
  }

  if (formData.value.title.length > 200) {
    errors.value.title = 'Caption must be 200 characters or less'
    return
  }

  if (formData.value.details.length > 5000) {
    errors.value.details = 'Details must be 5000 characters or less'
    return
  }

  try {
    saving.value = true
    emit('save', formData.value)
  } finally {
    saving.value = false
  }
}
</script>
