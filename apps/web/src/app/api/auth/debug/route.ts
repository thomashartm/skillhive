import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@trainhive/auth';

/**
 * Debug endpoint to check NextAuth session and token generation
 * Access at: http://localhost:3000/api/auth/debug
 */
export async function GET() {
  try {
    const session = await getServerSession(getAuthOptions());

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        message: 'No session found. Please login first.',
      });
    }

    // Try to get JWT token from the token endpoint
    const tokenResponse = await fetch('http://localhost:3000/api/auth/token', {
      headers: {
        Cookie: `next-auth.session-token=${session}`,
      },
    });

    let tokenData = null;
    if (tokenResponse.ok) {
      tokenData = await tokenResponse.json();
    }

    return NextResponse.json({
      authenticated: true,
      session: {
        user: session.user,
        expires: session.expires,
      },
      token: tokenData,
      environment: {
        apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
        nextAuthSecretSet: !!process.env.NEXTAUTH_SECRET,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      error: true,
      message: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
