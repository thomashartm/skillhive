<template>
  <div class="assets-view">
    <!-- Warning when no discipline selected -->
    <Message v-if="!activeDisciplineId" severity="warn" :closable="false">
      Please select a discipline to view assets
    </Message>

    <template v-else>
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-3xl font-bold">Assets</h1>
        <Button
          label="New Asset"
          icon="pi pi-plus"
          @click="handleCreate"
        />
      </div>

      <!-- Search -->
      <div class="mb-6">
        <InputText
          v-model="searchQuery"
          placeholder="Search assets..."
          class="w-full md:w-96"
        >
          <template #prefix>
            <i class="pi pi-search" />
          </template>
        </InputText>
      </div>

      <!-- Asset List -->
      <AssetList
        :assets="filteredAssets"
        :loading="loading"
        @edit="handleEdit"
        @delete="handleDeleteConfirm"
      />
    </template>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog />
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
import ConfirmDialog from 'primevue/confirmdialog'
import AssetList from '../components/assets/AssetList.vue'
import { useAssetStore } from '../stores/assets'
import { useDisciplineStore } from '../stores/discipline'
import { useDebouncedRef } from '../composables/useDebounce'
import type { Asset } from '../types'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const assetStore = useAssetStore()
const disciplineStore = useDisciplineStore()
const { activeDisciplineId } = storeToRefs(disciplineStore)

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

// Fetch assets when component mounts or discipline changes
watch(activeDisciplineId, async (newId) => {
  if (newId) {
    await loadAssets()
  }
})

onMounted(() => {
  if (activeDisciplineId.value) {
    loadAssets()
  }
})

async function loadAssets() {
  loading.value = true
  try {
    await assetStore.fetchAssets()
  } catch (error) {
    console.error('Failed to load assets:', error)
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

function handleEdit(asset: Asset) {
  router.push(`/assets/${asset.id}/edit`)
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
    console.error('Failed to delete asset:', error)
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
.assets-view {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}
</style>
