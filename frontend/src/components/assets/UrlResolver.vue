<template>
  <div class="url-resolver space-y-3">
    <div class="flex gap-2">
      <InputText
        :model-value="modelValue"
        placeholder="Enter YouTube URL..."
        class="flex-1"
        @update:model-value="emit('update:modelValue', $event)"
        @paste="handlePaste"
      />
      <Button
        label="Resolve"
        icon="pi pi-search"
        :loading="loading"
        :disabled="!isValidUrl"
        @click="handleResolve"
      />
    </div>

    <Message v-if="error" severity="error" :closable="false">
      {{ error }}
    </Message>

    <Message v-if="success" severity="success" :closable="false">
      <div class="flex items-center gap-2">
        <i class="pi pi-check-circle" />
        <span>Successfully resolved video metadata</span>
      </div>
    </Message>

    <div v-if="resolvedData" class="resolved-preview p-4 border border-surface-300 dark:border-surface-600 rounded bg-surface-50 dark:bg-surface-900">
      <div class="flex gap-4">
        <img
          v-if="resolvedData.thumbnail_url"
          :src="resolvedData.thumbnail_url"
          :alt="resolvedData.title"
          class="w-32 h-24 object-cover rounded"
        />
        <div class="flex-1 space-y-2">
          <div>
            <label class="text-xs font-semibold text-surface-600 dark:text-surface-400">Title</label>
            <p class="text-sm">{{ resolvedData.title }}</p>
          </div>
          <div v-if="resolvedData.author_name">
            <label class="text-xs font-semibold text-surface-600 dark:text-surface-400">Author</label>
            <p class="text-sm">{{ resolvedData.author_name }}</p>
          </div>
          <div v-if="resolvedData.provider_name">
            <label class="text-xs font-semibold text-surface-600 dark:text-surface-400">Provider</label>
            <p class="text-sm">{{ resolvedData.provider_name }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useAssetStore } from '../../stores/assets'
import type { OEmbedResponse } from '../../types'

interface Props {
  modelValue: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'resolved': [data: OEmbedResponse]
}>()

const assetStore = useAssetStore()

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref(false)
const resolvedData = ref<OEmbedResponse | null>(null)

const isValidUrl = computed(() => {
  try {
    if (!props.modelValue) return false
    new URL(props.modelValue)
    return true
  } catch {
    return false
  }
})

// Reset messages when URL changes
watch(() => props.modelValue, () => {
  error.value = null
  success.value = false
})

async function handleResolve() {
  if (!isValidUrl.value) return

  loading.value = true
  error.value = null
  success.value = false
  resolvedData.value = null

  try {
    const data = await assetStore.resolveYouTube(props.modelValue)
    resolvedData.value = data
    success.value = true
    emit('resolved', data)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to resolve URL'
    console.error('URL resolution error:', err)
  } finally {
    loading.value = false
  }
}

function handlePaste(event: ClipboardEvent) {
  // Auto-resolve after paste with a small delay
  setTimeout(() => {
    if (isValidUrl.value && !loading.value) {
      handleResolve()
    }
  }, 300)
}
</script>

<style scoped>
.url-resolver {
  width: 100%;
}

.resolved-preview {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
