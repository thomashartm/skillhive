## Why

The application requires a clear separation of concerns across three high-level components (Web application, PWA APP, and REST API) while maintaining shared code, dependencies, and tooling. A monorepo structure will enable efficient development, code reuse, and unified versioning while keeping each component independently deployable.

## What Changes

- **BREAKING**: Establish monorepo root structure with workspace configuration
- Create subprojects for each high-level component:
  - `apps/web` - Next.js web application
  - `apps/pwa` - Progressive Web App for mobile
  - `apps/api` - REST API backend
- Establish shared packages structure for common code:
  - `packages/shared` - Shared utilities, types, and constants
  - `packages/db` - Database entities, migrations, and TypeORM configuration
  - `packages/auth` - Authentication utilities and shared auth logic
- Configure workspace-level tooling (build, test, lint, format)
- Set up dependency management and workspace linking
- Make sure that @alias can be properly used and configure the projects accordingly
- Allow the different high level components to build independently

## Impact

- Affected specs: New capability `project-structure`
- Affected code: Root-level configuration files, new directory structure
- Migration: N/A (greenfield project)

