<template>
  <Card>
    <template #title>
      <h2 class="text-xl font-semibold">Quick Save Video</h2>
    </template>
    <template #content>
      <div class="space-y-4">
        <p class="text-sm text-slate-400">
          Quickly save a YouTube video to your collection
        </p>
        <div class="flex flex-col gap-3">
          <InputText
            v-model="url"
            placeholder="Paste a YouTube URL..."
            :disabled="loading"
            @keyup.enter="handleSave"
          />
          <Button
            label="Save"
            icon="pi pi-save"
            :loading="loading"
            :disabled="!url.trim() || loading"
            @click="handleSave"
            class="w-full"
          />
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useAssetStore } from '../../stores/assets'
import { useDisciplineStore } from '../../stores/discipline'

interface Emits {
  (e: 'saved'): void
}

const emit = defineEmits<Emits>()
const toast = useToast()
const assetStore = useAssetStore()
const disciplineStore = useDisciplineStore()
const { activeDisciplineId } = storeToRefs(disciplineStore)

const url = ref('')
const loading = ref(false)

const handleSave = async () => {
  if (!url.value.trim()) {
    return
  }

  if (!activeDisciplineId.value) {
    toast.add({
      severity: 'error',
      summary: 'No Discipline Selected',
      detail: 'Please select a discipline first',
      life: 3000
    })
    return
  }

  loading.value = true

  try {
    // Resolve YouTube metadata
    const metadata = await assetStore.resolveYouTube(url.value)

    // Create asset with resolved metadata
    await assetStore.createAsset({
      url: url.value,
      title: metadata.title,
      thumbnailUrl: metadata.thumbnail_url || null,
      type: 'video',
    })

    toast.add({
      severity: 'success',
      summary: 'Video Saved',
      detail: `"${metadata.title}" has been added to your collection`,
      life: 3000
    })

    // Reset form
    url.value = ''
    emit('saved')
  } catch (error: any) {
    console.error('Failed to save video:', error)
    toast.add({
      severity: 'error',
      summary: 'Failed to Save Video',
      detail: error.message || 'Could not save the video. Please check the URL and try again.',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}
</script>
