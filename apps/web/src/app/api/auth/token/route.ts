import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decode } from 'next-auth/jwt';

/**
 * API endpoint to get the current user's JWT token
 * This is needed because the JWT token is stored in an HTTP-only cookie
 * and cannot be accessed by client-side JavaScript directly
 */
export async function GET() {
  try {
    // Get the session token from cookies using Next.js App Router cookies() helper
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('next-auth.session-token')
      || cookieStore.get('__Secure-next-auth.session-token'); // For HTTPS

    console.log('[Token Endpoint] Session cookie found:', !!sessionToken);

    if (!sessionToken) {
      console.log('[Token Endpoint] No session cookie found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Decode the NextAuth session token
    const decoded = await decode({
      token: sessionToken.value,
      secret: process.env.NEXTAUTH_SECRET || 'change-this-secret-in-production',
    });

    console.log('[Token Endpoint] Token decoded:', !!decoded);

    if (!decoded || !decoded.id) {
      console.log('[Token Endpoint] Invalid session token');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('[Token Endpoint] Generating JWT for user:', decoded.email);
    console.log('[Token Endpoint] Decoded token keys:', Object.keys(decoded));

    // Encode the session data as a JWT string that can be sent to the API
    // Use jsonwebtoken (same library as NestJS passport-jwt) for compatibility
    const jwt = await import('jsonwebtoken');

    if (!process.env.NEXTAUTH_SECRET) {
      console.error('[Token Endpoint] NEXTAUTH_SECRET is not set!');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const secret = process.env.NEXTAUTH_SECRET;
    console.log('[Token Endpoint] Using secret (first 20 chars):', secret.substring(0, 20));

    // Create payload explicitly to avoid any extra fields from decoded token
    const payload = {
      id: String(decoded.id),
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      scopes: decoded.scopes || [],
    };

    console.log('[Token Endpoint] JWT payload:', payload);

    const token = jwt.sign(
      payload,
      secret,
      {
        algorithm: 'HS256',
        expiresIn: '7d',
      }
    );

    console.log('[Token Endpoint] JWT generated successfully');
    return NextResponse.json({ token });
  } catch (error) {
    console.error('[Token Endpoint] Error getting token:', error);
    return NextResponse.json({ error: 'Failed to get token' }, { status: 500 });
  }
}
