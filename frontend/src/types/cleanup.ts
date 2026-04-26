// frontend/src/types/cleanup.ts

export type CleanupEntityType = 'category' | 'technique'

export type CleanupActionType = 'update' | 'delete'

export type CleanupJobStatus = 'proposed' | 'applying' | 'applied' | 'discarded' | 'failed'

export interface CleanupTemplate {
  id: string
  disciplineId: string
  entityType: CleanupEntityType
  name: string
  description: string
  promptBody: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface CleanupFilter {
  parentId?: string
  categoryId?: string
  tagSlug?: string
  search?: string
}

export interface CleanupRecordSnapshot {
  id: string
  name: string
  slug: string
  description: string
  parentId?: string | null
  categoryIds?: string[]
  updatedAt: string
}

export interface CleanupProposedFields {
  name: string
  slug: string
  description: string
  parentId?: string | null
  categoryIds?: string[]
}

export interface CleanupProposal {
  index: number
  action: CleanupActionType
  targetId: string
  before: CleanupRecordSnapshot
  after?: CleanupProposedFields
  mergeInto?: string
  rationale: string
  approved: boolean
}

export interface CleanupAppliedResult {
  updated: number
  deleted: number
  // Backend may serialize an empty slice as null on older records; always
  // coalesce on read (e.g. `skipped ?? []`).
  skipped: { index: number; reason: string }[] | null
}

export interface CleanupJob {
  id: string
  disciplineId: string
  entityType: CleanupEntityType
  templateId: string
  templateName: string
  filter: CleanupFilter
  recordCount: number
  status: CleanupJobStatus
  proposals: CleanupProposal[]
  rawLlmResponse: string
  error?: string
  createdBy: string
  createdAt: string
  appliedBy?: string
  appliedAt?: string
  appliedResult?: CleanupAppliedResult
}
