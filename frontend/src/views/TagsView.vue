<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Message from 'primevue/message'
import TagList from '../components/tags/TagList.vue'
import TagForm from '../components/tags/TagForm.vue'
import { useTagStore } from '../stores/tags'
import { useDisciplineStore } from '../stores/discipline'
import { useAuthStore } from '../stores/auth'
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

const authStore = useAuthStore()
const tagStore = useTagStore()
const disciplineStore = useDisciplineStore()
const { tags, loading, error } = storeToRefs(tagStore)
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
    <div class="view-header">
      <h1 class="view-title">Admin</h1>
      <Button
        v-if="authStore.canEdit"
        label="New Tag"
        icon="pi pi-plus"
        size="small"
        @click="handleNew"
        :disabled="!activeDisciplineId"
      />
    </div>

    <!-- Admin navigation -->
    <div class="admin-nav">
      <Button
        label="User Management"
        icon="pi pi-users"
        class="admin-nav-btn"
        @click="$router.push({ name: 'admin' })"
      />
      <Button
        label="Asset Processing"
        icon="pi pi-video"
        class="admin-nav-btn"
        @click="$router.push({ name: 'admin-assets' })"
      />
      <Button
        label="Tags"
        icon="pi pi-tags"
        class="admin-nav-btn admin-nav-btn--active"
      />
    </div>

    <!-- No discipline selected message -->
    <div
      v-if="!activeDisciplineId"
      class="bg-yellow-900/20 border border-yellow-700/40 p-4 mb-6"
    >
      <div class="flex items-center gap-2">
        <i class="pi pi-info-circle text-yellow-400"></i>
        <span class="text-yellow-300">Please select a discipline to view tags.</span>
      </div>
    </div>

    <!-- Error state -->
    <Message v-if="error" severity="error" :closable="false" class="mb-4">
      {{ error }}
    </Message>

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
}

.admin-nav {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

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

@media (max-width: 768px) {
  .admin-nav {
    flex-direction: column;
  }
}
</style>
