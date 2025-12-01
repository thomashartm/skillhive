/**
 * Tags API Client
 */

import { httpClient } from '../client';
import type { CreateTagDto, UpdateTagDto, Tag, TagFilters } from '../dtos';

function buildQueryString(filters?: TagFilters): string {
  if (!filters) return '';

  const params = new URLSearchParams();

  if (filters.disciplineId) {
    params.append('disciplineId', filters.disciplineId.toString());
  }
  if (filters.includeUsageCount) {
    params.append('includeUsageCount', 'true');
  }

  return params.toString();
}

export const tags = {
  /**
   * List all tags with optional filters (public)
   * Note: disciplineId is typically required
   */
  async list(filters?: TagFilters): Promise<Tag[]> {
    const queryString = buildQueryString(filters);
    const endpoint = `/tags${queryString ? `?${queryString}` : ''}`;

    const response = await httpClient.get<Tag[]>(endpoint);
    return response.data;
  },

  /**
   * Get tag by ID
   */
  async getById(id: number): Promise<Tag> {
    const response = await httpClient.get<Tag>(`/tags/${id}`);
    return response.data;
  },

  /**
   * Get tag by slug
   */
  async getBySlug(disciplineId: number, slug: string): Promise<Tag> {
    const response = await httpClient.get<Tag>(
      `/tags/by-slug/${disciplineId}/${slug}`
    );
    return response.data;
  },

  /**
   * Create new tag (PROFESSOR+ only)
   */
  async create(data: CreateTagDto): Promise<Tag> {
    const response = await httpClient.post<Tag>('/tags', data);
    return response.data;
  },

  /**
   * Update tag (PROFESSOR+ only)
   */
  async update(id: number, data: UpdateTagDto): Promise<Tag> {
    const response = await httpClient.patch<Tag>(`/tags/${id}`, data);
    return response.data;
  },

  /**
   * Delete tag (MANAGER+ only)
   */
  async delete(id: number): Promise<void> {
    await httpClient.delete(`/tags/${id}`);
  },
};
