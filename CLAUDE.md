<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SkillHive is a training curriculum and knowledge management platform for martial arts (particularly BJJ). Users can organize their training curriculum around existing video media, create curricula, track sessions, and categorize techniques.

## Monorepo Structure

This is an npm workspaces monorepo with one app and three shared packages:

**App:**
- `apps/web` - Main Next.js 15 web application (includes both frontend and API routes)

**Packages:**
- `packages/shared` - Foundation layer with types (UserRole), utilities (generateSlug, role helpers), and constants
- `packages/db` - TypeORM entities (User, Account, Category, Technique, TechniqueCategory), migrations, and data source configuration
- `packages/auth` - NextAuth.js configuration, password hashing, and authorization helpers

**Dependency flow:** `shared` → `db` → `auth` → `apps/web`

## Development Commands

```bash
# Install dependencies (first time setup)
npm install

# Build all packages (required before running apps)
npm run build

# Run the Next.js app in development mode
npm run dev

# The dev command automatically runs the web app on http://localhost:3000

# Linting and type checking
npm run lint              # Lint all workspaces
npm run type-check        # Type check all workspaces
npm run format            # Format with Prettier
npm run format:check      # Check formatting

# Testing
npm run test              # Run tests in all workspaces

# Database operations (from packages/db)
npm run migration:generate -w @trainhive/db -- src/migrations/MigrationName
npm run migration:run -w @trainhive/db
npm run migration:revert -w @trainhive/db

# Or use root-level scripts
npm run db:schema
npm run db:seed
```

## Architecture & Key Patterns

### Database Layer (packages/db)

**Technology:** TypeORM with MySQL 8.0+

**Core entities:**
- `User` - UUID primary key, email (unique, indexed), role (USER/ADMIN/MANAGER/PROFESSOR), bcrypt password
- `Account` - OAuth/OIDC provider support (optional, for NextAuth)
- `Category` - Hierarchical (self-referential parent-child), discipline-scoped, unique (disciplineId, slug) pair
- `Technique` - Training techniques/skills with taxonomy JSON field
- `TechniqueCategory` - Many-to-many junction with primary flag

**Important patterns:**
- Lazy initialization: AppDataSource initializes on first API call to avoid webpack bundling issues
- Dynamic imports: Always use `import('@trainhive/db')` dynamically in API routes
- Migrations required: `synchronize: false` - never auto-sync schema in production
- Cascading deletes: Parent categories cascade to children, technique associations cascade on both sides

**Database configuration:**
- Connection via `DATABASE_URL` environment variable
- Connection pooling: max 10 connections
- Logging enabled in development

### API Structure (apps/web/app/api)

**Pattern:** RESTful route handlers using Next.js 15 App Router

**Endpoints:**
- `/api/auth/[...nextauth]` - NextAuth.js authentication
- `/api/v1/categories` - Category CRUD with tree support (?tree=true)
- `/api/v1/categories/[id]` - Single category operations
- `/api/v1/techniques/[techniqueId]/categories` - Technique-category associations

**API conventions:**
1. **Input validation:** Zod schemas at entry point
2. **Error responses:**
   - 400 - Validation/business logic errors
   - 401 - Authentication required (use `requireAuth()`)
   - 403 - Insufficient permissions (use `requireRole()`, `requireAdmin()`, etc.)
   - 404 - Resource not found
   - 500 - Server errors (detailed in dev, generic in prod)
3. **Business logic:**
   - Auto-generate slugs with `generateSlug()` from `@trainhive/shared/utils`
   - Validate relationships (prevent self-reference, check parent existence)
   - Enforce unique constraints per discipline
4. **Database access:**
   - Use lazy initialization pattern
   - Access repositories via AppDataSource
   - Always handle initialization errors

### Authentication (packages/auth)

**Strategy:** JWT-based sessions with NextAuth.js v4

**Configuration:**
- Provider: CredentialsProvider (email/password)
- Session: JWT (not database-backed)
- Password: bcryptjs with 10 salt rounds
- Secret: `NEXTAUTH_SECRET` environment variable

**Authorization helpers** (use these in API routes):
```typescript
import { requireAuth, requireRole, requireAdmin, requireManagerOrHigher } from '@trainhive/auth/api-helpers';

// Get authenticated user or return 401
const user = await requireAuth(request);

// Check specific role or return 403
const admin = await requireAdmin(request);
const manager = await requireManagerOrHigher(request);
const professor = await requireProfessorOrHigher(request);

// Check any role
const user = await requireRole(request, UserRole.MANAGER);
```

**Key files:**
- `packages/auth/src/config.ts` - NextAuth configuration with callbacks
- `packages/auth/src/api-helpers.ts` - Authorization helper functions
- `packages/auth/src/adapter.ts` - Database adapter implementation

### Frontend (apps/web)

**Framework:** Next.js 15 App Router with Tailwind CSS v4

