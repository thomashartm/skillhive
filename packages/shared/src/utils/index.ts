// Shared utility functions
import { UserRole, UserRoleType } from '../types';

export { generateSlug } from './slug';

/**
 * Validates if a string is a valid user role
 */
export function isValidRole(role: string): role is UserRoleType {
  return Object.values(UserRole).includes(role as UserRole);
}

/**
 * Checks if a user has a specific role
 */
export function hasRole(userRole: UserRoleType, requiredRole: UserRoleType): boolean {
  return userRole === requiredRole;
}

/**
 * Checks if a user has any of the required roles
 */
export function hasAnyRole(userRole: UserRoleType, requiredRoles: UserRoleType[]): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Checks if a user has admin role
 */
export function isAdmin(userRole: UserRoleType): boolean {
  return userRole === UserRole.ADMIN;
}

/**
 * Checks if a user has manager role or higher
 */
export function isManagerOrHigher(userRole: UserRoleType): boolean {
  return [UserRole.ADMIN, UserRole.MANAGER].includes(userRole as UserRole);
}

/**
 * Checks if a user has professor role or higher
 */
export function isProfessorOrHigher(userRole: UserRoleType): boolean {
  return [UserRole.ADMIN, UserRole.MANAGER, UserRole.PROFESSOR].includes(userRole as UserRole);
}
