<template>
  <div class="technique-detail-view">
    <div v-if="loading">
      <div class="flex items-center gap-4 mb-6">
        <Skeleton shape="circle" size="3rem" />
        <Skeleton width="60%" height="2rem" />
      </div>
      <div class="p-4 border border-white/10">
        <Skeleton width="100%" height="1rem" class="mb-3" />
        <Skeleton width="80%" height="1rem" class="mb-3" />
        <Skeleton width="90%" height="1rem" class="mb-6" />
        <div class="flex gap-2">
          <Skeleton width="5rem" height="1.5rem" />
          <Skeleton width="5rem" height="1.5rem" />
          <Skeleton width="5rem" height="1.5rem" />
        </div>
      </div>
    </div>

    <div v-else-if="technique">
      <div class="detail-header">
        <Button
          icon="pi pi-arrow-left"
          severity="secondary"
          text
          rounded
          @click="goBack"
          aria-label="Go back"
        />
        <h1 class="view-title flex-1">{{ technique.name }}</h1>
        <div class="detail-header-actions">
          <Button
            v-if="authStore.canEdit"
            icon="pi pi-pencil"
            label="Edit"
            severity="info"
            @click="openEditDialog"
          />
          <Button
            v-if="authStore.canEdit"
            icon="pi pi-trash"
            label="Delete"
            severity="danger"
            @click="handleDelete"
          />
        </div>
      </div>

      <Card class="mb-6">
        <template #content>
          <div class="flex flex-col gap-4">
            <div v-if="technique.description">
              <h3 class="text-lg font-semibold mb-2">Description</h3>
              <MarkdownRenderer
                :content="technique.description"
                class="prose max-w-none"
              />
            </div>
            <div v-else class="text-slate-400 italic">
              No description available
            </div>

            <div v-if="technique.categories && technique.categories.length > 0">
              <h3 class="text-lg font-semibold mb-2">Categories</h3>
              <div class="flex flex-wrap gap-2">
                <Tag
                  v-for="category in technique.categories"
                  :key="category.id"
                  :value="category.name"
                  severity="info"
                />
              </div>
            </div>
            <div
              v-else-if="technique.categoryIds && technique.categoryIds.length > 0"
            >
              <h3 class="text-lg font-semibold mb-2">Categories</h3>
              <div class="text-sm text-slate-400">
                {{ technique.categoryIds.length }} categories assigned
              </div>
            </div>

            <div v-if="technique.tags && technique.tags.length > 0">
              <h3 class="text-lg font-semibold mb-2">Tags</h3>
              <div class="flex flex-wrap gap-2">
                <Tag
                  v-for="tag in technique.tags"
                  :key="tag.id"
                  :value="tag.name"
                  :style="tag.color ? { backgroundColor: tag.color, color: '#ffffff' } : {}"
                />
              </div>
            </div>
            <div v-else-if="technique.tagIds && technique.tagIds.length > 0">
              <h3 class="text-lg font-semibold mb-2">Tags</h3>
              <div class="text-sm text-slate-400">
                {{ technique.tagIds.length }} tags assigned
              </div>
            </div>

            <div class="detail-meta">
              <div>
                <span class="font-semibold">Created:</span>
                {{ formatDate(technique.createdAt) }}
              </div>
              <div>
                <span class="font-semibold">Updated:</span>
                {{ formatDate(technique.updatedAt) }}
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Associated Assets -->
      <div class="mt-6">
        <h2 class="text-lg font-semibold mb-4">Associated Assets</h2>

        <div v-if="assetsLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="n in 3" :key="n" class="p-3 border border-white/10 rounded">
            <Skeleton width="100%" height="7rem" class="mb-3" />
            <Skeleton width="70%" height="1rem" class="mb-2" />
            <Skeleton width="100%" height="0.75rem" />
          </div>
        </div>

        <div v-else-if="assets.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="asset in assets"
            :key="asset.id"
            class="asset-card"
            @click="router.push(`/assets/${asset.id}`)"
          >
            <div class="asset-thumbnail">
              <img
                v-if="asset.thumbnailUrl"
                :src="asset.thumbnailUrl"
                :alt="asset.title"
                class="w-full h-full object-cover"
              />
              <div v-else class="asset-thumbnail-placeholder">
                <i class="pi pi-play-circle text-2xl text-slate-500"></i>
              </div>
            </div>
            <div class="asset-body">
              <div class="flex items-start justify-between gap-2 mb-1">
                <span class="asset-title">{{ asset.title }}</span>
                <Tag
                  v-if="asset.videoType"
                  :value="asset.videoType"
                  severity="secondary"
                  class="shrink-0 text-xs"
                />
              </div>
              <MarkdownRenderer v-if="asset.description" :content="asset.description" class="asset-description" />
              <p v-if="asset.originator" class="asset-originator">{{ asset.originator }}</p>
            </div>
          </div>
        </div>

        <p v-else class="text-sm text-slate-500 italic">No assets linked to this technique</p>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <p class="text-xl text-slate-400">Technique not found</p>
      <Button
        label="Go back"
        severity="secondary"
        class="mt-4"
        @click="goBack"
      />
    </div>

    <TechniqueForm
      :visible="showEditDialog"
      :technique="technique"
      :categories="categories"
      :tags="tags"
      @save="handleSave"
      @close="closeEditDialog"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import MarkdownRenderer from '../components/common/MarkdownRenderer.vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import TechniqueForm from '../components/techniques/TechniqueForm.vue'
