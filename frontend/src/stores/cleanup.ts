// frontend/src/stores/cleanup.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '../composables/useApi'
import type {
  CleanupEntityType,
  CleanupFilter,
  CleanupJob,
  CleanupJobStatus,
  CleanupProposedFields,
  CleanupTemplate,
} from '../types/cleanup'

export const useCleanupStore = defineStore('cleanup', () => {
  const api = useApi()

  const templates = ref<CleanupTemplate[]>([])
  const jobs = ref<CleanupJob[]>([])
  const activeJob = ref<CleanupJob | null>(null)
  const loading = ref(false)

  async function listTemplates(disciplineId: string, entityType: CleanupEntityType) {
    loading.value = true
    try {
      templates.value = await api.get<CleanupTemplate[]>(
        `/api/v1/admin/cleanup/templates?disciplineId=${disciplineId}&entityType=${entityType}`,
      )
    } finally {
      loading.value = false
    }
  }

  async function createTemplate(payload: {
    disciplineId: string
    entityType: CleanupEntityType
    name: string
    description: string
    promptBody: string
  }): Promise<CleanupTemplate> {
    const t = await api.post<CleanupTemplate>('/api/v1/admin/cleanup/templates', payload)
    templates.value = [t, ...templates.value]
    return t
  }

  async function updateTemplate(
    id: string,
    payload: { name: string; description: string; promptBody: string },
  ): Promise<CleanupTemplate> {
    const t = await api.patch<CleanupTemplate>(`/api/v1/admin/cleanup/templates/${id}`, payload)
    templates.value = templates.value.map((x) => (x.id === id ? t : x))
    return t
  }

  async function deleteTemplate(id: string): Promise<void> {
    await api.del(`/api/v1/admin/cleanup/templates/${id}`)
    templates.value = templates.value.filter((x) => x.id !== id)
  }

  async function listJobs(
    disciplineId: string,
    entityType: CleanupEntityType,
    status?: CleanupJobStatus,
  ) {
    loading.value = true
    try {
      let url = `/api/v1/admin/cleanup/jobs?disciplineId=${disciplineId}&entityType=${entityType}`
      if (status) url += `&status=${status}`
      jobs.value = await api.get<CleanupJob[]>(url)
    } finally {
      loading.value = false
    }
  }

  async function getJob(id: string): Promise<CleanupJob> {
    const j = await api.get<CleanupJob>(`/api/v1/admin/cleanup/jobs/${id}`)
    activeJob.value = j
    return j
  }

  async function runAnalysis(payload: {
    disciplineId: string
    entityType: CleanupEntityType
    templateId: string
    filter: CleanupFilter
  }): Promise<CleanupJob> {
    const j = await api.post<CleanupJob>('/api/v1/admin/cleanup/jobs', payload)
    jobs.value = [{ ...j, proposals: [] }, ...jobs.value]
    return j
  }

  async function updateProposal(
    jobId: string,
    index: number,
    payload: { after?: CleanupProposedFields; approved?: boolean },
  ): Promise<CleanupJob> {
    const j = await api.patch<CleanupJob>(
      `/api/v1/admin/cleanup/jobs/${jobId}/proposals/${index}`,
      payload,
    )
    activeJob.value = j
    return j
  }

  async function applyJob(jobId: string): Promise<CleanupJob> {
    const j = await api.post<CleanupJob>(`/api/v1/admin/cleanup/jobs/${jobId}/apply`, {})
    activeJob.value = j
    return j
  }

  async function discardJob(jobId: string): Promise<void> {
    await api.post(`/api/v1/admin/cleanup/jobs/${jobId}/discard`, {})
    if (activeJob.value?.id === jobId) {
      activeJob.value = { ...activeJob.value, status: 'discarded' }
    }
  }

  async function forceFailJob(jobId: string, reason: string): Promise<CleanupJob> {
    const j = await api.post<CleanupJob>(
      `/api/v1/admin/cleanup/jobs/${jobId}/force-fail`,
      { reason },
    )
    activeJob.value = j
    return j
  }

  return {
    templates,
    jobs,
    activeJob,
    loading,
    listTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    listJobs,
    getJob,
    runAnalysis,
    updateProposal,
    applyJob,
    discardJob,
    forceFailJob,
  }
})
