<template>
  <div class="curriculum-detail-view">
    <div v-if="loading">
      <div class="flex items-center gap-3 mb-4">
        <Skeleton shape="circle" size="2.5rem" />
        <Skeleton width="50%" height="2rem" />
      </div>
      <Skeleton width="80%" height="1rem" class="mb-3" />
      <Skeleton width="5rem" height="1.5rem" class="mb-6" />
      <Skeleton width="8rem" height="2.5rem" class="mb-6" />
      <Skeleton width="100%" height="4rem" class="mb-3" />
      <Skeleton width="100%" height="4rem" class="mb-3" />
      <Skeleton width="100%" height="4rem" />
    </div>

    <div v-else-if="curriculum">
      <div class="curriculum-header">
        <div class="curriculum-header-top">
          <Button
            icon="pi pi-arrow-left"
            severity="secondary"
            text
            @click="router.push('/curricula')"
            title="Back to Curricula"
          />
          <h1 class="view-title flex-1">{{ curriculum.title }}</h1>
          <Button
            v-if="authStore.canEdit"
            icon="pi pi-pencil"
            severity="secondary"
            text
            @click="handleEditCurriculum"
            title="Edit Curriculum"
          />
        </div>
        <p v-if="curriculum.description" class="text-slate-400 mb-2">
          {{ curriculum.description }}
        </p>
        <Tag
          :value="curriculum.isPublic ? 'Public' : 'Private'"
          :severity="curriculum.isPublic ? 'success' : 'secondary'"
        />
      </div>

      <div v-if="authStore.canEdit" class="mb-6">
        <AddElementMenu
          @add-technique="showTechniqueModal = true"
          @add-asset="showAssetModal = true"
          @add-text="showTextModal = true"
          @add-image="showImageModal = true"
          @add-list="showListModal = true"
        />
      </div>

      <div v-if="elementsLoading" class="py-4 space-y-3">
        <Skeleton width="100%" height="4rem" />
        <Skeleton width="100%" height="4rem" />
        <Skeleton width="100%" height="4rem" />
      </div>

      <ElementList
        v-else
        :elements="elements"
        :editable="authStore.canEdit"
        @reorder="handleReorder"
        @edit-element="handleEditElement"
        @delete-element="handleDeleteElement"
      />
    </div>

    <div v-else class="text-center py-12 text-slate-400">
      Curriculum not found
    </div>

    <CurriculumForm
      :visible="showCurriculumForm"
      :curriculum="curriculum"
      @save="handleSaveCurriculum"
      @close="showCurriculumForm = false"
    />

    <TechniqueSearchModal
      :visible="showTechniqueModal"
      @select="handleAddTechnique"
      @close="showTechniqueModal = false"
    />

    <AssetSearchModal
      :visible="showAssetModal"
      @select="handleAddAsset"
      @close="showAssetModal = false"
    />

    <TextElementModal
      :visible="showTextModal"
      :element="editingElement"
      @save="handleSaveTextElement"
      @close="handleCloseTextModal"
    />

    <ImageElementModal
      :visible="showImageModal"
      :element="editingElement"
      @save="handleSaveImageElement"
      @close="handleCloseImageModal"
    />

    <ListElementModal
      :visible="showListModal"
      :element="editingElement"
      @save="handleSaveListElement"
      @close="handleCloseListModal"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import ElementList from '../components/curricula/ElementList.vue'
import AddElementMenu from '../components/curricula/AddElementMenu.vue'
import CurriculumForm from '../components/curricula/CurriculumForm.vue'
import TechniqueSearchModal from '../components/curricula/modals/TechniqueSearchModal.vue'
import AssetSearchModal from '../components/curricula/modals/AssetSearchModal.vue'
import TextElementModal from '../components/curricula/modals/TextElementModal.vue'
import ImageElementModal from '../components/curricula/modals/ImageElementModal.vue'
import ListElementModal from '../components/curricula/modals/ListElementModal.vue'
import { useCurriculumStore } from '../stores/curricula'
import { useAuthStore } from '../stores/auth'
import type { Curriculum, CurriculumElement, Technique, Asset } from '../types'
import type { CurriculumFormData } from '../validation/schemas'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const authStore = useAuthStore()
const curriculumStore = useCurriculumStore()

const {
  getCurriculum,
  updateCurriculum,
  fetchElements,
  createElement,
  updateElement,
  deleteElement,
  reorderElements
} = curriculumStore

const id = route.params.id as string

const curriculum = ref<Curriculum | null>(null)
const elements = ref<CurriculumElement[]>([])
const loading = ref(true)
const elementsLoading = ref(false)

const showCurriculumForm = ref(false)
const showTechniqueModal = ref(false)
const showAssetModal = ref(false)
const showTextModal = ref(false)
const showImageModal = ref(false)
const showListModal = ref(false)
const editingElement = ref<CurriculumElement | null>(null)

