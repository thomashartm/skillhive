/**
 * Type definitions for API client
 */

/**
 * Request configuration options
 */
export interface RequestConfig {
  /** Additional headers to include in the request */
  headers?: HeadersInit;

  /** Request body (will be JSON stringified) */
  body?: any;

  /** Skip authentication (don't include JWT token) */
  skipAuth?: boolean;

  /** Request timeout in milliseconds (overrides default) */
  timeout?: number;

  /** Enable retry on 5xx errors (default: true) */
  retry?: boolean;

  /** Number of retry attempts (default: 2) */
  retries?: number;

  /** Cache strategy for the request */
  cache?: RequestCache;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  /** Response data */
  data: T;

  /** HTTP status code */
  status: number;

  /** Response headers */
  headers: Headers;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  /** Current page number (1-indexed) */
  page: number;

  /** Number of items per page */
  limit: number;

  /** Total number of items */
  total: number;

  /** Total number of pages */
  totalPages: number;

  /** Whether there's a next page */
  hasNextPage: boolean;

  /** Whether there's a previous page */
  hasPreviousPage: boolean;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  /** Array of items */
  items: T[];

  /** Pagination metadata */
  meta: PaginationMeta;
}

/**
 * Standard error response from NestJS
 */
export interface ErrorResponse {
  /** HTTP status code */
  statusCode: number;

  /** Error message or array of validation messages */
  message: string | string[];

  /** Error type */
  error: string;

  /** Timestamp of the error */
  timestamp?: string;

  /** Request path that caused the error */
  path?: string;
}
