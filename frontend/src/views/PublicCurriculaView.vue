<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import PTag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import TagFilterSelect from '../components/common/TagFilterSelect.vue'
import type { Curriculum } from '../types'
import { useCurriculumStore } from '../stores/curricula'
import { useTagStore } from '../stores/tags'
import { useCurriculaFilters } from '../composables/useCurriculaFilters'

const router = useRouter()
const curriculumStore = useCurriculumStore()
const tagStore = useTagStore()
const { tags } = storeToRefs(tagStore)

const curricula = ref<Curriculum[]>([])
const loading = ref(false)

const {
  searchQuery,
  selectedTagIds,
  debouncedSearchQuery,
  addTag,
  removeTag,
  clearAll,
  hasActiveFilters,
} = useCurriculaFilters()

const filteredCurricula = computed(() => {
  let result = curricula.value

  // Client-side multi-tag AND filter on allTagIds (server only handles first tag via array-contains)
  if (selectedTagIds.value.length > 1) {
    result = result.filter(c =>
      selectedTagIds.value.every(tagId => c.allTagIds?.includes(tagId))
    )
  }

  // Client-side text search
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
  () => loadData(),
  { deep: true }
)

onMounted(() => loadData())

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
      curriculumStore.fetchPublicCurricula(
        Object.keys(fetchParams).length > 0 ? fetchParams : undefined
      ),
      tagStore.fetchTags(),
    ])
    curricula.value = curriculumStore.curricula
  } finally {
    loading.value = false
  }
}

const handleView = (curriculum: Curriculum) => {
  router.push(`/curricula/${curriculum.id}`)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString()
}

const getTagName = (tagId: string): string => {
  const tag = tags.value.find(t => t.id === tagId)
  return tag?.name || tagId
}
</script>

<template>
  <div class="public-curricula-view">
    <div class="view-header">
      <h1 class="view-title">Public Curricula</h1>
      <Button
        label="Back"
        icon="pi pi-arrow-left"
        severity="secondary"
        size="small"
        @click="router.push('/curricula')"
      />
    </div>

    <!-- Filters -->
    <div class="filter-bar mb-4">
      <InputText
        v-model="searchQuery"
        placeholder="Search public curricula..."
        class="filter-search"
        aria-label="Search public curricula"
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

    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <DataTable
      v-else
      :value="filteredCurricula"
      striped-rows
      paginator
      :rows="10"
      data-key="id"
      class="public-curriculum-list"
    >
      <template #empty>
        <div class="text-center py-8 text-slate-400">
          No public curricula found yet.
        </div>
      </template>

      <Column field="title" header="Title" sortable>
        <template #body="{ data }">
          <a class="public-name" @click.prevent="handleView(data)">
            {{ data.title }}
          </a>
        </template>
      </Column>

      <Column field="description" header="Description">
        <template #body="{ data }">
          <span class="text-slate-400 text-sm block truncate max-w-md">
            {{ data.description || '—' }}
          </span>
        </template>
      </Column>

      <Column header="Tags">
        <template #body="{ data }">
          <div class="flex flex-wrap gap-1">
            <PTag
              v-for="tagId in (data.tagIds || [])"
              :key="tagId"
              :value="getTagName(tagId)"
              severity="info"
              class="cursor-pointer text-xs"
              @click="addTag(tagId)"
            />
          </div>
        </template>
      </Column>

      <Column field="elementCount" header="Elements" style="width: 100px">
        <template #body="{ data }">
          <PTag :value="String(data.elementCount || 0)" severity="info" />
        </template>
      </Column>

      <Column field="updatedAt" header="Updated" sortable style="width: 120px">
        <template #body="{ data }">
          <span class="text-slate-500 text-sm">{{ formatDate(data.updatedAt) }}</span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.public-curricula-view {
}

.public-curriculum-list {
  width: 100%;
}

.public-name {
  font-weight: 400;
  font-size: 0.875rem;
  color: #e2e8f0;
  cursor: pointer;
}

.public-name:hover {
  color: var(--primary-color);
}

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