**Page structure:**
- `/` - Dashboard (requires auth)
- `/login`, `/register` - Authentication pages
- `/techniques`, `/techniques/categories` - Technique management
- `/curricula` - Curriculum builder
- `/sessions` - Training session tracker
- `/videos/save` - Video ingestion

**Layout hierarchy:**
1. `app/layout.tsx` - Root layout with Tailwind and Providers
2. `app/components/layout/Providers.tsx` - SessionProvider wrapper (client component)
3. `app/components/layout/AppLayout.tsx` - Protected layout with navigation

**Key patterns:**
- Use `SessionProvider` for client-side auth context
- Dynamic imports for database access in routes
- Force dynamic rendering where needed: `export const dynamic = 'force-dynamic'`
- Metadata helpers for page titles and descriptions

## Common Development Patterns

### Adding a new API endpoint

1. Create route file: `apps/web/app/api/v1/your-endpoint/route.ts`
2. Import required dependencies:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { z } from 'zod';
   import { requireAuth } from '@trainhive/auth/api-helpers';
   ```
3. Implement handler with lazy DB initialization:
   ```typescript
   export async function GET(request: NextRequest) {
     try {
       // Auth check
       const user = await requireAuth(request);

       // Dynamic DB import
       const { AppDataSource, YourEntity } = await import('@trainhive/db');
       if (!AppDataSource.isInitialized) {
         await AppDataSource.initialize();
       }

       // Repository access
       const repo = AppDataSource.getRepository(YourEntity);
       const results = await repo.find();

       return NextResponse.json(results);
     } catch (error) {
       return NextResponse.json(
         { error: 'Internal server error' },
         { status: 500 }
       );
     }
   }
   ```

### Adding a new entity

1. Create entity file: `packages/db/src/entities/YourEntity.ts`
2. Define entity with decorators:
   ```typescript
   import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

   @Entity('your_table_name')
   export class YourEntity {
     @PrimaryGeneratedColumn('uuid')
     id: string;

     // Your columns...

     @CreateDateColumn()
     createdAt: Date;

     @UpdateDateColumn()
     updatedAt: Date;
   }
   ```
3. Export from `packages/db/src/index.ts`
4. Generate migration: `npm run migration:generate -w @trainhive/db -- src/migrations/AddYourEntity`
5. Run migration: `npm run migration:run -w @trainhive/db`

### Working with slugs

Always use the shared slug utility:
```typescript
import { generateSlug } from '@trainhive/shared/utils';

const slug = generateSlug('My Category Name'); // 'my-category-name'
```

Slugs should be unique within a discipline scope, not globally.

### Role-based authorization

Use the role hierarchy utilities:
```typescript
import { UserRole, isAdmin, isManagerOrHigher, isProfessorOrHigher } from '@trainhive/shared';

// Hierarchy: ADMIN > MANAGER > PROFESSOR > USER
// Helper functions:
// - isAdmin(role) - Only admins
// - isManagerOrHigher(role) - Admins and managers
// - isProfessorOrHigher(role) - Admins, managers, and professors
```

In API routes, use the auth helpers:
```typescript
// Require specific role
const admin = await requireAdmin(request);

// Require role level
const manager = await requireManagerOrHigher(request);
```

## Environment Variables

Required environment variables:

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/skillhive

# Auth
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Node environment
NODE_ENV=development
```

## Important Notes

1. **Single app architecture**: This monorepo now contains only one Next.js app (`apps/web`) that handles both frontend and API routes
2. **Always build packages before running apps**: Packages must be compiled with `npm run build` before apps can import them
3. **Dynamic imports for TypeORM**: Always use dynamic imports in API routes to avoid webpack bundling issues with decorators
4. **Slug uniqueness**: Slugs are unique per discipline, not globally. Check both `disciplineId` and `slug` when validating
5. **Hierarchical categories**: Prevent self-reference and validate parent existence before saving
6. **JWT sessions**: Sessions are JWT-based, not database-backed. User data in session comes from JWT callbacks
7. **Migration workflow**: Never use `synchronize: true` in production. Always generate and run migrations
8. **Password security**: Use bcryptjs from `@trainhive/auth` - never handle raw password hashing in other packages
9. **Error handling**: Always wrap API routes in try-catch and provide appropriate HTTP status codes
10. **No interactive git commands**: Never use `-i` flags (git rebase -i, git add -i) as they require interactive input

## Tech Stack

- **Runtime:** Node.js >=20.0.0, npm >=10.0.0
- **Framework:** Next.js 15.0.0 (App Router)
- **Database:** MySQL 8.0+ via TypeORM 0.3.20
- **Auth:** NextAuth.js 4.24.5 with JWT sessions
- **Validation:** Zod 4.1.12
- **Styling:** Tailwind CSS 4.1.17
- **Language:** TypeScript 5.3.3 (strict mode)
- **Testing:** Vitest 1.2.0
- **Linting:** ESLint 8.56.0 with Airbnb config + TypeScript support
- **Formatting:** Prettier 3.2.5
