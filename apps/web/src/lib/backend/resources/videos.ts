/**
 * Videos (Reference Assets) API Client
 */

import { httpClient } from '../http/client';
import type {
  CreateReferenceAssetDto,
  UpdateReferenceAssetDto,
  ReferenceAsset,
  MyVideosParams,
  VideoListParams,
  PaginatedVideoResponse,
} from '../../types/api';

function buildVideoListQueryString(params?: VideoListParams): string {
  if (!params) return '';

  const urlParams = new URLSearchParams();

  if (params.page) {
    urlParams.append('page', params.page.toString());
  }
  if (params.limit) {
    urlParams.append('limit', params.limit.toString());
  }
  if (params.techniqueId) {
    urlParams.append('techniqueId', params.techniqueId.toString());
  }
  if (params.title) {
    urlParams.append('title', params.title);
  }
  if (params.sortBy) {
    urlParams.append('sortBy', params.sortBy);
  }
  if (params.sortOrder) {
    urlParams.append('sortOrder', params.sortOrder);
  }

  return urlParams.toString();
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
   * List all videos with optional filters and pagination (authenticated)
   * Returns paginated response when page/limit are provided, otherwise returns simple array
   */
  async list(params?: VideoListParams): Promise<PaginatedVideoResponse<ReferenceAsset> | ReferenceAsset[]> {
    const queryString = buildVideoListQueryString(params);
    const endpoint = `/reference-assets${queryString ? `?${queryString}` : ''}`;

    // If pagination params are provided, expect paginated response
    if (params?.page && params?.limit) {
      const response = await httpClient.get<PaginatedVideoResponse<ReferenceAsset>>(endpoint);
      return response.data;
    }

    // Otherwise, return simple array
    const response = await httpClient.get<ReferenceAsset[]>(endpoint);
    return response.data;
  },

  /**
   * Get video by ID (authenticated)
   */
  async getById(id: number, options?: { include?: string[] }): Promise<ReferenceAsset> {
    const params = options?.include ? `?include=${options.include.join(',')}` : '';
    const response = await httpClient.get<ReferenceAsset>(
      `/reference-assets/${id}${params}`
    );
    return response.data;
  },

  /**
   * Get current user's videos with pagination and filters (authenticated)
   */
  async getMyVideos(params?: MyVideosParams): Promise<PaginatedVideoResponse<ReferenceAsset>> {
    const queryString = buildMyVideosQueryString(params);
    const endpoint = `/reference-assets/my-assets${queryString ? `?${queryString}` : ''}`;

    const response = await httpClient.get<PaginatedVideoResponse<ReferenceAsset>>(endpoint);
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
