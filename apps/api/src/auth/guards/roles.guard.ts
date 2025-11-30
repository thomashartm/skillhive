import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@trainhive/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../jwt.strategy';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator metadata
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get authenticated user from request
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    // If no user (shouldn't happen after JwtAuthGuard), deny access
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has one of the required roles
    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
