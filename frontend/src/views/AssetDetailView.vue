<template>
  <div class="asset-detail-view">
    <div v-if="loading" class="space-y-4">
      <div class="flex items-center gap-4">
        <Skeleton shape="circle" size="2.5rem" />
        <Skeleton width="50%" height="2rem" />
      </div>
      <Skeleton width="100%" height="12rem" />
    </div>

    <div v-else-if="asset">
      <!-- Header -->
      <div class="detail-header">
        <Button
          icon="pi pi-arrow-left"
          severity="secondary"
          text
          @click="router.push('/assets')"
        />
        <h1 class="view-title flex-1">{{ asset.title }}</h1>
        <div class="detail-header-actions">
          <Button
            v-if="authStore.canEdit"
            icon="pi pi-pencil"
            label="Edit"
            severity="secondary"
            size="small"
            @click="router.push(`/assets/${asset.id}/edit`)"
          />
          <Button
            v-if="authStore.canEdit"
            icon="pi pi-trash"
            label="Delete"
            severity="danger"
            size="small"
            @click="handleDelete"
          />
        </div>
      </div>

      <!-- Main content -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left: Thumbnail + URL -->
        <div class="lg:col-span-2 space-y-4">
          <div v-if="asset.thumbnailUrl" class="asset-thumbnail">
            <a :href="asset.url" target="_blank" rel="noopener noreferrer">
              <img
                :src="asset.thumbnailUrl"
                :alt="asset.title"
                class="w-full object-cover"
              />
            </a>
          </div>

          <a
            :href="asset.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-blue-400 hover:text-blue-300 break-all"
          >
            {{ asset.url }}
          </a>

          <MarkdownRenderer
            v-if="asset.description"
            :content="asset.description"
            class="text-slate-300 text-sm leading-relaxed"
          />
        </div>

        <!-- Right: Metadata -->
        <div class="space-y-5">
          <!-- Type -->
          <div>
            <h3 class="detail-label">Type</h3>
            <div class="flex gap-2">
              <Tag :value="asset.type" severity="info" />
              <Tag v-if="asset.videoType" :value="asset.videoType" severity="secondary" />
            </div>
          </div>

          <!-- Originator -->
          <div v-if="asset.originator">
            <h3 class="detail-label">Originator</h3>
            <span class="text-sm">{{ asset.originator }}</span>
          </div>

          <!-- Techniques -->
          <div>
            <h3 class="detail-label">Techniques</h3>
            <div v-if="resolvedTechniques.length" class="flex flex-col gap-1">
              <a
                v-for="tech in resolvedTechniques"
                :key="tech.id"
                class="technique-link"
                @click.prevent="router.push(`/techniques/${tech.id}`)"
              >
                {{ tech.name }}
              </a>
            </div>
            <span v-else class="text-xs text-slate-500">None</span>
          </div>

          <!-- Tags -->
          <div>
            <h3 class="detail-label">Tags</h3>
            <div v-if="resolvedTags.length" class="flex flex-wrap gap-1">
              <span
                v-for="tag in resolvedTags"
                :key="tag.id"
                class="tag-chip"
                :style="tag.color ? { backgroundColor: tag.color, borderColor: tag.color, color: '#ffffff' } : {}"
              >
                {{ tag.name }}
              </span>
            </div>
            <span v-else class="text-xs text-slate-500">None</span>
          </div>

          <!-- Dates -->
          <div class="text-xs text-slate-500 space-y-1 pt-3 border-t border-white/10">
            <div>Created: {{ formatDate(asset.createdAt) }}</div>
            <div>Updated: {{ formatDate(asset.updatedAt) }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-12 text-slate-400">
      <p class="text-lg">Asset not found</p>
      <Button
        label="Back to Assets"
        severity="secondary"
        class="mt-4"
        @click="router.push('/assets')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import MarkdownRenderer from '../components/common/MarkdownRenderer.vue'
import { useAssetStore } from '../stores/assets'
import { useTechniqueStore } from '../stores/techniques'
import { useTagStore } from '../stores/tags'
import { useAuthStore } from '../stores/auth'
import type { Asset } from '../types'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const authStore = useAuthStore()
const assetStore = useAssetStore()
const techniqueStore = useTechniqueStore()
const tagStore = useTagStore()

const asset = ref<Asset | null>(null)
const loading = ref(true)
const id = computed(() => route.params.id as string)

const resolvedTechniques = computed(() => {
  if (!asset.value?.techniqueIds?.length) return []
  return techniqueStore.techniques.filter(t => asset.value!.techniqueIds.includes(t.id))
})

const resolvedTags = computed(() => {
  if (!asset.value?.tagIds?.length) return []
  return tagStore.tags.filter(t => asset.value!.tagIds.includes(t.id))
})

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const handleDelete = () => {
  if (!asset.value) return
  confirm.require({
    message: `Are you sure you want to delete "${asset.value.title}"?`,
    header: 'Delete Asset',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await assetStore.deleteAsset(asset.value!.id)
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Asset deleted',
          life: 3000,
        })
        router.push('/assets')
      } catch (error: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to delete',
          life: 3000,
        })
      }
    },
  })
}

onMounted(async () => {
  try {
    const [fetchedAsset] = await Promise.all([
      assetStore.getAsset(id.value),
      techniqueStore.fetchTechniques(),
      tagStore.fetchTags(),
    ])
    asset.value = fetchedAsset
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load asset',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.detail-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.detail-header-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.asset-thumbnail {
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.asset-thumbnail img {
  max-height: 400px;
}

.detail-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 0.375rem;
}

.technique-link {
  font-size: 0.8125rem;
  color: #e2e8f0;
  cursor: pointer;
  text-decoration: none;
}

.technique-link:hover {
  color: var(--primary-color);
}

.tag-chip {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 500;
  color: #ffffff;
  background-color: #6b7280;
  border: 1px solid transparent;
  border-radius: 0.25rem;
}

@media (max-width: 768px) {
  .detail-header {
    flex-wrap: wrap;
  }

  .detail-header-actions {
    width: 100%;
    order: 3;
  }
}
</style>
