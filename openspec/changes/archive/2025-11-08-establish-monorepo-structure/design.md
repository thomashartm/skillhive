## Context

TrainHive requires three distinct applications that share common code and infrastructure:
- **Web application**: Next.js 15 frontend for desktop/web browsers
- **PWA APP**: Progressive Web App optimized for mobile devices
- **REST API**: Backend API serving both frontend applications

All three components share:
- Database schema and TypeORM entities
- Authentication logic (NextAuth.js)
- Type definitions and DTOs
- Utility functions and constants
- Testing patterns and tooling

## Goals / Non-Goals

### Goals
- Clear separation of application boundaries
- Code reuse through shared packages
- Unified dependency management
- Independent deployment capability for each app
- Consistent development tooling across all projects
- Type-safe sharing between packages

### Non-Goals
- Microservices architecture (all apps can share the same database)
- Separate repositories (monorepo only)
- Complex build orchestration (keep it simple)
- Package publishing to npm (internal packages only)

## Decisions

### Decision: Use npm workspaces for monorepo management
**Rationale**: 
- Native npm support, no additional tooling required
- Simple dependency management and linking
- Works well with Next.js and TypeScript
- Low complexity, easy to understand

**Alternatives considered**:
- **pnpm workspaces**: Better disk efficiency but adds tooling complexity
- **yarn workspaces**: Similar to npm but requires yarn installation
- **Turborepo/Nx**: Overkill for initial structure, can migrate later if needed

### Decision: Package structure: `apps/` and `packages/`
**Rationale**:
- Clear distinction between deployable apps and reusable packages
- Industry-standard convention (used by Turborepo, Nx, etc.)
- Easy to understand and navigate

**Structure**:
```
trainhive/
├── apps/
│   ├── web/          # Next.js web application
│   ├── pwa/          # PWA application
│   └── api/          # REST API backend
├── packages/
│   ├── shared/       # Shared utilities, types, constants
│   ├── db/           # Database entities, migrations, TypeORM config
│   └── auth/         # Authentication utilities
├── package.json      # Root workspace configuration
└── [other root files]
```

### Decision: Shared database package (`packages/db`)
**Rationale**:
- Single source of truth for database schema
- TypeORM entities shared across all apps
- Centralized migration management
- Type-safe database access

### Decision: TypeScript project references for type checking
**Rationale**:
- Enables incremental builds
- Type-safe imports across packages
- Better IDE support
- Standard TypeScript feature

## Risks / Trade-offs

### Risk: Dependency conflicts between apps
**Mitigation**: Use workspace protocol (`workspace:*`) for internal packages, pin external dependencies at root when possible

### Risk: Build complexity as project grows
**Mitigation**: Start simple with npm scripts, can migrate to Turborepo later if needed

### Risk: Circular dependencies between packages
**Mitigation**: Clear package boundaries, `packages/shared` should not depend on app-specific code

## Migration Plan

N/A - This is a greenfield setup. The existing README and OpenSpec structure will be preserved at the root level.

## Open Questions

- Should `apps/api` be a separate Next.js API-only project or use Next.js API routes within `apps/web`?
  - **Decision**: Start with separate `apps/api` for clear separation, can consolidate later if needed
- Should we use a shared `tsconfig.json` base or per-package configs?
  - **Decision**: Shared base config with package-specific extends for flexibility

