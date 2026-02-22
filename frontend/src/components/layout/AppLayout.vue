<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import DisciplinePicker from './DisciplinePicker.vue'
import LegalFooter from './LegalFooter.vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const mobileMenuOpen = ref(false)

const baseNavItems = [
  { label: 'Dashboard', icon: 'pi pi-home', to: '/', exact: true },
  { label: 'Curricula', icon: 'pi pi-book', to: '/curricula', exact: true },
  { label: 'Techniques', icon: 'pi pi-bolt', to: '/techniques' },
  { label: 'Assets', icon: 'pi pi-video', to: '/assets' },
  { label: 'Categories', icon: 'pi pi-folder', to: '/categories' },
  { label: 'Public', icon: 'pi pi-globe', to: '/curricula/public' },
]

const navItems = computed(() => {
  const items = [...baseNavItems]
  if (authStore.isAdmin) {
    items.push({ label: 'Admin', icon: 'pi pi-users', to: '/admin', exact: true })
  }
  return items
})

function isActive(item: { to: string; exact?: boolean }) {
  if (item.exact) return route.path === item.to
  return route.path.startsWith(item.to)
}

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'login' })
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}

// Auto-close mobile menu on navigation
watch(() => route.path, () => {
  closeMobileMenu()
})
</script>

<template>
  <Toast />
  <ConfirmDialog />
  <div class="app-layout">
    <header class="app-header">
      <div class="header-left">
        <h1 class="app-title">SkillHive</h1>
        <Button
          :icon="mobileMenuOpen ? 'pi pi-times' : 'pi pi-bars'"
          class="burger-button"
          severity="secondary"
          text
          @click="mobileMenuOpen = !mobileMenuOpen"
          aria-label="Toggle menu"
        />
      </div>
      <nav class="header-nav">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="{ active: isActive(item) }"
        >
          <i :class="item.icon" class="nav-icon"></i>
          <span class="nav-label">{{ item.label }}</span>
        </router-link>
      </nav>
      <div class="header-right">
        <DisciplinePicker />
        <span class="header-divider"></span>
        <router-link to="/profile" class="user-name">
          {{ authStore.userName }}
          <span class="role-badge" :class="'role-' + authStore.activeRole">{{ authStore.activeRole }}</span>
        </router-link>
        <Button
          icon="pi pi-sign-out"
          severity="secondary"
          text
          @click="handleLogout"
          aria-label="Logout"
        />
      </div>
    </header>

    <!-- Mobile Menu Panel -->
    <div v-if="mobileMenuOpen" class="mobile-menu">
      <nav class="mobile-nav">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="mobile-nav-link"
          :class="{ active: isActive(item) }"
          @click="closeMobileMenu"
        >
          <i :class="item.icon" class="mobile-nav-icon"></i>
          <span class="mobile-nav-label">{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="mobile-menu-section">
        <DisciplinePicker />
      </div>

      <div class="mobile-menu-section mobile-user-section">
        <router-link to="/profile" class="mobile-user-name" @click="closeMobileMenu">
          {{ authStore.userName }}
          <span class="role-badge" :class="'role-' + authStore.activeRole">{{ authStore.activeRole }}</span>
        </router-link>
        <Button
          icon="pi pi-sign-out"
          label="Logout"
          severity="secondary"
          outlined
          @click="handleLogout"
          aria-label="Logout"
          class="mobile-logout-button"
        />
      </div>
    </div>

    <main class="app-content">
      <RouterView />
    </main>
    <LegalFooter />
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
  gap: 1rem;
  padding: 0 1.5rem;
  height: 3rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: #111;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  height: 100%;
}

.app-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  line-height: 3rem;
  color: var(--primary-color);
  letter-spacing: -0.02em;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 0;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;
}

.header-nav::-webkit-scrollbar {
  display: none;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.15s ease;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.nav-link:hover {
  color: rgba(255, 255, 255, 0.8);
}

.nav-link.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.nav-icon {
  font-size: 0.875rem;
}

.nav-label {
  display: inline;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.header-divider {
  width: 1px;
  height: 1.25rem;
  background: rgba(255, 255, 255, 0.12);
}

.user-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  cursor: pointer;
  transition: color 0.15s ease;
}

.user-name:hover {
  color: rgba(255, 255, 255, 0.8);
}

.role-badge {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.1rem 0.375rem;
  border-radius: 3px;
  line-height: 1.2;
}

.role-admin {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.role-editor {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.role-viewer {
  background: rgba(156, 163, 175, 0.15);
  color: #9ca3af;
  border: 1px solid rgba(156, 163, 175, 0.3);
}

.app-content {
  flex: 1;
  overflow-y: auto;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem 1.5rem 0;
}

/* Mobile Menu Burger Button - hidden on desktop */
.burger-button {
  display: none;
  margin-left: 0.75rem;
}

/* Mobile Menu Panel */
.mobile-menu {
  display: none;
  position: absolute;
  top: 3rem;
  left: 0;
  right: 0;
  background: #1a1a1a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 1000;
  overflow-y: auto;
  max-height: calc(100vh - 3rem);
}

.mobile-nav {
  display: flex;
  flex-direction: column;
}

.mobile-nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  transition: all 0.15s ease;
  border-left: 3px solid transparent;
  min-height: 44px;
}

.mobile-nav-link:hover {
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.8);
}

.mobile-nav-link.active {
  color: var(--primary-color);
  background: rgba(var(--primary-color-rgb, 96, 165, 250), 0.08);
  border-left-color: var(--primary-color);
}

.mobile-nav-icon {
  font-size: 1rem;
  width: 1.25rem;
  text-align: center;
}

.mobile-nav-label {
  flex: 1;
}

.mobile-menu-section {
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.mobile-user-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mobile-user-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  padding: 0.5rem 0;
}

.mobile-logout-button {
  width: 100%;
}

@media (max-width: 768px) {
  .nav-label {
    display: none;
  }

  .header-right .user-name {
    display: none;
  }

  .header-right {
    display: none;
  }

  .header-nav {
    display: none;
  }

  .burger-button {
    display: inline-flex;
  }

  .mobile-menu {
    display: block;
  }
}
</style>
