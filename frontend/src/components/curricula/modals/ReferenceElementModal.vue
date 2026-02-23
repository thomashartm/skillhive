<template>
  <Dialog
    :visible="visible"
    :header="modalHeader"
    :modal="true"
    :closable="true"
    :style="{ width: '500px' }"
    @update:visible="$emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div class="p-3 bg-white/5 border border-white/10 rounded mb-4">
        <div class="flex items-center gap-3">
          <img
            v-if="element?.snapshot?.thumbnailUrl"
            :src="element.snapshot.thumbnailUrl"
            alt="Thumbnail"
            class="w-12 h-12 object-cover rounded"
          />
          <i v-else-if="element?.type === 'technique'" class="pi pi-bookmark text-blue-400 text-2xl"></i>
          <i v-else class="pi pi-video text-green-400 text-2xl"></i>
          <div>
            <div class="font-medium text-slate-100">{{ element?.snapshot?.name || 'Untitled' }}</div>
            <div class="text-xs text-slate-500 capitalize">{{ element?.type }}</div>
          </div>
        </div>
      </div>

      <div>
        <label for="details" class="block text-sm font-medium mb-2">Notes</label>
        <Textarea
          id="details"
          v-model="formData.details"
          :class="{ 'p-invalid': errors.details }"
          class="w-full"
          rows="6"
          placeholder="Add notes about execution, variations, or focus points..."
        />
        <small class="text-slate-400">Supports Markdown (bold, italic, links, lists)</small>
        <small v-if="errors.details" class="text-red-500 block">{{ errors.details }}</small>
      </div>

      <div>
        <label for="duration" class="block text-sm font-medium mb-2">Duration</label>
        <InputText
          id="duration"
          v-model="formData.duration"
          class="w-full"
          placeholder="e.g., 5:00, 10 min, 1h 30m"
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
import { ref, watch, computed } from 'vue'
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
  save: [data: { details: string; duration: string }]
  close: []
}>()

const formData = ref<{ details: string; duration: string }>({
  details: '',
  duration: ''
})

const errors = ref<Record<string, string>>({})
const saving = ref(false)

const modalHeader = computed(() => {
  if (!props.element) return 'Edit Element'
  const typeName = props.element.type === 'technique' ? 'Technique' : 'Asset'
  return `Edit ${typeName} Notes`
})

watch(
  () => props.visible,
  (newVal) => {
    if (newVal && props.element) {
      formData.value = {
        details: props.element.details || '',
        duration: props.element.duration || ''
      }
      errors.value = {}
    }
  }
)

const handleSubmit = async () => {
  errors.value = {}

  if (formData.value.details.length > 5000) {
    errors.value.details = 'Notes must be 5000 characters or less'
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
