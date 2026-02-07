import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Curriculum, CurriculumElement } from '../types'
import { useApi } from '../composables/useApi'
import { useDisciplineStore } from './discipline'

export const useCurriculumStore = defineStore('curricula', () => {
  const curricula = ref<Curriculum[]>([])
  const loading = ref(false)

  async function fetchCurricula() {
    const api = useApi()
    loading.value = true
    try {
      curricula.value = await api.get<Curriculum[]>('/api/v1/curricula')
    } finally {
      loading.value = false
    }
  }

  async function getCurriculum(id: string) {
    const api = useApi()
    return api.get<Curriculum>(`/api/v1/curricula/${id}`)
  }

  async function createCurriculum(data: {
    title: string
    description?: string
    isPublic?: boolean
  }) {
    const api = useApi()
    const discipline = useDisciplineStore()
    const curriculum = await api.post<Curriculum>(
      `/api/v1/curricula?disciplineId=${discipline.activeDisciplineId}`,
      data
    )
    curricula.value.unshift(curriculum)
    return curriculum
  }

  async function updateCurriculum(id: string, data: {
    title?: string
    description?: string
    isPublic?: boolean
  }) {
    const api = useApi()
    const updated = await api.patch<Curriculum>(`/api/v1/curricula/${id}`, data)
    const idx = curricula.value.findIndex((c) => c.id === id)
    if (idx !== -1) curricula.value[idx] = updated
    return updated
  }

  async function deleteCurriculum(id: string) {
    const api = useApi()
    await api.del(`/api/v1/curricula/${id}`)
    curricula.value = curricula.value.filter((c) => c.id !== id)
  }

  // Elements
  async function fetchElements(curriculumId: string) {
    const api = useApi()
    return api.get<CurriculumElement[]>(`/api/v1/curricula/${curriculumId}/elements`)
  }

  async function createElement(curriculumId: string, data: {
    type: string
    techniqueId?: string | null
    assetId?: string | null
    title?: string | null
    details?: string | null
  }) {
    const api = useApi()
    return api.post<CurriculumElement>(`/api/v1/curricula/${curriculumId}/elements`, data)
  }

  async function updateElement(curriculumId: string, elementId: string, data: {
    title?: string | null
    details?: string | null
  }) {
    const api = useApi()
    return api.put<CurriculumElement>(`/api/v1/curricula/${curriculumId}/elements/${elementId}`, data)
  }

  async function deleteElement(curriculumId: string, elementId: string) {
    const api = useApi()
    await api.del(`/api/v1/curricula/${curriculumId}/elements/${elementId}`)
  }

  async function reorderElements(curriculumId: string, orderedIds: string[]) {
    const api = useApi()
    return api.put<{ status: string }>(`/api/v1/curricula/${curriculumId}/elements/reorder`, { orderedIds })
  }

  return {
    curricula,
    loading,
    fetchCurricula,
    getCurriculum,
    createCurriculum,
    updateCurriculum,
    deleteCurriculum,
    fetchElements,
    createElement,
    updateElement,
    deleteElement,
    reorderElements,
  }
})
