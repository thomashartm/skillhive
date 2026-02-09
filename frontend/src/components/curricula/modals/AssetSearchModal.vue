<template>
  <Dialog
    :visible="visible"
    header="Add Asset"
    :modal="true"
    :closable="true"
    :style="{ width: '600px' }"
    @update:visible="$emit('close')"
  >
    <div class="space-y-4">
      <div>
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText
            v-model="searchTerm"
            placeholder="Search assets..."
            class="w-full"
            @input="handleSearch"
          />
        </IconField>
      </div>

      <div v-if="loading" class="text-center py-8">
        <ProgressSpinner style="width: 50px; height: 50px" />
      </div>

      <div v-else-if="assets.length === 0" class="text-center py-8 text-slate-400">
        No assets found. Try a different search term.
      </div>

      <div v-else class="max-h-96 overflow-y-auto space-y-2">
        <div
          v-for="asset in assets"
          :key="asset.id"
          class="p-3 border border-white/10 hover:bg-white/5 cursor-pointer transition-colors flex gap-3"
          @click="handleSelect(asset)"
        >
          <img
            v-if="asset.thumbnailUrl"
            :src="asset.thumbnailUrl"
            alt="Asset thumbnail"
            class="w-20 h-20 object-cover rounded flex-shrink-0"
          />
          <div class="flex-1 min-w-0">
            <div class="font-medium">{{ asset.title }}</div>
            <div v-if="asset.description" class="text-sm text-slate-400 mt-1 truncate">
              {{ asset.description }}
            </div>
            <div class="text-xs text-slate-500 mt-1">{{ asset.type }}</div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" severity="secondary" @click="$emit('close')" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import { useAssetStore } from '../../../stores/assets'
import type { Asset } from '../../../types'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  select: [asset: Asset]
  close: []
}>()

const assetStore = useAssetStore()

const searchTerm = ref('')
const assets = ref<Asset[]>([])
const loading = ref(false)

let searchTimeout: ReturnType<typeof setTimeout>

const handleSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    await fetchAssets()
  }, 300)
}

const fetchAssets = async () => {
  loading.value = true
  try {
    await assetStore.fetchAssets({ q: searchTerm.value })
    assets.value = assetStore.assets
  } catch (error) {
    console.error('Failed to fetch assets:', error)
    assets.value = []
  } finally {
    loading.value = false
  }
}

const handleSelect = (asset: Asset) => {
  emit('select', asset)
  emit('close')
}

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      searchTerm.value = ''
      fetchAssets()
    }
  }
)
</script>
