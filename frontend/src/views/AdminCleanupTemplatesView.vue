<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useDisciplineStore } from '../stores/discipline'
import { useCleanupStore } from '../stores/cleanup'
import type { CleanupEntityType, CleanupTemplate } from '../types/cleanup'

const router = useRouter()
const disciplineStore = useDisciplineStore()
const cleanupStore = useCleanupStore()
const confirm = useConfirm()
const toast = useToast()

const { activeDisciplineId } = storeToRefs(disciplineStore)
const { templates, loading } = storeToRefs(cleanupStore)

const entityType = ref<CleanupEntityType>('category')
const entityOptions = [
  { label: 'Categories', value: 'category' },
  { label: 'Techniques', value: 'technique' },
]

const editOpen = ref(false)
const editing = ref<Partial<CleanupTemplate>>({})
const isNew = computed(() => !editing.value.id)

async function refresh() {
  if (!activeDisciplineId.value) return
  await cleanupStore.listTemplates(activeDisciplineId.value, entityType.value)
}

onMounted(refresh)
watch([activeDisciplineId, entityType], refresh)

function openNew() {
  editing.value = {
    disciplineId: activeDisciplineId.value || '',
    entityType: entityType.value,
    name: '',
    description: '',
    promptBody: '',
  }
  editOpen.value = true
}

function openEdit(t: CleanupTemplate) {
  editing.value = { ...t }
  editOpen.value = true
}

async function save() {
  const e = editing.value
  if (!e.name || !e.promptBody) {
    toast.add({ severity: 'warn', summary: 'Missing fields', detail: 'Name and prompt body are required', life: 3000 })
    return
  }
  try {
    if (isNew.value) {
      await cleanupStore.createTemplate({
        disciplineId: e.disciplineId!,
        entityType: e.entityType as CleanupEntityType,
        name: e.name!,
        description: e.description || '',
        promptBody: e.promptBody!,
      })
    } else {
      await cleanupStore.updateTemplate(e.id!, {
        name: e.name!,
        description: e.description || '',
        promptBody: e.promptBody!,
      })
    }
    toast.add({ severity: 'success', summary: 'Saved', life: 2000 })
    editOpen.value = false
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Save failed', detail: err.message, life: 5000 })
  }
}

function askDelete(t: CleanupTemplate) {
  confirm.require({
    header: 'Delete template?',
    message: `Delete "${t.name}"? This cannot be undone.`,
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await cleanupStore.deleteTemplate(t.id)
        toast.add({ severity: 'success', summary: 'Deleted', life: 2000 })
      } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Delete failed', detail: err.message, life: 5000 })
      }
    },
  })
}
</script>

<template>
  <div class="view-padded">
    <div class="flex items-start justify-between mb-4">
      <div>
        <h1 class="text-2xl font-bold">Cleanup prompt templates</h1>
        <p class="text-sm text-gray-400">Reusable prompt variants for AI-driven cleanup runs.</p>
      </div>
      <Button label="Back to Cleanup" icon="pi pi-arrow-left" severity="secondary" @click="router.push({ name: 'admin-cleanup' })" />
    </div>

    <div class="flex gap-3 items-end mb-4">
      <div>
        <label class="block text-sm text-gray-400 mb-1">Entity type</label>
        <Select v-model="entityType" :options="entityOptions" option-label="label" option-value="value" class="min-w-[180px]" />
      </div>
      <Button label="New template" icon="pi pi-plus" @click="openNew" />
    </div>

    <DataTable :value="templates" :loading="loading" data-key="id" striped-rows>
      <template #empty>
        <div class="text-center py-4 text-gray-400">No templates for this entity type yet.</div>
      </template>
      <Column field="name" header="Name" sortable />
      <Column field="description" header="Description" />
      <Column header="" :style="{ width: '180px' }">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button icon="pi pi-pencil" severity="secondary" text @click="openEdit(data)" />
            <Button icon="pi pi-trash" severity="danger" text @click="askDelete(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="editOpen" :header="isNew ? 'New template' : 'Edit template'" modal :style="{ width: '640px' }">
      <div class="flex flex-col gap-3">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Name</label>
          <InputText v-model="editing.name" class="w-full" />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Description</label>
          <InputText v-model="editing.description" class="w-full" />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Prompt body</label>
          <Textarea v-model="editing.promptBody" :rows="12" class="w-full font-mono text-sm" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" @click="editOpen = false" />
        <Button label="Save" icon="pi pi-check" @click="save" />
      </template>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>

<style scoped>
.view-padded { padding: 1.5rem; }
</style>
