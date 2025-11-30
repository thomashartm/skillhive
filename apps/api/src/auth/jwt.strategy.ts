import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '@trainhive/shared';

// JWT payload structure matching NextAuth token
export interface JwtPayload {
  id: string;
  email?: string;
  name?: string;
  role: UserRole;
  scopes: string[];
  provider?: string;
  providerAccountId?: string;
  iat: number;
  exp: number;
}

// Authenticated user object attached to requests
export interface AuthenticatedUser {
  id: string;
  email?: string;
  name?: string;
  role: UserRole;
  scopes: string[];
  provider?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    if (!process.env.NEXTAUTH_SECRET) {
      throw new Error('NEXTAUTH_SECRET environment variable is not set');
    }

    const secret = process.env.NEXTAUTH_SECRET;
    console.log('[JwtStrategy] Using secret (first 20 chars):', secret.substring(0, 20));

    super({
      // Extract JWT from Authorization header as Bearer token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Use the same secret as NextAuth for token validation
      secretOrKey: secret,
      // Don't ignore expiration
      ignoreExpiration: false,
    });
  }

  // Validate and transform JWT payload into user object
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    console.log('[JwtStrategy] Validating token payload:', { id: payload.id, email: payload.email, role: payload.role });

    // Ensure required fields are present
    if (!payload.id || !payload.role) {
      console.error('[JwtStrategy] Invalid token payload - missing id or role');
      throw new UnauthorizedException('Invalid token payload');
    }

    console.log('[JwtStrategy] Token validated successfully for user:', payload.email);

    // Return user object that will be attached to request
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      scopes: payload.scopes || [],
      provider: payload.provider,
    };
  }
}
