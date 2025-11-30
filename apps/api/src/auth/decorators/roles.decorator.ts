import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@trainhive/shared';

// Metadata key for required roles
export const ROLES_KEY = 'roles';

/**
 * Requires one or more user roles for route access
 * @param roles - Roles that are allowed to access this route
 * @example
 * @Roles(UserRole.ADMIN, UserRole.MANAGER)
 * @Delete(':id')
 * deleteUser(@Param('id') id: number) { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
