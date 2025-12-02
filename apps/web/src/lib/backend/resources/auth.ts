/**
 * Authentication API Client
 */

import { httpClient } from '../http/client';
import type { LoginDto, LoginResponseDto } from '../../types/api';

export const auth = {
  /**
   * Login with email and password
   */
  async login(credentials: LoginDto): Promise<LoginResponseDto> {
    const response = await httpClient.post<LoginResponseDto>(
      '/auth/login',
      credentials,
      { skipAuth: true }
    );
    return response.data;
  },
};
