# Authentication Debugging Guide

This guide helps debug authentication issues between the Next.js web app and the NestJS API.

## Quick Diagnosis

### Step 1: Check if you're logged into the web app

1. Open the web app: http://localhost:3000
2. Make sure you're logged in (check for user name in nav bar)
3. If not logged in, go to http://localhost:3000/login

### Step 2: Check the debug endpoint

Visit: http://localhost:3000/api/auth/debug

This shows:
- Whether you have an active session
- Whether a JWT token can be generated
- Environment configuration

**Expected output (when logged in):**
```json
{
  "authenticated": true,
  "session": {
    "user": {
      "email": "admin@example.com",
      "name": "Admin",
      "role": "admin"
    }
  },
  "token": {
    "token": "eyJhbGci..."
  },
  "environment": {
    "apiUrl": "http://localhost:3001/api/v1",
    "nextAuthSecretSet": true
  }
}
```

### Step 3: Check browser console logs

1. Open browser DevTools (F12)
2. Go to Console tab
3. Try to fetch data from your app
4. Look for logs starting with `[API Client]` or `[Token Endpoint]`

**What to look for:**
- `[API Client] Token endpoint response status: 200` - Good!
- `[API Client] Token retrieved successfully` - Good!
- `[API Client] Token endpoint response status: 401` - Not logged in
- `[API Client] Failed to get auth token` - Token endpoint error

### Step 4: Check API logs

Look at your NestJS API terminal logs for:

**Good signs:**
```
[JwtStrategy] Using secret (first 20 chars): change-this-secret-i
[JwtStrategy] Validating token payload: { id: '1', email: 'admin@example.com', role: 'admin' }
[JwtStrategy] Token validated successfully for user: admin@example.com
```

**Bad signs:**
```
[JwtAuthGuard] JWT validation error: Unauthorized
[JwtStrategy] Invalid token payload - missing id or role
Error: NEXTAUTH_SECRET environment variable is not set
```

## Common Issues and Fixes

### Issue 1: "Not authenticated" or 401 errors

**Cause:** Not logged into the web app or session expired

**Fix:**
1. Go to http://localhost:3000/login
2. Login with credentials
3. Try again

### Issue 2: "NEXTAUTH_SECRET is not set"

**Cause:** Environment variable missing

**Fix:**
1. Check `.env` file exists in project root
2. Verify it contains: `NEXTAUTH_SECRET=change-this-secret-in-production-use-a-strong-random-string`
3. Restart both web app and API:
   ```bash
   # Stop both apps (Ctrl+C)
   # Then restart
   npm run dev:all
   ```

### Issue 3: Token generated but API rejects it

**Cause:** Secret mismatch between web app and API

**Fix:**
1. Verify both apps use the same `.env` file
2. Check API logs for secret (first 20 chars)
3. Check web app logs for secret (first 20 chars)
4. They must match!

### Issue 4: CORS errors

**Cause:** API not configured to accept requests from web app

**Fix:**
Already configured in `apps/api/src/main.ts`:
```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
});
```

If you're running on different ports, update `CORS_ORIGIN` in `.env`:
```
CORS_ORIGIN=http://localhost:3000
```

### Issue 5: Session cookie not found

**Cause:** NextAuth session cookies are HTTP-only and might be on different domain

**Fix:**
1. Clear browser cookies
2. Login again
3. Check DevTools → Application → Cookies → http://localhost:3000
4. Look for `next-auth.session-token` cookie

## Manual Testing with Token

If you want to test the API directly with a token:

```bash
# 1. Generate a token
make token USER_NUM=1

# 2. Copy the token

# 3. Test with curl
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:3001/api/v1/users
```

## Network Tab Inspection

1. Open DevTools → Network tab
2. Try to load data in your app
3. Look for requests to `http://localhost:3001/api/v1/...`
4. Click on a request
5. Check **Headers** tab:
   - Request Headers should include: `Authorization: Bearer eyJhbGci...`
   - If missing, the web app is not adding the token

6. Check **Response** tab:
   - 200 = Success
   - 401 = Unauthorized (token missing or invalid)
   - 403 = Forbidden (token valid but insufficient permissions)

## Check Token Payload

Use https://jwt.io to decode the JWT token and verify it contains:

```json
{
  "id": "1",
  "email": "admin@example.com",
  "name": "Admin",
  "role": "admin",
  "scopes": ["read:videos", "write:videos", ...],
  "iat": 1234567890,
  "exp": 1234567890
}
```

Required fields:
- `id` - User ID (string)
- `role` - User role (admin, manager, or user)
- `scopes` - Array of permission scopes

## Still Having Issues?

1. **Restart everything:**
   ```bash
   # Kill all processes
   pkill -f "node.*trainhive"

   # Rebuild packages
   npm run build

   # Start fresh
   npm run dev:all
   ```

2. **Check logs for both apps:**
   - Web app terminal: Look for `[Token Endpoint]` and `[API Client]` logs
   - API terminal: Look for `[JwtStrategy]` and `[JwtAuthGuard]` logs

3. **Verify environment:**
   ```bash
   # From project root
   cat .env | grep NEXTAUTH_SECRET
   cat .env | grep NEXT_PUBLIC_API_URL
   ```

4. **Test token generation manually:**
   ```bash
   # Open browser console on http://localhost:3000
   fetch('/api/auth/token', { credentials: 'include' })
     .then(r => r.json())
     .then(console.log);
   ```

## Success Checklist

✅ Logged into web app
✅ `/api/auth/debug` shows authenticated: true
✅ Browser console shows `[API Client] Token retrieved successfully`
✅ API logs show `[JwtStrategy] Token validated successfully`
✅ Network tab shows `Authorization: Bearer ...` header
✅ API requests return 200 status codes
