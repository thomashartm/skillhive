<template>
  <div class="techniques-view p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold">Techniques</h1>
      <Button
        label="New Technique"
        icon="pi pi-plus"
        @click="openCreateDialog"
      />
    </div>

    <div class="flex gap-4 mb-4">
      <div class="flex-1">
        <span class="p-input-icon-left w-full">
          <i class="pi pi-search" />
          <InputText
            v-model="searchTerm"
            placeholder="Search techniques..."
            class="w-full"
          />
        </span>
      </div>
      <Dropdown
        v-model="selectedCategoryId"
        :options="categoryOptions"
        option-label="label"
        option-value="value"
        placeholder="Filter by category"
        :show-clear="true"
        class="w-64"
        @change="handleFilterChange"
      />
      <Dropdown
        v-model="selectedTagId"
        :options="tagOptions"
        option-label="label"
        option-value="value"
        placeholder="Filter by tag"
        :show-clear="true"
        class="w-64"
        @change="handleFilterChange"
      />
    </div>

    <TechniqueList
      :techniques="techniques"
      :loading="loading"
      @edit="handleEdit"
      @delete="handleDelete"
      @view="handleView"
    />

    <TechniqueForm
      :visible="showDialog"
      :technique="selectedTechnique"
      :categories="categories"
      :tags="tags"
      @save="handleSave"
      @close="closeDialog"
    />

    <Toast />
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import TechniqueList from '../components/techniques/TechniqueList.vue'
import TechniqueForm from '../components/techniques/TechniqueForm.vue'
import { useTechniqueStore } from '../stores/techniques'
import { useDisciplineStore } from '../stores/discipline'
import { useCategoryStore } from '../stores/categories'
import { useTagStore } from '../stores/tags'
import { useDebouncedRef } from '../composables/useDebounce'
import type { Technique } from '../types'
import type { TechniqueFormData } from '../validation/schemas'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

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
const searchTerm = ref('')
const debouncedSearch = useDebouncedRef(searchTerm, 300)
const selectedCategoryId = ref<string | null>(null)
const selectedTagId = ref<string | null>(null)

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
}

// Debounced search watcher
watch(debouncedSearch, () => {
  fetchData()
})

const handleFilterChange = () => {
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
.techniques-view {
  max-width: 1400px;
  margin: 0 auto;
}

.p-input-icon-left {
  display: block;
}

.p-input-icon-left > input {
  width: 100%;
}
</style>
