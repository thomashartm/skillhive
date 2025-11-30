/**
 * Curricula API Client
 */

import { httpClient } from '../client';
import type {
  CreateCurriculumDto,
  UpdateCurriculumDto,
  Curriculum,
  CurriculumFilters,
  CurriculumElement,
  CreateCurriculumElementDto,
  UpdateCurriculumElementDto,
  ReorderElementsDto,
} from '../dtos';

function buildQueryString(filters?: CurriculumFilters): string {
  if (!filters) return '';

  const params = new URLSearchParams();

  if (filters.createdBy) {
    params.append('createdBy', filters.createdBy.toString());
  }
  if (filters.isPublic !== undefined) {
    params.append('isPublic', filters.isPublic.toString());
  }
  if (filters.onlyMine) {
    params.append('onlyMine', 'true');
  }

  return params.toString();
}

export const curricula = {
  /**
   * List curricula with optional filters (authenticated)
   * Returns user's own + public curricula
   */
  async list(filters?: CurriculumFilters): Promise<Curriculum[]> {
    const queryString = buildQueryString(filters);
    const endpoint = `/curricula${queryString ? `?${queryString}` : ''}`;

    const response = await httpClient.get<Curriculum[]>(endpoint);
    return response.data;
  },

  /**
   * Get curriculum by ID (authenticated, access control applies)
   */
  async getById(id: number): Promise<Curriculum> {
    const response = await httpClient.get<Curriculum>(`/curricula/${id}`);
    return response.data;
  },

  /**
   * Create new curriculum (authenticated)
   */
  async create(data: Omit<CreateCurriculumDto, 'createdBy'>): Promise<Curriculum> {
    const response = await httpClient.post<Curriculum>('/curricula', data);
    return response.data;
  },

  /**
   * Update curriculum (owner or admin)
   */
  async update(id: number, data: UpdateCurriculumDto): Promise<Curriculum> {
    const response = await httpClient.patch<Curriculum>(`/curricula/${id}`, data);
    return response.data;
  },

  /**
   * Delete curriculum (owner or admin)
   */
  async delete(id: number): Promise<void> {
    await httpClient.delete(`/curricula/${id}`);
  },

  /**
   * Curriculum Elements API
   */
  elements: {
    /**
     * List elements in a curriculum (authenticated, access control applies)
     */
    async list(curriculumId: number): Promise<CurriculumElement[]> {
      const response = await httpClient.get<CurriculumElement[]>(
        `/curricula/${curriculumId}/elements`
      );
      return response.data;
    },

    /**
     * Add element to curriculum (owner or admin)
     */
    async add(
      curriculumId: number,
      data: CreateCurriculumElementDto
    ): Promise<CurriculumElement> {
      const response = await httpClient.post<CurriculumElement>(
        `/curricula/${curriculumId}/elements`,
        data
      );
      return response.data;
    },

    /**
     * Update curriculum element (owner or admin)
     */
    async update(
      curriculumId: number,
      elementId: number,
      data: UpdateCurriculumElementDto
    ): Promise<CurriculumElement> {
      const response = await httpClient.put<CurriculumElement>(
        `/curricula/${curriculumId}/elements/${elementId}`,
        data
      );
      return response.data;
    },

    /**
     * Delete curriculum element (owner or admin)
     */
    async delete(curriculumId: number, elementId: number): Promise<void> {
      await httpClient.delete(`/curricula/${curriculumId}/elements/${elementId}`);
    },

    /**
     * Reorder curriculum elements (owner or admin)
     */
    async reorder(curriculumId: number, elementIds: number[]): Promise<CurriculumElement[]> {
      const response = await httpClient.put<CurriculumElement[]>(
        `/curricula/${curriculumId}/elements/reorder`,
        { elementIds } as ReorderElementsDto
      );
      return response.data;
    },
  },
};
