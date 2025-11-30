import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { encode } from 'next-auth/jwt';
import { UserRole, getScopesForRole } from '@trainhive/shared';
import bcrypt from 'bcryptjs';
import { TypeORMAdapter } from './adapter';

// Database connection is initialized lazily by the adapter when needed
// Using dynamic imports to prevent webpack from bundling TypeORM entities at build time

export function getAuthOptions(): NextAuthOptions {
  // TypeORM adapter is used for OAuth account linking
  // For credentials provider, authorization is handled manually in authorize() callback
  // Session strategy is JWT (not database-backed)

  // Log the secret at startup for debugging
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error('[NextAuth] NEXTAUTH_SECRET is not set!');
  } else {
    console.log('[NextAuth] Using secret (first 20 chars):', secret.substring(0, 20));
  }

  const config: NextAuthOptions = {
    // Adapter needed for OAuth account linking (Account table management)
    adapter: TypeORMAdapter(),
    providers: [
      CredentialsProvider({
        id: 'credentials',
        name: 'Credentials',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          try {
            const { getDbEntities } = await import('./db-helper');
            const { AppDataSource, User: UserEntity } = await getDbEntities();
            const userRepository = AppDataSource.getRepository(UserEntity);

            // Find user by email
            const user = await userRepository.findOne({
              where: { email: credentials.email },
            });

            if (!user || !user.password) {
              return null;
            }

            // Verify password
            const isValid = await bcrypt.compare(credentials.password, user.password);
            if (!isValid) {
              return null;
            }

            // Update last login timestamp
            try {
              await userRepository.update(
                { id: user.id },
                { lastLoginAt: new Date() },
              );
            } catch (error) {
              // Non-critical, log but don't fail
              // eslint-disable-next-line no-console
              console.error('Failed to update last login:', error);
            }

            return {
              id: user.id.toString(),
              email: user.email,
              name: user.name,
              role: user.role,
            };
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Authentication error:', error);
            return null;
          }
        },
      }),
      // Google OAuth Provider (optional - requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
      ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? [
            GoogleProvider({
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              authorization: {
                params: {
                  prompt: 'consent',
                  access_type: 'offline',
                  response_type: 'code',
                },
              },
            }),
          ]
        : []),
      // Microsoft/Azure AD Provider (optional - requires MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET)
      ...(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET
        ? [
            AzureADProvider({
              clientId: process.env.MICROSOFT_CLIENT_ID,
              clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
              tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
              authorization: {
                params: {
                  scope: 'openid profile email User.Read',
                },
              },
            }),
          ]
        : []),
    ],
    session: {
      strategy: 'jwt',
      // JWT expiration settings
      maxAge: 7 * 24 * 60 * 60, // 7 days (604800 seconds)
    },
    jwt: {
      // JWT token expiration
      maxAge: 7 * 24 * 60 * 60, // 7 days (604800 seconds)
    },
    callbacks: {
      jwt({ token, user, account }) {
        // Initial sign in
        if (user) {
          // eslint-disable-next-line no-param-reassign
          token.id = user.id;

          const userRole = (user as { role?: UserRole }).role || UserRole.USER;
          // eslint-disable-next-line no-param-reassign
          token.role = userRole;

          // Add scopes based on user role
          // eslint-disable-next-line no-param-reassign
          token.scopes = getScopesForRole(userRole);

          // Add issued at timestamp
          // eslint-disable-next-line no-param-reassign
          token.iat = Math.floor(Date.now() / 1000);
        }

        // Add OAuth account information if available
        if (account) {
          // eslint-disable-next-line no-param-reassign
          token.provider = account.provider;
          // eslint-disable-next-line no-param-reassign
          token.providerAccountId = account.providerAccountId;
        }

        return token;
      },
      session({ session, token }) {
        if (session.user) {
          // Type assertion for extended session user
          const sessionUser = session.user as {
            id?: string;
            role?: UserRole;
            scopes?: string[];
            provider?: string;
          };

          // eslint-disable-next-line no-param-reassign
          sessionUser.id = token.id as string;
          // eslint-disable-next-line no-param-reassign
          sessionUser.role = (token.role as UserRole) || UserRole.USER;
          // eslint-disable-next-line no-param-reassign
          sessionUser.scopes = (token.scopes as string[]) || [];
          // eslint-disable-next-line no-param-reassign
          sessionUser.provider = (token.provider as string) || 'credentials';
        }
        return session;
      },
    },
    pages: {
      signIn: '/login',
    },
    secret: process.env.NEXTAUTH_SECRET || 'change-this-secret-in-production',
  };

  return config;
}
