<script setup lang="ts">
import { ref, onMounted, watch, computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import InputSwitch from 'primevue/inputswitch'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useAuthStore } from '../stores/auth'
import { useDisciplineStore } from '../stores/discipline'
import { useApi } from '../composables/useApi'
import type { Asset } from '../types'

const authStore = useAuthStore()
const disciplineStore = useDisciplineStore()
const { activeDisciplineId, activeDiscipline } = storeToRefs(disciplineStore)
const { isAdmin } = storeToRefs(authStore)

const api = useApi()
const toast = useToast()
const confirm = useConfirm()

// State
const assets = ref<Asset[]>([])
const loading = ref(false)
const statusFilter = ref('')
let pollTimer: ReturnType<typeof setInterval> | null = null

// Status filter options
const statusOptions = ref([
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Enriching', value: 'enriching' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
])

// Computed
const disciplineName = computed(() => activeDiscipline.value?.name || '')
const hasProcessingAssets = computed(() =>
  assets.value.some(
    (a) => a.processingStatus === 'pending' || a.processingStatus === 'enriching'
  )
)

// Fetch assets
async function fetchAssets() {
  if (!activeDisciplineId.value) return

  loading.value = true
  try {
    let url = `/api/v1/admin/assets?disciplineId=${activeDisciplineId.value}`
    if (statusFilter.value) {
      url += `&status=${statusFilter.value}`
    }
    const data = await api.get<Asset[]>(url)
    assets.value = data
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to fetch assets',
      life: 5000,
    })
  } finally {
    loading.value = false
  }
}

// Toggle active status
async function toggleActive(asset: Asset) {
  try {
    await api.patch(`/api/v1/admin/assets/${asset.id}/active`, {
      active: !asset.active,
    })
    asset.active = !asset.active
    toast.add({
      severity: 'success',
      summary: 'Updated',
      detail: `Asset ${asset.active ? 'activated' : 'deactivated'}`,
      life: 3000,
    })
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to update asset',
      life: 5000,
    })
  }
}

// Retry enrichment
async function retryEnrichment(asset: Asset) {
  try {
    await api.post(`/api/v1/admin/assets/${asset.id}/enrich`, {})
    asset.processingStatus = 'pending'
    asset.processingError = null
    toast.add({
      severity: 'info',
      summary: 'Retrying',
      detail: 'Enrichment re-triggered',
      life: 3000,
    })
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to retry enrichment',
      life: 5000,
    })
  }
}

// Delete asset
function confirmDelete(asset: Asset) {
  confirm.require({
    message: `Are you sure you want to delete "${asset.title}"?`,
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await api.delete(`/api/v1/assets/${asset.id}`)
        assets.value = assets.value.filter((a) => a.id !== asset.id)
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Asset deleted successfully',
          life: 3000,
        })
      } catch (error: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to delete asset',
          life: 5000,
        })
      }
    },
  })
}

// Status tag severity mapping
function getStatusSeverity(status: string): 'warn' | 'info' | 'success' | 'danger' | 'secondary' {
  switch (status) {
    case 'pending':
      return 'warn'
    case 'enriching':
      return 'info'
    case 'completed':
      return 'success'
    case 'failed':
      return 'danger'
    default:
      return 'secondary'
  }
}

function getStatusLabel(status: string): string {
  if (!status) return 'Legacy'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

// Polling for processing assets
function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    if (hasProcessingAssets.value) {
      fetchAssets()
    }
  }, 5000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// Lifecycle
onMounted(() => {
  if (activeDisciplineId.value && isAdmin.value) {
    fetchAssets()
    startPolling()
  }
})

onUnmounted(() => {
  stopPolling()
})

watch(activeDisciplineId, (newId) => {
  if (newId && isAdmin.value) {
    fetchAssets()
    startPolling()
  }
})

watch(statusFilter, () => {
  fetchAssets()
})
</script>

