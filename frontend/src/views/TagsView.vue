<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import TagList from '../components/tags/TagList.vue'
import TagForm from '../components/tags/TagForm.vue'
import { useTagStore } from '../stores/tags'
import { useDisciplineStore } from '../stores/discipline'
import type { Tag } from '../types'
import type { TagFormData } from '../validation/schemas'

/**
 * TagsView - Main view for managing tags
 *
 * Features:
 * - List all tags for active discipline
 * - Create new tags
 * - Edit existing tags
 * - Delete tags with confirmation
 * - Auto-refresh when discipline changes
 */

const tagStore = useTagStore()
const disciplineStore = useDisciplineStore()
const { tags, loading } = storeToRefs(tagStore)
const { activeDisciplineId } = storeToRefs(disciplineStore)

const toast = useToast()
const confirm = useConfirm()

// Dialog state
const showDialog = ref(false)
const editingTag = ref<Tag | null>(null)

// Fetch tags on mount and when discipline changes
onMounted(() => {
  if (activeDisciplineId.value) {
    tagStore.fetchTags()
  }
})

watch(activeDisciplineId, (newDisciplineId) => {
  if (newDisciplineId) {
    tagStore.fetchTags()
  }
})

// Create new tag
const handleNew = () => {
  editingTag.value = null
  showDialog.value = true
}

// Edit existing tag
const handleEdit = (tag: Tag) => {
  editingTag.value = tag
  showDialog.value = true
}

// Save tag (create or update)
const handleSave = async (data: TagFormData) => {
  try {
    if (editingTag.value) {
      // Update existing tag
      await tagStore.updateTag(editingTag.value.id, data)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Tag updated successfully',
        life: 3000,
      })
    } else {
      // Create new tag
      await tagStore.createTag(data)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Tag created successfully',
        life: 3000,
      })
    }

    showDialog.value = false
    editingTag.value = null
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save tag',
      life: 5000,
    })
  }
}

// Delete tag with confirmation
const handleDelete = (tag: Tag) => {
  confirm.require({
    message: `Are you sure you want to delete "${tag.name}"? This action cannot be undone.`,
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await tagStore.deleteTag(tag.id)
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Tag deleted successfully',
          life: 3000,
        })
      } catch (error: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to delete tag',
          life: 5000,
        })
      }
    },
  })
}

// Close dialog
const handleCloseDialog = () => {
  showDialog.value = false
  editingTag.value = null
}
</script>

<template>
  <div class="tags-view">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-3xl font-bold text-gray-900">Tags</h2>
      <Button
        label="New Tag"
        icon="pi pi-plus"
        @click="handleNew"
        :disabled="!activeDisciplineId"
      />
    </div>

    <!-- No discipline selected message -->
    <div
      v-if="!activeDisciplineId"
      class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6"
    >
      <div class="flex items-center gap-2">
        <i class="pi pi-info-circle text-yellow-600"></i>
        <span class="text-yellow-800">Please select a discipline to view tags.</span>
      </div>
    </div>

    <!-- Tag list -->
    <TagList
      v-if="activeDisciplineId"
      :tags="tags"
      :loading="loading"
      @edit="handleEdit"
      @delete="handleDelete"
    />

    <!-- Tag form dialog -->
    <TagForm
      :visible="showDialog"
      :tag="editingTag"
      @save="handleSave"
      @close="handleCloseDialog"
    />
  </div>
</template>

<style scoped>
.tags-view {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
