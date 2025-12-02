/**
 * Curricula API Client
 */

import { httpClient } from '../http/client';
import type {
  CreateCurriculumDto,
  UpdateCurriculumDto,
  Curriculum,
  CurriculumFilters,
  CurriculumElement,
  CreateCurriculumElementDto,
  UpdateCurriculumElementDto,
  ReorderElementsDto,
} from '../../types/api';

async function buildQueryString(filters?: CurriculumFilters): Promise<string> {
  console.log('[Curricula API] buildQueryString called with filters:', JSON.stringify(filters));

  if (!filters) {
    console.log('[Curricula API] No filters provided, returning empty string');
    return '';
  }

  const params = new URLSearchParams();

  // Handle onlyMine filter by converting it to createdBy with current user's ID
  if (filters.onlyMine) {
    console.log('[Curricula API] onlyMine filter detected, fetching current user...');
    try {
      // Get current user to use their ID for createdBy filter
      const { users } = await import('./users');
      const currentUser = await users.getMe();
      console.log('[Curricula API] Current user ID:', currentUser.id);
      params.append('createdBy', currentUser.id.toString());
    } catch (error) {
      console.error('[Curricula API] Failed to get current user for onlyMine filter:', error);
      // If we can't get the user, don't add the filter
    }
  } else if (filters.createdBy) {
    console.log('[Curricula API] createdBy filter:', filters.createdBy);
    params.append('createdBy', filters.createdBy.toString());
  }

  if (filters.isPublic !== undefined) {
    console.log('[Curricula API] isPublic filter:', filters.isPublic);
    params.append('isPublic', filters.isPublic.toString());
  }

  // NOTE: onlyMine is NOT sent to the API - it's translated to createdBy above

  const queryString = params.toString();
  console.log('[Curricula API] Built query string:', queryString);
  return queryString;
}

export const curricula = {
  /**
   * List curricula with optional filters (authenticated)
   * Returns user's own + public curricula
   * Note: onlyMine filter is translated to createdBy=<currentUserId>
   */
  async list(filters?: CurriculumFilters): Promise<Curriculum[]> {
    const queryString = await buildQueryString(filters);
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
