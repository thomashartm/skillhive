<script setup lang="ts">
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import AppSidebar from './AppSidebar.vue'
import DisciplinePicker from './DisciplinePicker.vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <Toast />
  <ConfirmDialog />
  <div class="app-layout">
    <header class="app-header">
      <div class="header-left">
        <h1 class="app-title">SkillHive</h1>
      </div>
      <div class="header-center">
        <DisciplinePicker />
      </div>
      <div class="header-right">
        <span class="user-name">{{ authStore.userName }}</span>
        <Button
          icon="pi pi-sign-out"
          severity="secondary"
          text
          rounded
          @click="handleLogout"
          aria-label="Logout"
        />
      </div>
    </header>
    <div class="app-body">
      <AppSidebar />
      <main class="app-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid var(--surface-200);
  background: var(--surface-0);
}

.header-left {
  display: flex;
  align-items: center;
}

.app-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: var(--primary-color);
}

.header-center {
  width: 250px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-name {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.app-body {
  display: flex;
  flex: 1;
}

.app-content {
  flex: 1;
  padding: 1.5rem;
  background: var(--surface-50);
  overflow-y: auto;
}
</style>
