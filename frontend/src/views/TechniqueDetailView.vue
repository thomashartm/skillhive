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
      <div class="flex items-center gap-4 mb-6">
        <Button
          icon="pi pi-arrow-left"
          severity="secondary"
          text
          rounded
          @click="goBack"
          aria-label="Go back"
        />
        <h1 class="view-title flex-1">{{ technique.name }}</h1>
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

      <Card class="mb-6">
        <template #content>
          <div class="flex flex-col gap-4">
            <div v-if="technique.description">
              <h3 class="text-lg font-semibold mb-2">Description</h3>
              <div class="prose max-w-none">
                {{ technique.description }}
              </div>
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
                  :style="tag.color ? { backgroundColor: tag.color } : {}"
                />
              </div>
            </div>
            <div v-else-if="technique.tagIds && technique.tagIds.length > 0">
              <h3 class="text-lg font-semibold mb-2">Tags</h3>
              <div class="text-sm text-slate-400">
                {{ technique.tagIds.length }} tags assigned
              </div>
            </div>

            <div class="flex gap-4 text-sm text-slate-400 mt-4 pt-4 border-t border-white/10">
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
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import TechniqueForm from '../components/techniques/TechniqueForm.vue'
import { useTechniqueStore } from '../stores/techniques'
import { useCategoryStore } from '../stores/categories'
import { useTagStore } from '../stores/tags'
import { useAuthStore } from '../stores/auth'
import type { Technique } from '../types'
import type { TechniqueFormData } from '../validation/schemas'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const authStore = useAuthStore()
const techniqueStore = useTechniqueStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()

const { categories } = storeToRefs(categoryStore)
const { tags } = storeToRefs(tagStore)

const technique = ref<Technique | null>(null)
const loading = ref(true)
const showEditDialog = ref(false)

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

onMounted(async () => {
  await Promise.all([
    fetchTechnique(),
    categoryStore.fetchCategories(),
    tagStore.fetchTags(),
  ])
})
</script>

<style scoped>
.technique-detail-view {
}

.prose {
  color: #cbd5e1;
  line-height: 1.75;
}
</style>
