import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Asset, OEmbedResponse } from '../types'
import { useApi } from '../composables/useApi'
import { useDisciplineStore } from './discipline'

export const useAssetStore = defineStore('assets', () => {
  const assets = ref<Asset[]>([])
  const loading = ref(false)

  async function fetchAssets(params?: {
    techniqueId?: string
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
      if (params?.techniqueId) query.set('techniqueId', params.techniqueId)
      if (params?.tagId) query.set('tagId', params.tagId)
      if (params?.q) query.set('q', params.q)
      if (params?.limit) query.set('limit', String(params.limit))
      if (params?.offset) query.set('offset', String(params.offset))

      assets.value = await api.get<Asset[]>(`/api/v1/assets?${query}`)
    } finally {
      loading.value = false
    }
  }

  async function getAsset(id: string) {
    const api = useApi()
    return api.get<Asset>(`/api/v1/assets/${id}`)
  }

  async function createAsset(data: {
    url: string
    title: string
    description?: string
    type?: string
    videoType?: string | null
    originator?: string | null
    thumbnailUrl?: string | null
    techniqueIds?: string[]
    tagIds?: string[]
  }) {
    const api = useApi()
    const discipline = useDisciplineStore()
    const asset = await api.post<Asset>(
      `/api/v1/assets?disciplineId=${discipline.activeDisciplineId}`,
      data
    )
    assets.value.push(asset)
    return asset
  }

  async function updateAsset(id: string, data: Record<string, unknown>) {
    const api = useApi()
    const updated = await api.patch<Asset>(`/api/v1/assets/${id}`, data)
    const idx = assets.value.findIndex((a) => a.id === id)
    if (idx !== -1) assets.value[idx] = updated
    return updated
  }

  async function deleteAsset(id: string) {
    const api = useApi()
    await api.del(`/api/v1/assets/${id}`)
    assets.value = assets.value.filter((a) => a.id !== id)
  }

  async function resolveYouTube(url: string): Promise<OEmbedResponse> {
    const api = useApi()
    return api.post<OEmbedResponse>('/api/v1/youtube/resolve', { url })
  }

  return { assets, loading, fetchAssets, getAsset, createAsset, updateAsset, deleteAsset, resolveYouTube }
})
