<template>
  <Dialog
    :visible="visible"
    :header="element ? 'Edit Text Note' : 'Add Text Note'"
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
          placeholder="Enter note title"
        />
        <small v-if="errors.title" class="text-red-500">{{ errors.title }}</small>
      </div>

      <div>
        <label for="details" class="block text-sm font-medium mb-2">Details</label>
        <Textarea
          id="details"
          v-model="formData.details"
          :class="{ 'p-invalid': errors.details }"
          class="w-full"
          rows="6"
          placeholder="Enter note details"
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
  save: [data: { title: string; details: string; duration: string }]
  close: []
}>()

const formData = ref<{ title: string; details: string; duration: string }>({
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
          title: props.element.title || '',
          details: props.element.details || '',
          duration: props.element.duration || ''
        }
      } else {
        formData.value = {
          title: '',
          details: '',
          duration: ''
        }
      }
      errors.value = {}
    }
  }
)

const handleSubmit = async () => {
  errors.value = {}

  if (!formData.value.title.trim()) {
    errors.value.title = 'Title is required'
    return
  }

  if (formData.value.title.length > 200) {
    errors.value.title = 'Title must be 200 characters or less'
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
