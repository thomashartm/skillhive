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

      <!-- Filters -->
      <div class="filter-bar mb-4">
        <InputText
          v-model="searchQuery"
          placeholder="Search assets..."
          class="filter-search"
        />
        <TagFilterSelect
          :available-tags="tags"
          :selected-tag-ids="selectedTagIds"
          class="filter-tags"
          @add-tag="addTag"
          @remove-tag="removeTag"
        />
        <Button
          v-if="hasActiveFilters"
          label="Clear"
          icon="pi pi-times"
          severity="secondary"
          text
          size="small"
          @click="clearAll"
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
        @tag-click="addTag"
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
import TagFilterSelect from '../components/common/TagFilterSelect.vue'
import { useAssetStore } from '../stores/assets'
import { useTechniqueStore } from '../stores/techniques'
import { useTagStore } from '../stores/tags'
import { useDisciplineStore } from '../stores/discipline'
import { useAuthStore } from '../stores/auth'
import { useAssetFilters } from '../composables/useAssetFilters'
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

const {
  searchQuery,
  selectedTagIds,
  debouncedSearchQuery,
  addTag,
  removeTag,
  clearAll,
  hasActiveFilters,
} = useAssetFilters()

const loading = ref(false)

const filteredAssets = computed(() => {
  let result = assetStore.assets

  // Client-side multi-tag AND filter (server only handles first tag)
  if (selectedTagIds.value.length > 1) {
    result = result.filter(asset =>
      selectedTagIds.value.every(tagId => asset.tagIds?.includes(tagId))
    )
  }

  // Client-side text search (supplements server slug-prefix matching)
  if (debouncedSearchQuery.value) {
    const q = debouncedSearchQuery.value.toLowerCase()
    result = result.filter(asset =>
      asset.title.toLowerCase().includes(q) ||
      asset.description?.toLowerCase().includes(q) ||
      asset.originator?.toLowerCase().includes(q) ||
      asset.url.toLowerCase().includes(q)
    )
  }

  return result
})

// Re-fetch when debounced search or tags change
watch(
  [debouncedSearchQuery, selectedTagIds],
  () => {
    if (activeDisciplineId.value) {
      loadData()
    }
  },
  { deep: true }
)

watch(activeDisciplineId, async (newId) => {
  if (newId) {
    clearAll()
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
    const fetchParams: { tagId?: string; q?: string } = {}
    if (selectedTagIds.value.length > 0) {
      fetchParams.tagId = selectedTagIds.value[0]
    }
    if (debouncedSearchQuery.value) {
      fetchParams.q = debouncedSearchQuery.value
    }

    await Promise.all([
      assetStore.fetchAssets(Object.keys(fetchParams).length > 0 ? fetchParams : undefined),
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
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-start;
}

.filter-search {
  width: 16rem;
}

.filter-tags {
  width: 16rem;
}

@media (max-width: 768px) {
  .filter-search,
  .filter-tags {
    width: 100%;
  }
}
</style>
