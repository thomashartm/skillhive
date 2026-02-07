import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Category, CategoryTree } from '../types'
import { useApi } from '../composables/useApi'
import { useDisciplineStore } from './discipline'

export const useCategoryStore = defineStore('categories', () => {
  const categories = ref<Category[]>([])
  const tree = ref<CategoryTree[]>([])
  const loading = ref(false)

  async function fetchCategories() {
    const api = useApi()
    const discipline = useDisciplineStore()
    if (!discipline.activeDisciplineId) return

    loading.value = true
    try {
      categories.value = await api.get<Category[]>(
        `/api/v1/categories?disciplineId=${discipline.activeDisciplineId}`
      )
    } finally {
      loading.value = false
    }
  }

  async function fetchTree() {
    const api = useApi()
    const discipline = useDisciplineStore()
    if (!discipline.activeDisciplineId) return

    loading.value = true
    try {
      tree.value = await api.get<CategoryTree[]>(
        `/api/v1/categories?disciplineId=${discipline.activeDisciplineId}&tree=true`
      )
    } finally {
      loading.value = false
    }
  }

  async function createCategory(data: { name: string; description?: string; parentId?: string | null }) {
    const api = useApi()
    const discipline = useDisciplineStore()
    const cat = await api.post<Category>(
      `/api/v1/categories?disciplineId=${discipline.activeDisciplineId}`,
      data
    )
    categories.value.push(cat)
    return cat
  }

  async function updateCategory(id: string, data: { name?: string; description?: string; parentId?: string | null }) {
    const api = useApi()
    const updated = await api.patch<Category>(`/api/v1/categories/${id}`, data)
    const idx = categories.value.findIndex((c) => c.id === id)
    if (idx !== -1) categories.value[idx] = updated
    return updated
  }

  async function deleteCategory(id: string) {
    const api = useApi()
    await api.del(`/api/v1/categories/${id}`)
    categories.value = categories.value.filter((c) => c.id !== id)
  }

  return { categories, tree, loading, fetchCategories, fetchTree, createCategory, updateCategory, deleteCategory }
})
