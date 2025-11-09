## 1. Root Workspace Setup
- [x] 1.1 Create root `package.json` with workspace configuration
- [x] 1.2 Configure npm workspaces to include `apps/*` and `packages/*`
- [x] 1.3 Set up root-level scripts for common operations (build, test, lint, format)
- [x] 1.4 Create root `.gitignore` with monorepo patterns
- [x] 1.5 Create root `.npmrc` if needed for workspace configuration

## 2. Shared Packages Structure
- [x] 2.1 Create `packages/shared/` directory with `package.json`
- [x] 2.2 Set up TypeScript configuration for `packages/shared`
- [x] 2.3 Create initial structure (types, utils, constants directories)
- [x] 2.4 Create `packages/db/` directory with `package.json`
- [x] 2.5 Set up TypeORM configuration structure in `packages/db`
- [x] 2.6 Create `packages/auth/` directory with `package.json`
- [x] 2.7 Set up authentication utilities structure in `packages/auth`

## 3. Application Projects Setup
- [x] 3.1 Create `apps/web/` directory structure for Next.js web app
- [x] 3.2 Initialize Next.js 15 project in `apps/web/` with App Router
- [x] 3.3 Configure `apps/web/package.json` with workspace dependencies
- [x] 3.4 Create `apps/pwa/` directory structure for PWA
- [x] 3.5 Initialize PWA project in `apps/pwa/` (can start as Next.js with PWA config)
- [x] 3.6 Configure `apps/pwa/package.json` with workspace dependencies
- [x] 3.7 Create `apps/api/` directory structure for REST API
- [x] 3.8 Initialize API project in `apps/api/` (Next.js API routes or Express)
- [x] 3.9 Configure `apps/api/package.json` with workspace dependencies

## 4. TypeScript Configuration
- [x] 4.1 Create root `tsconfig.json` base configuration
- [x] 4.2 Configure TypeScript project references in root `tsconfig.json`
- [x] 4.3 Create `tsconfig.json` for each app extending root config
- [x] 4.4 Create `tsconfig.json` for each package extending root config
- [x] 4.5 Verify TypeScript project references work correctly

## 5. Development Tooling
- [x] 5.1 Set up ESLint configuration at root level
- [x] 5.2 Configure Prettier at root level
- [x] 5.3 Set up Vitest configuration for testing
- [x] 5.4 Create root-level scripts for running tests across workspaces
- [x] 5.5 Configure Husky for git hooks (if needed)

## 6. Documentation
- [x] 6.1 Update root `README.md` with monorepo structure explanation
- [x] 6.2 Create `CONTRIBUTING.md` with workspace development guidelines
- [x] 6.3 Document workspace commands and common workflows
- [x] 6.4 Add package-specific README files where helpful

## 7. Validation
- [x] 7.1 Verify all workspace dependencies install correctly
- [x] 7.2 Test workspace linking (`npm install` at root)
- [x] 7.3 Verify TypeScript compilation works across all packages
- [x] 7.4 Test that apps can import from shared packages
- [x] 7.5 Run `openspec validate establish-monorepo-structure --strict`

