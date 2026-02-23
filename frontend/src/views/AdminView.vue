<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useAuthStore } from '../stores/auth'
import { useDisciplineStore } from '../stores/discipline'
import { useRouter } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { UserInfo, UserRole, UserRoleFilter, UsersListResponse } from '../types'

/**
 * AdminView - User management page for discipline administrators
 *
 * Features:
 * - Search users by email
 * - List users with roles for current discipline
 * - Update user roles (viewer, editor, admin)
 * - Revoke user access to discipline
 * - Auto-refresh claims after role changes
 */

const authStore = useAuthStore()
const disciplineStore = useDisciplineStore()
const { activeDisciplineId, activeDiscipline } = storeToRefs(disciplineStore)
const { isAdmin } = storeToRefs(authStore)

const router = useRouter()
const api = useApi()
const toast = useToast()
const confirm = useConfirm()

// State
const users = ref<UserInfo[]>([])
const loading = ref(false)
const searchEmail = ref('')
const searchLoading = ref(false)

// Pagination state
const pageSize = ref(20)
const currentPageToken = ref<string | null>(null)
const nextPageToken = ref<string | null>(null)
const pageHistory = ref<string[]>([]) // Stack of previous page tokens for "Previous" navigation

// Role filter state
const selectedRoleFilter = ref<UserRoleFilter>('all')

// Role filter options for dropdown
const roleFilterOptions = ref<{ label: string; value: UserRoleFilter }[]>([
  { label: 'All Users', value: 'all' },
  { label: 'Admin', value: 'admin' },
  { label: 'Editor', value: 'editor' },
  { label: 'Viewer', value: 'viewer' },
  { label: 'No Access', value: 'none' },
])

// Role options for user role dropdown (includes 'none' for no access)
const roleOptions = ref<{ label: string; value: UserRole | 'none' }[]>([
  { label: 'No Access', value: 'none' },
  { label: 'Viewer', value: 'viewer' },
  { label: 'Editor', value: 'editor' },
  { label: 'Admin', value: 'admin' },
])

// Computed: discipline name for subtitle
const disciplineName = computed(() => activeDiscipline.value?.name || '')

// Fetch users for current discipline with filtering and pagination
async function fetchUsers(pageToken: string | null = null) {
  if (!activeDisciplineId.value) return

  loading.value = true
  try {
    let url = `/api/v1/admin/users?disciplineId=${activeDisciplineId.value}&pageSize=${pageSize.value}&role=${selectedRoleFilter.value}`
    if (pageToken) {
      url += `&pageToken=${encodeURIComponent(pageToken)}`
    }

    const data = await api.get<UsersListResponse>(url)
    users.value = data.users
    nextPageToken.value = data.nextPageToken || null
    currentPageToken.value = pageToken
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to fetch users',
      life: 5000,
    })
  } finally {
    loading.value = false
  }
}

// Handle role filter change
function handleRoleFilterChange() {
  // Reset pagination when filter changes
  currentPageToken.value = null
  nextPageToken.value = null
  pageHistory.value = []
  fetchUsers()
}

// Go to next page
function goToNextPage() {
  if (!nextPageToken.value) return
  // Save current token to history for "Previous" navigation
  pageHistory.value.push(currentPageToken.value || '')
  fetchUsers(nextPageToken.value)
}

// Go to previous page
function goToPreviousPage() {
  if (pageHistory.value.length === 0) return
  const previousToken = pageHistory.value.pop() || null
  fetchUsers(previousToken === '' ? null : previousToken)
}

// Check if we can go to previous page
const canGoPrevious = computed(() => pageHistory.value.length > 0)

// Check if we can go to next page
const canGoNext = computed(() => !!nextPageToken.value)

// Search for user by email
async function handleSearch() {
  if (!searchEmail.value.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'Please enter an email address to search',
      life: 3000,
    })
    return
  }

  searchLoading.value = true
  try {
    const data = await api.get<UserInfo>(
      `/api/v1/admin/users/search?email=${encodeURIComponent(searchEmail.value.trim())}`
    )

    // Add user to list if not already present
    const existingIndex = users.value.findIndex((u) => u.uid === data.uid)
    if (existingIndex >= 0) {
      users.value[existingIndex] = data
    } else {
      users.value = [data, ...users.value]
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `User found: ${data.email}`,
      life: 3000,
    })
    searchEmail.value = ''
  } catch (error: any) {
    // Handle 404 specifically
    if (error.message.includes('404') || error.message.toLowerCase().includes('not found')) {
      toast.add({
        severity: 'warn',
        summary: 'Not Found',
        detail: 'User not found',
        life: 3000,
      })
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to search user',
        life: 5000,
      })
    }
  } finally {
    searchLoading.value = false
  }
}

