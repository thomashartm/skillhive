<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold">Curricula</h1>
      <Button label="New Curriculum" icon="pi pi-plus" @click="showForm = true" />
    </div>

    <CurriculumList
      :curricula="curricula"
      :loading="loading"
      @view="handleView"
      @edit="handleEdit"
      @delete="handleDelete"
    />

    <CurriculumForm
      :visible="showForm"
      :curriculum="editingCurriculum"
      @save="handleSave"
      @close="handleCloseForm"
    />

    <Toast />
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import CurriculumList from '../components/curricula/CurriculumList.vue'
import CurriculumForm from '../components/curricula/CurriculumForm.vue'
import { useCurriculumStore } from '../stores/curricula'
import type { Curriculum } from '../types'
import type { CurriculumFormData } from '../validation/schemas'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const curriculumStore = useCurriculumStore()

const { curricula, loading, fetchCurricula, createCurriculum, updateCurriculum, deleteCurriculum } = curriculumStore

const showForm = ref(false)
const editingCurriculum = ref<Curriculum | null>(null)

onMounted(async () => {
  await fetchCurricula()
})

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
        await fetchCurricula()
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
    await fetchCurricula()
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
