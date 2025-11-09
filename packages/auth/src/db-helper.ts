// Shared database helper to avoid code duplication
// Uses dynamic imports to prevent webpack bundling issues

import type { DbEntities } from './types';

let dbInitializationPromise: Promise<DbEntities> | null = null;

export async function getDbEntities(): Promise<DbEntities> {
  if (!dbInitializationPromise) {
    dbInitializationPromise = (async () => {
      try {
        const dbModule = await import('@trainhive/db');
        const { AppDataSource, User, Account } = dbModule;

        // Initialize database connection if needed
        if (!AppDataSource.isInitialized) {
          try {
            await AppDataSource.initialize();
          } catch (err: unknown) {
            // If already initialized (race condition), ignore error
            if (!AppDataSource.isInitialized) {
              // Re-throw if it's a real initialization error
              throw err;
            }
          }
        }

        return { AppDataSource, User, Account };
      } catch (error) {
        // Reset promise on error so we can retry
        dbInitializationPromise = null;
        throw error;
      }
    })();
  }

  return dbInitializationPromise;
}
