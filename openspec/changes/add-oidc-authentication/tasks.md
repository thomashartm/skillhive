## 1. Database Schema
- [x] 1.1 Update User entity with role enum ('user', 'admin', 'manager', 'professor')
- [x] 1.2 Set default role to 'user' in User entity
- [x] 1.3 Create Account entity for OIDC provider linking (provider, providerAccountId, userId)
- [x] 1.4 Create TypeORM migration for User role enum
- [x] 1.5 Create TypeORM migration for Account table (if needed)
- [x] 1.6 Add indexes on email and providerAccountId

## 2. NextAuth.js Configuration
- [x] 2.1 Install NextAuth.js and required dependencies
- [x] 2.2 Create NextAuth configuration file in `packages/auth`
- [x] 2.3 Configure Google OIDC provider
- [x] 2.4 Configure Facebook OIDC provider
- [x] 2.5 Set up JWT session strategy
- [x] 2.6 Configure database adapter for user storage
- [x] 2.7 Add callbacks for user creation and session handling

## 3. Authentication API Routes
- [x] 3.1 Create `/api/auth/[...nextauth]` route handler
- [x] 3.2 Configure NextAuth API route in Next.js app
- [x] 3.3 Add sign-in endpoint
- [x] 3.4 Add sign-out endpoint
- [x] 3.5 Add session endpoint
- [x] 3.6 Add callback handlers for OIDC providers

## 4. User Registration Flow
- [x] 4.1 Implement user creation on first OIDC sign-in
- [x] 4.2 Set default role to 'user' for new users
- [x] 4.3 Extract user info from OIDC provider (name, email, avatar)
- [x] 4.4 Handle account linking (same email, different provider)
- [x] 4.5 Create Account record linking OIDC provider to User
- [x] 4.6 Create login menu to main menu - Added Sign In/Sign Out buttons to MainNav
- [x] 4.7 Create reg menu to main menu - Registration is same as login flow (OIDC handles both)

## 5. Login Flow
- [x] 5.1 Implement OIDC sign-in flow
- [x] 5.2 Authenticate existing users via OIDC
- [x] 5.3 Create JWT session with user ID and role
- [x] 5.4 Handle OIDC callback and redirect
- [x] 5.5 Update last login timestamp - Added lastLoginAt field to User entity and update on sign-in

## 6. Role Management
- [x] 6.1 Create role enum type in shared package
- [x] 6.2 Add role validation utilities
- [x] 6.3 Create role-based access control helpers
- [x] 6.4 Add role to JWT token
- [x] 6.5 Create middleware for role-based route protection

## 7. UI Components - Login/Registration
- [x] 7.1 Create login page component (`/login`)
- [x] 7.2 Add "Sign in with Google" button
- [x] 7.3 Add "Sign in with Facebook" button
- [x] 7.4 Handle OIDC redirect flow
- [x] 7.5 Show loading states during authentication
- [x] 7.6 Display error messages for failed authentication

## 8. UI Components - Session Management
- [x] 8.1 Create session provider wrapper
- [x] 8.2 Add user profile display component
- [x] 8.3 Add sign-out button/action
- [x] 8.4 Show user role in profile (if visible)
- [x] 8.5 Handle session expiration

## 9. Integration
- [x] 9.1 Integrate authentication with protected routes
- [x] 9.2 Add authentication check to dashboard
- [x] 9.3 Update API routes to use session authentication
- [x] 9.4 Add role-based access checks to API routes - Created API helpers in `packages/auth/src/api-helpers.ts` with `requireAuth`, `requireRole`, `requireAdmin`, `requireManagerOrHigher`, `requireProfessorOrHigher` functions
- [x] 9.5 Test full authentication flow end-to-end - Middleware protects routes, redirects unauthenticated users to login

## 10. Testing
- [ ] 10.1 Write unit tests for User entity with roles
- [ ] 10.2 Write unit tests for authentication utilities
- [ ] 10.3 Write integration tests for OIDC sign-in flow
- [ ] 10.4 Write integration tests for user registration
- [ ] 10.5 Write E2E tests for login/registration
- [ ] 10.6 Test role-based access control

## 11. Documentation
- [ ] 11.1 Document OIDC provider setup (Google, Facebook)
- [ ] 11.2 Document environment variables needed
- [ ] 11.3 Document user roles and permissions
- [ ] 11.4 Update API documentation with authentication requirements

