/**
 * Error handling utilities for API client
 */

import type { ErrorResponse } from './types';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  /** HTTP status code */
  statusCode: number;

  /** URL that caused the error */
  url: string;

  /** Validation errors (for 400 Bad Request) */
  validationErrors?: string[];

  /** Original error object */
  originalError?: any;

  constructor(message: string, statusCode: number, url: string, originalError?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.url = url;
    this.originalError = originalError;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Check if error is a validation error (400)
   */
  isValidationError(): boolean {
    return this.statusCode === 400;
  }

  /**
   * Check if error is unauthorized (401)
   */
  isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  /**
   * Check if error is forbidden (403)
   */
  isForbidden(): boolean {
    return this.statusCode === 403;
  }

  /**
   * Check if error is not found (404)
   */
  isNotFound(): boolean {
    return this.statusCode === 404;
  }

  /**
   * Check if error is conflict (409)
   */
  isConflict(): boolean {
    return this.statusCode === 409;
  }

  /**
   * Check if error is server error (5xx)
   */
  isServerError(): boolean {
    return this.statusCode >= 500 && this.statusCode < 600;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    if (this.validationErrors && this.validationErrors.length > 0) {
      return this.validationErrors.join(', ');
    }

    return this.message;
  }
}

/**
 * Transform API error response into ApiError
 */
export function transformError(statusCode: number, data: any, url: string): ApiError {
  // Handle NestJS error response format
  if (data && typeof data === 'object') {
    const errorResponse = data as Partial<ErrorResponse>;

    // Extract error message
    let message: string;
    if (Array.isArray(errorResponse.message)) {
      // Validation errors
      const error = new ApiError(
        'Validation failed',
        statusCode,
        url
      );
      error.validationErrors = errorResponse.message;
      return error;
    } else {
      message = errorResponse.message || errorResponse.error || 'An error occurred';
    }

    // Create error with appropriate message
    const error = new ApiError(message, statusCode, url);

    return error;
  }

  // Handle non-JSON error responses
  if (typeof data === 'string') {
    return new ApiError(data, statusCode, url);
  }

  // Fallback to generic error messages based on status code
  return new ApiError(getDefaultErrorMessage(statusCode), statusCode, url);
}

/**
 * Get default error message for status code
 */
function getDefaultErrorMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return 'You must be logged in to perform this action.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'This resource already exists or conflicts with existing data.';
    case 422:
      return 'The request could not be processed.';
    case 429:
      return 'Too many requests. Please try again later.';
    case 500:
      return 'An internal server error occurred. Please try again later.';
    case 502:
      return 'Bad gateway. The server is temporarily unavailable.';
    case 503:
      return 'Service temporarily unavailable. Please try again later.';
    case 504:
      return 'Gateway timeout. The request took too long to process.';
    default:
      if (statusCode >= 400 && statusCode < 500) {
        return 'Client error. Please check your request.';
      }
      if (statusCode >= 500) {
        return 'Server error. Please try again later.';
      }
      return 'An unexpected error occurred.';
  }
}

/**
 * Extract user-friendly error message from ApiError
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.getUserMessage();
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

/**
 * Check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Create a user-friendly error display object
 */
export interface ErrorDisplay {
  /** Main error message */
  message: string;

  /** Detailed error messages (validation errors) */
  details?: string[];

  /** Error type/title */
  title: string;

  /** Whether to show retry button */
  canRetry: boolean;
}

/**
 * Transform error into display format
 */
export function formatErrorForDisplay(error: unknown): ErrorDisplay {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      details: error.validationErrors,
      title: getErrorTitle(error.statusCode),
      canRetry: error.isServerError(),
    };
  }

  return {
    message: getErrorMessage(error),
    title: 'Error',
    canRetry: false,
  };
}

/**
 * Get error title based on status code
 */
function getErrorTitle(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Invalid Request';
    case 401:
      return 'Authentication Required';
    case 403:
      return 'Access Denied';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Validation Error';
    case 429:
      return 'Rate Limit Exceeded';
    case 500:
      return 'Server Error';
    case 502:
      return 'Bad Gateway';
    case 503:
      return 'Service Unavailable';
    case 504:
      return 'Timeout';
    default:
      if (statusCode >= 400 && statusCode < 500) {
        return 'Client Error';
      }
      if (statusCode >= 500) {
        return 'Server Error';
      }
      return 'Error';
  }
}
