<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useDisciplineStore } from '../stores/discipline'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import type { UserRole } from '../types'

const authStore = useAuthStore()
const disciplineStore = useDisciplineStore()
const toast = useToast()

// Profile section
const displayName = ref(authStore.userName)
const savingProfile = ref(false)

async function saveDisplayName() {
  if (!displayName.value.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Display name cannot be empty',
      life: 3000,
    })
    return
  }

  savingProfile.value = true
  try {
    await authStore.updateDisplayName(displayName.value)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Display name updated',
      life: 3000,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error instanceof Error ? error.message : 'Failed to update display name',
      life: 3000,
    })
  } finally {
    savingProfile.value = false
  }
}

// Email section
const newEmail = ref('')
const emailPassword = ref('')
const savingEmail = ref(false)

async function saveEmail() {
  if (!newEmail.value.trim() || !emailPassword.value) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Please provide both new email and current password',
      life: 3000,
    })
    return
  }

  savingEmail.value = true
  try {
    await authStore.updateUserEmail(newEmail.value, emailPassword.value)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Email updated successfully',
      life: 3000,
    })
    newEmail.value = ''
    emailPassword.value = ''
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error instanceof Error ? error.message : 'Failed to update email',
      life: 3000,
    })
  } finally {
    savingEmail.value = false
  }
}

// Password section
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const savingPassword = ref(false)

const passwordsMatch = computed(() => {
  if (!newPassword.value && !confirmPassword.value) return true
  return newPassword.value === confirmPassword.value
})

async function savePassword() {
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Please fill in all password fields',
      life: 3000,
    })
    return
  }

  if (!passwordsMatch.value) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'New passwords do not match',
      life: 3000,
    })
    return
  }

  savingPassword.value = true
  try {
    await authStore.changePassword(currentPassword.value, newPassword.value)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Password changed successfully',
      life: 3000,
    })
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error instanceof Error ? error.message : 'Failed to change password',
      life: 3000,
    })
  } finally {
    savingPassword.value = false
  }
}

// Roles section
interface DisciplineRole {
  disciplineId: string
  disciplineName: string
  role: UserRole
}

const disciplineRoles = computed<DisciplineRole[]>(() => {
  return disciplineStore.disciplines.map(discipline => ({
    disciplineId: discipline.id,
    disciplineName: discipline.name,
    role: authStore.getRoleForDiscipline(discipline.id),
  }))
})

function getRoleBadgeClass(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'role-badge role-badge-admin'
    case 'editor':
      return 'role-badge role-badge-editor'
    case 'viewer':
    default:
      return 'role-badge role-badge-viewer'
  }
}
</script>

<template>
  <div class="profile-view">
    <h1 class="page-title">Profile & Settings</h1>

    <!-- Profile Section -->
    <div class="section-card">
      <h2 class="section-header">Profile</h2>
      <div class="form-field">
        <label for="displayName" class="form-label">Display Name</label>
        <div class="field-with-button">
          <InputText
            id="displayName"
            v-model="displayName"
            class="input-field"
            placeholder="Enter your display name"
          />
          <Button
            label="Save"
            :loading="savingProfile"
            @click="saveDisplayName"
            class="save-button"
          />
        </div>
      </div>
    </div>

    <!-- Email Section -->
    <div class="section-card">
      <h2 class="section-header">Email</h2>
      <div class="form-field">
        <label class="form-label">Current Email</label>
        <div class="current-value">{{ authStore.userEmail }}</div>
      </div>
      <div class="form-field">
        <label for="newEmail" class="form-label">New Email</label>
        <InputText
          id="newEmail"
          v-model="newEmail"
          type="email"
          class="input-field"
          placeholder="Enter new email"
        />
      </div>
      <div class="form-field">
        <label for="emailPassword" class="form-label">Current Password (for verification)</label>
        <Password
          id="emailPassword"
          v-model="emailPassword"
          class="input-field"
          placeholder="Enter current password"
          :feedback="false"
          toggleMask
        />
      </div>
      <Button
        label="Update Email"
        :loading="savingEmail"
        @click="saveEmail"
        class="save-button"
      />
    </div>

    <!-- Password Section -->
    <div class="section-card">
      <h2 class="section-header">Change Password</h2>
      <div class="form-field">
        <label for="currentPassword" class="form-label">Current Password</label>
        <Password
          id="currentPassword"
          v-model="currentPassword"
          class="input-field"
          placeholder="Enter current password"
          :feedback="false"
          toggleMask
        />
      </div>
      <div class="form-field">
        <label for="newPassword" class="form-label">New Password</label>
        <Password
          id="newPassword"
          v-model="newPassword"
          class="input-field"
          placeholder="Enter new password"
          toggleMask
        />
      </div>
      <div class="form-field">
        <label for="confirmPassword" class="form-label">Confirm New Password</label>
        <Password
          id="confirmPassword"
          v-model="confirmPassword"
          class="input-field"
          placeholder="Confirm new password"
          :feedback="false"
          toggleMask
        />
      </div>
      <div v-if="!passwordsMatch && confirmPassword" class="error-message">
        Passwords do not match
      </div>
      <Button
        label="Change Password"
        :loading="savingPassword"
        :disabled="!passwordsMatch"
        @click="savePassword"
        class="save-button"
      />
    </div>

    <!-- Roles Section -->
    <div class="section-card">
      <h2 class="section-header">Your Roles</h2>
      <div v-if="disciplineRoles.length === 0" class="empty-state">
        No disciplines available
      </div>
      <div v-else class="roles-list">
        <div
          v-for="dr in disciplineRoles"
          :key="dr.disciplineId"
          class="role-row"
        >
          <span class="discipline-name">{{ dr.disciplineName }}</span>
          <span :class="getRoleBadgeClass(dr.role)">{{ dr.role }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-view {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #e2e8f0;
  margin-bottom: 1.5rem;
}

.section-card {
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.section-header {
  font-size: 1rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 1rem 0;
}

.form-field {
  margin-bottom: 1rem;
}

.form-field:last-of-type {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #e2e8f0;
  margin-bottom: 0.375rem;
}

.current-value {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: #9ca3af;
  font-size: 0.875rem;
}

.input-field {
  width: 100%;
}

.field-with-button {
  display: flex;
  gap: 0.5rem;
}

.field-with-button .input-field {
  flex: 1;
}

.save-button {
  flex-shrink: 0;
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.empty-state {
  color: #6b7280;
  font-size: 0.875rem;
  padding: 1rem;
  text-align: center;
}

.roles-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.role-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
}

.discipline-name {
  font-size: 0.875rem;
  color: #e2e8f0;
  font-weight: 500;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.role-badge-admin {
  color: #4ade80;
  background: rgba(34, 197, 94, 0.15);
}

.role-badge-editor {
  color: #60a5fa;
  background: rgba(59, 130, 246, 0.15);
}

.role-badge-viewer {
  color: #9ca3af;
  background: rgba(156, 163, 175, 0.15);
}

/* PrimeVue Password component styling */
:deep(.p-password) {
  width: 100%;
}

:deep(.p-password-input) {
  width: 100%;
}

@media (max-width: 768px) {
  .field-with-button {
    flex-direction: column;
  }

  .field-with-button .input-field {
    width: 100%;
  }
}
</style>
