<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const displayName = ref('')
const error = ref('')
const loading = ref(false)
const isRegister = ref(false)

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    if (isRegister.value) {
      await authStore.register(email.value, password.value, displayName.value || undefined)
    } else {
      await authStore.loginWithEmail(email.value, password.value)
    }
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : (isRegister.value ? 'Registration failed' : 'Login failed')
  } finally {
    loading.value = false
  }
}

async function handleGoogleLogin() {
  error.value = ''
  loading.value = true
  try {
    await authStore.loginWithGoogle()
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Google login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <h1 class="login-title">SkillHive</h1>
      <p class="login-subtitle">{{ isRegister ? 'Create your account' : 'Manage your training curriculum' }}</p>

      <Message v-if="error" severity="error" :closable="false" class="mb-3">
        {{ error }}
      </Message>

      <form @submit.prevent="handleSubmit" class="login-form">
        <div v-if="isRegister" class="field">
          <label for="displayName">Display Name</label>
          <InputText
            id="displayName"
            v-model="displayName"
            placeholder="Enter your name"
            class="w-full"
          />
        </div>

        <div class="field">
          <label for="email">Email</label>
          <InputText
            id="email"
            v-model="email"
            type="email"
            placeholder="Enter your email"
            class="w-full"
            required
          />
        </div>

        <div class="field">
          <label for="password">Password</label>
          <Password
            id="password"
            v-model="password"
            :placeholder="isRegister ? 'Choose a password' : 'Enter your password'"
            class="w-full"
            :feedback="isRegister"
            toggleMask
            required
          />
        </div>

        <Button
          type="submit"
          :label="isRegister ? 'Create Account' : 'Sign In'"
          :icon="isRegister ? 'pi pi-user-plus' : 'pi pi-sign-in'"
          class="w-full"
          :loading="loading"
        />
      </form>

      <p class="toggle-text">
        {{ isRegister ? 'Already have an account?' : "Don't have an account?" }}
        <a class="toggle-link" @click.prevent="isRegister = !isRegister; error = ''">
          {{ isRegister ? 'Sign in' : 'Register' }}
        </a>
      </p>

      <div class="divider">
        <span>or</span>
      </div>

      <Button
        label="Sign in with Google"
        icon="pi pi-google"
        severity="secondary"
        outlined
        class="w-full"
        :loading="loading"
        @click="handleGoogleLogin"
      />
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #0a0a0a;
}

.login-card {
  background: #111;
  padding: 2.5rem;
  width: 100%;
  max-width: 400px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.login-title {
  font-size: 1.75rem;
  font-weight: 700;
  text-align: center;
  margin: 0 0 0.25rem;
  color: var(--primary-color);
}

.login-subtitle {
  text-align: center;
  color: var(--text-color-secondary);
  margin: 0 0 1.5rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field label {
  font-size: 0.875rem;
  font-weight: 500;
}

.toggle-text {
  text-align: center;
  font-size: 0.8125rem;
  color: var(--text-color-secondary);
  margin: 1rem 0 0;
}

.toggle-link {
  color: var(--primary-color);
  cursor: pointer;
  font-weight: 500;
}

.toggle-link:hover {
  text-decoration: underline;
}

.divider {
  display: flex;
  align-items: center;
  margin: 1.25rem 0;
  gap: 0.75rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--surface-200);
}

.divider span {
  font-size: 0.8125rem;
  color: var(--text-color-secondary);
}
</style>
