import { UserRole } from '../types';

// OAuth2 Scope Definitions for TrainHive API
// Scopes define granular permissions for API access

// Read Scopes - View access to resources
export const SCOPE_READ_TECHNIQUES = 'read:techniques';
export const SCOPE_READ_CATEGORIES = 'read:categories';
export const SCOPE_READ_CURRICULA = 'read:curricula';
export const SCOPE_READ_VIDEOS = 'read:videos';
export const SCOPE_READ_TAGS = 'read:tags';
export const SCOPE_READ_DISCIPLINES = 'read:disciplines';
export const SCOPE_READ_USERS = 'read:users';
export const SCOPE_READ_REFERENCE_ASSETS = 'read:reference-assets';

// Write Scopes - Create/Update access to resources
export const SCOPE_WRITE_TECHNIQUES = 'write:techniques';
export const SCOPE_WRITE_CATEGORIES = 'write:categories';
export const SCOPE_WRITE_CURRICULA = 'write:curricula';
export const SCOPE_WRITE_VIDEOS = 'write:videos';
export const SCOPE_WRITE_TAGS = 'write:tags';
export const SCOPE_WRITE_DISCIPLINES = 'write:disciplines';
export const SCOPE_WRITE_REFERENCE_ASSETS = 'write:reference-assets';

// Delete Scopes - Delete access to resources
export const SCOPE_DELETE_TECHNIQUES = 'delete:techniques';
export const SCOPE_DELETE_CATEGORIES = 'delete:categories';
export const SCOPE_DELETE_CURRICULA = 'delete:curricula';
export const SCOPE_DELETE_VIDEOS = 'delete:videos';
export const SCOPE_DELETE_TAGS = 'delete:tags';
export const SCOPE_DELETE_DISCIPLINES = 'delete:disciplines';
export const SCOPE_DELETE_REFERENCE_ASSETS = 'delete:reference-assets';

// Admin Scopes - Administrative operations
export const SCOPE_ADMIN_USERS = 'admin:users';
export const SCOPE_ADMIN_SYSTEM = 'admin:system';
export const SCOPE_ADMIN_ROLES = 'admin:roles';

// Special Scopes
export const SCOPE_WRITE_OWN = 'write:own'; // Can only write own resources
export const SCOPE_READ_OWN = 'read:own'; // Can only read own resources

// Scope Collections for easier management
export const READ_SCOPES = [
  SCOPE_READ_TECHNIQUES,
  SCOPE_READ_CATEGORIES,
  SCOPE_READ_CURRICULA,
  SCOPE_READ_VIDEOS,
  SCOPE_READ_TAGS,
  SCOPE_READ_DISCIPLINES,
  SCOPE_READ_USERS,
  SCOPE_READ_REFERENCE_ASSETS,
] as const;

export const WRITE_SCOPES = [
  SCOPE_WRITE_TECHNIQUES,
  SCOPE_WRITE_CATEGORIES,
  SCOPE_WRITE_CURRICULA,
  SCOPE_WRITE_VIDEOS,
  SCOPE_WRITE_TAGS,
  SCOPE_WRITE_DISCIPLINES,
  SCOPE_WRITE_REFERENCE_ASSETS,
] as const;

export const DELETE_SCOPES = [
  SCOPE_DELETE_TECHNIQUES,
  SCOPE_DELETE_CATEGORIES,
  SCOPE_DELETE_CURRICULA,
  SCOPE_DELETE_VIDEOS,
  SCOPE_DELETE_TAGS,
  SCOPE_DELETE_DISCIPLINES,
  SCOPE_DELETE_REFERENCE_ASSETS,
] as const;

export const ADMIN_SCOPES = [
  SCOPE_ADMIN_USERS,
  SCOPE_ADMIN_SYSTEM,
  SCOPE_ADMIN_ROLES,
] as const;

export const ALL_SCOPES = [
  ...READ_SCOPES,
  ...WRITE_SCOPES,
  ...DELETE_SCOPES,
  ...ADMIN_SCOPES,
  SCOPE_WRITE_OWN,
  SCOPE_READ_OWN,
] as const;

// Type for scope strings
export type Scope = typeof ALL_SCOPES[number];

