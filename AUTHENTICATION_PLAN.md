# Authentication Plan

**Purpose:** Guide for logging in via the web app and being authenticated in both frontend (Next.js) and API (NestJS)

**Status:** Active - NestJS API with NextAuth JWT authentication

---

## System Architecture

### Components

1. **Frontend (Next.js)** - Port 3000
   - NextAuth.js v4 with JWT session strategy
   - Session stored in HTTP-only cookies
   - Login UI at `/login`

2. **Backend (NestJS API)** - Port 3001
   - JWT validation using shared secret
   - Passport.js with JWT strategy
   - Role-based access control (RBAC)

3. **Shared Secret** - `NEXTAUTH_SECRET`
   - Used by both frontend and backend
   - Signs and verifies JWT tokens

---

## Authentication Flow

### 1. User Login (Frontend)

```
User → Login Form → NextAuth → Database → JWT Token → Session Cookie
```

**Steps:**

1. User navigates to `http://localhost:3000/login`
2. Enters email and password
3. NextAuth validates credentials against database
4. On success:
   - Creates JWT token with user info (id, email, role, scopes)
   - Stores token in HTTP-only cookie (`next-auth.session-token`)
   - Token expires in 7 days
5. User redirected to dashboard

**Login Form Location:** `/apps/web/app/login/page.tsx`

**NextAuth Configuration:** `/packages/auth/src/config.ts`

---

### 2. Frontend Session Access

**How to access session in components:**

```typescript
'use client';
import { useSession } from 'next-auth/react';

export default function MyComponent() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <div>Loading...</div>;
  if (status === 'unauthenticated') return <div>Not logged in</div>;

  return (
    <div>
      <p>Email: {session.user.email}</p>
      <p>Role: {session.user.role}</p>
    </div>
  );
}
```

**Session Data Structure:**

```typescript
{
  user: {
    id: string,
    email: string,
    name: string,
    role: 'USER' | 'PROFESSOR' | 'MANAGER' | 'ADMIN',
    scopes: string[]
  },
  expires: string // ISO date
}
```

---

### 3. API Authentication (Frontend → Backend)

**How API client sends token:**

```typescript
// Automatic - handled by httpClient
import { apiClient } from '@/lib/api';

// Token automatically attached from session
const curricula = await apiClient.curricula.list();
```

**Under the hood:**

```typescript
// apps/web/app/lib/api/client.ts (lines 65-85)
async function getAuthToken(): Promise<string | null> {
  // Fetch JWT token from custom endpoint that encodes NextAuth session
  const response = await fetch('/api/auth/token');

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.token || null;
}

// Token added to Authorization header
headers: {
  'Authorization': 'Bearer <jwt-token>'
}
```

**Token Generation Endpoint:**
- **Location:** `/apps/web/app/api/auth/token/route.ts`
- **Method:** GET
- **Authentication:** Requires NextAuth session cookie
- **Response:** `{ token: "signed-jwt-string" }`
- **Implementation:** Uses `jose` library to sign JWT with `NEXTAUTH_SECRET`

**Why a separate endpoint?**
NextAuth doesn't expose the signed JWT token in the session object. The `/api/auth/token` endpoint:
1. Reads the NextAuth session from the HTTP-only cookie
2. Extracts user data (id, email, role, scopes)
3. Signs a new JWT using the same secret as the NestJS API
4. Returns the signed JWT for API requests

---

### 4. API Token Validation (Backend)

**Flow:**

```
API Request → JwtAuthGuard → JWT Strategy → Validate Token → Attach User → Controller
```

**JWT Strategy Location:** `/apps/api/src/auth/jwt.strategy.ts`

**Validation Steps:**

1. Extract token from `Authorization: Bearer <token>` header
2. Verify token signature using `NEXTAUTH_SECRET`
3. Decode token payload
4. Attach user info to request object
5. Check roles/scopes if required

**Example Controller:**

```typescript
@Get()
@ApiBearerAuth()
@Roles(UserRole.PROFESSOR)
async findAll(@CurrentUser() user: AuthenticatedUser) {
  // user.id, user.email, user.role, user.scopes available
  return this.curriculaService.findAll(user.id);
}
```

