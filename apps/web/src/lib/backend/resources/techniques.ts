/**
 * Techniques API Client
 */

import { httpClient } from '../http/client';
import type {
  CreateTechniqueDto,
  UpdateTechniqueDto,
  Technique,
  TechniqueFilters,
  Category,
  Tag,
} from '../../types/api';

function buildQueryString(filters?: TechniqueFilters): string {
  if (!filters) return '';

  const params = new URLSearchParams();

  if (filters.disciplineId) {
    params.append('disciplineId', filters.disciplineId.toString());
  }
  if (filters.categoryId) {
    params.append('categoryId', filters.categoryId.toString());
  }
  if (filters.tagId) {
    params.append('tagId', filters.tagId.toString());
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

export const techniques = {
  /**
   * List all techniques with optional filters (authenticated)
   */
  async list(filters?: TechniqueFilters): Promise<Technique[]> {
    const queryString = buildQueryString(filters);
    const endpoint = `/techniques${queryString ? `?${queryString}` : ''}`;

    const response = await httpClient.get<Technique[]>(endpoint);
    return response.data;
  },

  /**
   * Search techniques by name or description (public)
   */
  async search(query: string, disciplineId?: number): Promise<Technique[]> {
    return techniques.list({ search: query, disciplineId });
  },

  /**
   * Get technique by ID (authenticated)
   */
  async getById(id: number, options?: { include?: string[] }): Promise<Technique> {
    const params = options?.include ? `?include=${options.include.join(',')}` : '';
    const response = await httpClient.get<Technique>(`/techniques/${id}${params}`);
    return response.data;
  },

  /**
   * Get technique by slug (authenticated)
   */
  async getBySlug(disciplineId: number, slug: string): Promise<Technique> {
    const response = await httpClient.get<Technique>(
      `/techniques/by-slug/${disciplineId}/${slug}`
    );
    return response.data;
  },

  /**
   * Create new technique (PROFESSOR+ only)
   */
  async create(data: CreateTechniqueDto): Promise<Technique> {
    const response = await httpClient.post<Technique>('/techniques', data);
    return response.data;
  },

  /**
   * Update technique (PROFESSOR+ only)
   */
  async update(id: number, data: UpdateTechniqueDto): Promise<Technique> {
    const response = await httpClient.patch<Technique>(`/techniques/${id}`, data);
    return response.data;
  },

  /**
   * Delete technique (MANAGER+ only)
   */
  async delete(id: number): Promise<void> {
    await httpClient.delete(`/techniques/${id}`);
  },

  /**
   * Get categories for a technique (authenticated)
   */
  async getCategories(id: number): Promise<Category[]> {
    const response = await httpClient.get<Category[]>(`/techniques/${id}/categories`);
    return response.data;
  },

  /**
   * Add category to technique (PROFESSOR+ only)
   */
  async addCategory(
    techniqueId: number,
    categoryId: number,
    primary: boolean = false
  ): Promise<void> {
    await httpClient.post(`/techniques/${techniqueId}/categories`, {
      categoryId,
      primary,
    });
  },

  /**
   * Remove category from technique (PROFESSOR+ only)
   */
  async removeCategory(techniqueId: number, categoryId: number): Promise<void> {
    await httpClient.delete(`/techniques/${techniqueId}/categories/${categoryId}`);
  },

  /**
   * Update category primary flag (PROFESSOR+ only)
   */
  async updateCategoryPrimary(
    techniqueId: number,
    categoryId: number,
    primary: boolean
  ): Promise<void> {
    await httpClient.patch(`/techniques/${techniqueId}/categories/${categoryId}`, {
      primary,
    });
  },

  /**
   * Get tags for a technique (authenticated)
   */
  async getTags(id: number): Promise<Tag[]> {
    const response = await httpClient.get<Tag[]>(`/techniques/${id}/tags`);
    return response.data;
  },

  /**
   * Add tag to technique (PROFESSOR+ only)
   */
  async addTag(techniqueId: number, tagId: number): Promise<void> {
    await httpClient.post(`/techniques/${techniqueId}/tags`, { tagId });
  },

  /**
   * Remove tag from technique (PROFESSOR+ only)
   */
  async removeTag(techniqueId: number, tagId: number): Promise<void> {
    await httpClient.delete(`/techniques/${techniqueId}/tags/${tagId}`);
  },
};
