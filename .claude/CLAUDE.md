# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SkillHive is a training content management platform for collecting external video knowledge and instructionals and organising them into repeatable, sharable curriculums.
The initial use case is creating guidance through a martial arts journey for instance BJJ and JKD. 
Users can collect, organize and share their training curriculum around existing video media.

### Key Concepts
* Techniques and skills are reflected by referenced assets, which are primarily video links
* We do no upload or host videos. We just reference to streaming platforms and respect their constraints, licenses and paywalls
* Users collect video links to all major social media platforms
* Extract and append title and metadata to organize it
* Tag the source material and categorize the videos 
* Search for specific videos or video series
* Create curricula around a selected list of video instructional

### System Design Decisions
* Web UI based on next.js to manage and organize videos, categories, tags and curricula. 
** This is the main front facing components and point of interaction for all user roles. 
** The system is behind login. 
** It is solely a frontend and interacts with the API for all operations
** No database connectivity on it's own
** All API calls require a valid session token which reflects user id, role and privileges
* API layer based on nest.js which provides the backend business logic.
** Responsible for CRUD operations to the database
** Expects successful session auth token
** Designed to serve multiple frontends
* Mobile App (Future development and not in scope right now) will be the future mobile backend to simplify video collection and mobile access to courses. 
** Relies on the REST API
** Supports iOS and Android



## Monorepo Structure

This is an npm workspaces monorepo with two apps and three shared packages:

**Apps:**
- `apps/web` - Next.js 15 web application (frontend + some API routes for auth)
- `apps/api` - Nest.js REST API (primary CRUD API for all entities)

**Packages:**
- `packages/shared` - Foundation layer with types (UserRole), utilities (generateSlug, role helpers), and constants
- `packages/db` - TypeORM entities, migrations, and data source configuration
- `packages/auth` - NextAuth.js configuration, password hashing, and authorization helpers

**Dependency flow:** `shared` → `db` → `auth` → `apps/api` + `apps/web`

## Development Commands

```bash
# Install dependencies (first time setup)
npm install

# Build all packages (required before running apps)
npm run build

# Run the Next.js web app in development mode
npm run dev                # Web app on http://localhost:3000

# Run the Nest.js API in development mode
npm run dev:api            # API on http://localhost:3001

# Run both web app and API simultaneously
npm run dev:all

# Linting and type checking
npm run lint              # Lint all workspaces
npm run type-check        # Type check all workspaces
npm run format            # Format with Prettier
npm run format:check      # Check formatting

# Testing
npm run test              # Run tests in all workspaces

# Database operations
npm run db:schema
npm run db:seed
```

## Architecture & Key Patterns

### Database Layer (packages/db)

**Technology:** TypeORM with MySQL 8.0+

**Core entities:**
- `User` - Incremental ID, email (unique, indexed), role (USER/PROFESSOR/MANAGER/ADMIN), optional password
- `Account` - OAuth/OIDC provider support (for NextAuth)
- `Discipline` - Top-level martial arts discipline (BJJ, Judo, etc.), unique name and slug
- `Category` - Hierarchical (self-referential parent-child), discipline-scoped, unique (disciplineId, slug) pair
- `Technique` - Training techniques/skills, discipline-scoped with slug
- `TechniqueCategory` - Many-to-many junction between techniques and categories with primary flag
- `Tag` - Flexible tagging system, discipline-scoped with slug and color
- `TechniqueTag`, `ReferenceAssetTag` - Junction tables for tag associations
- `ReferenceAsset` - Media assets (videos, web links, images) with metadata, linked to techniques
- `Curriculum` - Training curriculum/program with title, description, and public/private visibility
- `CurriculumElement` - Elements within a curriculum (technique, asset, or text) with ordering

**Important patterns:**
- **Data source reuse:** AppDataSource is globally cached to avoid multiple initializations
- **Auto-sync in development:** `synchronize: true` in development for rapid iteration
- **Connection pooling:** 20 connections max, with keep-alive and automatic reconnection
- **Cascading deletes:** Parent categories cascade to children, technique associations cascade on both sides
- **Slug generation:** Always use `generateSlug()` from `@trainhive/shared` for URL-friendly slugs
- **Unique constraints:** Most entities use (disciplineId, slug) for uniqueness, not global slugs

