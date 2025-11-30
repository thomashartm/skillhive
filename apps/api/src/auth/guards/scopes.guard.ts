import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPES_KEY } from '../decorators/scopes.decorator';
import type { AuthenticatedUser } from '../jwt.strategy';

@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required scopes from decorator metadata
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no scopes are specified, allow access
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    // Get authenticated user from request
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    // If no user (shouldn't happen after JwtAuthGuard), deny access
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has all required scopes
    const userScopes = user.scopes || [];
    const hasAllScopes = requiredScopes.every((scope) => userScopes.includes(scope));

    if (!hasAllScopes) {
      const missingScopes = requiredScopes.filter((scope) => !userScopes.includes(scope));
      throw new ForbiddenException(
        `Insufficient permissions. Missing scopes: ${missingScopes.join(', ')}`,
      );
    }

    return true;
  }
}
