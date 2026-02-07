<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import ColorPicker from 'primevue/colorpicker'
import Button from 'primevue/button'
import type { Tag } from '../../types'
import { tagSchema, type TagFormData } from '../../validation/schemas'

/**
 * TagForm - Dialog for creating/editing tags
 *
 * @example
 * <TagForm
 *   :visible="showDialog"
 *   :tag="editingTag"
 *   @save="handleSave"
 *   @close="showDialog = false"
 * />
 */

interface Props {
  visible: boolean
  tag: Tag | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  save: [data: TagFormData]
  close: []
}>()

// Form state
const formData = ref<TagFormData>({
  name: '',
  description: '',
  color: '#6B7280',
})

const errors = ref<Record<string, string>>({})
const colorValue = ref('6B7280') // ColorPicker uses hex without #

// Watch for tag changes (edit mode)
watch(
  () => props.tag,
  (newTag) => {
    if (newTag) {
      formData.value = {
        name: newTag.name,
        description: newTag.description || '',
        color: newTag.color || '#6B7280',
      }
      colorValue.value = (newTag.color || '#6B7280').replace('#', '')
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

// Sync color picker value with form
watch(colorValue, (newColor) => {
  formData.value.color = `#${newColor}`
})

const dialogTitle = computed(() => (props.tag ? 'Edit Tag' : 'New Tag'))

const resetForm = () => {
  formData.value = {
    name: '',
    description: '',
    color: '#6B7280',
  }
  colorValue.value = '6B7280'
  errors.value = {}
}

const validateForm = (): boolean => {
  try {
    tagSchema.parse(formData.value)
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
        <label for="tag-name" class="font-semibold">Name *</label>
        <InputText
          id="tag-name"
          v-model="formData.name"
          placeholder="Enter tag name"
          :invalid="!!errors.name"
        />
        <small v-if="errors.name" class="text-red-500">{{ errors.name }}</small>
      </div>

      <!-- Description field -->
      <div class="flex flex-col gap-2">
        <label for="tag-description" class="font-semibold">Description</label>
        <Textarea
          id="tag-description"
          v-model="formData.description"
          placeholder="Enter tag description"
          :rows="3"
          :invalid="!!errors.description"
        />
        <small v-if="errors.description" class="text-red-500">{{ errors.description }}</small>
      </div>

      <!-- Color picker -->
      <div class="flex flex-col gap-2">
        <label for="tag-color" class="font-semibold">Color</label>
        <div class="flex items-center gap-3">
          <ColorPicker v-model="colorValue" format="hex" />
          <div
            class="w-20 h-10 rounded border border-gray-300"
            :style="{ backgroundColor: formData.color }"
          />
          <span class="text-sm text-gray-600">{{ formData.color }}</span>
        </div>
        <small v-if="errors.color" class="text-red-500">{{ errors.color }}</small>
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
