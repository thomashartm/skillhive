import { getToken } from 'next-auth/jwt';
// eslint-disable-next-line import/no-extraneous-dependencies
import { NextRequest, NextResponse } from 'next/server';
import {
  UserRole,
  hasRole,
  isManagerOrHigher,
  isProfessorOrHigher,
} from '@trainhive/shared';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Get the authenticated user from the request
 * Returns null if not authenticated
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<{
  id: string;
  email: string;
  role: UserRole;
} | null> {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET || 'change-this-secret-in-production',
    });

    if (!token || !token.email || !token.id) {
      return null;
    }

    const { role } = token;
    return {
      id: token.id as string,
      email: token.email,
      role: (role as UserRole | undefined) ?? UserRole.USER,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Require authentication for an API route
 * Returns the authenticated user or sends a 401 response
 */
export async function requireAuth(request: NextRequest): Promise<{
  id: string;
  email: string;
  role: UserRole;
} | NextResponse> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    );
  }

  return user;
}

/**
 * Require a specific role for an API route
 * Returns the authenticated user or sends a 403 response
 */
export async function requireRole(
  request: NextRequest,
  requiredRole: UserRole,
): Promise<{
    id: string;
    email: string;
    role: UserRole;
  } | NextResponse> {
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const user = authResult;

  if (!hasRole(user.role, requiredRole)) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 },
    );
  }

  return user;
}

/**
 * Require admin role for an API route
 */
export async function requireAdmin(request: NextRequest): Promise<{
  id: string;
  email: string;
  role: UserRole;
} | NextResponse> {
  return requireRole(request, UserRole.ADMIN);
}

/**
 * Require manager or higher role for an API route
 */
export async function requireManagerOrHigher(request: NextRequest): Promise<{
  id: string;
  email: string;
  role: UserRole;
} | NextResponse> {
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const user = authResult;

  if (!isManagerOrHigher(user.role)) {
    return NextResponse.json(
      { error: 'Insufficient permissions. Manager or higher role required.' },
      { status: 403 },
    );
  }

  return user;
}

/**
 * Require professor or higher role for an API route
 */
export async function requireProfessorOrHigher(request: NextRequest): Promise<{
  id: string;
  email: string;
  role: UserRole;
} | NextResponse> {
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const user = authResult;

  if (!isProfessorOrHigher(user.role)) {
    return NextResponse.json(
      { error: 'Insufficient permissions. Professor or higher role required.' },
      { status: 403 },
    );
  }

  return user;
}
