/**
 * Videos (Reference Assets) API Client
 */

import { httpClient } from '../http/client';
import type {
  CreateReferenceAssetDto,
  UpdateReferenceAssetDto,
  ReferenceAsset,
  VideoFilters,
  MyVideosParams,
  PaginatedResponse,
} from '../../types/api';

function buildQueryString(filters?: VideoFilters): string {
  if (!filters) return '';

  const params = new URLSearchParams();

  if (filters.disciplineId) {
    params.append('disciplineId', filters.disciplineId.toString());
  }
  if (filters.techniqueId) {
    params.append('techniqueId', filters.techniqueId.toString());
  }
  if (filters.search) {
    params.append('search', filters.search);
  }
  if (filters.ids && filters.ids.length > 0) {
    params.append('ids', filters.ids.join(','));
  }
  if (filters.include && filters.include.length > 0) {
    params.append('include', filters.include.join(','));
  }

  return params.toString();
}

function buildMyVideosQueryString(params?: MyVideosParams): string {
  if (!params) return '';

  const urlParams = new URLSearchParams();

  if (params.page) {
    urlParams.append('page', params.page.toString());
  }
  if (params.limit) {
    urlParams.append('limit', params.limit.toString());
  }
  if (params.title) {
    urlParams.append('title', params.title);
  }
  if (params.techniqueName) {
    urlParams.append('techniqueName', params.techniqueName);
  }
  if (params.categoryName) {
    urlParams.append('categoryName', params.categoryName);
  }
  if (params.sortBy) {
    urlParams.append('sortBy', params.sortBy);
  }
  if (params.sortOrder) {
    urlParams.append('sortOrder', params.sortOrder);
  }

  return urlParams.toString();
}

export const videos = {
  /**
   * List all videos with optional filters (public)
   */
  async list(filters?: VideoFilters): Promise<ReferenceAsset[]> {
    const queryString = buildQueryString(filters);
    const endpoint = `/reference-assets${queryString ? `?${queryString}` : ''}`;

    const response = await httpClient.get<ReferenceAsset[]>(endpoint, { skipAuth: true });
    return response.data;
  },

  /**
   * Get video by ID (public)
   */
  async getById(id: number, options?: { include?: string[] }): Promise<ReferenceAsset> {
    const params = options?.include ? `?include=${options.include.join(',')}` : '';
    const response = await httpClient.get<ReferenceAsset>(
      `/reference-assets/${id}${params}`,
      { skipAuth: true }
    );
    return response.data;
  },

  /**
   * Get current user's videos with pagination and filters (authenticated)
   */
  async getMyVideos(params?: MyVideosParams): Promise<PaginatedResponse<ReferenceAsset>> {
    const queryString = buildMyVideosQueryString(params);
    const endpoint = `/reference-assets/my-assets${queryString ? `?${queryString}` : ''}`;

    const response = await httpClient.get<PaginatedResponse<ReferenceAsset>>(endpoint);
    return response.data;
  },

  /**
   * Create new video (authenticated)
   */
  async create(data: CreateReferenceAssetDto): Promise<ReferenceAsset> {
    const response = await httpClient.post<ReferenceAsset>('/reference-assets', data);
    return response.data;
  },

  /**
   * Update video (owner or admin)
   */
  async update(id: number, data: UpdateReferenceAssetDto): Promise<ReferenceAsset> {
    const response = await httpClient.patch<ReferenceAsset>(`/reference-assets/${id}`, data);
    return response.data;
  },

  /**
   * Delete video (owner or admin)
   */
  async delete(id: number): Promise<void> {
    await httpClient.delete(`/reference-assets/${id}`);
  },
};
