# project-structure Specification

## Purpose
TBD - created by archiving change establish-monorepo-structure. Update Purpose after archive.
## Requirements
### Requirement: Monorepo Workspace Structure
The project SHALL be organized as a monorepo containing multiple applications and shared packages, managed through npm workspaces.

#### Scenario: Workspace root configuration
- **WHEN** a developer runs `npm install` at the project root
- **THEN** all workspace dependencies are installed and linked correctly
- **AND** internal packages are accessible to applications via workspace protocol

#### Scenario: Application isolation
- **WHEN** an application in `apps/` needs to use shared code
- **THEN** it imports from packages using workspace dependencies
- **AND** TypeScript resolves types correctly across workspace boundaries

### Requirement: Application Subprojects
The monorepo SHALL contain three distinct application subprojects, each independently deployable.

#### Scenario: Web application exists
- **WHEN** a developer navigates to `apps/web/`
- **THEN** they find a Next.js 15 application with App Router
- **AND** the application has its own `package.json` and build configuration

#### Scenario: PWA application exists
- **WHEN** a developer navigates to `apps/pwa/`
- **THEN** they find a Progressive Web App application
- **AND** the application has its own `package.json` and build configuration

#### Scenario: API application exists
- **WHEN** a developer navigates to `apps/api/`
- **THEN** they find a REST API backend application
- **AND** the application has its own `package.json` and build configuration

### Requirement: Shared Packages
The monorepo SHALL provide shared packages for common functionality used across applications.

#### Scenario: Shared utilities package
- **WHEN** an application needs common utilities or types
- **THEN** it imports from `packages/shared`
- **AND** the package exports reusable functions, types, and constants

#### Scenario: Database package
- **WHEN** an application needs database entities or migrations
- **THEN** it imports from `packages/db`
- **AND** the package provides TypeORM entities, migrations, and database configuration

#### Scenario: Authentication package
- **WHEN** an application needs authentication utilities
- **THEN** it imports from `packages/auth`
- **AND** the package provides shared authentication logic and utilities

### Requirement: TypeScript Project References
The monorepo SHALL use TypeScript project references for type-safe cross-package imports and incremental builds.

#### Scenario: Type checking across packages
- **WHEN** TypeScript compiles the project
- **THEN** it validates types across all workspace packages
- **AND** changes in shared packages are reflected in dependent applications

#### Scenario: IDE support
- **WHEN** a developer uses an IDE with TypeScript support
- **THEN** they get autocomplete and type checking for workspace packages
- **AND** navigation between packages works correctly

### Requirement: Unified Development Tooling
The monorepo SHALL provide unified tooling for building, testing, and linting across all workspaces.

#### Scenario: Root-level scripts
- **WHEN** a developer runs `npm run build` at the root
- **THEN** all applications and packages are built in the correct order
- **AND** build outputs are placed in appropriate directories

#### Scenario: Testing across workspaces
- **WHEN** a developer runs tests from the root
- **THEN** tests run for all workspaces that have test configurations
- **AND** test results are aggregated appropriately

