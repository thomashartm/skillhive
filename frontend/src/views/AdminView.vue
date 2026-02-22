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
import type { UserInfo, UserRole } from '../types'

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

// Role options for dropdown
const roleOptions = ref<{ label: string; value: UserRole }[]>([
  { label: 'Viewer', value: 'viewer' },
  { label: 'Editor', value: 'editor' },
  { label: 'Admin', value: 'admin' },
])

// Computed: discipline name for subtitle
const disciplineName = computed(() => activeDiscipline.value?.name || '')

// Fetch users for current discipline
async function fetchUsers() {
  if (!activeDisciplineId.value) return

  loading.value = true
  try {
    const data = await api.get<UserInfo[]>(
      `/api/v1/admin/users?disciplineId=${activeDisciplineId.value}`
    )
    users.value = data
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
async function handleRoleChange(user: UserInfo, newRole: UserRole) {
  if (!activeDisciplineId.value) return

  const oldRole = user.roles[activeDisciplineId.value]
  if (oldRole === newRole) return

  try {
    await api.put(`/api/v1/admin/users/${user.uid}/role`, {
      disciplineId: activeDisciplineId.value,
      role: newRole,
    })

    // Update local state
    user.roles[activeDisciplineId.value] = newRole

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Role updated to ${newRole}`,
      life: 3000,
    })

    // Refresh claims in case admin changed their own role
    await authStore.refreshClaims()

    // Refresh users list to ensure consistency
    await fetchUsers()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to update role',
      life: 5000,
    })
    // Reload to revert local changes
    await fetchUsers()
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

// Get user role for current discipline
function getUserRole(user: UserInfo): UserRole {
  if (!activeDisciplineId.value) return 'viewer'
  return user.roles[activeDisciplineId.value] || 'viewer'
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
      <!-- Search bar -->
      <div class="mb-6">
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
              v-if="hasRoleInDiscipline(data)"
              :modelValue="getUserRole(data)"
              @update:modelValue="(val) => handleRoleChange(data, val)"
              :options="roleOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
            <span v-else class="text-gray-500 italic">No access</span>
          </template>
        </Column>

        <Column header="Actions" :style="{ width: '120px' }">
          <template #body="{ data }">
            <Button
              v-if="hasRoleInDiscipline(data)"
              label="Revoke"
              icon="pi pi-times"
              severity="danger"
              text
              size="small"
              @click="handleRevoke(data)"
            />
          </template>
        </Column>
      </DataTable>
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

/* Admin search form */
.admin-search-form {
  display: flex;
  gap: 0.75rem;
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

@media (max-width: 768px) {
  .admin-nav {
    flex-direction: column;
  }

  .admin-search-form {
    flex-direction: column;
  }
}
</style>