import { useTechniqueStore } from '../stores/techniques'
import { useCategoryStore } from '../stores/categories'
import { useTagStore } from '../stores/tags'
import { useAuthStore } from '../stores/auth'
import { useDisciplineStore } from '../stores/discipline'
import { useApi } from '../composables/useApi'
import type { Technique, Asset } from '../types'
import type { TechniqueFormData } from '../validation/schemas'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const authStore = useAuthStore()
const techniqueStore = useTechniqueStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()
const disciplineStore = useDisciplineStore()
const { get } = useApi()

const { categories } = storeToRefs(categoryStore)
const { tags } = storeToRefs(tagStore)
const { activeDisciplineId } = storeToRefs(disciplineStore)

const technique = ref<Technique | null>(null)
const loading = ref(true)
const showEditDialog = ref(false)
const assets = ref<Asset[]>([])
const assetsLoading = ref(false)

const id = computed(() => route.params.id as string)

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const goBack = () => {
  router.push('/techniques')
}

const openEditDialog = () => {
  showEditDialog.value = true
}

const closeEditDialog = () => {
  showEditDialog.value = false
}

const handleSave = async (data: TechniqueFormData) => {
  if (!technique.value) return

  try {
    await techniqueStore.updateTechnique(technique.value.id, data)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Technique updated successfully',
      life: 3000,
    })
    closeEditDialog()
    await fetchTechnique()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to update technique',
      life: 3000,
    })
  }
}

const handleDelete = () => {
  if (!technique.value) return

  confirm.require({
    message: `Are you sure you want to delete "${technique.value.name}"?`,
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await techniqueStore.deleteTechnique(technique.value!.id)
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Technique deleted successfully',
          life: 3000,
        })
        goBack()
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

const fetchTechnique = async () => {
  try {
    loading.value = true
    technique.value = await techniqueStore.getTechnique(id.value)
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load technique',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

const fetchAssets = async () => {
  if (!activeDisciplineId.value) return
  try {
    assetsLoading.value = true
    const params = new URLSearchParams({
      disciplineId: activeDisciplineId.value,
      techniqueId: id.value,
    })
    const response = await get<{ data: Asset[] } | Asset[]>(`/api/v1/assets?${params.toString()}`)
    assets.value = Array.isArray(response) ? response : response.data ?? []
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load assets',
      life: 3000,
    })
  } finally {
    assetsLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    fetchTechnique(),
    categoryStore.fetchCategories(),
    tagStore.fetchTags(),
    fetchAssets(),
  ])
})
</script>

<style scoped>
.technique-detail-view {
}

/* Override PrimeVue Tag to use full bright colors */
:deep(.p-tag) {
  color: #ffffff !important;
  border: none !important;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.detail-header-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.detail-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #94a3b8;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

@media (max-width: 768px) {
  .detail-header {
    flex-wrap: wrap;
  }

  .detail-header-actions {
    width: 100%;
    order: 3;
  }

  .detail-meta {
    flex-direction: column;
    gap: 0.25rem;
  }
}

.prose {
  color: #cbd5e1;
  line-height: 1.75;
}

.asset-card {
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
  border-radius: 0.375rem;
  overflow: hidden;
}

.asset-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.16);
}

.asset-thumbnail {
  width: 100%;
  height: 7rem;
  background: rgba(255, 255, 255, 0.04);
  flex-shrink: 0;
  overflow: hidden;
}

.asset-thumbnail-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.asset-body {
  padding: 0.625rem 0.75rem;
  flex: 1;
}

.asset-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #e2e8f0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.asset-description {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 0.25rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

.asset-originator {
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 0.375rem;
  font-style: italic;
}
</style>
