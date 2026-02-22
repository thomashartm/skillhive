<template>
  <div class="category-detail-view">
    <div v-if="loading" class="space-y-4">
      <Skeleton width="50%" height="2rem" />
      <Skeleton width="80%" height="1rem" />
      <Skeleton width="100%" height="8rem" />
    </div>

    <div v-else-if="category">
      <!-- Header -->
      <div class="detail-header">
        <Button
          icon="pi pi-arrow-left"
          severity="secondary"
          text
          @click="router.push(backRoute)"
        />
        <div class="flex-1">
          <h1 class="view-title">{{ category.name }}</h1>
          <div v-if="breadcrumbs.length > 1" class="breadcrumb-row">
            <template v-for="(crumb, i) in breadcrumbs" :key="crumb.id">
              <span v-if="i > 0" class="text-slate-600 text-xs">/</span>
              <a
                v-if="crumb.id !== category.id"
                class="breadcrumb-link"
                @click.prevent="router.push(`/categories/${crumb.id}`)"
              >
                {{ crumb.name }}
              </a>
              <span v-else class="text-xs text-slate-400">{{ crumb.name }}</span>
            </template>
          </div>
        </div>
        <Button
          v-if="authStore.canEdit"
          icon="pi pi-pencil"
          label="Edit"
          severity="secondary"
          size="small"
          @click="handleEdit"
        />
      </div>

      <!-- Description -->
      <p v-if="category.description" class="text-slate-300 text-sm mb-6">
        {{ category.description }}
      </p>

      <!-- Children -->
      <div v-if="children.length" class="mb-6">
        <h2 class="detail-label mb-3">Subcategories</h2>
        <div class="space-y-1">
          <a
            v-for="child in children"
            :key="child.id"
            class="subcategory-row"
            @click.prevent="router.push(`/categories/${child.id}`)"
          >
            <i class="pi pi-folder text-slate-500 text-sm"></i>
            <div class="flex-1">
              <span class="text-sm">{{ child.name }}</span>
              <span v-if="child.description" class="text-xs text-slate-500 ml-2">{{ child.description }}</span>
            </div>
            <i class="pi pi-chevron-right text-slate-600 text-xs"></i>
          </a>
        </div>
      </div>

      <!-- Techniques in this category -->
      <div v-if="techniques.length" class="mb-6">
        <h2 class="detail-label mb-3">Techniques ({{ techniques.length }})</h2>
        <div class="space-y-1">
          <a
            v-for="tech in techniques"
            :key="tech.id"
            class="technique-row"
            @click.prevent="router.push(`/techniques/${tech.id}`)"
          >
            <span class="technique-icon">T</span>
            <span class="text-sm text-slate-300">{{ tech.name }}</span>
          </a>
        </div>
      </div>
      <div v-else-if="!children.length" class="text-sm text-slate-500 italic">
        No subcategories or techniques in this category.
      </div>

      <!-- Assets in this category -->
      <div class="mb-6">
        <h2 class="detail-label mb-3">Assets</h2>

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
              <p v-if="asset.description" class="asset-description">{{ asset.description }}</p>
              <p v-if="asset.originator" class="asset-originator">{{ asset.originator }}</p>
            </div>
          </div>
        </div>

        <p v-else class="text-sm text-slate-500 italic">No assets in this category</p>
      </div>

      <!-- Metadata -->
      <div class="text-xs text-slate-500 pt-4 border-t border-white/10 space-y-1">
        <div>Created: {{ formatDate(category.createdAt) }}</div>
        <div>Updated: {{ formatDate(category.updatedAt) }}</div>
      </div>
    </div>

    <div v-else class="text-center py-12 text-slate-400">
      <p class="text-lg">Category not found</p>
      <Button
        label="Back to Categories"
        severity="secondary"
        class="mt-4"
        @click="router.push('/categories')"
      />
    </div>

    <CategoryForm
      :visible="showEditDialog"
      :category="category"
      :categories="allCategories"
      @save="handleSave"
      @close="showEditDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import CategoryForm from '../components/categories/CategoryForm.vue'
import { useCategoryStore } from '../stores/categories'
import { useTechniqueStore } from '../stores/techniques'
import { useAuthStore } from '../stores/auth'
import { useDisciplineStore } from '../stores/discipline'
import { useApi } from '../composables/useApi'
import type { Category, Technique, Asset } from '../types'
import type { CategoryFormData } from '../validation/schemas'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const categoryStore = useCategoryStore()
const techniqueStore = useTechniqueStore()
const disciplineStore = useDisciplineStore()
const { get } = useApi()

const { activeDisciplineId } = storeToRefs(disciplineStore)

const category = ref<Category | null>(null)
const loading = ref(true)
const showEditDialog = ref(false)
const allCategories = ref<Category[]>([])
const techniques = ref<Technique[]>([])
const assets = ref<Asset[]>([])
const assetsLoading = ref(false)

const id = computed(() => route.params.id as string)

const children = computed(() => {
  return allCategories.value.filter(c => c.parentId === id.value)
})

const backRoute = computed(() => {
  if (category.value?.parentId) {
    return `/categories/${category.value.parentId}`
  }
  return '/categories'
})

const breadcrumbs = computed(() => {
  if (!category.value) return []
  const crumbs: Category[] = []
  let current: Category | undefined = category.value

  while (current) {
    crumbs.unshift(current)
    if (current.parentId) {
      current = allCategories.value.find(c => c.id === current!.parentId)
    } else {
      break
    }
  }
  return crumbs
})

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const handleEdit = () => {
  showEditDialog.value = true
}

const handleSave = async (data: CategoryFormData) => {
  if (!category.value) return
  try {
    await categoryStore.updateCategory(category.value.id, data)
    toast.add({
      severity: 'success',
      summary: 'Updated',
      detail: 'Category updated',
      life: 3000,
    })
    showEditDialog.value = false
    await loadData()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to update',
      life: 3000,
    })
  }
}

const fetchAssets = async () => {
  if (!activeDisciplineId.value) return
  try {
    assetsLoading.value = true
    const params = new URLSearchParams({
      disciplineId: activeDisciplineId.value,
      categoryId: id.value,
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

const loadData = async () => {
  loading.value = true
  try {
    await categoryStore.fetchCategories()
    allCategories.value = categoryStore.categories

    const found = allCategories.value.find(c => c.id === id.value)
    if (found) {
      category.value = found
    } else {
      category.value = null
    }

    // Load techniques that belong to this category
    await techniqueStore.fetchTechniques({ categoryId: id.value })
    techniques.value = techniqueStore.techniques

    // Load assets tagged with this category
    await fetchAssets()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load category',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

// Reload when navigating between categories (same component, different param)
watch(id, () => {
  loadData()
})
</script>

<style scoped>
.detail-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.breadcrumb-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.25rem;
  flex-wrap: wrap;
}

.detail-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.4);
}

.breadcrumb-link {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
}

.breadcrumb-link:hover {
  color: var(--primary-color);
}

.subcategory-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  transition: background 0.15s ease;
}

.subcategory-row:hover {
  background: rgba(255, 255, 255, 0.06);
}

.technique-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.375rem 0.75rem;
  cursor: pointer;
  border-left: 2px solid rgba(255, 255, 255, 0.08);
  transition: border-color 0.15s ease, color 0.15s ease;
}

.technique-row:hover {
  border-left-color: var(--primary-color);
}

.technique-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  font-size: 0.625rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.12);
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

@media (max-width: 768px) {
  .detail-header {
    flex-wrap: wrap;
  }
}
</style>
