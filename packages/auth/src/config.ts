import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserRole } from '@trainhive/shared';
import bcrypt from 'bcryptjs';

// Database connection is initialized lazily by the adapter when needed
// Using dynamic imports to prevent webpack from bundling TypeORM entities at build time

export function getAuthOptions(): NextAuthOptions {
  // For JWT sessions with credentials provider, we don't need an adapter
  // User creation/retrieval is handled in the authorize callback
  // Adapter is only needed for database sessions or OAuth providers

  const config: NextAuthOptions = {
    // No adapter needed for credentials provider with JWT sessions
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
              id: user.id,
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
    ],
    session: {
      strategy: 'jwt',
    },
    callbacks: {
      jwt({ token, user }) {
        // Initial sign in
        if (user) {
          // eslint-disable-next-line no-param-reassign
          token.id = user.id;
          // eslint-disable-next-line no-param-reassign
          token.role = (user as { role?: UserRole }).role || UserRole.USER;
        }

        return token;
      },
      session({ session, token }) {
        if (session.user) {
          const sessionUser = session.user as { id?: string; role?: UserRole };
          // eslint-disable-next-line no-param-reassign
          sessionUser.id = token.id as string;
          // eslint-disable-next-line no-param-reassign, max-len
          sessionUser.role = (token.role as UserRole) || UserRole.USER;
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
