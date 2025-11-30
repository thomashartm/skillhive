import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Allow public routes without authentication
    if (isPublic) {
      return true;
    }

    // Log the request details for debugging
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    console.log('[JwtAuthGuard] Authorization header:', authHeader ? `${authHeader.substring(0, 30)}...` : 'MISSING');

    // Manually verify JWT for debugging
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      try {
        if (!process.env.NEXTAUTH_SECRET) {
          throw new Error('NEXTAUTH_SECRET is not set');
        }

        const secret = process.env.NEXTAUTH_SECRET;
        const decoded: any = jwt.verify(token, secret);
        console.log('[JwtAuthGuard] Manual JWT verification succeeded:', { id: decoded.id, email: decoded.email });
      } catch (verifyError: any) {
        console.error('[JwtAuthGuard] Manual JWT verification failed:', verifyError.message);
      }
    }

    // Otherwise, require JWT authentication
    try {
      const result = super.canActivate(context);

      // Handle both boolean and Promise results
      if (result instanceof Promise) {
        return result.catch((error) => {
          console.error('[JwtAuthGuard] JWT validation error:', {
            message: error.message,
            name: error.name,
            stack: error.stack?.split('\n')[0],
          });
          throw error;
        });
      }

      return result;
    } catch (error: any) {
      console.error('[JwtAuthGuard] JWT validation error (sync):', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
      });
      throw error;
    }
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      console.error('[JwtAuthGuard] handleRequest error:', {
        err,
        info: info?.message, // Info usually contains the reason why passport failed
        user,
      });
      throw err || new Error(info?.message || 'Unauthorized');
    }
    return user;
  }
}
