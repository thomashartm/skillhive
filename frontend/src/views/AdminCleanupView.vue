<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import SelectButton from 'primevue/selectbutton'
import { useDisciplineStore } from '../stores/discipline'
import { useCleanupStore } from '../stores/cleanup'
import NewCleanupJobDialog from '../components/admin/NewCleanupJobDialog.vue'
import type { CleanupEntityType, CleanupJobStatus } from '../types/cleanup'

const router = useRouter()
const disciplineStore = useDisciplineStore()
const cleanupStore = useCleanupStore()

const { activeDisciplineId } = storeToRefs(disciplineStore)
const { jobs, loading } = storeToRefs(cleanupStore)

const entityType = ref<CleanupEntityType>('category')
const entityOptions = [
  { label: 'Categories', value: 'category' },
  { label: 'Techniques', value: 'technique' },
]

const newJobOpen = ref(false)

async function refresh() {
  if (!activeDisciplineId.value) return
  await cleanupStore.listJobs(activeDisciplineId.value, entityType.value)
}

onMounted(refresh)
watch([activeDisciplineId, entityType], refresh)

function onJobCreated(id: string) {
  router.push({ name: 'admin-cleanup-job', params: { id } })
}

function statusSeverity(s: CleanupJobStatus) {
  switch (s) {
    case 'proposed': return 'info'
    case 'applying': return 'info'
    case 'applied': return 'success'
    case 'discarded': return 'warn'
    case 'failed': return 'danger'
    default: return 'secondary'
  }
}
</script>

<template>
  <div class="view-padded">
    <div class="view-header">
      <div>
        <h1 class="text-2xl font-bold">Cleanup</h1>
        <p class="text-sm text-gray-400">AI-driven deduplication and restructuring.</p>
      </div>
      <div class="flex gap-2">
        <Button label="Manage templates" icon="pi pi-file-edit" severity="secondary"
                @click="router.push({ name: 'admin-cleanup-templates' })" />
        <Button label="New analysis" icon="pi pi-play" :disabled="!activeDisciplineId" @click="newJobOpen = true" />
      </div>
    </div>

    <div class="mb-4">
      <SelectButton v-model="entityType" :options="entityOptions" option-label="label" option-value="value" />
    </div>

    <DataTable :value="jobs" :loading="loading" data-key="id" striped-rows>
      <template #empty>
        <div class="text-center py-4 text-gray-400">No jobs yet. Run a new analysis to get started.</div>
      </template>
      <Column field="createdAt" header="Created" sortable>
        <template #body="{ data }">{{ new Date(data.createdAt).toLocaleString() }}</template>
      </Column>
      <Column field="templateName" header="Template" />
      <Column field="recordCount" header="Records" :style="{ width: '100px' }" />
      <Column field="status" header="Status" :style="{ width: '140px' }">
        <template #body="{ data }">
          <Tag :value="data.status" :severity="statusSeverity(data.status)" />
        </template>
      </Column>
      <Column header="" :style="{ width: '120px' }">
        <template #body="{ data }">
          <Button label="Open" icon="pi pi-arrow-right" icon-pos="right" text
                  @click="router.push({ name: 'admin-cleanup-job', params: { id: data.id } })" />
        </template>
      </Column>
    </DataTable>

    <NewCleanupJobDialog
      v-if="activeDisciplineId"
      v-model:visible="newJobOpen"
      :discipline-id="activeDisciplineId"
      :entity-type="entityType"
      @created="onJobCreated"
    />
  </div>
</template>

<style scoped>
.view-padded { padding: 1.5rem; }
.view-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
</style>
