<template>
  <div class="save-asset-view">
    <!-- Header -->
    <div class="mb-6">
      <Button
        icon="pi pi-arrow-left"
        text
        rounded
        class="mb-4"
        @click="handleCancel"
      />
      <h1 class="text-3xl font-bold">
        {{ isEditMode ? 'Edit Asset' : 'New Asset' }}
      </h1>
    </div>

    <!-- Warning when no discipline selected -->
    <Message v-if="!activeDiscipline" severity="warn" :closable="false">
      Please select a discipline to create or edit assets
    </Message>

    <!-- Loading state -->
    <div v-else-if="isEditMode && loadingAsset" class="flex items-center justify-center py-12">
      <ProgressSpinner />
    </div>

    <!-- Form -->
    <AssetForm
      v-else
      :asset="currentAsset"
      :initial-url="initialUrl"
      :technique-options="techniqueOptions"
      :tag-options="tagOptions"
      @save="handleSave"
      @cancel="handleCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import AssetForm from '../components/assets/AssetForm.vue'
import type { AssetFormData } from '../components/assets/AssetForm.vue'
import { useAssetStore } from '../stores/assets'
import { useTechniqueStore } from '../stores/techniques'
import { useTagStore } from '../stores/tags'
import { useDisciplineStore } from '../stores/discipline'
import type { Asset } from '../types'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const assetStore = useAssetStore()
const techniqueStore = useTechniqueStore()
const tagStore = useTagStore()
const disciplineStore = useDisciplineStore()

const assetId = computed(() => route.params.id as string | undefined)
const isEditMode = computed(() => !!assetId.value)
const initialUrl = computed(() => (route.query.url as string) || '')

const activeDiscipline = computed(() => disciplineStore.activeDiscipline)
const currentAsset = ref<Asset | null>(null)
const loadingAsset = ref(false)

const techniqueOptions = computed(() =>
  techniqueStore.techniques.map(t => ({
    label: t.name,
    value: t.id,
  }))
)

const tagOptions = computed(() =>
  tagStore.tags.map(t => ({
    label: t.name,
    value: t.id,
  }))
)

onMounted(async () => {
  if (!activeDiscipline.value) {
    return
  }

  // Load techniques and tags for the multiselects
  await Promise.all([
    techniqueStore.fetchTechniques(),
    tagStore.fetchTags(),
  ])

  // Load asset data if in edit mode
  if (isEditMode.value && assetId.value) {
    await loadAsset(assetId.value)
  }
})

async function loadAsset(id: string) {
  loadingAsset.value = true
  try {
    const asset = assetStore.assets.find(a => a.id === id)
    if (asset) {
      currentAsset.value = asset
    } else {
      // If not in store, fetch from API
      await assetStore.fetchAssets()
      const fetchedAsset = assetStore.assets.find(a => a.id === id)
      if (fetchedAsset) {
        currentAsset.value = fetchedAsset
      } else {
        throw new Error('Asset not found')
      }
    }
  } catch (error) {
    console.error('Failed to load asset:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load asset',
      life: 3000,
    })
    router.push('/assets')
  } finally {
    loadingAsset.value = false
  }
}

async function handleSave(data: AssetFormData) {
  try {
    if (isEditMode.value && assetId.value) {
      // Update existing asset
      await assetStore.updateAsset(assetId.value, data)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Asset updated successfully',
        life: 3000,
      })
    } else {
      // Create new asset
      await assetStore.createAsset(data)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Asset created successfully',
        life: 3000,
      })
    }
    router.push('/assets')
  } catch (error) {
    console.error('Failed to save asset:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: isEditMode.value ? 'Failed to update asset' : 'Failed to create asset',
      life: 3000,
    })
  }
}

function handleCancel() {
  router.push('/assets')
}
</script>

<style scoped>
.save-asset-view {
  padding: 1.5rem;
  max-width: 1000px;
  margin: 0 auto;
}
</style>
