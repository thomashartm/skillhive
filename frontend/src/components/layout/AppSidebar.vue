<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Menu from 'primevue/menu'

const route = useRoute()

const menuItems = computed(() => [
  {
    label: 'Dashboard',
    icon: 'pi pi-home',
    to: '/',
    class: route.path === '/' ? 'active-menu-item' : '',
  },
  {
    separator: true,
  },
  {
    label: 'Content',
    items: [
      {
        label: 'Techniques',
        icon: 'pi pi-bolt',
        to: '/techniques',
        class: route.path.startsWith('/techniques') ? 'active-menu-item' : '',
      },
      {
        label: 'Assets',
        icon: 'pi pi-video',
        to: '/assets',
        class: route.path.startsWith('/assets') ? 'active-menu-item' : '',
      },
    ],
  },
  {
    label: 'Organization',
    items: [
      {
        label: 'Categories',
        icon: 'pi pi-folder',
        to: '/categories',
        class: route.path.startsWith('/categories') ? 'active-menu-item' : '',
      },
      {
        label: 'Tags',
        icon: 'pi pi-tags',
        to: '/tags',
        class: route.path.startsWith('/tags') ? 'active-menu-item' : '',
      },
    ],
  },
  {
    separator: true,
  },
  {
    label: 'Learning',
    items: [
      {
        label: 'My Curricula',
        icon: 'pi pi-book',
        to: '/curricula',
        class: route.path === '/curricula' || (route.path.startsWith('/curricula/') && !route.path.startsWith('/curricula/public')) ? 'active-menu-item' : '',
      },
      {
        label: 'Public Curricula',
        icon: 'pi pi-globe',
        to: '/curricula/public',
        class: route.path.startsWith('/curricula/public') ? 'active-menu-item' : '',
      },
    ],
  },
])
</script>

<template>
  <nav class="app-sidebar">
    <Menu :model="menuItems" class="w-full border-none" />
  </nav>
</template>

<style scoped>
.app-sidebar {
  width: 240px;
  min-height: 100%;
  border-right: 1px solid var(--surface-200);
  background: var(--surface-0);
}

:deep(.active-menu-item) {
  background: var(--primary-50);
  border-radius: 6px;
}
</style>
