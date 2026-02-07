import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Discipline } from '../types'
import { useApi } from '../composables/useApi'

export const useDisciplineStore = defineStore('discipline', () => {
  const disciplines = ref<Discipline[]>([])
  const activeDisciplineId = ref<string>(
    localStorage.getItem('activeDisciplineId') || ''
  )
  const loading = ref(false)

  const activeDiscipline = computed(() =>
    disciplines.value.find((d) => d.id === activeDisciplineId.value) ?? null
  )

  async function fetchDisciplines() {
    const api = useApi()
    loading.value = true
    try {
      const data = await api.get<Discipline[]>('/api/v1/disciplines')
      disciplines.value = data
      // Auto-select first discipline if none selected
      const first = data[0]
      if (!activeDisciplineId.value && first) {
        setActiveDiscipline(first.id)
      }
    } finally {
      loading.value = false
    }
  }

  function setActiveDiscipline(id: string) {
    activeDisciplineId.value = id
    localStorage.setItem('activeDisciplineId', id)
  }

  return {
    disciplines,
    activeDisciplineId,
    activeDiscipline,
    loading,
    fetchDisciplines,
    setActiveDiscipline,
  }
})
