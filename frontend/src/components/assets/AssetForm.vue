<template>
  <form @submit.prevent="handleSubmit" class="asset-form space-y-6">
    <!-- URL Resolver Section -->
    <div class="form-field">
      <label for="url" class="form-label">
        URL <span class="text-red-500">*</span>
      </label>
      <UrlResolver
        v-model="formData.url"
        @resolved="handleUrlResolved"
      />
      <small v-if="errors.url" class="text-red-500">{{ errors.url }}</small>
    </div>

    <!-- Title -->
    <div class="form-field">
      <label for="title" class="form-label">
        Title <span class="text-red-500">*</span>
      </label>
      <InputText
        id="title"
        v-model="formData.title"
        placeholder="Enter title..."
        class="w-full"
        :invalid="!!errors.title"
      />
      <small v-if="errors.title" class="text-red-500">{{ errors.title }}</small>
    </div>

    <!-- Description -->
    <div class="form-field">
      <label for="description" class="form-label">Description</label>
      <Textarea
        id="description"
        v-model="formData.description"
        placeholder="Enter description..."
        rows="4"
        class="w-full"
        :invalid="!!errors.description"
      />
      <small v-if="errors.description" class="text-red-500">{{ errors.description }}</small>
    </div>

    <!-- Type -->
    <div class="form-field">
      <label for="type" class="form-label">
        Type <span class="text-red-500">*</span>
      </label>
      <Select
        id="type"
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

    <!-- Video Type (only shown when type is 'video') -->
    <div v-if="formData.type === 'video'" class="form-field">
      <label for="videoType" class="form-label">Video Type</label>
      <Select
        id="videoType"
        v-model="formData.videoType"
        :options="videoTypeOptions"
        option-label="label"
        option-value="value"
        placeholder="Select video type..."
        class="w-full"
        :invalid="!!errors.videoType"
      />
      <small v-if="errors.videoType" class="text-red-500">{{ errors.videoType }}</small>
    </div>

    <!-- Originator -->
    <div class="form-field">
      <label for="originator" class="form-label">Originator</label>
      <InputText
        id="originator"
        v-model="formData.originator"
        placeholder="Content creator name..."
        class="w-full"
        :invalid="!!errors.originator"
      />
      <small v-if="errors.originator" class="text-red-500">{{ errors.originator }}</small>
    </div>

    <!-- Thumbnail URL -->
    <div class="form-field">
      <label for="thumbnailUrl" class="form-label">Thumbnail URL</label>
      <InputText
        id="thumbnailUrl"
        v-model="formData.thumbnailUrl"
        placeholder="Thumbnail URL (auto-filled from oEmbed)..."
        class="w-full"
        :invalid="!!errors.thumbnailUrl"
      />
      <div v-if="formData.thumbnailUrl" class="mt-2">
        <img
          :src="formData.thumbnailUrl"
          alt="Thumbnail preview"
          class="w-48 h-32 object-cover rounded border border-surface-300 dark:border-surface-600"
        />
      </div>
      <small v-if="errors.thumbnailUrl" class="text-red-500">{{ errors.thumbnailUrl }}</small>
    </div>

    <!-- Technique IDs -->
    <div class="form-field">
      <label for="techniqueIds" class="form-label">Techniques</label>
      <MultiSelect
        id="techniqueIds"
        v-model="formData.techniqueIds"
        :options="techniqueOptions"
        option-label="label"
        option-value="value"
        placeholder="Select techniques..."
        class="w-full"
        display="chip"
        :invalid="!!errors.techniqueIds"
      />
      <small v-if="errors.techniqueIds" class="text-red-500">{{ errors.techniqueIds }}</small>
    </div>

    <!-- Tag IDs -->
    <div class="form-field">
      <label for="tagIds" class="form-label">Tags</label>
      <MultiSelect
        id="tagIds"
        v-model="formData.tagIds"
        :options="tagOptions"
        option-label="label"
        option-value="value"
        placeholder="Select tags..."
        class="w-full"
        display="chip"
        :invalid="!!errors.tagIds"
      />
      <small v-if="errors.tagIds" class="text-red-500">{{ errors.tagIds }}</small>
    </div>

    <!-- Actions -->
    <div class="flex gap-3 justify-end pt-4 border-t border-surface-200 dark:border-surface-700">
      <Button
        label="Cancel"
        severity="secondary"
        outlined
        @click="emit('cancel')"
      />
      <Button
        type="submit"
        :label="asset ? 'Update Asset' : 'Create Asset'"
        icon="pi pi-check"
      />
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, watch, onMounted } from 'vue'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import Button from 'primevue/button'
import { z } from 'zod'
import UrlResolver from './UrlResolver.vue'
import type { Asset, OEmbedResponse } from '../../types'

interface Props {
  asset?: Asset | null
  initialUrl?: string
  techniqueOptions?: Array<{ label: string; value: string }>
  tagOptions?: Array<{ label: string; value: string }>
}

const props = withDefaults(defineProps<Props>(), {
  asset: null,
  initialUrl: '',
  techniqueOptions: () => [],
  tagOptions: () => [],
})

const emit = defineEmits<{
  save: [data: AssetFormData]
  cancel: []
}>()

// Zod schema for validation
const assetSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  title: z.string().min(1, 'Title is required').max(300, 'Title must be less than 300 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional().default(''),
  type: z.enum(['video', 'web', 'image']).default('video'),
  videoType: z.enum(['short', 'full', 'instructional', 'seminar']).nullable().optional(),
  originator: z.string().max(200, 'Originator must be less than 200 characters').optional().default(''),
  thumbnailUrl: z.string().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  techniqueIds: z.array(z.string()).optional().default([]),
  tagIds: z.array(z.string()).optional().default([]),
})

export type AssetFormData = z.infer<typeof assetSchema>

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

const formData = reactive<AssetFormData>({
  url: '',
  title: '',
  description: '',
  type: 'video',
  videoType: null,
  originator: '',
  thumbnailUrl: '',
  techniqueIds: [],
  tagIds: [],
})

const errors = reactive<Record<string, string>>({})

// Initialize form with asset data or initial URL
const populateForm = (asset: Asset) => {
  Object.assign(formData, {
    url: asset.url,
    title: asset.title,
    description: asset.description || '',
    type: asset.type,
    videoType: asset.videoType,
    originator: asset.originator || '',
    thumbnailUrl: asset.thumbnailUrl || '',
    techniqueIds: asset.techniqueIds || [],
    tagIds: asset.tagIds || [],
  })
}

watch(() => props.asset, (newAsset) => {
  if (newAsset) {
    populateForm(newAsset)
  }
}, { immediate: true })

onMounted(() => {
  if (!props.asset && props.initialUrl) {
    formData.url = props.initialUrl
  }
})

// Clear videoType when type changes from video to something else
watch(() => formData.type, (newType) => {
  if (newType !== 'video') {
    formData.videoType = null
  }
})

function handleUrlResolved(data: OEmbedResponse) {
  // Auto-fill fields from oEmbed response
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

function handleSubmit() {
  // Clear previous errors
  Object.keys(errors).forEach(key => delete errors[key])

  // Validate form data
  const result = assetSchema.safeParse(formData)

  if (!result.success) {
    // Map Zod errors to form errors
    result.error.issues.forEach((issue) => {
      if (issue.path.length > 0) {
        errors[String(issue.path[0])] = issue.message
      }
    })
    return
  }

  // Emit validated data
  emit('save', result.data)
}
</script>

<style scoped>
.asset-form {
  max-width: 800px;
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
</style>
