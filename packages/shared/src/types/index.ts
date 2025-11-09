// Shared type definitions

/**
 * User roles supported by the system
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MANAGER = 'manager',
  PROFESSOR = 'professor',
}

/**
 * Type for user role values
 */
export type UserRoleType = UserRole | 'user' | 'admin' | 'manager' | 'professor';
