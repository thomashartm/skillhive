/**
 * Reference Assets API Client
 */

import { httpClient } from '../http/client';

export interface ReferenceAsset {
  id: number;
  techniqueId: number;
  type: 'video' | 'web' | 'image';
  url: string;
  title: string | null;
  description: string | null;
  videoType: 'short' | 'full' | 'instructional' | 'seminar' | null;
  originator: string | null;
  ord: number;
  tagIds?: number[];
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReferenceAssetDto {
  techniqueId: number;
  type: 'video' | 'web' | 'image';
  url: string;
  title?: string | null;
  description?: string | null;
  videoType?: 'short' | 'full' | 'instructional' | 'seminar' | null;
  originator?: string | null;
  ord?: number;
  createdBy?: number;
}

export interface UpdateReferenceAssetDto {
  type?: 'video' | 'web' | 'image';
  url?: string;
  title?: string | null;
  description?: string | null;
  videoType?: 'short' | 'full' | 'instructional' | 'seminar' | null;
  originator?: string | null;
  ord?: number;
}

export const referenceAssets = {
  /**
   * List all reference assets with optional filters
   */
  async list(techniqueId?: number): Promise<ReferenceAsset[]> {
    const params = techniqueId ? `?techniqueId=${techniqueId}` : '';
    const response = await httpClient.get<ReferenceAsset[]>(`/reference-assets${params}`);
    return response.data;
  },

  /**
   * Get reference asset by ID
   */
  async getById(id: number): Promise<ReferenceAsset> {
    const response = await httpClient.get<ReferenceAsset>(`/reference-assets/${id}`);
    return response.data;
  },

  /**
   * Create new reference asset
   */
  async create(data: CreateReferenceAssetDto): Promise<ReferenceAsset> {
    const response = await httpClient.post<ReferenceAsset>('/reference-assets', data);
    return response.data;
  },

  /**
   * Update reference asset
   */
  async update(id: number, data: UpdateReferenceAssetDto): Promise<ReferenceAsset> {
    const response = await httpClient.patch<ReferenceAsset>(`/reference-assets/${id}`, data);
    return response.data;
  },

  /**
   * Delete reference asset
   */
  async delete(id: number): Promise<void> {
    await httpClient.delete(`/reference-assets/${id}`);
  },
};
