import { useAuthStore } from '../stores/auth'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export function useApi() {
  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const authStore = useAuthStore()
    const token = await authStore.getIdToken()

    const url = `${API_BASE}${path}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const body = await response.text()
      let message: string
      try {
        const json = JSON.parse(body)
        message = json.error || json.message || response.statusText
      } catch {
        message = body || response.statusText
      }
      throw new Error(message)
    }

    if (response.status === 204) return undefined as T

    return response.json()
  }

  function get<T>(path: string) {
    return request<T>(path, { method: 'GET' })
  }

  function post<T>(path: string, body: unknown) {
    return request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  function patch<T>(path: string, body: unknown) {
    return request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  }

  function put<T>(path: string, body: unknown) {
    return request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  function del<T>(path: string) {
    return request<T>(path, { method: 'DELETE' })
  }

  return { get, post, patch, put, del, request }
}
