import {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
} from 'next-auth/adapters';
import { UserRole } from '@trainhive/shared';
import { getDbEntities } from './db-helper';
import type { DbEntities } from './types';

interface TypeORMAdapterUser extends AdapterUser {
  role: UserRole;
}

export function TypeORMAdapter(): Adapter {
  // Use shared helper to get entities
  // This is lazy - database connection is only established when adapter methods are called
  const getEntities = async (): Promise<DbEntities> => {
    try {
      return await getDbEntities();
    } catch (error: unknown) {
      // If database connection fails, log error
      // For JWT sessions, adapter is optional - we can still function without it
      const errorMessage = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.error('Database connection error in adapter:', errorMessage);
      throw error;
    }
  };

  return {
    async createUser(user: Omit<AdapterUser, 'id'>): Promise<TypeORMAdapterUser> {
      const { AppDataSource, User: UserEntity } = await getEntities();
      const userRepository = AppDataSource.getRepository(UserEntity);

      const newUser = userRepository.create({
        name: user.name || '',
        email: user.email || '',
        emailVerified: user.emailVerified || null,
        avatarUrl: user.image || null,
        role: UserRole.USER, // Default role
      });

      const savedUser = await userRepository.save(newUser);

      return {
        id: savedUser.id.toString(),
        name: savedUser.name,
        email: savedUser.email,
        emailVerified: savedUser.emailVerified,
        image: savedUser.avatarUrl || null,
        role: savedUser.role,
      };
    },

    async getUser(id: string): Promise<TypeORMAdapterUser | null> {
      const { AppDataSource, User: UserEntity } = await getEntities();
      const userRepository = AppDataSource.getRepository(UserEntity);
      const numId = parseInt(id, 10);
      if (isNaN(numId)) return null;

      const user = await userRepository.findOne({ where: { id: numId } });

      if (!user) return null;

      return {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.avatarUrl || null,
        role: user.role,
      };
    },

    async getUserByEmail(email: string): Promise<TypeORMAdapterUser | null> {
      const { AppDataSource, User: UserEntity } = await getEntities();
      const userRepository = AppDataSource.getRepository(UserEntity);
      const user = await userRepository.findOne({ where: { email } });

      if (!user) return null;

      return {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.avatarUrl || null,
        role: user.role,
      };
    },

    async getUserByAccount(
      { providerAccountId, provider }: Pick<AdapterAccount, 'providerAccountId' | 'provider'>,
    ): Promise<TypeORMAdapterUser | null> {
      const { AppDataSource, Account: AccountEntity } = await getEntities();
      const accountRepository = AppDataSource.getRepository(AccountEntity);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const account = await accountRepository.findOne({
        where: { providerAccountId, provider },
        relations: ['user'],
      });

      if (!account || !account.user) return null;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { user } = account;
      // Type assertion needed due to circular dependency
      // eslint-disable-next-line max-len
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      interface UserType {
        id: number;
        name: string;
        email: string;
        emailVerified: Date | null;
        avatarUrl: string | null;
        role: UserRole;
      }
      const typedUser = user as UserType;
      return {
        id: typedUser.id.toString(),
        name: typedUser.name,
        email: typedUser.email,
        emailVerified: typedUser.emailVerified,
        image: typedUser.avatarUrl || null,
        role: typedUser.role,
      };
    },

    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, 'id'>): Promise<TypeORMAdapterUser> {
      const { AppDataSource, User: UserEntity } = await getEntities();
      const userRepository = AppDataSource.getRepository(UserEntity);
      const numId = parseInt(user.id, 10);
      if (isNaN(numId)) {
        throw new Error('Invalid user ID');
      }

      const existingUser = await userRepository.findOne({ where: { id: numId } });

      if (!existingUser) {
        throw new Error('User not found');
      }

      if (user.name) existingUser.name = user.name;
      if (user.email) existingUser.email = user.email;
      if (user.image) existingUser.avatarUrl = user.image;
      if (user.emailVerified !== undefined) {
        existingUser.emailVerified = user.emailVerified;
      }

      const updatedUser = await userRepository.save(existingUser);

      return {
        id: updatedUser.id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        emailVerified: updatedUser.emailVerified,
        image: updatedUser.avatarUrl || null,
        role: updatedUser.role,
      };
    },

    async linkAccount(account: AdapterAccount): Promise<void> {
      const { AppDataSource, Account: AccountEntity } = await getEntities();
      const accountRepository = AppDataSource.getRepository(AccountEntity);

      const userId = parseInt(account.userId, 10);
      if (isNaN(userId)) {
        throw new Error('Invalid user ID');
      }

      const newAccount = accountRepository.create({
        userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refreshToken: account.refresh_token || null,
        accessToken: account.access_token || null,
        expiresAt: account.expires_at ? Math.floor(account.expires_at) : null,
        tokenType: account.token_type || null,
        scope: account.scope || null,
        idToken: account.id_token || null,
        sessionState: account.session_state || null,
      });

      await accountRepository.save(newAccount);
    },

    async unlinkAccount(
      { providerAccountId, provider }: Pick<AdapterAccount, 'providerAccountId' | 'provider'>,
    ): Promise<void> {
      const { AppDataSource, Account: AccountEntity } = await getEntities();
      const accountRepository = AppDataSource.getRepository(AccountEntity);
      await accountRepository.delete({ providerAccountId, provider });
    },

    async createSession(
      { sessionToken, userId, expires }: { sessionToken: string; userId: string; expires: Date },
    ): Promise<AdapterSession> {
      // NextAuth v4 with JWT doesn't require database sessions
      // This is a no-op for JWT sessions
      return Promise.resolve({
        sessionToken,
        userId,
        expires,
      } as AdapterSession);
    },

    async getSessionAndUser(
      _sessionToken: string,
    ): Promise<{ session: AdapterSession; user: TypeORMAdapterUser } | null> {
      // For JWT sessions, we don't store sessions in DB
      // This should not be called with JWT strategy
      return Promise.resolve(null);
    },

    async updateSession(
      { sessionToken: _sessionToken }: Partial<AdapterSession> & Pick<AdapterSession, 'sessionToken'>,
    ): Promise<AdapterSession | null> {
      // JWT sessions don't need updates
      return Promise.resolve(null);
    },

    async deleteSession(_sessionToken: string): Promise<void> {
      // JWT sessions don't need deletion
      return Promise.resolve();
    },
  };
}
