/**
 * TrainHive API Client
 *
 * Centralized API client for the NestJS REST API
 *
 * Usage:
 * ```typescript
 * import { apiClient } from '@/lib/api';
 *
 * // Authentication
 * const response = await apiClient.auth.login({ email, password });
 *
 * // Users
 * const user = await apiClient.users.getMe();
 * const newUser = await apiClient.users.register({ name, email, password });
 *
 * // Disciplines
 * const disciplines = await apiClient.disciplines.list();
 * const discipline = await apiClient.disciplines.getBySlug('brazilian-jiu-jitsu');
 *
 * // Categories
 * const categories = await apiClient.categories.list({ disciplineId: 1 });
 * const tree = await apiClient.categories.getTree(1);
 *
 * // Techniques
 * const techniques = await apiClient.techniques.list({ disciplineId: 1 });
 * const technique = await apiClient.techniques.search('arm bar');
 * await apiClient.techniques.addCategory(techniqueId, categoryId, true);
 *
 * // Tags
 * const tags = await apiClient.tags.list({ disciplineId: 1 });
 *
 * // Videos
 * const videos = await apiClient.videos.list({ techniqueId: 1 });
 * const myVideos = await apiClient.videos.getMyVideos({ page: 1, limit: 20 });
 *
 * // Curricula
 * const curricula = await apiClient.curricula.list({ onlyMine: true });
 * const elements = await apiClient.curricula.elements.list(curriculumId);
 * await apiClient.curricula.elements.reorder(curriculumId, [1, 3, 2]);
 *
 * // oEmbed
 * const metadata = await apiClient.oembed.fetch('https://youtube.com/watch?v=...');
 * ```
 */

// Export everything from resources
export { auth } from './resources/auth';
export { users } from './resources/users';
export { disciplines } from './resources/disciplines';
export { categories } from './resources/categories';
export { techniques } from './resources/techniques';
export { tags } from './resources/tags';
export { videos } from './resources/videos';
export { curricula } from './resources/curricula';
export { oembed } from './resources/oembed';

// Export types
export type * from './types';
export type * from './dtos';

// Export error utilities
export { ApiError, getErrorMessage, isApiError, formatErrorForDisplay } from './errors';
export type { ErrorDisplay } from './errors';

// Export HTTP client (for advanced usage)
export { httpClient } from './client';

// Main API client object
import { auth } from './resources/auth';
import { users } from './resources/users';
import { disciplines } from './resources/disciplines';
import { categories } from './resources/categories';
import { techniques } from './resources/techniques';
import { tags } from './resources/tags';
import { videos } from './resources/videos';
import { curricula } from './resources/curricula';
import { oembed } from './resources/oembed';

/**
 * Main API client instance
 *
 * This is the primary export for consuming the API throughout the application
 */
export const apiClient = {
  auth,
  users,
  disciplines,
  categories,
  techniques,
  tags,
  videos,
  curricula,
  oembed,
};

// Default export
export default apiClient;
