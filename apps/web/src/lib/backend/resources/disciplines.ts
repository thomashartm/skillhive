/**
 * Disciplines API Client
 */

import { httpClient } from '../http/client';
import type { CreateDisciplineDto, UpdateDisciplineDto, Discipline } from '../../types/api';

export const disciplines = {
  /**
   * List all disciplines (public)
   */
  async list(): Promise<Discipline[]> {
    const response = await httpClient.get<Discipline[]>('/disciplines', { skipAuth: true });
    return response.data;
  },

  /**
   * Get discipline by ID (public)
   */
  async getById(id: number): Promise<Discipline> {
    const response = await httpClient.get<Discipline>(`/disciplines/${id}`, { skipAuth: true });
    return response.data;
  },

  /**
   * Get discipline by slug (public)
   */
  async getBySlug(slug: string): Promise<Discipline> {
    const response = await httpClient.get<Discipline>(`/disciplines/by-slug/${slug}`, { skipAuth: true });
    return response.data;
  },

  /**
   * Create new discipline (MANAGER+ only)
   */
  async create(data: CreateDisciplineDto): Promise<Discipline> {
    const response = await httpClient.post<Discipline>('/disciplines', data);
    return response.data;
  },

  /**
   * Update discipline (MANAGER+ only)
   */
  async update(id: number, data: UpdateDisciplineDto): Promise<Discipline> {
    const response = await httpClient.patch<Discipline>(`/disciplines/${id}`, data);
    return response.data;
  },

  /**
   * Delete discipline (ADMIN only)
   */
  async delete(id: number): Promise<void> {
    await httpClient.delete(`/disciplines/${id}`);
  },

  /**
   * Seed initial disciplines (ADMIN only)
   */
  async seed(): Promise<Discipline[]> {
    const response = await httpClient.post<Discipline[]>('/disciplines/seed');
    return response.data;
  },
};
