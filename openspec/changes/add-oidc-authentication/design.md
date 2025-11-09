## Context

The current project has:
- NextAuth.js mentioned in tech stack for authentication
- User entity with role field (mentioned in data model)
- OIDC authentication requirement mentioned for API
- Federation via Google and Facebook mentioned
- Empty auth package structure

Users need to:
- Register using Google or Facebook accounts
- Login using federated OIDC
- Have role-based access (user, admin, manager, professor)
- Default role assignment for new users

## Goals / Non-Goals

### Goals
- OIDC authentication with Google and Facebook
- User registration via OIDC federation
- Role-based access control (user, admin, manager, professor)
- Default role 'user' for new registrations
- Login flow using federated OIDC
- Session management with JWT

### Non-Goals
- Email/password authentication (mentioned in project but not requested)
- Custom OIDC provider setup (only Google and Facebook)
- Role assignment UI (roles assigned by admins, not self-service)
- Multi-factor authentication
- Account linking (one OIDC account = one user account)

## Decisions

### Decision: Use NextAuth.js for OIDC authentication
**Rationale**: 
- Already mentioned in tech stack
- Well-supported OIDC provider integrations
- Handles session management
- Works with Next.js App Router
- Supports JWT sessions

**Configuration**:
- Google OIDC provider
- Facebook OIDC provider
- JWT session strategy
- Database adapter for user storage

### Decision: User role as enum
**Rationale**:
- Clear, fixed set of roles
- Easy to query and validate
- Type-safe in TypeScript
- Can extend enum later if needed

**Roles**:
- `user` - Default role, standard user permissions
- `admin` - Full system access
- `manager` - Can manage content and users
- `professor` - Can create and manage curricula/techniques

**Schema**:
```
User {
  id: UUID
  handle: string
  name: string
  email: string (unique)
  role: enum('user', 'admin', 'manager', 'professor')
  avatarUrl: string (nullable)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Decision: Default role 'user' for new registrations
**Rationale**:
- Most users are standard users
- Admin/manager/professor roles assigned by existing admins
- Prevents privilege escalation on registration
- Can be changed later by admins

### Decision: OIDC account linking to User entity
**Rationale**:
- One OIDC account (Google/Facebook) creates one User account
- Email from OIDC provider used as unique identifier
- If user registers with different provider but same email, link to existing account
- Store OIDC provider info (Google/Facebook) in account record

**Account linking approach**:
- Store `provider` and `providerAccountId` in User or separate Account table
- Use email as primary identifier for account linking
- Allow linking multiple providers to same user account (future enhancement)

### Decision: Registration and login are the same flow
**Rationale**:
- OIDC federation handles both registration and login
- First-time OIDC sign-in creates user account
- Subsequent sign-ins authenticate existing user
- No separate registration form needed

### Decision: Session management with JWT
**Rationale**:
- NextAuth.js supports JWT sessions
- Stateless authentication
- Works with API routes
- Can include role in JWT token

## Risks / Trade-offs

### Risk: OIDC provider configuration complexity
**Mitigation**: Use NextAuth.js which abstracts provider setup, document configuration clearly

### Risk: Account linking edge cases
**Mitigation**: Use email as primary identifier, handle conflicts gracefully, allow manual linking later

### Risk: Role management complexity
**Mitigation**: Start with simple enum, can add role hierarchy/permissions later

### Risk: OIDC provider changes/outages
**Mitigation**: Support multiple providers (Google + Facebook), graceful error handling

## Migration Plan

1. Configure NextAuth.js with Google and Facebook providers
2. Create/update User entity with role enum
3. Set default role in database schema
4. Create authentication API routes
5. Build login/registration UI
6. Test OIDC flows
7. Migrate existing users (if any) to have default 'user' role

## Open Questions

- Should users be able to link multiple OIDC providers to one account?
  - **Decision**: Not in initial scope, can be added later
- How are admin/manager/professor roles assigned?
  - **Decision**: By existing admins via admin interface (not in this scope)
- Should there be email verification?
  - **Decision**: OIDC providers handle email verification, no additional step needed
- What happens if OIDC provider email changes?
  - **Decision**: Use provider account ID as stable identifier, email can be updated

