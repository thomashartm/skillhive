# Next.js Web App Architecture

**Port:** 3000 (default)
**Framework:** Next.js 15 App Router with Tailwind CSS v4

## Page Structure

- `/` - Dashboard (requires auth)
- `/login`, `/register` - Authentication pages
- `/techniques`, `/techniques/categories` - Technique management
- `/curricula`, `/curricula/my-curricula` - Curriculum builder
- `/videos/save`, `/videos/my-videos` - Video ingestion and management

## API Routes (Legacy)

**Note:** These are being migrated to the NestJS API.

Some endpoints still exist in `apps/web/app/api/`:
- `/api/auth/[...nextauth]` - NextAuth.js authentication
- `/api/register` - User registration
- `/api/seed/disciplines` - Database seeding
- Various `/api/v1/*` routes (being phased out in favor of NestJS API)

## Authentication

- NextAuth.js v4 with JWT sessions
- Session provider wraps app in `app/components/layout/Providers.tsx`
- Auth helpers: `requireAuth()`, `requireRole()`, `requireAdmin()`, etc.

## Layout Hierarchy

1. `app/layout.tsx` - Root layout with Tailwind and Providers
2. `app/components/layout/Providers.tsx` - SessionProvider wrapper (client component)
3. `app/components/layout/AppLayout.tsx` - Protected layout with navigation

## Key Patterns

### wrapDb Helper
Use `wrapDb()` from `@app/lib/wrapDb` for API routes that need database access:

```typescript
import { wrapDb } from '@app/lib/wrapDb';

export const GET = wrapDb(async (request, { db }) => {
  const disciplines = await db.getRepository(Discipline).find();
  return Response.json(disciplines);
});
```

This helper:
- Initializes database connection
- Handles errors gracefully
- Cleans up resources

### Dynamic Imports
Import `@trainhive/db` dynamically in API routes to avoid bundling issues:

```typescript
export async function GET() {
  const { AppDataSource, Discipline } = await import('@trainhive/db');

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  // Use entities...
}
```

### Force Dynamic Rendering
Use `export const dynamic = 'force-dynamic'` for routes that need runtime data:

```typescript
export const dynamic = 'force-dynamic';

export default async function Page() {
  const data = await fetchDataFromAPI();
  return <div>{data}</div>;
}
```

This prevents:
- Stale data from static generation
- Build-time errors with dynamic data
- Caching issues during development

## Component Organization

### Server Components (default)
- Use for data fetching
- Direct database access (via API routes)
- No client-side interactivity

### Client Components
- Mark with `'use client'` directive
- Use for interactivity (onClick, onChange, etc.)
- Access to hooks (useState, useEffect, etc.)
- Session access via `useSession()`

## Best Practices

1. **Prefer Server Components** unless you need interactivity
2. **Use API routes** for database operations, not direct DB access in components
3. **Validate user input** with Zod before sending to API
4. **Handle loading states** with Suspense boundaries
5. **Use error boundaries** for graceful error handling
6. **Keep client bundles small** - minimize 'use client' components

## Migration Strategy

Legacy Next.js API routes are being migrated to NestJS API:

1. **Phase 1**: Create equivalent NestJS endpoint
2. **Phase 2**: Update frontend to call NestJS endpoint
3. **Phase 3**: Remove Next.js API route
4. **Phase 4**: Update tests and documentation

**Do not create new Next.js API routes** - use the NestJS API instead.
