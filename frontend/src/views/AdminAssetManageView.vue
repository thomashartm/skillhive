<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import InputSwitch from 'primevue/inputswitch'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Card from 'primevue/card'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useApi } from '../composables/useApi'
import { useTechniqueStore } from '../stores/techniques'
import { useCategoryStore } from '../stores/categories'
import { useTagStore } from '../stores/tags'
import { useDisciplineStore } from '../stores/discipline'
import UrlResolver from '../components/assets/UrlResolver.vue'
import type { Asset, OEmbedResponse, AssetType, VideoType } from '../types'

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()
const confirm = useConfirm()

const techniqueStore = useTechniqueStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()
const disciplineStore = useDisciplineStore()
const { activeDisciplineId } = storeToRefs(disciplineStore)

// Mode: create or edit
const assetId = computed(() => route.params.id as string)
const isCreateMode = computed(() => assetId.value === 'new')

// State
const loading = ref(false)
const saving = ref(false)
const asset = ref<Asset | null>(null)
const statusUpdating = ref(false)
const enriching = ref(false)
const deletingAsset = ref(false)

// Form data
const formData = reactive({
  url: '',
  title: '',
  description: '',
  type: 'video' as AssetType,
  videoType: null as VideoType | null,
  originator: '',
  thumbnailUrl: '',
  techniqueIds: [] as string[],
  categoryIds: [] as string[],
  tagIds: [] as string[],
})

// Admin-only fields
const adminFields = reactive({
  status: '' as '' | 'pending' | 'enriching' | 'completed' | 'failed',
  active: true,
})

// Validation errors
const errors = reactive<Record<string, string>>({})

// Poll timer for status updates
let pollTimer: ReturnType<typeof setInterval> | null = null

// Options for selects
const typeOptions = [
  { label: 'Video', value: 'video' },
  { label: 'Web', value: 'web' },
  { label: 'Image', value: 'image' },
]

const videoTypeOptions = [
  { label: 'Short', value: 'short' },
  { label: 'Full', value: 'full' },
  { label: 'Instructional', value: 'instructional' },
  { label: 'Seminar', value: 'seminar' },
]

const statusOptions = [
  { label: 'None (Legacy)', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Enriching', value: 'enriching' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
]

// Computed options for multi-selects
const techniqueOptions = computed(() =>
  techniqueStore.techniques.map((t) => ({
    label: t.name,
    value: t.id,
  }))
)

const categoryOptions = computed(() =>
  categoryStore.categories.map((c) => ({
    label: c.name,
    value: c.id,
  }))
)

const tagOptions = computed(() =>
  tagStore.tags.map((t) => ({
    label: t.name,
    value: t.id,
  }))
)

// Status severity helper
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

// Should we poll for status changes?
const shouldPoll = computed(
  () =>
    !isCreateMode.value &&
    (adminFields.status === 'pending' || adminFields.status === 'enriching')
)

// Load asset data
async function loadAsset() {
  if (isCreateMode.value) return

  loading.value = true
  try {
    const data = await api.get<Asset>(`/api/v1/assets/${assetId.value}`)
    asset.value = data

    // Populate form
    formData.url = data.url
    formData.title = data.title
    formData.description = data.description
    formData.type = data.type
    formData.videoType = data.videoType
    formData.originator = data.originator || ''
    formData.thumbnailUrl = data.thumbnailUrl || ''
    formData.techniqueIds = data.techniqueIds || []
    formData.categoryIds = data.categoryIds || []
    formData.tagIds = data.tagIds || []

    // Admin fields
    adminFields.status = data.processingStatus
    adminFields.active = data.active
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to load asset'
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: msg,
      life: 5000,
    })
  } finally {
    loading.value = false
  }
}

// Load reference data (techniques, categories, tags)
async function loadReferenceData() {
  try {
    await Promise.all([
      techniqueStore.fetchTechniques(),
      categoryStore.fetchCategories(),
      tagStore.fetchTags(),
    ])
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to load reference data'
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: msg,
      life: 5000,
    })
  }
}

// Auto-fill from URL resolver
function handleUrlResolved(data: OEmbedResponse) {
  if (data.title && !formData.title) {
    formData.title = data.title
  }
  if (data.author_name && !formData.originator) {
    formData.originator = data.author_name
  }
  if (data.thumbnail_url && !formData.thumbnailUrl) {
    formData.thumbnailUrl = data.thumbnail_url
  }
}