// Update user role for current discipline
async function handleRoleChange(user: UserInfo, newRole: UserRole | 'none') {
  if (!activeDisciplineId.value) return

  const oldRole = user.roles[activeDisciplineId.value] || 'none'
  if (oldRole === newRole) return

  // Find user in the reactive array to ensure Vue tracks the change
  const userIndex = users.value.findIndex((u) => u.uid === user.uid)
  if (userIndex === -1) return

  try {
    if (newRole === 'none') {
      // Revoke access
      await api.del(
        `/api/v1/admin/users/${user.uid}/role?disciplineId=${activeDisciplineId.value}`
      )
      // Update local state reactively
      const updatedRoles = { ...users.value[userIndex].roles }
      delete updatedRoles[activeDisciplineId.value]
      users.value[userIndex] = { ...users.value[userIndex], roles: updatedRoles }

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Access revoked',
        life: 3000,
      })
    } else {
      // Set role
      await api.put(`/api/v1/admin/users/${user.uid}/role`, {
        disciplineId: activeDisciplineId.value,
        role: newRole,
      })

      // Update local state reactively
      users.value[userIndex] = {
        ...users.value[userIndex],
        roles: { ...users.value[userIndex].roles, [activeDisciplineId.value]: newRole },
      }

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: `Role updated to ${newRole}`,
        life: 3000,
      })
    }

    // Refresh claims in case admin changed their own role
    await authStore.refreshClaims()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to update role',
      life: 5000,
    })
  }
}

// Revoke user access to current discipline
function handleRevoke(user: UserInfo) {
  if (!activeDisciplineId.value) return

  confirm.require({
    message: `Are you sure you want to revoke access for "${user.email}"? They will lose all permissions for this discipline.`,
    header: 'Confirm Revoke Access',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Revoke',
    rejectLabel: 'Cancel',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await api.del(
          `/api/v1/admin/users/${user.uid}/role?disciplineId=${activeDisciplineId.value}`
        )

        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Access revoked successfully',
          life: 3000,
        })

        // Refresh claims in case admin revoked their own access
        await authStore.refreshClaims()

        // Refresh users list
        await fetchUsers()
      } catch (error: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to revoke access',
          life: 5000,
        })
      }
    },
  })
}

// Get user role for current discipline (returns 'none' if no access)
function getUserRole(user: UserInfo): UserRole | 'none' {
  if (!activeDisciplineId.value) return 'none'
  return user.roles[activeDisciplineId.value] || 'none'
}

// Check if user has a role in current discipline
function hasRoleInDiscipline(user: UserInfo): boolean {
  if (!activeDisciplineId.value) return false
  return !!user.roles[activeDisciplineId.value]
}

// Load users on mount and when discipline changes
onMounted(() => {
  if (activeDisciplineId.value && isAdmin.value) {
    fetchUsers()
  }
})

watch(activeDisciplineId, (newId) => {
  if (newId && isAdmin.value) {
    // Reset pagination when discipline changes
    currentPageToken.value = null
    nextPageToken.value = null
    pageHistory.value = []
    fetchUsers()
  }
})
</script>

