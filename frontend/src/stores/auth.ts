import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from '../plugins/firebase'
import type { UserRole } from '../types'
import { useDisciplineStore } from './discipline'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(true)
  const userRoles = ref<Record<string, string>>({})
  let initResolve: (() => void) | null = null
  const initPromise = new Promise<void>((resolve) => {
    initResolve = resolve
  })

  const isAuthenticated = computed(() => !!user.value)
  const userEmail = computed(() => user.value?.email ?? '')
  const userName = computed(() => user.value?.displayName ?? user.value?.email ?? '')
  const userUid = computed(() => user.value?.uid ?? '')

  function getRoleForDiscipline(disciplineId: string): UserRole {
    const role = userRoles.value[disciplineId]
    if (role === 'admin' || role === 'editor' || role === 'viewer') {
      return role
    }
    return 'viewer'
  }

  const canEdit = computed(() => {
    const disciplineStore = useDisciplineStore()
    const id = disciplineStore.activeDisciplineId
    if (!id) return false
    const role = getRoleForDiscipline(id)
    return role === 'editor' || role === 'admin'
  })

  const isAdmin = computed(() => {
    const disciplineStore = useDisciplineStore()
    const id = disciplineStore.activeDisciplineId
    if (!id) return false
    return getRoleForDiscipline(id) === 'admin'
  })

  async function parseRolesFromToken(forceRefresh = false) {
    if (!user.value) {
      userRoles.value = {}
      return
    }
    try {
      const tokenResult = await user.value.getIdTokenResult(forceRefresh)
      const claims = tokenResult.claims
      const roles: Record<string, string> = {}
      if (claims.roles && typeof claims.roles === 'object') {
        const claimRoles = claims.roles as Record<string, unknown>
        for (const [k, v] of Object.entries(claimRoles)) {
          if (typeof v === 'string') {
            roles[k] = v
          }
        }
      }
      userRoles.value = roles
    } catch {
      userRoles.value = {}
    }
  }

  async function refreshClaims() {
    if (!user.value) return
    // Force-refresh the token to pick up updated claims
    await user.value.getIdToken(true)
    await parseRolesFromToken()
  }

  const activeRole = computed(() => {
    const disciplineStore = useDisciplineStore()
    const id = disciplineStore.activeDisciplineId
    if (!id) return 'viewer' as UserRole
    return getRoleForDiscipline(id)
  })

  onAuthStateChanged(auth, async (firebaseUser) => {
    user.value = firebaseUser
    loading.value = false
    if (firebaseUser) {
      await parseRolesFromToken(true)
    } else {
      userRoles.value = {}
    }
    if (initResolve) {
      initResolve()
      initResolve = null
    }
  })

  async function waitForInit() {
    return initPromise
  }

  async function loginWithEmail(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    user.value = credential.user
    await parseRolesFromToken(true)
  }

  async function register(email: string, password: string, displayName?: string) {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName) {
      await updateProfile(credential.user, { displayName })
    }
    user.value = credential.user
    await parseRolesFromToken(true)
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider()
    const credential = await signInWithPopup(auth, provider)
    user.value = credential.user
    await parseRolesFromToken(true)
  }

  async function updateDisplayName(name: string) {
    if (!user.value) throw new Error('Not authenticated')
    await updateProfile(user.value, { displayName: name })
    // Force reactivity update
    user.value = { ...user.value } as User
  }

  async function updateUserEmail(newEmail: string, currentPassword: string) {
    if (!user.value || !user.value.email) throw new Error('Not authenticated')
    const credential = EmailAuthProvider.credential(user.value.email, currentPassword)
    await reauthenticateWithCredential(user.value, credential)
    await firebaseUpdateEmail(user.value, newEmail)
    user.value = { ...user.value } as User
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    if (!user.value || !user.value.email) throw new Error('Not authenticated')
    const credential = EmailAuthProvider.credential(user.value.email, currentPassword)
    await reauthenticateWithCredential(user.value, credential)
    await firebaseUpdatePassword(user.value, newPassword)
  }

  async function logout() {
    await signOut(auth)
    user.value = null
    userRoles.value = {}
  }

  async function getIdToken(): Promise<string> {
    if (!user.value) throw new Error('Not authenticated')
    return user.value.getIdToken()
  }

  return {
    user,
    loading,
    userRoles,
    isAuthenticated,
    userEmail,
    userName,
    userUid,
    canEdit,
    isAdmin,
    activeRole,
    getRoleForDiscipline,
    refreshClaims,
    waitForInit,
    loginWithEmail,
    register,
    loginWithGoogle,
    updateDisplayName,
    updateUserEmail,
    changePassword,
    logout,
    getIdToken,
  }
})