// Validate form
function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key])

  if (!formData.url) {
    errors.url = 'URL is required'
  } else {
    try {
      new URL(formData.url)
    } catch {
      errors.url = 'Must be a valid URL'
    }
  }

  if (!formData.title || formData.title.trim().length === 0) {
    errors.title = 'Title is required'
  } else if (formData.title.length > 300) {
    errors.title = 'Title must be less than 300 characters'
  }

  if (formData.description.length > 2000) {
    errors.description = 'Description must be less than 2000 characters'
  }

  if (!formData.type) {
    errors.type = 'Type is required'
  }

  return Object.keys(errors).length === 0
}

// Save asset
async function saveAsset() {
  if (!validate()) {
    toast.add({
      severity: 'warn',
      summary: 'Validation Error',
      detail: 'Please fix the errors in the form',
      life: 4000,
    })
    return
  }

  saving.value = true

  try {
    const payload = {
      url: formData.url,
      title: formData.title,
      description: formData.description,
      type: formData.type,
      videoType: formData.videoType,
      originator: formData.originator || null,
      thumbnailUrl: formData.thumbnailUrl || null,
      techniqueIds: formData.techniqueIds,
      categoryIds: formData.categoryIds,
      tagIds: formData.tagIds,
    }

    if (isCreateMode.value) {
      // Create
      const created = await api.post<Asset>(
        `/api/v1/assets?disciplineId=${activeDisciplineId.value}`,
        payload
      )
      toast.add({
        severity: 'success',
        summary: 'Created',
        detail: 'Asset created successfully',
        life: 3000,
      })
      // Redirect to edit mode for this asset
      router.push({ name: 'admin-asset-manage', params: { id: created.id } })
    } else {
      // Update
      const updated = await api.patch<Asset>(`/api/v1/assets/${assetId.value}`, payload)
      asset.value = updated
      toast.add({
        severity: 'success',
        summary: 'Updated',
        detail: 'Asset updated successfully',
        life: 3000,
      })
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to save asset'
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: msg,
      life: 5000,
    })
  } finally {
    saving.value = false
  }
}

// Update status (admin only)
async function updateStatus() {
  if (isCreateMode.value) return

  statusUpdating.value = true
  try {
    await api.patch(`/api/v1/admin/assets/${assetId.value}/status`, {
      processingStatus: adminFields.status,
      processingError: null,
    })
    if (asset.value) {
      asset.value.processingStatus = adminFields.status
    }
    toast.add({
      severity: 'success',
      summary: 'Updated',
      detail: 'Status updated successfully',
      life: 3000,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update status'
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: msg,
      life: 5000,
    })
  } finally {
    statusUpdating.value = false
  }
}

// Toggle active state
async function toggleActive() {
  if (isCreateMode.value) return

  try {
    await api.patch(`/api/v1/admin/assets/${assetId.value}/active`, {
      active: adminFields.active,
    })
    if (asset.value) {
      asset.value.active = adminFields.active
    }
    toast.add({
      severity: 'success',
      summary: 'Updated',
      detail: `Asset ${adminFields.active ? 'activated' : 'deactivated'}`,
      life: 3000,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update active state'
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: msg,
      life: 5000,
    })
  }
}

// Trigger enrichment
async function triggerEnrichment() {
  if (isCreateMode.value) return

  enriching.value = true
  try {
    await api.post(`/api/v1/admin/assets/${assetId.value}/enrich`, {})
    adminFields.status = 'pending'
    if (asset.value) {
      asset.value.processingStatus = 'pending'
      asset.value.processingError = null
    }
    toast.add({
      severity: 'info',
      summary: 'Enrichment Triggered',
      detail: 'Asset enrichment has been queued',
      life: 3000,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to trigger enrichment'
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: msg,
      life: 5000,
    })
  } finally {
    enriching.value = false
  }
}

// Delete asset
function confirmDelete() {
  if (isCreateMode.value) return

  confirm.require({
    message: `Are you sure you want to delete "${asset.value?.title}"?`,
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    acceptClass: 'p-button-danger',
    accept: async () => {
      deletingAsset.value = true
      try {
        await api.del(`/api/v1/assets/${assetId.value}`)
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Asset deleted successfully',
          life: 3000,
        })
        router.push({ name: 'admin-assets' })
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Failed to delete asset'
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: msg,
          life: 5000,
        })
      } finally {
        deletingAsset.value = false
      }
    },
  })
}

// Cancel and go back
function cancel() {
  router.push({ name: 'admin-assets' })
}

// Polling for status updates
function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    if (shouldPoll.value) {
      loadAsset()
    }
  }, 5000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// Clear videoType when type changes from video to something else
watch(
  () => formData.type,
  (newType) => {
    if (newType !== 'video') {
      formData.videoType = null
    }
  }
)

// Auto-start polling if we load an asset in processing state
watch(shouldPoll, (val) => {
  if (val) {
    startPolling()
  } else {
    stopPolling()
  }
})

