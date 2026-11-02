<template>
  <div class="techniques-view">
    <div class="view-header">
      <h1 class="view-title">Techniques</h1>
      <Button
        v-if="authStore.canEdit"
        label="New Technique"
        icon="pi pi-plus"
        size="small"
        @click="openCreateDialog"
      />
    </div>

    <div class="filter-bar">
      <InputText
        v-model="searchTerm"
        placeholder="Search techniques..."
        class="filter-search"
      />
      <Dropdown
        v-model="selectedCategoryId"
        :options="categoryOptions"
        option-label="label"
        option-value="value"
        placeholder="Category"
        :show-clear="true"
        class="filter-dropdown"
        @change="handleFilterChange"
      />
      <Dropdown
        v-model="selectedTagId"
        :options="tagOptions"
        option-label="label"
        option-value="value"
        placeholder="Tag"
        :show-clear="true"
        class="filter-dropdown"
        @change="handleFilterChange"
      />
    </div>

    <div class="alphabet-filter" role="group" aria-label="Filter techniques by first letter">
      <Button
        v-for="letter in alphabet"
        :key="letter"
        :label="letter"
        :aria-label="letter === '#' ? 'Names starting with numbers or other characters' : undefined"
        :aria-pressed="selectedLetter === letter"
        :severity="selectedLetter === letter ? 'primary' : 'secondary'"
        :outlined="selectedLetter !== letter"
        size="small"
        @click="selectedLetter = letter"
      />
    </div>

    <TechniqueList
      :techniques="filteredTechniques"
      :categories="categories"
      :loading="loading"
      :first="listState.first"
      :rows="listState.rows"
      :sort-field="listState.sortField"
      :sort-order="listState.sortOrder"
      @page="handlePage"
      @sort="handleSort"
      @edit="handleEdit"
      @delete="handleDelete"
      @view="handleView"
      @filter-category="handleCategoryFilter"
    />

    <TechniqueForm
      :visible="showDialog"
      :technique="selectedTechnique"
      :categories="categories"
      :tags="tags"
      @save="handleSave"
      @close="closeDialog"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, toRefs } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import type { DataTablePageEvent, DataTableSortEvent } from 'primevue/datatable'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import TechniqueList from '../components/techniques/TechniqueList.vue'
import TechniqueForm from '../components/techniques/TechniqueForm.vue'
import { useTechniqueStore } from '../stores/techniques'
import { useDisciplineStore } from '../stores/discipline'
import { useAuthStore } from '../stores/auth'
import { useCategoryStore } from '../stores/categories'
import { useTagStore } from '../stores/tags'
import { useDebouncedRef } from '../composables/useDebounce'
import type { Technique } from '../types'
import type { TechniqueFormData } from '../validation/schemas'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const authStore = useAuthStore()
const techniqueStore = useTechniqueStore()
const disciplineStore = useDisciplineStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()

const { techniques, loading } = storeToRefs(techniqueStore)
const { activeDisciplineId } = storeToRefs(disciplineStore)
const { categories } = storeToRefs(categoryStore)
const { tags } = storeToRefs(tagStore)

const showDialog = ref(false)
const selectedTechnique = ref<Technique | null>(null)
const listState = techniqueStore.listState
const { searchTerm, selectedCategoryId, selectedTagId, selectedLetter } = toRefs(listState)
const debouncedSearch = useDebouncedRef(searchTerm, 300)
const alphabet = ['All', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#']
const filteredTechniques = computed(() => techniques.value.filter(technique => {
  if (selectedLetter.value === 'All') return true
  const name = technique.name.trim().normalize('NFD').replace(/\p{M}/gu, '').toUpperCase()
  return selectedLetter.value === '#' ? !/^[A-Z]/.test(name) : name.startsWith(selectedLetter.value)
}))

watch([searchTerm, selectedCategoryId, selectedTagId, selectedLetter, activeDisciplineId], () => {
  listState.first = 0
})

function handlePage(event: DataTablePageEvent) {
  listState.first = event.first
  listState.rows = event.rows
}

function handleSort(event: DataTableSortEvent) {
  listState.sortField = typeof event.sortField === 'string' ? event.sortField : undefined
  listState.sortOrder = event.sortOrder ?? undefined
  listState.first = 0
}

const categoryOptions = computed(() => [
  { label: 'All Categories', value: null },
  ...categories.value.map((cat) => ({ label: cat.name, value: cat.id })),
])

const tagOptions = computed(() => [
  { label: 'All Tags', value: null },
  ...tags.value.map((tag) => ({ label: tag.name, value: tag.id })),
])

const fetchData = async () => {
  const params: any = {}

  if (debouncedSearch.value) {
    params.q = debouncedSearch.value
  }
  if (selectedCategoryId.value) {
    params.categoryId = selectedCategoryId.value
  }
  if (selectedTagId.value) {
    params.tagId = selectedTagId.value
  }

  await techniqueStore.fetchTechniques(params)
  if (listState.first >= filteredTechniques.value.length) {
    listState.first = Math.floor(Math.max(0, filteredTechniques.value.length - 1) / listState.rows) * listState.rows
  }
}

// Debounced search watcher
watch(debouncedSearch, () => {
  fetchData()
})

const handleFilterChange = () => {
  fetchData()
}

const handleCategoryFilter = (categoryId: string) => {
  selectedCategoryId.value = categoryId
  fetchData()
}

const openCreateDialog = () => {
  selectedTechnique.value = null
  showDialog.value = true
}

const handleEdit = (technique: Technique) => {
  selectedTechnique.value = technique
  showDialog.value = true
}

const handleView = (technique: Technique) => {
  router.push(`/techniques/${technique.id}`)
}

const handleDelete = (technique: Technique) => {
  confirm.require({
    message: `Are you sure you want to delete "${technique.name}"?`,
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await techniqueStore.deleteTechnique(technique.id)
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Technique deleted successfully',
          life: 3000,
        })
        await fetchData()
      } catch (error: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to delete technique',
          life: 3000,
        })
      }
    },
  })
}

const handleSave = async (data: TechniqueFormData) => {
  try {
    if (selectedTechnique.value) {
      await techniqueStore.updateTechnique(selectedTechnique.value.id, data)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Technique updated successfully',
        life: 3000,
      })
    } else {
      await techniqueStore.createTechnique(data)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Technique created successfully',
        life: 3000,
      })
    }
    closeDialog()
    await fetchData()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save technique',
      life: 3000,
    })
  }
}

const closeDialog = () => {
  showDialog.value = false
  selectedTechnique.value = null
}

onMounted(async () => {
  await Promise.all([
    fetchData(),
    categoryStore.fetchCategories(),
    tagStore.fetchTags(),
  ])
})

watch(activeDisciplineId, () => {
  fetchData()
  categoryStore.fetchCategories()
  tagStore.fetchTags()
})
</script>

<style scoped>
.alphabet-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 1rem;
}

.alphabet-filter :deep(button) {
  min-width: 2rem;
}

.filter-bar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.filter-search {
  width: 16rem;
}

.filter-dropdown {
  width: 12rem;
}

@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
  }

  .filter-search,
  .filter-dropdown {
    width: 100%;
  }
}
</style>
