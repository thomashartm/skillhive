/**
 * Central DB wrapper helper
 *
 * Purpose
 * - Provide a tiny utility that ensures the shared AppDataSource is initialized
 *   before running a handler and destroyed if this call performed the initialization.
 * - Keep it tiny and explicit so routes/middleware can use it as a single line wrapper.
 *
 * Usage examples:
 *
 * 1) Use from a route that needs the DS:
 *
 *    import { wrapDb } from '@/lib/wrapDb';
 *
 *    export const GET = wrapDb(async (AppDataSource, req, ctx) => {
 *      const repo = AppDataSource.getRepository(SomeEntity);
 *      const rows = await repo.find();
 *      return NextResponse.json(rows);
 *    });
 *
 * 2) Or call directly inside a route:
 *
 *    import { withDb } from '@/lib/wrapDb';
 *
 *    export async function POST(req) {
 *      return withDb(async (AppDataSource) => {
 *        // do DB work...
 *      });
 *    }
 *
 * Notes
 * - This file uses a dynamic import for `@trainhive/db` to avoid bundling/decorator issues
 *   in environments where static import of entities may evaluate decorators too early.
 * - The helper only destroys the data source if this invocation initialized it.
 *   If the DS was already initialized elsewhere in the process, it will be left open.
 */

import type { NextRequest, NextResponse } from 'next/server';

type AnyResponse = ReturnType<typeof NextResponse.json> | Promise<any> | any;

/**
 * withDb(fn)
 *
 * Initialize AppDataSource if needed, run the callback, and destroy the DS if we initialized it.
 * Returns whatever the callback returns (so it works in routes returning NextResponse or raw values).
 */
export async function withDb<T>(fn: (AppDataSource: any) => Promise<T> | T): Promise<T> {
  // dynamic import to avoid bundling issues in Next.js app routes
  const db = await import('@trainhive/db');
  const AppDataSource = db.AppDataSource;

  try {
    if (!AppDataSource.isInitialized) {
      try {
        await AppDataSource.initialize();
      } catch (e: any) {
        const msg = (e && e.message) || '';
        // If another request is initializing or the pool already exists, tolerate and proceed.
        if (
          typeof msg === 'string' &&
          (msg.includes('already') || msg.includes('exist') || msg.includes('initialized'))
        ) {
          await new Promise((r) => setTimeout(r, 100));
        } else {
          throw e;
        }
      }
    }
    // Run the user callback with the initialized data source
    return await fn(AppDataSource);
  } finally {
    // Do not destroy the pool here; keep it available for subsequent requests.
  }
}

/**
 * wrapDb(handler)
 *
 * Returns a function compatible with Next.js App Router route handlers:
 * (request, context?) => Promise<NextResponse|any>
 *
 * The handler receives (AppDataSource, request, context) so it can use the DS directly.
 *
 * Example:
 * export const POST = wrapDb(async (ds, req, ctx) => { ... return NextResponse.json(...) })
 */
export function wrapDb(
  handler: (
    AppDataSource: any,
    request: NextRequest,
    context?: any
  ) => Promise<AnyResponse> | AnyResponse
) {
  return async function wrapped(request: NextRequest, context?: any) {
    return withDb(async (AppDataSource) => {
      // Call the provided handler and return whatever it returns.
      // We don't swallow errors: they propagate to Next.js error handling as before.
      return handler(AppDataSource, request, context);
    });
  };
}