// Lifecycle
onMounted(async () => {
  await loadReferenceData()
  await loadAsset()

  if (shouldPoll.value) {
    startPolling()
  }
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="admin-asset-manage-view">
    <!-- Header -->
    <div class="view-header">
      <div>
        <h1 class="view-title">
          {{ isCreateMode ? 'Create Asset' : 'Manage Asset' }}
        </h1>
        <p v-if="!isCreateMode && asset" class="text-gray-400 text-sm mt-1">
          ID: {{ asset.id }}
        </p>
      </div>
      <Button
        label="Back to Assets"
        icon="pi pi-arrow-left"
        severity="secondary"
        outlined
        @click="cancel"
      />
    </div>

    <!-- Loading spinner -->
    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <!-- Main content grid -->
    <div v-else class="grid lg:grid-cols-3 gap-6">
      <!-- Left column: Form -->
      <div class="lg:col-span-2 space-y-6">
        <Card>
          <template #title>Asset Details</template>
          <template #content>
            <div class="space-y-4">
              <!-- URL Resolver -->
              <div class="form-field">
                <label class="form-label">
                  URL <span class="text-red-500">*</span>
                </label>
                <UrlResolver v-model="formData.url" @resolved="handleUrlResolved" />
                <small v-if="errors.url" class="text-red-500">{{ errors.url }}</small>
              </div>

              <!-- Title -->
              <div class="form-field">
                <label class="form-label">
                  Title <span class="text-red-500">*</span>
                </label>
                <InputText
                  v-model="formData.title"
                  placeholder="Enter title..."
                  class="w-full"
                  :invalid="!!errors.title"
                />
                <small v-if="errors.title" class="text-red-500">{{ errors.title }}</small>
              </div>

              <!-- Description -->
              <div class="form-field">
                <label class="form-label">Description</label>
                <Textarea
                  v-model="formData.description"
                  placeholder="Enter description..."
                  rows="4"
                  class="w-full"
                  :invalid="!!errors.description"
                />
                <small v-if="errors.description" class="text-red-500">{{
                  errors.description
                }}</small>
              </div>

              <!-- Type -->
              <div class="form-field">
                <label class="form-label">
                  Type <span class="text-red-500">*</span>
                </label>
                <Select
                  v-model="formData.type"
                  :options="typeOptions"
                  option-label="label"
                  option-value="value"
                  placeholder="Select type..."
                  class="w-full"
                  :invalid="!!errors.type"
                />
                <small v-if="errors.type" class="text-red-500">{{ errors.type }}</small>
              </div>

              <!-- Video Type (conditional) -->
              <div v-if="formData.type === 'video'" class="form-field">
                <label class="form-label">Video Type</label>
                <Select
                  v-model="formData.videoType"
                  :options="videoTypeOptions"
                  option-label="label"
                  option-value="value"
                  placeholder="Select video type..."
                  class="w-full"
                />
              </div>

              <!-- Originator -->
              <div class="form-field">
                <label class="form-label">Originator</label>
                <InputText
                  v-model="formData.originator"
                  placeholder="Content creator name..."
                  class="w-full"
                />
              </div>

              <!-- Thumbnail URL -->
              <div class="form-field">
                <label class="form-label">Thumbnail URL</label>
                <InputText
                  v-model="formData.thumbnailUrl"
                  placeholder="Thumbnail URL (auto-filled from oEmbed)..."
                  class="w-full"
                />
                <div v-if="formData.thumbnailUrl" class="mt-2">
                  <img
                    :src="formData.thumbnailUrl"
                    alt="Thumbnail preview"
                    class="w-48 h-32 object-cover rounded border border-surface-700"
                  />
                </div>
              </div>

              <!-- Techniques -->
              <div class="form-field">
                <label class="form-label">Techniques</label>
                <MultiSelect
                  v-model="formData.techniqueIds"
                  :options="techniqueOptions"
                  option-label="label"
                  option-value="value"
                  placeholder="Select techniques..."
                  class="w-full"
                  display="chip"
                />
              </div>

              <!-- Categories -->
              <div class="form-field">
                <label class="form-label">Categories</label>
                <MultiSelect
                  v-model="formData.categoryIds"
                  :options="categoryOptions"
                  option-label="label"
                  option-value="value"
                  placeholder="Select categories..."
                  class="w-full"
                  display="chip"
                />
              </div>

              <!-- Tags -->
              <div class="form-field">
                <label class="form-label">Tags</label>
                <MultiSelect
                  v-model="formData.tagIds"
                  :options="tagOptions"
                  option-label="label"
                  option-value="value"
                  placeholder="Select tags..."
                  class="w-full"
                  display="chip"
                />
              </div>

              <!-- Actions -->
              <div class="flex gap-3 justify-end pt-4 border-t border-surface-700">
                <Button label="Cancel" severity="secondary" outlined @click="cancel" />
                <Button
                  :label="isCreateMode ? 'Create Asset' : 'Save Changes'"
                  icon="pi pi-check"
                  :loading="saving"
                  @click="saveAsset"
                />
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Right column: Admin controls -->
      <div class="space-y-4">
        <!-- Processing Status -->
        <Card>
          <template #title>Processing Status</template>
          <template #content>
            <div v-if="isCreateMode">
              <Message severity="info" :closable="false">
                Save the asset first to access admin controls.
              </Message>
            </div>
            <div v-else class="space-y-3">
              <div>
                <label class="form-label">Current Status</label>
                <div class="mt-1">
                  <Tag
                    :value="getStatusLabel(adminFields.status)"
                    :severity="getStatusSeverity(adminFields.status)"
                  />
                </div>
              </div>

              <div class="form-field">
                <label class="form-label">Update Status</label>
                <Select
                  v-model="adminFields.status"
                  :options="statusOptions"
                  option-label="label"
                  option-value="value"
                  placeholder="Select status..."
                  class="w-full"
                />
              </div>

              <Button
                label="Update Status"
                icon="pi pi-sync"
                class="w-full"
                :loading="statusUpdating"
                @click="updateStatus"
              />

              <div v-if="asset?.processingError" class="mt-3">
                <label class="form-label text-red-400">Processing Error</label>
                <p class="text-sm text-red-400 mt-1 p-2 bg-red-900/20 rounded border border-red-900/40">
                  {{ asset.processingError }}
                </p>
              </div>

              <div v-if="asset?.duration" class="mt-3">
                <label class="form-label">Duration</label>
                <p class="text-sm mt-1">{{ asset.duration }}</p>
              </div>
            </div>
          </template>
        </Card>

        <!-- Visibility -->
        <Card>
          <template #title>Visibility</template>
          <template #content>
            <div v-if="isCreateMode">
              <Message severity="info" :closable="false">
                Save the asset first to access admin controls.
              </Message>
            </div>
            <div v-else class="flex items-center justify-between">
              <div>
                <label class="form-label">Active</label>
                <p class="text-sm text-gray-400 mt-1">
                  {{ adminFields.active ? 'Asset is visible' : 'Asset is hidden' }}
                </p>
              </div>
              <InputSwitch v-model="adminFields.active" @change="toggleActive" />
            </div>
          </template>
        </Card>

        <!-- Enrichment -->
        <Card>
          <template #title>Enrichment</template>
          <template #content>
            <div v-if="isCreateMode">
              <Message severity="info" :closable="false">
                Save the asset first to access admin controls.
              </Message>
            </div>
            <div v-else>
              <p class="text-sm text-gray-400 mb-3">
                Trigger AI-based enrichment for this asset.
              </p>
              <Button
                label="Trigger Enrichment"
                icon="pi pi-bolt"
                severity="info"
                class="w-full"
                :loading="enriching"
                @click="triggerEnrichment"
              />
            </div>
          </template>
        </Card>

        <!-- Danger Zone -->
        <Card v-if="!isCreateMode" class="danger-card">
          <template #title>Danger Zone</template>
          <template #content>
            <p class="text-sm text-gray-400 mb-3">
              Permanently delete this asset. This action cannot be undone.
            </p>
            <Button
              label="Delete Asset"
              icon="pi pi-trash"
              severity="danger"
              class="w-full"
              :loading="deletingAsset"
              @click="confirmDelete"
            />
          </template>
        </Card>

        <!-- Metadata -->
        <Card v-if="!isCreateMode && asset">
          <template #title>Metadata</template>
          <template #content>
            <div class="space-y-2 text-sm">
              <div>
                <span class="font-semibold">ID:</span>
                <span class="ml-2 text-gray-400">{{ asset.id }}</span>
              </div>
              <div>
                <span class="font-semibold">Owner:</span>
                <span class="ml-2 text-gray-400">{{ asset.ownerUid }}</span>
              </div>
              <div>
                <span class="font-semibold">Created:</span>
                <span class="ml-2 text-gray-400">{{
                  new Date(asset.createdAt).toLocaleString()
                }}</span>
              </div>
              <div>
                <span class="font-semibold">Updated:</span>
                <span class="ml-2 text-gray-400">{{
                  new Date(asset.updatedAt).toLocaleString()
                }}</span>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-asset-manage-view {
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

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-color);
}

.danger-card {
  border: 1px solid rgba(239, 68, 68, 0.4);
  background: rgba(127, 29, 29, 0.2);
}

@media (max-width: 1024px) {
  .admin-asset-manage-view {
    padding: 1rem;
  }

  .view-header {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