**Database configuration:**
- Connection via `DATABASE_URL` environment variable (defaults to local MySQL)
- Example: `mysql://trainhive_user:trainhive_password@localhost:3306/trainhive`

### Nest.js API (apps/api)

**Port:** 3001 (default)
**Base path:** `/api/v1/`
**Documentation:** http://localhost:3001/api/docs (Swagger UI)

**Architecture:**
- **Module-based structure:** Each entity has its own module (users, disciplines, categories, techniques, tags, reference-assets, curricula)
- **Service layer:** Business logic encapsulated in services
- **Controller layer:** HTTP request handling with DTOs and validation
- **DTOs:** Request/response shapes with class-validator decorators
- **OpenAPI:** Full Swagger documentation with `@ApiTags`, `@ApiOperation`, `@ApiResponse`

**CRUD Endpoints:**
All entities follow standard REST patterns:
- `GET /api/v1/{resource}` - List all (with optional query filters)
- `POST /api/v1/{resource}` - Create new
- `GET /api/v1/{resource}/{id}` - Get by ID
- `PATCH /api/v1/{resource}/{id}` - Update by ID
- `DELETE /api/v1/{resource}/{id}` - Delete by ID

**Resources:**
- `/api/v1/users` - User management
- `/api/v1/disciplines` - Martial arts disciplines
- `/api/v1/categories` - Technique categories (hierarchical)
- `/api/v1/techniques` - Techniques with category associations
- `/api/v1/tags` - Tags for techniques and assets
- `/api/v1/reference-assets` - Media assets (videos, images, links)
- `/api/v1/curricula` - Training curricula

**Key patterns:**
- **Validation:** class-validator with DTOs for all inputs
- **Error handling:** Standard HTTP status codes (400, 404, 409, 500)
- **Slug generation:** Auto-generated from name if not provided
- **Uniqueness checks:** Prevent duplicate slugs within discipline scope
- **Relationship validation:** Verify parent existence, prevent self-reference for categories

**OpenAPI Specification:**
- Located at: `apps/api/openapi.yaml`
- Covers all CRUD endpoints with request/response schemas
- Use for API client generation or integration testing

### Next.js Web App (apps/web)

**Port:** 3000 (default)
**Framework:** Next.js 15 App Router with Tailwind CSS v4

**Page structure:**
- `/` - Dashboard (requires auth)
- `/login`, `/register` - Authentication pages
- `/techniques`, `/techniques/categories` - Technique management
- `/curricula`, `/curricula/my-curricula` - Curriculum builder
- `/videos/save`, `/videos/my-videos` - Video ingestion and management

**API Routes (legacy, being migrated to Nest.js API):**
Some endpoints still exist in `apps/web/app/api/`:
- `/api/auth/[...nextauth]` - NextAuth.js authentication
- `/api/register` - User registration
- `/api/seed/disciplines` - Database seeding
- Various `/api/v1/*` routes (being phased out in favor of Nest.js API)

**Authentication:**
- NextAuth.js v4 with JWT sessions
- Session provider wraps app in `app/components/layout/Providers.tsx`
- Auth helpers: `requireAuth()`, `requireRole()`, `requireAdmin()`, etc.

**Layout hierarchy:**
1. `app/layout.tsx` - Root layout with Tailwind and Providers
2. `app/components/layout/Providers.tsx` - SessionProvider wrapper (client component)
3. `app/components/layout/AppLayout.tsx` - Protected layout with navigation

**Key patterns:**
- **wrapDb helper:** Use `wrapDb()` from `@app/lib/wrapDb` for API routes that need database access
- **Dynamic imports:** Import `@trainhive/db` dynamically in API routes to avoid bundling issues
- **Force dynamic rendering:** Use `export const dynamic = 'force-dynamic'` for routes that need runtime data

### Authentication & Authorization (packages/auth + apps/api/src/auth)