<template>
  <div class="admin-view">
    <!-- Header -->
    <div class="view-header">
      <div>
        <h1 class="view-title">Admin</h1>
        <p v-if="disciplineName" class="text-gray-400 text-sm mt-1">
          Managing users for {{ disciplineName }}
        </p>
      </div>
    </div>

    <!-- Admin navigation -->
    <div class="admin-nav">
      <Button
        label="User Management"
        icon="pi pi-users"
        class="admin-nav-btn admin-nav-btn--active"
      />
      <Button
        label="Asset Processing"
        icon="pi pi-video"
        class="admin-nav-btn"
        @click="router.push({ name: 'admin-assets' })"
      />
      <Button
        label="Tags"
        icon="pi pi-tags"
        class="admin-nav-btn"
        @click="router.push({ name: 'admin-tags' })"
      />
    </div>

    <!-- No discipline selected message -->
    <div
      v-if="!activeDisciplineId"
      class="bg-yellow-900/20 border border-yellow-700/40 p-4 mb-6"
    >
      <div class="flex items-center gap-2">
        <i class="pi pi-info-circle text-yellow-400"></i>
        <span class="text-yellow-300">Please select a discipline to manage users.</span>
      </div>
    </div>

    <!-- Not admin message -->
    <Message
      v-else-if="!isAdmin"
      severity="warn"
      :closable="false"
      class="mb-4"
    >
      You do not have admin permissions for this discipline.
    </Message>

    <template v-else>
      <!-- Filters and Search bar -->
      <div class="mb-6">
        <div class="admin-filters">
          <!-- Role Filter -->
          <div class="filter-group">
            <label class="filter-label">Filter by Role</label>
            <Select
              v-model="selectedRoleFilter"
              :options="roleFilterOptions"
              optionLabel="label"
              optionValue="value"
              class="role-filter-select"
              @change="handleRoleFilterChange"
            />
          </div>

          <!-- Search -->
          <form @submit.prevent="handleSearch" class="admin-search-form">
            <IconField class="flex-1">
              <InputIcon class="pi pi-search" />
              <InputText
                v-model="searchEmail"
                placeholder="Search users by email..."
                class="w-full"
                :disabled="searchLoading"
              />
            </IconField>
            <Button
              type="submit"
              label="Search"
              icon="pi pi-search"
              :loading="searchLoading"
              :disabled="!searchEmail.trim()"
            />
          </form>
        </div>
      </div>

      <!-- Users table -->
      <DataTable
        :value="users"
        :loading="loading"
        stripedRows
        dataKey="uid"
        class="admin-table"
      >
        <template #empty>
          <div class="text-center py-6 text-gray-400">
            <i class="pi pi-users text-3xl mb-2 block"></i>
            <p>No users found. Use the search bar to find users.</p>
          </div>
        </template>

        <template #loading>
          <div class="text-center py-6 text-gray-400">
            <i class="pi pi-spinner pi-spin text-3xl mb-2 block"></i>
            <p>Loading users...</p>
          </div>
        </template>

        <Column field="email" header="Email" sortable>
          <template #body="{ data }">
            <div class="font-medium">{{ data.email }}</div>
          </template>
        </Column>

        <Column field="displayName" header="Display Name" sortable>
          <template #body="{ data }">
            <div class="text-gray-300">{{ data.displayName || '—' }}</div>
          </template>
        </Column>

        <Column header="Role" :style="{ width: '200px' }">
          <template #body="{ data }">
            <Select
              :modelValue="getUserRole(data)"
              @update:modelValue="(val) => handleRoleChange(data, val)"
              :options="roleOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
          </template>
        </Column>
      </DataTable>

      <!-- Pagination Controls -->
      <div class="pagination-controls">
        <Button
          label="Previous"
          icon="pi pi-chevron-left"
          :disabled="!canGoPrevious || loading"
          @click="goToPreviousPage"
          class="pagination-btn"
        />
        <span class="pagination-info">
          Page {{ pageHistory.length + 1 }}
        </span>
        <Button
          label="Next"
          icon="pi pi-chevron-right"
          iconPos="right"
          :disabled="!canGoNext || loading"
          @click="goToNextPage"
          class="pagination-btn"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.admin-view {
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

/* Admin nav */
.admin-nav {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

/* Admin filters container */
.admin-filters {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-label {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.role-filter-select {
  min-width: 150px;
}

/* Admin search form */
.admin-search-form {
  display: flex;
  gap: 0.75rem;
  flex: 1;
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

/* Ensure dark theme for table */
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

/* Pagination controls */
.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
  padding: 1rem 0;
}

.pagination-info {
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.pagination-btn {
  min-width: 100px;
}

@media (max-width: 768px) {
  .admin-nav {
    flex-direction: column;
  }

  .admin-filters {
    flex-direction: column;
    align-items: stretch;
  }

  .admin-search-form {
    flex-direction: column;
  }

  .role-filter-select {
    width: 100%;
  }
}
</style>
