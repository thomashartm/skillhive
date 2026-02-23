// All entity interfaces — ported from v1 api.ts with Firestore adaptations
// Key changes: IDs are strings, ownerUid replaces createdBy

export type UserRole = 'viewer' | 'editor' | 'admin'
export type UserRoleFilter = 'all' | 'admin' | 'editor' | 'viewer' | 'none'

export interface UserInfo {
  uid: string
  email: string
  displayName: string
  roles: Record<string, UserRole>
}

export interface UsersListResponse {
  users: UserInfo[]
  nextPageToken?: string
}

export interface TimestampFields {
  createdAt: string
  updatedAt: string
}

export interface Discipline extends TimestampFields {
  id: string
  name: string
  slug: string
  description: string
}

export interface Category extends TimestampFields {
  id: string
  disciplineId: string
  name: string
  slug: string
  description: string
  parentId: string | null
  ownerUid: string
  children?: Category[]
}

export interface CategoryTree extends Category {
  children: CategoryTree[]
}

export interface Tag extends TimestampFields {
  id: string
  disciplineId: string
  name: string
  slug: string
  description: string
  color: string | null
  ownerUid: string
}

export interface Technique extends TimestampFields {
  id: string
  disciplineId: string
  name: string
  slug: string
  description: string
  categoryIds: string[]
  tagIds: string[]
  ownerUid: string
  categories?: Category[]
  tags?: Tag[]
}

export type AssetType = 'video' | 'web' | 'image'
export type VideoType = 'short' | 'full' | 'instructional' | 'seminar'

export interface Asset extends TimestampFields {
  id: string
  disciplineId: string
  url: string
  title: string
  description: string
  type: AssetType
  videoType: VideoType | null
  originator: string | null
  thumbnailUrl: string | null
  techniqueIds: string[]
  categoryIds: string[]
  tagIds: string[]
  ownerUid: string
  active: boolean
  processingStatus: '' | 'pending' | 'enriching' | 'completed' | 'failed'
  processingError: string | null
  duration: string | null
}

export interface Curriculum extends TimestampFields {
  id: string
  disciplineId: string
  title: string
  description: string
  duration?: string | null
  isPublic: boolean
  ownerUid: string
  elementCount?: number
}

export type ElementType = 'technique' | 'asset' | 'text' | 'image' | 'list'

export interface CurriculumElement extends TimestampFields {
  id: string
  type: ElementType
  techniqueId: string | null
  assetId: string | null
  title: string | null
  details: string | null
  imageUrl?: string | null
  duration?: string | null
  items?: string[]
  ord: number
  snapshot?: {
    name?: string
    thumbnailUrl?: string
    url?: string
  }
}

export interface OEmbedResponse {
  type: string
  version: string
  title: string
  author_name?: string
  author_url?: string
  provider_name?: string
  provider_url?: string
  thumbnail_url?: string
  thumbnail_width?: number
  thumbnail_height?: number
  html?: string
  width?: number
  height?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}
