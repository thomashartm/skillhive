/**
 * Categories API Client
 */

import { httpClient } from '../http/client';
import type {
  CreateCategoryDto,
  UpdateCategoryDto,
  Category,
  CategoryTree,
  CategoryFilters,
  Technique,
} from '../../types/api';

export const categories = {
  /**
   * List all categories with optional filters (public)
   * @param filters - Optional filters including tree structure
   */
  async list(filters?: CategoryFilters): Promise<Category[] | CategoryTree[]> {
    const params = new URLSearchParams();
    if (filters?.disciplineId) {
      params.append('disciplineId', filters.disciplineId.toString());
    }
    if (filters?.tree) {
      params.append('tree', 'true');
    }

    const queryString = params.toString();
    const endpoint = `/categories${queryString ? `?${queryString}` : ''}`;

    const response = await httpClient.get<Category[] | CategoryTree[]>(endpoint);
    return response.data;
  },

  /**
   * Get category tree for a discipline
   */
  async getTree(disciplineId: number): Promise<CategoryTree[]> {
    return (await categories.list({ disciplineId, tree: true })) as CategoryTree[];
  },

  /**
   * Get category by ID
   */
  async getById(id: number): Promise<Category> {
    const response = await httpClient.get<Category>(`/categories/${id}`);
    return response.data;
  },

  /**
   * Get category by slug
   */
  async getBySlug(disciplineId: number, slug: string): Promise<Category> {
    const response = await httpClient.get<Category>(
      `/categories/by-slug/${disciplineId}/${slug}`
    );
    return response.data;
  },

  /**
   * Create new category (PROFESSOR+ only)
   */
  async create(data: CreateCategoryDto): Promise<Category> {
    const response = await httpClient.post<Category>('/categories', data);
    return response.data;
  },

  /**
   * Update category (PROFESSOR+ only)
   */
  async update(id: number, data: UpdateCategoryDto): Promise<Category> {
    const response = await httpClient.patch<Category>(`/categories/${id}`, data);
    return response.data;
  },

  /**
   * Delete category (MANAGER+ only)
   */
  async delete(id: number): Promise<void> {
    await httpClient.delete(`/categories/${id}`);
  },

  /**
   * Get techniques in a category
   */
  async getTechniques(
    id: number,
    filters?: {
      page?: number;
      limit?: number;
      title?: string;
      tagIds?: string;
    }
  ): Promise<Technique[]> {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.title) params.append('title', filters.title);
    if (filters?.tagIds) params.append('tagIds', filters.tagIds);

    const queryString = params.toString();
    const endpoint = `/categories/${id}/techniques${queryString ? `?${queryString}` : ''}`;

    const response = await httpClient.get<Technique[]>(endpoint);
    return response.data;
  },
};
