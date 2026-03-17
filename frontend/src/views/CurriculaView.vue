<template>
  <div class="curricula-view">
    <div class="view-header">
      <h1 class="view-title">Curricula</h1>
      <Button v-if="authStore.canEdit" label="New Curriculum" icon="pi pi-plus" size="small" @click="showForm = true" />
    </div>

    <!-- Filters -->
    <div class="filter-bar mb-4">
      <InputText
        v-model="searchQuery"
        placeholder="Search curricula..."
        class="filter-search"
        aria-label="Search curricula"
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

    <CurriculumList
      :curricula="filteredCurricula"
      :tags="tags"
      :loading="loading"
      @view="handleView"
      @edit="handleEdit"
      @delete="handleDelete"
      @tag-click="addTag"
    />

    <CurriculumForm
      :visible="showForm"
      :curriculum="editingCurriculum"
      @save="handleSave"
      @close="handleCloseForm"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import CurriculumList from '../components/curricula/CurriculumList.vue'
import CurriculumForm from '../components/curricula/CurriculumForm.vue'
import TagFilterSelect from '../components/common/TagFilterSelect.vue'
import { useCurriculumStore } from '../stores/curricula'
import { useDisciplineStore } from '../stores/discipline'
import { useTagStore } from '../stores/tags'
import { useAuthStore } from '../stores/auth'
import { useCurriculaFilters } from '../composables/useCurriculaFilters'
import type { Curriculum } from '../types'
import type { CurriculumFormData } from '../validation/schemas'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const authStore = useAuthStore()
const curriculumStore = useCurriculumStore()
const disciplineStore = useDisciplineStore()
const tagStore = useTagStore()
const { activeDisciplineId } = storeToRefs(disciplineStore)
const { tags } = storeToRefs(tagStore)

const { curricula, loading } = storeToRefs(curriculumStore)
const { fetchCurricula, createCurriculum, updateCurriculum, deleteCurriculum } = curriculumStore

const {
  searchQuery,
  selectedTagIds,
  debouncedSearchQuery,
  addTag,
  removeTag,
  clearAll,
  hasActiveFilters,
} = useCurriculaFilters()

const showForm = ref(false)
const editingCurriculum = ref<Curriculum | null>(null)

const filteredCurricula = computed(() => {
  let result = curricula.value

  // Client-side multi-tag AND filter (server only handles first tag via array-contains)
  if (selectedTagIds.value.length > 1) {
    result = result.filter(c =>
      selectedTagIds.value.every(tagId => c.allTagIds?.includes(tagId))
    )
  }

  // Client-side text search (supplements server slug-prefix matching)
  if (debouncedSearchQuery.value) {
    const q = debouncedSearchQuery.value.toLowerCase()
    result = result.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
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
  const fetchParams: { tagId?: string; q?: string } = {}
  if (selectedTagIds.value.length > 0) {
    fetchParams.tagId = selectedTagIds.value[0]
  }
  if (debouncedSearchQuery.value) {
    fetchParams.q = debouncedSearchQuery.value
  }

  await Promise.all([
    fetchCurricula(Object.keys(fetchParams).length > 0 ? fetchParams : undefined),
    tagStore.fetchTags(),
  ])
}

const handleView = (id: string) => {
  router.push(`/curricula/${id}`)
}

const handleEdit = (curriculum: Curriculum) => {
  editingCurriculum.value = curriculum
  showForm.value = true
}

const handleDelete = (id: string) => {
  confirm.require({
    message: 'Are you sure you want to delete this curriculum? This action cannot be undone.',
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await deleteCurriculum(id)
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Curriculum deleted successfully',
          life: 3000
        })
        await loadData()
      } catch (error: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to delete curriculum',
          life: 3000
        })
      }
    }
  })
}

const handleSave = async (data: CurriculumFormData) => {
  try {
    if (editingCurriculum.value) {
      await updateCurriculum(editingCurriculum.value.id, data)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Curriculum updated successfully',
        life: 3000
      })
    } else {
      await createCurriculum(data)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Curriculum created successfully',
        life: 3000
      })
    }
    showForm.value = false
    editingCurriculum.value = null
    await loadData()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save curriculum',
      life: 3000
    })
  }
}

const handleCloseForm = () => {
  showForm.value = false
  editingCurriculum.value = null
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
