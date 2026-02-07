import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from '../plugins/firebase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(true)
  let initResolve: (() => void) | null = null
  const initPromise = new Promise<void>((resolve) => {
    initResolve = resolve
  })

  const isAuthenticated = computed(() => !!user.value)
  const userEmail = computed(() => user.value?.email ?? '')
  const userName = computed(() => user.value?.displayName ?? user.value?.email ?? '')
  const userUid = computed(() => user.value?.uid ?? '')

  onAuthStateChanged(auth, (firebaseUser) => {
    user.value = firebaseUser
    loading.value = false
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
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider()
    const credential = await signInWithPopup(auth, provider)
    user.value = credential.user
  }

  async function logout() {
    await signOut(auth)
    user.value = null
  }

  async function getIdToken(): Promise<string> {
    if (!user.value) throw new Error('Not authenticated')
    return user.value.getIdToken()
  }

  return {
    user,
    loading,
    isAuthenticated,
    userEmail,
    userName,
    userUid,
    waitForInit,
    loginWithEmail,
    loginWithGoogle,
    logout,
    getIdToken,
  }
})
