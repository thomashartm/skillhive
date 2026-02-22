import { createRouter, createWebHistory } from 'vue-router'
import { authGuard } from './guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/imprint',
      name: 'imprint',
      component: () => import('../views/ImprintView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: () => import('../views/PrivacyView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      component: () => import('../components/layout/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('../views/DashboardView.vue'),
        },
        {
          path: 'admin/tags',
          name: 'admin-tags',
          component: () => import('../views/TagsView.vue'),
          meta: { requiresRole: 'admin' },
        },
        {
          path: 'categories',
          name: 'categories',
          component: () => import('../views/CategoriesView.vue'),
        },
        {
          path: 'categories/:id',
          name: 'category-detail',
          component: () => import('../views/CategoryDetailView.vue'),
        },
        {
          path: 'techniques',
          name: 'techniques',
          component: () => import('../views/TechniquesView.vue'),
        },
        {
          path: 'techniques/:id',
          name: 'technique-detail',
          component: () => import('../views/TechniqueDetailView.vue'),
        },
        {
          path: 'assets',
          name: 'assets',
          component: () => import('../views/AssetsView.vue'),
        },
        {
          path: 'assets/new',
          name: 'asset-new',
          component: () => import('../views/SaveAssetView.vue'),
        },
        {
          path: 'assets/:id',
          name: 'asset-detail',
          component: () => import('../views/AssetDetailView.vue'),
        },
        {
          path: 'assets/:id/edit',
          name: 'asset-edit',
          component: () => import('../views/SaveAssetView.vue'),
        },
        {
          path: 'curricula',
          name: 'curricula',
          component: () => import('../views/CurriculaView.vue'),
        },
        {
          path: 'curricula/public',
          name: 'public-curricula',
          component: () => import('../views/PublicCurriculaView.vue'),
        },
        {
          path: 'curricula/:id',
          name: 'curriculum-detail',
          component: () => import('../views/CurriculumDetailView.vue'),
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('../views/ProfileView.vue'),
        },
        {
          path: 'admin',
          name: 'admin',
          component: () => import('../views/AdminView.vue'),
          meta: { requiresRole: 'admin' },
        },
        {
          path: 'admin/assets',
          name: 'admin-assets',
          component: () => import('../views/AdminAssetsView.vue'),
          meta: { requiresRole: 'admin' },
        },
        {
          path: 'admin/assets/:id',
          name: 'admin-asset-manage',
          component: () => import('../views/AdminAssetManageView.vue'),
          meta: { requiresRole: 'admin' },
        },
      ],
    },
  ],
})

router.beforeEach(authGuard)

export default router
