# Authentication & Authorization

**Strategy:** OAuth2/OIDC with JWT-based sessions using NextAuth.js v4

## Frontend Authentication (packages/auth + apps/web)

### NextAuth Configuration

**Location:** `packages/auth/src/config.ts`

**Providers:**
- **CredentialsProvider**: Email/password (offline-capable, always available)
- **GoogleProvider**: Optional OAuth (requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`)
- **AzureADProvider**: Optional OAuth (requires `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`)

**Session Strategy:** JWT (not database-backed)
**Adapter:** TypeORMAdapter for OAuth account linking
**Password Hashing:** bcryptjs with 10 salt rounds
**Secret:** `NEXTAUTH_SECRET` environment variable (shared with API)

### JWT Claims

Enhanced with scopes:

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

### Token Expiration

- JWT tokens: 7 days (604800 seconds)
- Session max age: 7 days

### Authorization Helpers (Next.js API Routes)

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

## API Authentication (apps/api/src/auth)

### NestJS Authentication Module

**Location:** `apps/api/src/auth/auth.module.ts`

**Components:**
- **JWT Strategy** (`jwt.strategy.ts`): Validates NextAuth JWT tokens using shared `NEXTAUTH_SECRET`
- **Passport Integration**: Uses `@nestjs/passport` and `passport-jwt`
- **Token Extraction**: Bearer token from `Authorization` header

### Global Guards

Applied in `app.module.ts`:

1. **JwtAuthGuard**: Validates JWT tokens, respects `@Public()` decorator
2. **RolesGuard**: Enforces role-based access control
3. **ScopesGuard**: Enforces OAuth scope requirements

### Custom Decorators

**Location:** `apps/api/src/auth/decorators/`

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

## Authorization Models

### 1. Role-Based Access Control (RBAC)

**Role Hierarchy:** ADMIN > MANAGER > PROFESSOR > USER

**Location:** `packages/shared/src/utils/index.ts`

**Helper functions:**
- `isAdmin(role)` - Check if user is ADMIN
- `isManagerOrHigher(role)` - ADMIN or MANAGER
- `isProfessorOrHigher(role)` - ADMIN, MANAGER, or PROFESSOR

**Usage:**
```typescript
import { UserRole, isAdmin, isManagerOrHigher, isProfessorOrHigher } from '@trainhive/shared';

if (isManagerOrHigher(user.role)) {
  // Allow access
}
```

### 2. OAuth Scope-Based Authorization

**Location:** `packages/shared/src/constants/scopes.ts`

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

### 3. Resource Ownership Authorization

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

## OAuth Provider Configuration

### Setting up Google OAuth (optional)

1. Create OAuth client at https://console.cloud.google.com/apis/credentials
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Add to `.env`:
   ```bash
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

### Setting up Microsoft/Azure AD (optional)

1. Register app at https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps
2. Redirect URI: `http://localhost:3000/api/auth/callback/azure-ad`
3. Add to `.env`:
   ```bash
   MICROSOFT_CLIENT_ID=your-microsoft-client-id
   MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
   MICROSOFT_TENANT_ID=common
   ```

## Authentication Flow

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

## Security Considerations

1. **JWT Secret**: Use strong random secret, rotate periodically
2. **Token Expiration**: 7-day tokens with automatic refresh
3. **HTTPS Only**: Enforce secure cookies in production (`secure: true`)
4. **CORS**: Whitelist specific origins, not wildcards
5. **Password Policy**: Enforce strong passwords in registration
6. **SQL Injection**: Use TypeORM parameterized queries (already done)
7. **XSS Protection**: Sanitize user inputs

## Testing Authentication

### Public Endpoints (no auth required)

```bash
curl http://localhost:3001/api/v1/health
curl http://localhost:3001/api/v1/disciplines
```

### Protected Endpoints (requires JWT)

```bash
# Returns 401 Unauthorized without token
curl http://localhost:3001/api/v1/users

# With valid JWT token
curl -H "Authorization: Bearer <jwt-token>" http://localhost:3001/api/v1/users
```

### Getting a JWT Token

1. Login via frontend at http://localhost:3000/login
2. Use browser DevTools → Application → Cookies → `next-auth.session-token`
3. Decode JWT to get token payload (or use for API requests)