---

## Step-by-Step Login Test

### Prerequisites

1. **Both servers running:**
   ```bash
   # Terminal 1: Next.js frontend
   npm run dev

   # Terminal 2: NestJS API
   npm run dev:api
   ```

2. **Test user exists in database:**
   ```bash
   # Create test user (if needed)
   npm run db:seed
   ```

### Test Steps

#### Step 1: Login via Web Interface

1. Open browser: `http://localhost:3000`
2. Click "Login" or navigate to `/login`
3. Enter credentials:
   ```
   Email: test@example.com
   Password: password123
   ```
4. Click "Sign In"
5. Should redirect to dashboard (`/`)

#### Step 2: Verify Frontend Session

1. Open browser DevTools (F12)
2. Go to **Application** → **Cookies** → `http://localhost:3000`
3. Look for cookie: `next-auth.session-token`
4. Cookie should be:
   - HTTP-only: Yes
   - Secure: No (localhost only)
   - Expires: ~7 days from now

#### Step 3: Test API Authentication

**Option A: Via Web App UI**

1. Navigate to `/curricula` or `/videos`
2. Data should load (proves API auth works)
3. Open DevTools → **Network** tab
4. Look for API calls to `localhost:3001`
5. Check **Request Headers** → `Authorization: Bearer ...`

**Option B: Via Browser Console**

```javascript
// Open DevTools Console
fetch('http://localhost:3001/api/v1/curricula', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  }
})
.then(r => r.json())
.then(console.log);
```

**Option C: Via curl**

1. Get JWT token from cookie (copy from DevTools)
2. Test API directly:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost:3001/api/v1/curricula
   ```

---

## Environment Variables Required

### Frontend (.env or .env.local)

```bash
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-min-32-chars

# Database
DATABASE_URL=mysql://trainhive_user:trainhive_password@localhost:3306/trainhive

# API endpoint (optional - defaults to localhost:3001)
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

# OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
```

### Backend (.env)

```bash
# JWT Secret (MUST match NEXTAUTH_SECRET)
NEXTAUTH_SECRET=your-secret-key-here-min-32-chars

# Database
DATABASE_URL=mysql://trainhive_user:trainhive_password@localhost:3306/trainhive

# Server config
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

**CRITICAL:** `NEXTAUTH_SECRET` must be identical in both frontend and backend!

---

## User Roles & Permissions

### Role Hierarchy

```
ADMIN > MANAGER > PROFESSOR > USER
```

### Default Scopes by Role

**USER:**
- All read scopes
- `write:own` (can write own resources)
- `read:own` (can read own resources)

**PROFESSOR:**
- USER scopes +
- `write:techniques`, `write:categories`, `write:curricula`
- `write:videos`, `write:tags`, `write:reference-assets`

**MANAGER:**
- PROFESSOR scopes +
- `read:users`, `write:disciplines`
- All delete scopes (techniques, categories, videos, etc.)

**ADMIN:**
- All scopes
- `admin:users`, `admin:system`, `admin:roles`

---

## Common Issues & Solutions

### Issue 1: 401 Unauthorized despite being logged in

**Symptoms:**
- User can access login page and log in successfully
- NextAuth session exists (can see session cookie)
- API calls return 401 Unauthorized

**Cause:** JWT token not being sent to API

**Solution:**
1. Verify `/api/auth/token` endpoint exists at `apps/web/app/api/auth/token/route.ts`
2. Check that API client uses the token endpoint (see `apps/web/app/lib/api/client.ts` line 65)
3. Verify `NEXTAUTH_SECRET` is set in both frontend and backend `.env` files
4. Check browser console for token fetch errors

**Debug:**
```javascript
// Test token endpoint in browser console
fetch('/api/auth/token')
  .then(r => r.json())
  .then(console.log);

// Should return: { token: "eyJhbGc..." }
```

---

### Issue 2: "Module not found: Can't resolve '@/lib/api'"

**Cause:** Path alias not configured correctly

**Solution:** Check `apps/web/tsconfig.json`:
```json
"paths": {
  "@/*": ["./app/*"]
}
```

