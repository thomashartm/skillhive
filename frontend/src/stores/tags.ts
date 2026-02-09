import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Tag } from '../types'
import { useApi } from '../composables/useApi'
import { useDisciplineStore } from './discipline'

export const useTagStore = defineStore('tags', () => {
  const tags = ref<Tag[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTags() {
    const api = useApi()
    const discipline = useDisciplineStore()
    if (!discipline.activeDisciplineId) return

    loading.value = true
    error.value = null
    try {
      tags.value = await api.get<Tag[]>(
        `/api/v1/tags?disciplineId=${discipline.activeDisciplineId}`
      )
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load tags'
      console.error('fetchTags error:', e)
    } finally {
      loading.value = false
    }
  }

  async function createTag(data: { name: string; description?: string; color?: string | null }) {
    const api = useApi()
    const discipline = useDisciplineStore()
    const tag = await api.post<Tag>(
      `/api/v1/tags?disciplineId=${discipline.activeDisciplineId}`,
      data
    )
    tags.value.push(tag)
    return tag
  }

  async function updateTag(id: string, data: { name?: string; description?: string; color?: string | null }) {
    const api = useApi()
    const updated = await api.patch<Tag>(`/api/v1/tags/${id}`, data)
    const idx = tags.value.findIndex((t) => t.id === id)
    if (idx !== -1) tags.value[idx] = updated
    return updated
  }

  async function deleteTag(id: string) {
    const api = useApi()
    await api.del(`/api/v1/tags/${id}`)
    tags.value = tags.value.filter((t) => t.id !== id)
  }

  return { tags, loading, error, fetchTags, createTag, updateTag, deleteTag }
})
