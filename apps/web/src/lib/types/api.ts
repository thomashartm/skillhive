/**
 * Data Transfer Objects (DTOs) for API requests and responses
 *
 * These interfaces match the NestJS API DTOs to provide type safety
 */

import type { UserRole } from '@trainhive/shared';

// ============================================================================
// Common Types
// ============================================================================

export interface TimestampFields {
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Authentication & Users
// ============================================================================

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    scopes: string[];
  };
}

export interface CreateUserDto {
  name: string;
  email: string;
  handle?: string;
  avatarUrl?: string;
  password?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  handle?: string;
  avatarUrl?: string;
  password?: string;
}

export interface User extends TimestampFields {
  id: number;
  name: string;
  email: string;
  handle: string | null;
  avatarUrl: string | null;
  role: UserRole;
  emailVerified: boolean;
  lastLoginAt: Date | null;
}

// ============================================================================
// Disciplines
// ============================================================================

export interface CreateDisciplineDto {
  name: string;
  slug?: string;
  description?: string;
}

export interface UpdateDisciplineDto {
  name?: string;
  slug?: string;
  description?: string;
}

export interface Discipline extends TimestampFields {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

// ============================================================================
// Categories
// ============================================================================

export interface CreateCategoryDto {
  disciplineId: number;
  name: string;
  slug?: string;
  description?: string;
  parentId?: number | null;
}

export interface UpdateCategoryDto {
  name?: string;
  slug?: string;
  description?: string;
  parentId?: number | null;
}

export interface Category extends TimestampFields {
  id: number;
  disciplineId: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  parent?: Category | null;
  children?: Category[];
}

export interface CategoryTree extends Category {
  children: CategoryTree[];
}

// ============================================================================
// Techniques
// ============================================================================

export interface CreateTechniqueDto {
  disciplineId: number;
  name: string;
  slug?: string;
  description?: string;
  categoryIds?: number[];
  tagIds?: number[];
}

export interface UpdateTechniqueDto {
  name?: string;
  slug?: string;
  description?: string;
  categoryIds?: number[];
  tagIds?: number[];
}

export interface Technique extends TimestampFields {
  id: number;
  disciplineId: number;
  name: string;
  slug: string;
  description: string | null;
  categories?: TechniqueCategory[];
  tags?: TechniqueTag[];
  referenceAssets?: ReferenceAsset[];
}

export interface TechniqueCategory {
  techniqueId: number;
  categoryId: number;
  primary: boolean;
  category?: Category;
}

export interface TechniqueTag {
  techniqueId: number;
  tagId: number;
  tag?: Tag;
}

// ============================================================================
// Tags
// ============================================================================

export interface CreateTagDto {
  disciplineId: number;
  name: string;
  slug?: string;
  description?: string;
  color?: string;
}

export interface UpdateTagDto {
  name?: string;
  slug?: string;
  description?: string;
  color?: string;
}

export interface Tag extends TimestampFields {
  id: number;
  disciplineId: number;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  usageCount?: number;
}

// ============================================================================
// Reference Assets (Videos)
// ============================================================================

export type AssetType = 'video' | 'web' | 'image';
export type VideoType = 'short' | 'full' | 'instructional' | 'seminar';

export interface CreateReferenceAssetDto {
  techniqueId?: number;
  type: AssetType;
  url: string;
  title?: string;
  description?: string;
  videoType?: VideoType;
  originator?: string;
  ord?: number;
  createdBy?: number;
}

export interface UpdateReferenceAssetDto {
  techniqueId?: number | null;
  type?: AssetType;
  url?: string;
  title?: string;
  description?: string;
  videoType?: VideoType;
  originator?: string;
  ord?: number;
}

export interface ReferenceAsset extends TimestampFields {
  id: number;
  techniqueId: number | null;
  type: AssetType;
  url: string;
  title: string | null;
  description: string | null;
  videoType: VideoType | null;
  originator: string | null;
  ord: number;
  createdBy: number | null;
  technique?: Technique;
  tags?: ReferenceAssetTag[];
}

export interface ReferenceAssetTag {
  assetId: number;
  tagId: number;
  tag?: Tag;
}

// ============================================================================
// Curricula
// ============================================================================

export interface CreateCurriculumDto {
  title: string;
  description?: string;
  createdBy: number;
  isPublic?: boolean;
}

export interface UpdateCurriculumDto {
  title?: string;
  description?: string;
  isPublic?: boolean;
}

export interface Curriculum extends TimestampFields {
  id: number;
  title: string;
  description: string | null;
  createdBy: number;
  isPublic: boolean;
  elements?: CurriculumElement[];
  elementCount?: number;
}

// ============================================================================
// Curriculum Elements
// ============================================================================

export type ElementType = 'technique' | 'asset' | 'text';

export interface CreateCurriculumElementDto {
  type: ElementType;
  techniqueId?: number | null;
  assetId?: number | null;
  title?: string | null;
  details?: string | null;
}

export interface UpdateCurriculumElementDto {
  techniqueId?: number | null;
  assetId?: number | null;
  title?: string | null;
  details?: string | null;
}

export interface CurriculumElement extends TimestampFields {
  id: number;
  curriculumId: number;
  type: ElementType;
  techniqueId: number | null;
  assetId: number | null;
  title: string | null;
  details: string | null;
  ord: number;
  technique?: Technique;
  asset?: ReferenceAsset;
}

export interface ReorderElementsDto {
  elementIds: number[];
}

// ============================================================================
// oEmbed
// ============================================================================

export interface OEmbedResponse {
  type: string;
  version: string;
  title: string;
  author_name?: string;
  author_url?: string;
  provider_name?: string;
  provider_url?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  html?: string;
  width?: number;
  height?: number;
}

// ============================================================================
// Filter and Query Parameters
// ============================================================================

export interface TechniqueFilters {
  disciplineId?: number;
  categoryId?: number;
  tagId?: number;
  search?: string;
  ids?: number[];
  include?: string[]; // ['categories', 'tags', 'assets']
}

export interface CategoryFilters {
  disciplineId?: number;
  tree?: boolean;
}

export interface TagFilters {
  disciplineId?: number;
  includeUsageCount?: boolean;
}

export interface VideoFilters {
  disciplineId?: number;
  techniqueId?: number;
  search?: string;
  ids?: number[];
  include?: string[]; // ['technique', 'categories']
}

export interface CurriculumFilters {
  createdBy?: number;
  isPublic?: boolean;
  onlyMine?: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface MyVideosParams extends PaginationParams, SortParams {
  title?: string;
  techniqueName?: string;
  categoryName?: string;
}

export interface VideoListParams extends PaginationParams, SortParams {
  techniqueId?: number;
  title?: string;
}

export interface PaginatedVideoResponse<T> {
  data?: T[];
  videos?: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