Restart Next.js dev server after changes.

---

### Issue 3: 403 Forbidden (insufficient permissions)

**Cause:** User role doesn't have required permissions

**Solution:**

1. Check user's role in database
2. Verify endpoint's role requirements:
   ```typescript
   @Roles(UserRole.ADMIN) // Only ADMIN can access
   ```
3. Update user role if needed:
   ```sql
   UPDATE users SET role = 'ADMIN' WHERE email = 'test@example.com';
   ```

---

### Issue 4: Session not persisting (logged out on refresh)

**Possible causes:**

1. **Cookie not being set**
   - Check `NEXTAUTH_URL` matches your domain
   - Check for cookie in DevTools

2. **HTTPS mismatch in production**
   - Set `secure: true` in production
   - Use HTTPS in production

3. **Session provider not wrapped**
   - Verify `SessionProvider` in `apps/web/app/layout.tsx`

---

## Testing Checklist

- [ ] Environment variables configured (both .env files)
- [ ] Both servers running (frontend:3000, api:3001)
- [ ] Test user created in database
- [ ] Can access login page
- [ ] Can submit login form
- [ ] Redirected to dashboard after login
- [ ] Session cookie created
- [ ] API calls include Authorization header
- [ ] API returns data (not 401)
- [ ] Protected pages accessible
- [ ] Logout works correctly

---

## Security Best Practices

### Development
- ✅ HTTP-only cookies (prevents XSS)
- ✅ CORS restricted to localhost:3000
- ✅ JWT tokens expire after 7 days
- ✅ Password hashing with bcrypt (10 rounds)

### Production (TODO)
- [ ] Use HTTPS (set `secure: true` on cookies)
- [ ] Rotate `NEXTAUTH_SECRET` regularly
- [ ] Use strong, random secrets (min 32 characters)
- [ ] Whitelist specific domains in CORS
- [ ] Add rate limiting
- [ ] Add refresh token rotation
- [ ] Monitor failed login attempts

---

## API Endpoints Reference

### Authentication

- `POST /api/auth/callback/credentials` - Login (handled by NextAuth)
- `GET /api/auth/session` - Get current session
- `POST /api/auth/signout` - Logout

### Protected API Routes

All routes under `/api/v1/*` require authentication:

- `GET /api/v1/users` - List users (MANAGER+)
- `GET /api/v1/curricula` - List curricula
- `POST /api/v1/curricula` - Create curriculum
- `GET /api/v1/techniques` - List techniques
- etc.

### Public API Routes

- `GET /api/v1/disciplines` - List disciplines (no auth)
- `GET /api/v1/oembed` - Fetch video metadata (no auth)

---

## Debugging Tips

### Enable Request Logging

**Frontend API Client:**
Already enabled in development - check browser console

**Backend API:**
```typescript
// Already enabled via NestJS logger
// Check terminal output for:
// [AuthGuard] Validating JWT token...
// [JwtStrategy] Token validated for user: ...
```

### Inspect JWT Token

**Decode token (without verification):**
```javascript
// In browser console
const token = 'YOUR_TOKEN_HERE';
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(payload);
```

Should show:
```json
{
  "id": "123",
  "email": "user@example.com",
  "role": "USER",
  "scopes": ["read:techniques", "write:own", ...],
  "iat": 1234567890,
  "exp": 1234567890
}
```

---

## Next Steps

After successful authentication:

1. **Test different user roles** - Create users with PROFESSOR, MANAGER, ADMIN roles
2. **Test protected routes** - Try accessing admin-only endpoints
3. **Test OAuth login** - Configure Google/Azure AD if needed
4. **Add refresh tokens** - For longer sessions
5. **Add 2FA** - For enhanced security

---

## Support

If authentication issues persist:

1. Check both server logs (frontend terminal + API terminal)
2. Verify database connection and user exists
3. Clear browser cookies and try again
4. Ensure `NEXTAUTH_SECRET` matches in both .env files
5. Check this document for common issues

For more details, see:
- NextAuth docs: https://next-auth.js.org/
- NestJS Auth docs: https://docs.nestjs.com/security/authentication
- Project README: `/README.md`