onMounted(async () => {
  await loadCurriculum()
})

const loadCurriculum = async () => {
  loading.value = true
  try {
    curriculum.value = await getCurriculum(id)
    await loadElements()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load curriculum',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

const loadElements = async () => {
  elementsLoading.value = true
  try {
    elements.value = await fetchElements(id)
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load elements',
      life: 3000
    })
  } finally {
    elementsLoading.value = false
  }
}

const handleEditCurriculum = () => {
  showCurriculumForm.value = true
}

const handleSaveCurriculum = async (data: CurriculumFormData) => {
  try {
    curriculum.value = await updateCurriculum(id, data)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Curriculum updated successfully',
      life: 3000
    })
    showCurriculumForm.value = false
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to update curriculum',
      life: 3000
    })
  }
}

const handleAddTechnique = async (technique: Technique) => {
  try {
    await createElement(id, {
      type: 'technique',
      techniqueId: technique.id
    })
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Technique added to curriculum',
      life: 3000
    })
    await loadElements()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to add technique',
      life: 3000
    })
  }
}

const handleAddAsset = async (asset: Asset) => {
  try {
    await createElement(id, {
      type: 'asset',
      assetId: asset.id
    })
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Asset added to curriculum',
      life: 3000
    })
    await loadElements()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to add asset',
      life: 3000
    })
  }
}

const handleSaveTextElement = async (data: { title: string; details: string; duration: string }) => {
  try {
    if (editingElement.value) {
      await updateElement(id, editingElement.value.id, data)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Text note updated successfully',
        life: 3000
      })
    } else {
      await createElement(id, {
        type: 'text',
        title: data.title,
        details: data.details,
        duration: data.duration
      })
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Text note added to curriculum',
        life: 3000
      })
    }
    handleCloseTextModal()
    await loadElements()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save text note',
      life: 3000
    })
  }
}

const handleSaveImageElement = async (data: { imageUrl: string; title: string; details: string; duration: string }) => {
  try {
    if (editingElement.value) {
      await updateElement(id, editingElement.value.id, data)
      toast.add({ severity: 'success', summary: 'Success', detail: 'Image element updated', life: 3000 })
    } else {
      await createElement(id, { type: 'image', imageUrl: data.imageUrl, title: data.title, details: data.details, duration: data.duration })
      toast.add({ severity: 'success', summary: 'Success', detail: 'Image added to curriculum', life: 3000 })
    }
    handleCloseImageModal()
    await loadElements()
  } catch (error: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: error.message || 'Failed to save image element', life: 3000 })
  }
}

const handleCloseImageModal = () => {
  showImageModal.value = false
  editingElement.value = null
}

const handleSaveListElement = async (data: { title: string; details: string; items: string[]; duration: string }) => {
  try {
    if (editingElement.value) {
      await updateElement(id, editingElement.value.id, data)
      toast.add({ severity: 'success', summary: 'Success', detail: 'List element updated', life: 3000 })
    } else {
      await createElement(id, { type: 'list', title: data.title, details: data.details, items: data.items, duration: data.duration })
      toast.add({ severity: 'success', summary: 'Success', detail: 'List added to curriculum', life: 3000 })
    }
    handleCloseListModal()
    await loadElements()
  } catch (error: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: error.message || 'Failed to save list element', life: 3000 })
  }
}

const handleCloseListModal = () => {
  showListModal.value = false
  editingElement.value = null
}

const handleCloseTextModal = () => {
  showTextModal.value = false
  editingElement.value = null
}

const handleEditElement = (element: CurriculumElement) => {
  if (element.type === 'text') {
    editingElement.value = element
    showTextModal.value = true
  } else if (element.type === 'image') {
    editingElement.value = element
    showImageModal.value = true
  } else if (element.type === 'list') {
    editingElement.value = element
    showListModal.value = true
  } else {
    toast.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Only text notes can be edited. Technique and asset elements are snapshots.',
      life: 3000
    })
  }
}

const handleDeleteElement = (elementId: string) => {
  confirm.require({
    message: 'Are you sure you want to remove this element from the curriculum?',
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await deleteElement(id, elementId)
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Element removed from curriculum',
          life: 3000
        })
        await loadElements()
      } catch (error: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to delete element',
          life: 3000
        })
      }
    }
  })
}

const handleReorder = async (orderedIds: string[]) => {
  try {
    await reorderElements(id, orderedIds)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Elements reordered successfully',
      life: 3000
    })
    await loadElements()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to reorder elements',
      life: 3000
    })
  }
}
</script>

<style scoped>
.curriculum-header {
  margin-bottom: 1.5rem;
}

.curriculum-header-top {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

@media (max-width: 768px) {
  .curriculum-header-top {
    flex-wrap: wrap;
  }
}
</style>
