<template>
  <Dialog
    :visible="visible"
    header="Add Technique"
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
            placeholder="Search techniques..."
            class="w-full"
            @input="handleSearch"
          />
        </IconField>
      </div>

      <div v-if="loading" class="text-center py-8">
        <ProgressSpinner style="width: 50px; height: 50px" />
      </div>

      <div v-else-if="techniques.length === 0" class="text-center py-8 text-slate-400">
        No techniques found. Try a different search term.
      </div>

      <div v-else class="max-h-96 overflow-y-auto space-y-2">
        <div
          v-for="technique in techniques"
          :key="technique.id"
          class="p-3 border border-white/10 hover:bg-white/5 cursor-pointer transition-colors"
          @click="handleSelect(technique)"
        >
          <div class="font-medium">{{ technique.name }}</div>
          <div v-if="technique.description" class="text-sm text-slate-400 mt-1">
            {{ technique.description }}
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
import { useTechniqueStore } from '../../../stores/techniques'
import type { Technique } from '../../../types'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  select: [technique: Technique]
  close: []
}>()

const techniqueStore = useTechniqueStore()

const searchTerm = ref('')
const techniques = ref<Technique[]>([])
const loading = ref(false)

let searchTimeout: ReturnType<typeof setTimeout>

const handleSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    await fetchTechniques()
  }, 300)
}

const fetchTechniques = async () => {
  loading.value = true
  try {
    await techniqueStore.fetchTechniques({ q: searchTerm.value })
    techniques.value = techniqueStore.techniques
  } catch (error) {
    console.error('Failed to fetch techniques:', error)
    techniques.value = []
  } finally {
    loading.value = false
  }
}

const handleSelect = (technique: Technique) => {
  emit('select', technique)
  emit('close')
}

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      searchTerm.value = ''
      fetchTechniques()
    }
  }
)
</script>
