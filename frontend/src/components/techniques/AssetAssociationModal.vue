<template>
  <Dialog
    :visible="visible"
    header="Associate Assets"
    :modal="true"
    :closable="true"
    :style="{ width: '800px' }"
    @update:visible="handleClose"
  >
    <div class="space-y-4">
      <!-- Filters -->
      <div class="flex gap-3">
        <div class="flex-1">
          <IconField>
            <InputIcon class="pi pi-search" />
            <InputText
              v-model="searchTerm"
              placeholder="Search assets by name..."
              class="w-full"
              @input="handleSearch"
            />
          </IconField>
        </div>
        <div class="w-48">
          <Select
            v-model="selectedTagId"
            :options="tagOptions"
            option-label="label"
            option-value="value"
            placeholder="Filter by tag"
            class="w-full"
            show-clear
            @change="handleTagChange"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8">
        <ProgressSpinner style="width: 50px; height: 50px" />
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredAssets.length === 0" class="text-center py-8 text-slate-400">
        No assets found. Try a different search term or tag filter.
      </div>

      <!-- Asset Selection Table -->
      <div v-else>
        <!-- Select All -->
        <div class="flex items-center gap-2 pb-3 border-b border-white/10">
          <Checkbox
            v-model="selectAll"
            :binary="true"
            input-id="select-all"
            @change="handleSelectAll"
          />
          <label for="select-all" class="cursor-pointer text-sm">
            Select all ({{ filteredAssets.length }} assets)
          </label>
        </div>

        <!-- Scrollable Asset List -->
        <div class="max-h-96 overflow-y-auto mt-3 space-y-2">
          <div
            v-for="asset in filteredAssets"
            :key="asset.id"
            class="flex items-center gap-3 p-3 border border-white/10 hover:bg-white/5 transition-colors rounded"
          >
            <Checkbox
              v-model="selectedAssetIds"
              :value="asset.id"
              :input-id="`asset-${asset.id}`"
            />
            
            <!-- Thumbnail -->
            <div class="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-white/5">
              <img
                v-if="asset.thumbnailUrl"
                :src="asset.thumbnailUrl"
                :alt="asset.title"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <i class="pi pi-play-circle text-xl text-slate-500"></i>
              </div>
            </div>

            <!-- Asset Info -->
            <label :for="`asset-${asset.id}`" class="flex-1 min-w-0 cursor-pointer">
              <div class="font-medium text-sm">{{ asset.title }}</div>
              <div v-if="asset.description" class="text-xs text-slate-400 mt-1 truncate">
                {{ asset.description }}
              </div>
              <div class="flex items-center gap-2 mt-1">
                <Tag :value="asset.type" severity="secondary" class="text-xs" />
                <Tag
                  v-if="asset.videoType"
                  :value="asset.videoType"
                  severity="info"
                  class="text-xs"
                />
              </div>
            </label>

            <!-- Asset Tags -->
            <div v-if="getAssetTags(asset).length" class="flex flex-wrap gap-1 max-w-32">
              <Tag
                v-for="tag in getAssetTags(asset).slice(0, 2)"
                :key="tag.id"
                :value="tag.name"
                :style="tag.color ? { backgroundColor: tag.color, color: '#fff' } : {}"
                class="text-xs"
              />
              <span v-if="getAssetTags(asset).length > 2" class="text-xs text-slate-400">
                +{{ getAssetTags(asset).length - 2 }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between items-center w-full">
        <span class="text-sm text-slate-400">
          {{ selectedAssetIds.length }} asset(s) selected
        </span>
        <div class="flex gap-2">
          <Button label="Cancel" severity="secondary" @click="handleClose" />
          <Button
            :label="`Save (${selectedAssetIds.length})`"
            :loading="saving"
            :disabled="saving"
            @click="handleSave"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import { useAssetStore } from '../../stores/assets'
import { useTagStore } from '../../stores/tags'
import { useDisciplineStore } from '../../stores/discipline'
import { useApi } from '../../composables/useApi'
import { useToast } from 'primevue/usetoast'
import type { Asset, Tag as TagType } from '../../types'

const props = defineProps<{
  visible: boolean
  techniqueId: string
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const assetStore = useAssetStore()
const tagStore = useTagStore()
const disciplineStore = useDisciplineStore()
const { get } = useApi()
const toast = useToast()

const searchTerm = ref('')
const selectedTagId = ref<string | null>(null)
const allAssets = ref<Asset[]>([])
const loading = ref(false)
const saving = ref(false)
const selectedAssetIds = ref<string[]>([])
const initialSelectedIds = ref<string[]>([])

// Computed: Tag options for dropdown
const tagOptions = computed(() => {
  return tagStore.tags.map((tag) => ({
    label: tag.name,
    value: tag.id,
  }))
})

// Computed: Filter assets by search term (client-side for instant feedback)
const filteredAssets = computed(() => {
  if (!searchTerm.value.trim()) {
    return allAssets.value
  }
  const term = searchTerm.value.toLowerCase()
  return allAssets.value.filter(
    (asset) =>
      asset.title.toLowerCase().includes(term) ||
      asset.description?.toLowerCase().includes(term)
  )
})

// Computed: Select all checkbox state
const selectAll = computed({
  get: () =>
    filteredAssets.value.length > 0 &&
    filteredAssets.value.every((a) => selectedAssetIds.value.includes(a.id)),
  set: () => {}, // Handled by handleSelectAll
})

// Get resolved tags for an asset
const getAssetTags = (asset: Asset): TagType[] => {
  if (!asset.tagIds?.length) return []
  return tagStore.tags.filter((t) => asset.tagIds.includes(t.id))
}

// Debounced search handler
let searchTimeout: ReturnType<typeof setTimeout>
const handleSearch = () => {
  // Client-side filtering is instant, no need to refetch
  // But if we want server-side search, uncomment below:
  // clearTimeout(searchTimeout)
  // searchTimeout = setTimeout(() => fetchAssets(), 300)
}

// Tag filter change
const handleTagChange = () => {
  fetchAssets()
}

// Select all handler
const handleSelectAll = () => {
  if (selectAll.value) {
    // Deselect all filtered
    selectedAssetIds.value = selectedAssetIds.value.filter(
      (id) => !filteredAssets.value.some((a) => a.id === id)
    )
  } else {
    // Select all filtered
    const filteredIds = filteredAssets.value.map((a) => a.id)
    const newSelection = new Set([...selectedAssetIds.value, ...filteredIds])
    selectedAssetIds.value = Array.from(newSelection)
  }
}

// Fetch assets from API
const fetchAssets = async () => {
  if (!disciplineStore.activeDisciplineId) return

  loading.value = true
  try {
    const params = new URLSearchParams({
      disciplineId: disciplineStore.activeDisciplineId,
    })
    if (selectedTagId.value) {
      params.set('tagId', selectedTagId.value)
    }

    const response = await get<Asset[] | { data: Asset[] }>(`/api/v1/assets?${params}`)
    allAssets.value = Array.isArray(response) ? response : response.data ?? []
  } catch (error) {
    console.error('Failed to fetch assets:', error)
    allAssets.value = []
  } finally {
    loading.value = false
  }
}

// Save associations
const handleSave = async () => {
  saving.value = true

  try {
    const toAdd = selectedAssetIds.value.filter((id) => !initialSelectedIds.value.includes(id))
    const toRemove = initialSelectedIds.value.filter((id) => !selectedAssetIds.value.includes(id))

    // Add technique to newly selected assets
    for (const assetId of toAdd) {
      const asset = allAssets.value.find((a) => a.id === assetId)
      if (asset) {
        const newTechniqueIds = [...(asset.techniqueIds || []), props.techniqueId]
        await assetStore.updateAsset(assetId, { techniqueIds: newTechniqueIds })
      }
    }

    // Remove technique from deselected assets
    for (const assetId of toRemove) {
      const asset = allAssets.value.find((a) => a.id === assetId)
      if (asset) {
        const newTechniqueIds = (asset.techniqueIds || []).filter(
          (id) => id !== props.techniqueId
        )
        await assetStore.updateAsset(assetId, { techniqueIds: newTechniqueIds })
      }
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Asset associations updated',
      life: 3000,
    })

    emit('saved')
    emit('close')
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to update associations',
      life: 3000,
    })
  } finally {
    saving.value = false
  }
}

// Close handler
const handleClose = () => {
  emit('close')
}

// Initialize when modal opens
watch(
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      searchTerm.value = ''
      selectedTagId.value = null
      selectedAssetIds.value = []
      initialSelectedIds.value = []

      await Promise.all([fetchAssets(), tagStore.fetchTags()])

      // Pre-select assets that are already associated with this technique
      const associated = allAssets.value
        .filter((a) => a.techniqueIds?.includes(props.techniqueId))
        .map((a) => a.id)
      selectedAssetIds.value = [...associated]
      initialSelectedIds.value = [...associated]
    }
  }
)
</script>
