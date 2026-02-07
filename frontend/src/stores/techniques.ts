import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Technique } from '../types'
import { useApi } from '../composables/useApi'
import { useDisciplineStore } from './discipline'

export const useTechniqueStore = defineStore('techniques', () => {
  const techniques = ref<Technique[]>([])
  const loading = ref(false)

  async function fetchTechniques(params?: {
    categoryId?: string
    tagId?: string
    q?: string
    limit?: number
    offset?: number
  }) {
    const api = useApi()
    const discipline = useDisciplineStore()
    if (!discipline.activeDisciplineId) return

    loading.value = true
    try {
      const query = new URLSearchParams({ disciplineId: discipline.activeDisciplineId })
      if (params?.categoryId) query.set('categoryId', params.categoryId)
      if (params?.tagId) query.set('tagId', params.tagId)
      if (params?.q) query.set('q', params.q)
      if (params?.limit) query.set('limit', String(params.limit))
      if (params?.offset) query.set('offset', String(params.offset))

      techniques.value = await api.get<Technique[]>(`/api/v1/techniques?${query}`)
    } finally {
      loading.value = false
    }
  }

  async function getTechnique(id: string) {
    const api = useApi()
    return api.get<Technique>(`/api/v1/techniques/${id}`)
  }

  async function createTechnique(data: {
    name: string
    description?: string
    categoryIds?: string[]
    tagIds?: string[]
  }) {
    const api = useApi()
    const discipline = useDisciplineStore()
    const technique = await api.post<Technique>(
      `/api/v1/techniques?disciplineId=${discipline.activeDisciplineId}`,
      data
    )
    techniques.value.push(technique)
    return technique
  }

  async function updateTechnique(id: string, data: {
    name?: string
    description?: string
    categoryIds?: string[]
    tagIds?: string[]
  }) {
    const api = useApi()
    const updated = await api.patch<Technique>(`/api/v1/techniques/${id}`, data)
    const idx = techniques.value.findIndex((t) => t.id === id)
    if (idx !== -1) techniques.value[idx] = updated
    return updated
  }

  async function deleteTechnique(id: string) {
    const api = useApi()
    await api.del(`/api/v1/techniques/${id}`)
    techniques.value = techniques.value.filter((t) => t.id !== id)
  }

  return { techniques, loading, fetchTechniques, getTechnique, createTechnique, updateTechnique, deleteTechnique }
})
