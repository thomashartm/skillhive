<template>
  <div class="assets-view">
    <!-- Warning when no discipline selected -->
    <Message v-if="!activeDisciplineId" severity="warn" :closable="false">
      Please select a discipline to view assets
    </Message>

    <template v-else>
      <!-- Header -->
      <div class="view-header">
        <h1 class="view-title">Assets</h1>
        <Button
          v-if="authStore.canEdit"
          label="New Asset"
          icon="pi pi-plus"
          size="small"
          @click="handleCreate"
        />
      </div>

      <!-- Search -->
      <div class="mb-4">
        <InputText
          v-model="searchQuery"
          placeholder="Search assets..."
          class="filter-search"
        />
      </div>

      <!-- Asset List -->
      <AssetList
        :assets="filteredAssets"
        :techniques="techniques"
        :tags="tags"
        :loading="loading"
        @view="handleView"
        @edit="handleEdit"
        @delete="handleDeleteConfirm"
        @view-technique="handleViewTechnique"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Message from 'primevue/message'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import AssetList from '../components/assets/AssetList.vue'
import { useAssetStore } from '../stores/assets'
import { useTechniqueStore } from '../stores/techniques'
import { useTagStore } from '../stores/tags'
import { useDisciplineStore } from '../stores/discipline'
import { useAuthStore } from '../stores/auth'
import { useDebouncedRef } from '../composables/useDebounce'
import type { Asset } from '../types'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const authStore = useAuthStore()
const assetStore = useAssetStore()
const techniqueStore = useTechniqueStore()
const tagStore = useTagStore()
const disciplineStore = useDisciplineStore()
const { activeDisciplineId } = storeToRefs(disciplineStore)
const { techniques } = storeToRefs(techniqueStore)
const { tags } = storeToRefs(tagStore)

const searchQuery = ref('')
const debouncedSearch = useDebouncedRef(searchQuery, 300)
const loading = ref(false)

const filteredAssets = computed(() => {
  if (!debouncedSearch.value) {
    return assetStore.assets
  }

  const query = debouncedSearch.value.toLowerCase()
  return assetStore.assets.filter(asset =>
    asset.title.toLowerCase().includes(query) ||
    asset.description?.toLowerCase().includes(query) ||
    asset.originator?.toLowerCase().includes(query) ||
    asset.url.toLowerCase().includes(query)
  )
})

watch(activeDisciplineId, async (newId) => {
  if (newId) {
    await loadData()
  }
})

onMounted(() => {
  if (activeDisciplineId.value) {
    loadData()
  }
})

async function loadData() {
  loading.value = true
  try {
    await Promise.all([
      assetStore.fetchAssets(),
      techniqueStore.fetchTechniques(),
      tagStore.fetchTags(),
    ])
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load assets',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

function handleCreate() {
  router.push('/assets/new')
}

function handleView(asset: Asset) {
  router.push(`/assets/${asset.id}`)
}

function handleEdit(asset: Asset) {
  router.push(`/assets/${asset.id}/edit`)
}

function handleViewTechnique(techniqueId: string) {
  router.push(`/techniques/${techniqueId}`)
}

function handleDeleteConfirm(asset: Asset) {
  confirm.require({
    message: `Are you sure you want to delete "${asset.title}"?`,
    header: 'Delete Asset',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => handleDelete(asset),
  })
}

async function handleDelete(asset: Asset) {
  try {
    await assetStore.deleteAsset(asset.id)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Asset deleted successfully',
      life: 3000,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete asset',
      life: 3000,
    })
  }
}
</script>

<style scoped>
.filter-search {
  width: 16rem;
}
</style>