// Default scopes by user role
export const DEFAULT_SCOPES_BY_ROLE: Record<UserRole, Scope[]> = {
  [UserRole.USER]: [
    // Basic users can read public content and write their own
    SCOPE_READ_TECHNIQUES,
    SCOPE_READ_CATEGORIES,
    SCOPE_READ_CURRICULA,
    SCOPE_READ_VIDEOS,
    SCOPE_READ_TAGS,
    SCOPE_READ_DISCIPLINES,
    SCOPE_READ_REFERENCE_ASSETS,
    SCOPE_WRITE_OWN,
    SCOPE_READ_OWN,
  ],
  [UserRole.PROFESSOR]: [
    // Professors can create and edit techniques and curricula
    SCOPE_READ_TECHNIQUES,
    SCOPE_READ_CATEGORIES,
    SCOPE_READ_CURRICULA,
    SCOPE_READ_VIDEOS,
    SCOPE_READ_TAGS,
    SCOPE_READ_DISCIPLINES,
    SCOPE_READ_REFERENCE_ASSETS,
    SCOPE_WRITE_TECHNIQUES,
    SCOPE_WRITE_CATEGORIES,
    SCOPE_WRITE_CURRICULA,
    SCOPE_WRITE_VIDEOS,
    SCOPE_WRITE_TAGS,
    SCOPE_WRITE_REFERENCE_ASSETS,
    SCOPE_WRITE_OWN,
    SCOPE_READ_OWN,
  ],
  [UserRole.MANAGER]: [
    // Managers have all professor permissions plus user management and delete operations
    SCOPE_READ_TECHNIQUES,
    SCOPE_READ_CATEGORIES,
    SCOPE_READ_CURRICULA,
    SCOPE_READ_VIDEOS,
    SCOPE_READ_TAGS,
    SCOPE_READ_DISCIPLINES,
    SCOPE_READ_REFERENCE_ASSETS,
    SCOPE_READ_USERS,
    SCOPE_WRITE_TECHNIQUES,
    SCOPE_WRITE_CATEGORIES,
    SCOPE_WRITE_CURRICULA,
    SCOPE_WRITE_VIDEOS,
    SCOPE_WRITE_TAGS,
    SCOPE_WRITE_DISCIPLINES,
    SCOPE_WRITE_REFERENCE_ASSETS,
    SCOPE_DELETE_TECHNIQUES,
    SCOPE_DELETE_CATEGORIES,
    SCOPE_DELETE_CURRICULA,
    SCOPE_DELETE_VIDEOS,
    SCOPE_DELETE_TAGS,
    SCOPE_DELETE_REFERENCE_ASSETS,
    SCOPE_WRITE_OWN,
    SCOPE_READ_OWN,
  ],
  [UserRole.ADMIN]: [
    // Admins have all scopes
    SCOPE_READ_TECHNIQUES,
    SCOPE_READ_CATEGORIES,
    SCOPE_READ_CURRICULA,
    SCOPE_READ_VIDEOS,
    SCOPE_READ_TAGS,
    SCOPE_READ_DISCIPLINES,
    SCOPE_READ_USERS,
    SCOPE_READ_REFERENCE_ASSETS,
    SCOPE_WRITE_TECHNIQUES,
    SCOPE_WRITE_CATEGORIES,
    SCOPE_WRITE_CURRICULA,
    SCOPE_WRITE_VIDEOS,
    SCOPE_WRITE_TAGS,
    SCOPE_WRITE_DISCIPLINES,
    SCOPE_WRITE_REFERENCE_ASSETS,
    SCOPE_DELETE_TECHNIQUES,
    SCOPE_DELETE_CATEGORIES,
    SCOPE_DELETE_CURRICULA,
    SCOPE_DELETE_VIDEOS,
    SCOPE_DELETE_TAGS,
    SCOPE_DELETE_DISCIPLINES,
    SCOPE_DELETE_REFERENCE_ASSETS,
    SCOPE_ADMIN_USERS,
    SCOPE_ADMIN_SYSTEM,
    SCOPE_ADMIN_ROLES,
    SCOPE_WRITE_OWN,
    SCOPE_READ_OWN,
  ],
};

// Utility function to get scopes for a user role
export function getScopesForRole(role: UserRole): Scope[] {
  return DEFAULT_SCOPES_BY_ROLE[role] || DEFAULT_SCOPES_BY_ROLE[UserRole.USER];
}

// Utility function to check if a user has a specific scope
export function hasScope(userScopes: string[], requiredScope: string): boolean {
  return userScopes.includes(requiredScope);
}

// Utility function to check if a user has any of the required scopes
export function hasAnyScope(userScopes: string[], requiredScopes: string[]): boolean {
  return requiredScopes.some((scope) => userScopes.includes(scope));
}

// Utility function to check if a user has all required scopes
export function hasAllScopes(userScopes: string[], requiredScopes: string[]): boolean {
  return requiredScopes.every((scope) => userScopes.includes(scope));
}
