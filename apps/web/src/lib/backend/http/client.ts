/**
 * API Client for TrainHive NestJS REST API
 *
 * Centralized HTTP client with:
 * - Automatic JWT token handling from NextAuth session
 * - Consistent error handling and transformation
 * - Request/response interceptors
 * - Type-safe method signatures using shared DTOs
 * - Retry logic for transient failures
 * - Request cancellation support
 */

import { getSession } from 'next-auth/react';
import { ApiError, transformError } from './errors';
import type { RequestConfig, ApiResponse } from '../types';

/**
 * Get the API base URL from environment variables
 */
function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  // Validate URL format
  try {
    new URL(url);
    return url;
  } catch (error) {
    console.error('Invalid API URL:', url);
    throw new Error(`Invalid NEXT_PUBLIC_API_URL: ${url}`);
  }
}

/**
 * Get the request timeout from environment variables
 */
function getTimeout(): number {
  const timeout = process.env.NEXT_PUBLIC_API_TIMEOUT;
  return timeout ? parseInt(timeout, 10) : 30000; // Default 30 seconds
}

/**
 * Check if API logging is enabled
 */
function isLoggingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_API_LOGGING === 'true' || process.env.NODE_ENV === 'development';
}

/**
 * Base HTTP client class
 */
class HttpClient {
  private baseUrl: string;
  private timeout: number;
  private loggingEnabled: boolean;

  constructor() {
    this.baseUrl = getApiBaseUrl();
    this.timeout = getTimeout();
    this.loggingEnabled = isLoggingEnabled();
  }

  /**
   * Get the JWT token from NextAuth session via /api/auth/token endpoint
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      // Fetch JWT token from our custom endpoint that encodes the NextAuth session token
      // Include credentials to send session cookies
      const response = await fetch('/api/auth/token', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('[API Client] Token endpoint response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[API Client] Token endpoint error:', response.status, errorData);

        if (response.status === 401) {
          // User is not authenticated
          console.warn('[API Client] User not authenticated - no session cookie found');
          return null;
        }
        return null;
      }

      const data = await response.json();
      const token = data.token || null;
      console.log('[API Client] Token retrieved successfully');
      console.log('[API Client] JWT token (first 50 chars):', token ? token.substring(0, 50) + '...' : 'NULL');
      return token;
    } catch (error) {
      console.error('[API Client] Failed to get auth token:', error);
      return null;
    }
  }

  /**
   * Build headers for the request
   */
  private async buildHeaders(config: RequestConfig = {}): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    // Add authorization header if we have a token
    if (!config.skipAuth) {
      const token = await this.getAuthToken();
      if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
        console.log('[API Client] Authorization header set with token (first 50 chars):', token.substring(0, 50) + '...');
      } else {
        console.warn('[API Client] No token available, Authorization header NOT set');
      }
    }

    return headers;
  }

  /**
   * Create AbortController with timeout
   */
  private createAbortController(config: RequestConfig): AbortController {
    const controller = new AbortController();
    const timeoutMs = config.timeout || this.timeout;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    // Clean up timeout if request completes
    controller.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
    });

    return controller;
  }

  /**
   * Log request details (development mode only)
   */
  private logRequest(method: string, url: string, body?: any): void {
    if (!this.loggingEnabled) return;

    console.group(`[API Request] ${method} ${url}`);
    console.log('Timestamp:', new Date().toISOString());
    if (body) {
      console.log('Body:', body);
    }
    console.groupEnd();
  }

  /**
   * Log response details (development mode only)
   */
  private logResponse(method: string, url: string, status: number, data: any): void {
    if (!this.loggingEnabled) return;

    console.group(`[API Response] ${method} ${url} - ${status}`);
    console.log('Timestamp:', new Date().toISOString());
    console.log('Status:', status);
    console.log('Data:', data);
    console.groupEnd();
  }

  /**
   * Log error details
   */
  private logError(method: string, url: string, error: any): void {
    console.error(`[API Error] ${method} ${url}`, error);
  }

  /**
   * Check if error is retryable (5xx errors or network errors)
   */
  private isRetryableError(error: any): boolean {
    if (error instanceof ApiError) {
      return error.statusCode >= 500 && error.statusCode < 600;
    }
    // Network errors (ECONNREFUSED, ETIMEDOUT, etc.)
    return error.name === 'TypeError' || error.name === 'NetworkError';
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryRequest<T>(
    fn: () => Promise<T>,
    retries: number = 2,
    delay: number = 1000
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryRequest(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = this.createAbortController(config);

    console.log('[API Client] Making request:', {
      method,
      url,
      endpoint,
      baseUrl: this.baseUrl,
    });

    this.logRequest(method, url, config.body);

    try {
      const headers = await this.buildHeaders(config);

      // Log headers to verify Authorization is included
      console.log('[API Client] Request headers:', JSON.stringify(headers, null, 2));

      const fetchFn = async () => {
        const response = await fetch(url, {
          method,
          headers,
          body: config.body ? JSON.stringify(config.body) : undefined,
          signal: controller.signal,
          credentials: 'include', // Include cookies for CORS
          cache: config.cache || 'no-store',
        });

        console.log('[API Client] Response received:', {
          url,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        });

        // Parse response
        let data: any;
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        console.log('[API Client] Raw response data:', JSON.stringify(data, null, 2));

        this.logResponse(method, url, response.status, data);

        // Handle error responses
        if (!response.ok) {
          throw transformError(response.status, data, url);
        }

        return {
          data: data as T,
          status: response.status,
          headers: response.headers,
        };
      };

      // Apply retry logic if enabled
      if (config.retry !== false) {
        return await this.retryRequest(fetchFn, config.retries);
      }

      return await fetchFn();
    } catch (error: any) {
      this.logError(method, url, error);

      // Handle AbortError (timeout)
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408, url);
      }

      // Handle network errors
      if (error instanceof TypeError) {
        throw new ApiError('Network error: Unable to reach API server', 0, url);
      }

      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      // Unknown error
      throw new ApiError('An unexpected error occurred', 500, url, error);
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, config);
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, { ...config, body });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, { ...config, body });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, { ...config, body });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, config);
  }
}

// Export singleton instance
export const httpClient = new HttpClient();
