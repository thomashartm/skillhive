<template>
  <Dialog
    :visible="visible"
    :header="element ? 'Edit List' : 'Add List'"
    :modal="true"
    :closable="true"
    :style="{ width: '550px' }"
    @update:visible="$emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label for="title" class="block text-sm font-medium mb-2">
          List Title <span class="text-red-500">*</span>
        </label>
        <InputText
          id="title"
          v-model="formData.title"
          :class="{ 'p-invalid': errors.title }"
          class="w-full"
          placeholder="List title"
        />
        <small v-if="errors.title" class="text-red-500">{{ errors.title }}</small>
      </div>

      <div>
        <label for="details" class="block text-sm font-medium mb-2">List Description</label>
        <Textarea
          id="details"
          v-model="formData.details"
          :class="{ 'p-invalid': errors.details }"
          class="w-full"
          rows="3"
          placeholder="List description"
        />
        <small class="text-slate-400">Supports Markdown (bold, italic, links, lists)</small>
        <small v-if="errors.details" class="text-red-500">{{ errors.details }}</small>
      </div>

      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium">
            Items <span class="text-red-500">*</span>
          </label>
          <Button
            icon="pi pi-plus"
            label="Add Item"
            severity="secondary"
            size="small"
            type="button"
            @click="addItem"
          />
        </div>
        <small v-if="errors.items" class="text-red-500 block mb-2">{{ errors.items }}</small>
        <div class="space-y-2">
          <div
            v-for="(_item, idx) in formData.items"
            :key="idx"
            class="flex items-center gap-2"
          >
            <InputText
              v-model="formData.items[idx]"
              class="flex-1"
              :placeholder="`Item ${idx + 1}`"
            />
            <Button
              icon="pi pi-times"
              severity="danger"
              size="small"
              text
              type="button"
              :aria-label="`Remove item ${idx + 1}`"
              @click="removeItem(idx)"
            />
          </div>
        </div>
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
  save: [data: { title: string; details: string; items: string[]; duration: string }]
  close: []
}>()

const formData = ref<{ title: string; details: string; items: string[]; duration: string }>({
  title: '',
  details: '',
  items: [''],
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
          items: props.element.items && props.element.items.length > 0 ? [...props.element.items] : [''],
          duration: props.element.duration || ''
        }
      } else {
        formData.value = {
          title: '',
          details: '',
          items: [''],
          duration: ''
        }
      }
      errors.value = {}
    }
  }
)

const addItem = () => {
  formData.value.items.push('')
}

const removeItem = (idx: number) => {
  formData.value.items.splice(idx, 1)
  if (formData.value.items.length === 0) {
    formData.value.items.push('')
  }
}

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

  for (const item of formData.value.items) {
    if (item.length > 500) {
      errors.value.items = 'Each item must be 500 characters or less'
      return
    }
  }

  const filteredItems = formData.value.items.filter((item) => item.trim() !== '')
  if (filteredItems.length === 0) {
    errors.value.items = 'At least one non-empty item is required'
    return
  }

  try {
    saving.value = true
    emit('save', {
      title: formData.value.title,
      details: formData.value.details,
      items: filteredItems,
      duration: formData.value.duration
    })
  } finally {
    saving.value = false
  }
}
</script>