**Strategy:** OAuth2/OIDC with JWT-based sessions using NextAuth.js v4

#### Frontend Authentication (packages/auth + apps/web)

**NextAuth Configuration** (`packages/auth/src/config.ts`):
- **Providers:**
  - **CredentialsProvider**: Email/password (offline-capable, always available)
  - **GoogleProvider**: Optional OAuth (requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`)
  - **AzureADProvider**: Optional OAuth (requires `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`)
- **Session Strategy**: JWT (not database-backed)
- **Adapter**: TypeORMAdapter for OAuth account linking
- **Password Hashing**: bcryptjs with 10 salt rounds
- **Secret**: `NEXTAUTH_SECRET` environment variable (shared with API)

**JWT Claims** (enhanced with scopes):
```typescript
{
  id: string,              // User ID
  email: string,           // User email
  name: string,            // User name
  role: UserRole,          // USER | PROFESSOR | MANAGER | ADMIN
  scopes: string[],        // OAuth scopes based on role
  provider?: string,       // 'credentials' | 'google' | 'azure-ad'
  providerAccountId?: string,  // Provider's account ID
  iat: number,            // Issued at timestamp
  exp: number             // Expiration (7 days)
}
```

**Token Expiration:**
- JWT tokens: 7 days (604800 seconds)
- Session max age: 7 days

**Authorization helpers** (for Next.js API routes):
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

#### API Authentication (apps/api/src/auth)

**NestJS Authentication Module** (`apps/api/src/auth/auth.module.ts`):
- **JWT Strategy** (`jwt.strategy.ts`): Validates NextAuth JWT tokens using shared `NEXTAUTH_SECRET`
- **Passport Integration**: Uses `@nestjs/passport` and `passport-jwt`
- **Token Extraction**: Bearer token from `Authorization` header

**Global Guards** (applied in `app.module.ts`):
1. **JwtAuthGuard**: Validates JWT tokens, respects `@Public()` decorator
2. **RolesGuard**: Enforces role-based access control
3. **ScopesGuard**: Enforces OAuth scope requirements

**Custom Decorators** (`apps/api/src/auth/decorators/`):
```typescript
import { Public, Roles, Scopes, CurrentUser } from '../../auth/decorators';
import { AuthenticatedUser } from '../../auth/jwt.strategy';
import { UserRole } from '@trainhive/shared';
import { SCOPE_WRITE_DISCIPLINES } from '@trainhive/shared';

// Mark endpoint as public (no authentication required)
@Public()
@Get('health')
healthCheck() { ... }

// Require specific roles (any of the listed roles)
@Roles(UserRole.MANAGER, UserRole.ADMIN)
@Post()
create() { ... }

// Require specific OAuth scopes (all scopes must be present)
@Scopes(SCOPE_WRITE_DISCIPLINES, SCOPE_DELETE_DISCIPLINES)
@Delete(':id')
remove() { ... }

// Access authenticated user in controller methods
@Get('me')
getProfile(@CurrentUser() user: AuthenticatedUser) {
  return { userId: user.id, role: user.role, scopes: user.scopes };
}
```

#### Authorization Models

**1. Role-Based Access Control (RBAC)**

**Role Hierarchy:** ADMIN > MANAGER > PROFESSOR > USER

Role definitions and helpers in `packages/shared/src/utils/index.ts`:
- `isAdmin(role)` - Check if user is ADMIN
- `isManagerOrHigher(role)` - ADMIN or MANAGER
- `isProfessorOrHigher(role)` - ADMIN, MANAGER, or PROFESSOR

**2. OAuth Scope-Based Authorization**

Scopes defined in `packages/shared/src/constants/scopes.ts`:

**Read Scopes:**
- `read:techniques`, `read:categories`, `read:curricula`, `read:videos`
- `read:tags`, `read:disciplines`, `read:users`, `read:reference-assets`

**Write Scopes:**
- `write:techniques`, `write:categories`, `write:curricula`, `write:videos`
- `write:tags`, `write:disciplines`, `write:reference-assets`

**Delete Scopes:**
- `delete:techniques`, `delete:categories`, `delete:curricula`, `delete:videos`
- `delete:tags`, `delete:disciplines`, `delete:reference-assets`

**Admin Scopes:**
- `admin:users`, `admin:system`, `admin:roles`

**Special Scopes:**
- `write:own` - Can only write own resources
- `read:own` - Can only read own resources

**Default Scopes by Role:**
- **USER**: All read scopes + `write:own` + `read:own`
- **PROFESSOR**: USER scopes + all write scopes (techniques, categories, curricula, videos, tags, assets)
- **MANAGER**: PROFESSOR scopes + `read:users` + `write:disciplines` + all delete scopes
- **ADMIN**: All scopes

**Scope Utilities:**
```typescript
import { getScopesForRole, hasScope, hasAnyScope, hasAllScopes } from '@trainhive/shared';

// Get scopes for a user's role
const scopes = getScopesForRole(UserRole.PROFESSOR);

// Check if user has specific scope
if (hasScope(user.scopes, 'write:techniques')) { ... }

// Check if user has any of the required scopes
if (hasAnyScope(user.scopes, ['write:techniques', 'write:curricula'])) { ... }

// Check if user has all required scopes
if (hasAllScopes(user.scopes, ['read:users', 'admin:users'])) { ... }
```

**3. Resource Ownership Authorization**

Implemented in controller logic with `@CurrentUser()` decorator:
```typescript
@Patch(':id')
@ApiBearerAuth()
update(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: UpdateDto,
  @CurrentUser() user: AuthenticatedUser,
) {
  // Users can update their own resources
  const isOwn = parseInt(user.id, 10) === id;
  const isAdmin = user.role === UserRole.ADMIN;

  if (!isOwn && !isAdmin) {
    throw new ForbiddenException('You can only update your own resources');
  }

  return this.service.update(id, dto);
}
```

#### OAuth Provider Configuration

**Setting up Google OAuth** (optional):
1. Create OAuth client at https://console.cloud.google.com/apis/credentials
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Add to `.env`:
   ```bash
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

**Setting up Microsoft/Azure AD** (optional):
1. Register app at https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps
2. Redirect URI: `http://localhost:3000/api/auth/callback/azure-ad`
3. Add to `.env`:
   ```bash
   MICROSOFT_CLIENT_ID=your-microsoft-client-id
   MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
   MICROSOFT_TENANT_ID=common
   ```

#### Authentication Flow

1. **User Authentication (Frontend)**:
   - User logs in via credentials or OAuth provider
   - NextAuth creates JWT token with user info, role, and scopes
   - Token stored in session cookie

2. **API Request (Frontend → API)**:
   - Frontend sends request with JWT in `Authorization: Bearer <token>` header
   - API's JwtAuthGuard validates token using shared secret
   - User info extracted and attached to request

3. **Authorization (API)**:
   - RolesGuard checks if user has required role(s)
   - ScopesGuard checks if user has required scope(s)
   - Controller logic checks resource ownership if needed

4. **Response**:
   - If authorized: Process request and return response
   - If unauthorized: Return 401 (invalid token) or 403 (insufficient permissions)

#### Security Considerations

1. **JWT Secret**: Use strong random secret, rotate periodically
2. **Token Expiration**: 7-day tokens with automatic refresh
3. **HTTPS Only**: Enforce secure cookies in production (`secure: true`)
4. **CORS**: Whitelist specific origins, not wildcards
5. **Password Policy**: Enforce strong passwords in registration
6. **SQL Injection**: Use TypeORM parameterized queries (already done)
7. **XSS Protection**: Sanitize user inputs

#### Testing Authentication

**Public Endpoints** (no auth required):
```bash
curl http://localhost:3001/api/v1/health
curl http://localhost:3001/api/v1/disciplines
```

**Protected Endpoints** (requires JWT):
```bash
# Returns 401 Unauthorized without token
curl http://localhost:3001/api/v1/users

# With valid JWT token
curl -H "Authorization: Bearer <jwt-token>" http://localhost:3001/api/v1/users
```

**Getting a JWT Token:**
1. Login via frontend at http://localhost:3000/login
2. Use browser DevTools → Application → Cookies → `next-auth.session-token`
3. Decode JWT to get token payload (or use for API requests)

## Common Development Patterns

### Adding a Nest.js API endpoint

1. Identify which module (or create new module in `apps/api/src/modules/`)
2. Update DTO files in `dto/` folder:
   - `create-{entity}.dto.ts` - for POST requests
   - `update-{entity}.dto.ts` - for PATCH requests
3. Add method to service (`{entity}.service.ts`)
4. Add controller endpoint with decorators:
   ```typescript
   @Get(':id')
   @ApiOperation({ summary: 'Get item by ID' })
   @ApiResponse({ status: 200, description: 'Item found' })
   findOne(@Param('id', ParseIntPipe) id: number) {
     return this.service.findOne(id);
   }
   ```
5. Rebuild API and regenerate openapi.yaml

### Adding a new entity

1. Create entity file: `packages/db/src/entities/YourEntity.ts`
2. Define entity with TypeORM decorators:
   ```typescript
   import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

   @Entity('your_table_name')
   export class YourEntity {
     @PrimaryGeneratedColumn('increment')
     id: number;

     // Your columns...

     @CreateDateColumn()
     createdAt: Date;

     @UpdateDateColumn()
     updatedAt: Date;
   }
   ```
3. Export from `packages/db/src/index.ts`
4. Create Nest.js module, service, controller, and DTOs in `apps/api/src/modules/your-entity/`
5. Import module in `apps/api/src/app.module.ts`
6. Rebuild packages and API

### Working with slugs

Always use the shared slug utility:
```typescript
import { generateSlug } from '@trainhive/shared';

const slug = generateSlug('My Category Name'); // 'my-category-name'
```

Slugs are unique within a discipline scope, not globally.

### Role-based authorization

```typescript
import { UserRole, isAdmin, isManagerOrHigher, isProfessorOrHigher } from '@trainhive/shared';

// Hierarchy: ADMIN > MANAGER > PROFESSOR > USER
// Helper functions available:
// - isAdmin(role)
// - isManagerOrHigher(role)
// - isProfessorOrHigher(role)
```

## Environment Variables

Required environment variables:

```env
# Database
DATABASE_URL=mysql://trainhive_user:trainhive_password@localhost:3306/trainhive

# Auth (for Next.js web app)
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# API (optional, defaults shown)
API_PORT=3001
CORS_ORIGIN=http://localhost:3000

# Node environment
NODE_ENV=development
```

## Important Notes

1. **Two-app architecture**: Monorepo contains both Next.js web app and Nest.js API
2. **API migration**: Legacy Next.js API routes are being migrated to Nest.js API
3. **Always build packages first**: Run `npm run build` to compile packages before running apps
4. **Module resolution**: Nest.js API uses CommonJS, packages use ESM (be careful with imports)
5. **Slug uniqueness**: Slugs are unique per discipline, not globally
6. **Hierarchical categories**: Prevent self-reference and validate parent existence
7. **JWT sessions**: Sessions are JWT-based, not database-backed
8. **Auto-sync in dev**: Database schema auto-syncs in development (synchronize: true)
9. **Password security**: Use bcryptjs from `@trainhive/auth`
10. **OpenAPI documentation**: Always update openapi.yaml when adding/modifying endpoints

## Tech Stack

- **Runtime:** Node.js >=20.0.0, npm >=10.0.0
- **Web Framework:** Next.js 15.0.0 (App Router)
- **API Framework:** NestJS 10.3.0
- **Database:** MySQL 8.0+ via TypeORM 0.3.20
- **Auth:** NextAuth.js 4.24.5 with JWT sessions
- **Validation:** Zod (web) + class-validator (API)
- **API Documentation:** Swagger/OpenAPI 3.0
- **Styling:** Tailwind CSS 4.1.17
- **Language:** TypeScript 5.3.3 (strict mode)
- **Testing:** Vitest 1.2.0
- **Linting:** ESLint 8.56.0 with Airbnb config
- **Formatting:** Prettier 3.2.5
