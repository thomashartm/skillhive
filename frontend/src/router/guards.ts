import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useDisciplineStore } from '../stores/discipline'

export async function authGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  const authStore = useAuthStore()

  // Wait for auth to initialize
  if (authStore.loading) {
    await authStore.waitForInit()
  }

  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  if (to.name === 'login' && authStore.isAuthenticated) {
    next({ name: 'dashboard' })
    return
  }

  // Role-based route guard
  const requiredRole = to.meta.requiresRole as string | undefined
  if (requiredRole && authStore.isAuthenticated) {
    const disciplineStore = useDisciplineStore()
    // Ensure disciplines are loaded before checking roles
    if (disciplineStore.disciplines.length === 0) {
      await disciplineStore.fetchDisciplines()
    }
    const disciplineId = disciplineStore.activeDisciplineId
    if (disciplineId) {
      const role = authStore.getRoleForDiscipline(disciplineId)
      const hierarchy = ['viewer', 'editor', 'admin']
      const userLevel = hierarchy.indexOf(role)
      const requiredLevel = hierarchy.indexOf(requiredRole)

      if (userLevel < requiredLevel) {
        next({ name: 'dashboard' })
        return
      }
    }
  }

  next()
}