<template>
  <div class="admin-assets-view">
    <!-- Header -->
    <div class="view-header">
      <div>
        <h1 class="view-title">Admin</h1>
        <p v-if="disciplineName" class="text-gray-400 text-sm mt-1">
          Managing assets for {{ disciplineName }}
        </p>
      </div>
      <Button
        label="Refresh"
        icon="pi pi-refresh"
        severity="secondary"
        outlined
        :loading="loading"
        @click="fetchAssets"
      />
    </div>

    <!-- Admin navigation -->
    <div class="admin-nav flex gap-2 mb-4">
      <Button
        label="User Management"
        icon="pi pi-users"
        class="admin-nav-btn"
        @click="$router.push({ name: 'admin' })"
      />
      <Button
        label="Asset Processing"
        icon="pi pi-video"
        class="admin-nav-btn admin-nav-btn--active"
      />
      <Button
        label="Tags"
        icon="pi pi-tags"
        class="admin-nav-btn"
        @click="$router.push({ name: 'admin-tags' })"
      />
    </div>

    <!-- No discipline selected -->
    <div
      v-if="!activeDisciplineId"
      class="bg-yellow-900/20 border border-yellow-700/40 p-4 mb-6"
    >
      <div class="flex items-center gap-2">
        <i class="pi pi-info-circle text-yellow-400"></i>
        <span class="text-yellow-300">Please select a discipline to manage assets.</span>
      </div>
    </div>

    <!-- Not admin -->
    <Message v-else-if="!isAdmin" severity="warn" :closable="false" class="mb-4">
      You do not have admin permissions for this discipline.
    </Message>

    <template v-else>
      <!-- Filters -->
      <div class="mb-4">
        <Select
          v-model="statusFilter"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Filter by status"
          class="w-48"
        />
      </div>

      <!-- Assets table -->
      <DataTable
        :value="assets"
        :loading="loading"
        stripedRows
        dataKey="id"
        class="admin-table"
        :paginator="assets.length > 20"
        :rows="20"
      >
        <template #empty>
          <div class="text-center py-6 text-gray-400">
            <i class="pi pi-video text-3xl mb-2 block"></i>
            <p>No assets found.</p>
          </div>
        </template>

        <Column field="title" header="Title" sortable :style="{ minWidth: '200px' }">
          <template #body="{ data }">
            <router-link :to="{ name: 'asset-detail', params: { id: data.id } }" class="asset-link">
              {{ data.title }}
            </router-link>
            <div class="text-xs text-gray-400 truncate" :style="{ maxWidth: '300px' }">
              {{ data.url }}
            </div>
          </template>
        </Column>

        <Column header="Status" :style="{ width: '130px' }">
          <template #body="{ data }">
            <Tag
              :value="getStatusLabel(data.processingStatus)"
              :severity="getStatusSeverity(data.processingStatus)"
            />
          </template>
        </Column>

        <Column header="Active" :style="{ width: '100px' }">
          <template #body="{ data }">
            <InputSwitch
              :modelValue="data.active"
              @update:modelValue="() => toggleActive(data)"
            />
          </template>
        </Column>

        <Column field="type" header="Type" :style="{ width: '100px' }">
          <template #body="{ data }">
            <span class="text-gray-300">{{ data.videoType || data.type }}</span>
          </template>
        </Column>

        <Column field="originator" header="Originator" :style="{ width: '150px' }">
          <template #body="{ data }">
            <span class="text-gray-300">{{ data.originator || '—' }}</span>
          </template>
        </Column>

        <Column header="Error" :style="{ width: '200px' }">
          <template #body="{ data }">
            <span
              v-if="data.processingError"
              class="text-red-400 text-xs"
              :title="data.processingError"
            >
              {{ data.processingError.length > 60 ? data.processingError.slice(0, 60) + '...' : data.processingError }}
            </span>
            <span v-else class="text-gray-500">—</span>
          </template>
        </Column>

        <Column header="Actions" :style="{ width: '180px' }">
          <template #body="{ data }">
            <div class="flex gap-1">
              <Button
                icon="pi pi-pencil"
                severity="secondary"
                text
                size="small"
                v-tooltip.top="'Edit'"
                @click="$router.push({ name: 'asset-edit', params: { id: data.id } })"
              />
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                size="small"
                v-tooltip.top="'Delete'"
                @click="confirmDelete(data)"
              />
              <Button
                v-if="data.processingStatus === 'failed'"
                label="Retry"
                icon="pi pi-replay"
                severity="warn"
                text
                size="small"
                @click="retryEnrichment(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </template>
  </div>
</template>

<style scoped>
.admin-assets-view {
  padding: 1.5rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.view-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #f9fafb;
  margin: 0;
}

/* Admin nav buttons */
.admin-nav-btn {
  background: rgba(45, 212, 191, 0.1) !important;
  border: 1px solid rgba(45, 212, 191, 0.3) !important;
  color: #5eead4 !important;
  transition: all 0.2s ease;
}

.admin-nav-btn:hover {
  background: rgba(45, 212, 191, 0.2) !important;
  border-color: rgba(45, 212, 191, 0.5) !important;
}

.admin-nav-btn--active {
  background: rgba(45, 212, 191, 0.25) !important;
  border-color: #2dd4bf !important;
  color: #99f6e4 !important;
  font-weight: 600;
}

.asset-link {
  font-weight: 500;
  color: #e2e8f0;
  text-decoration: none;
  transition: color 0.15s ease;
}

.asset-link:hover {
  color: var(--primary-color);
}

:deep(.admin-table) {
  background: var(--surface-ground);
  color: var(--text-color);
}

:deep(.admin-table .p-datatable-thead > tr > th) {
  background: var(--surface-800);
  color: var(--text-color);
  border-color: var(--surface-border);
}

:deep(.admin-table .p-datatable-tbody > tr) {
  background: var(--surface-ground);
  color: var(--text-color);
}

:deep(.admin-table .p-datatable-tbody > tr:hover) {
  background: var(--surface-hover);
}

:deep(.admin-table .p-datatable-tbody > tr.p-row-odd) {
  background: var(--surface-50);
}

:deep(.admin-table .p-datatable-tbody > tr.p-row-odd:hover) {
  background: var(--surface-hover);
}
</style>
