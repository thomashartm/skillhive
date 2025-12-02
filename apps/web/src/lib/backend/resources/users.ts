/**
 * Users API Client
 */

import { httpClient } from '../http/client';
import type {
  CreateUserDto,
  UpdateUserDto,
  User,
  LoginDto,
  LoginResponseDto,
} from '../../types/api';

export const users = {
  /**
   * Register a new user (public endpoint)
   */
  async register(data: CreateUserDto): Promise<User> {
    const response = await httpClient.post<User>('/users', data, { skipAuth: true });
    return response.data;
  },

  /**
   * Get current authenticated user
   */
  async getMe(): Promise<User> {
    const response = await httpClient.get<User>('/users/me');
    return response.data;
  },

  /**
   * Get user by ID
   */
  async getById(id: number): Promise<User> {
    const response = await httpClient.get<User>(`/users/${id}`);
    return response.data;
  },

  /**
   * List all users (MANAGER+ only)
   */
  async list(): Promise<User[]> {
    const response = await httpClient.get<User[]>('/users');
    return response.data;
  },

  /**
   * Update current user
   */
  async updateMe(data: UpdateUserDto): Promise<User> {
    const me = await users.getMe();
    const response = await httpClient.patch<User>(`/users/${me.id}`, data);
    return response.data;
  },

  /**
   * Update user by ID (own profile or ADMIN)
   */
  async update(id: number, data: UpdateUserDto): Promise<User> {
    const response = await httpClient.patch<User>(`/users/${id}`, data);
    return response.data;
  },

  /**
   * Delete user (ADMIN only)
   */
  async delete(id: number): Promise<void> {
    await httpClient.delete(`/users/${id}`);
  },
};
