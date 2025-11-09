# Contributing to TrainHive

## Monorepo Structure

TrainHive uses a monorepo structure managed by npm workspaces. The project is organized as follows:

```
trainhive/
├── apps/
│   ├── web/          # Next.js web application
│   ├── pwa/          # Progressive Web App for mobile
│   └── api/          # REST API backend
├── packages/
│   ├── shared/       # Shared utilities, types, constants
│   ├── db/           # Database entities, migrations, TypeORM
│   └── auth/         # Authentication utilities
└── [root config files]
```

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up local database**:
   ```bash
   # Copy environment template
   cp .env.local.example .env.local
   
   # Start MySQL database container
   make db-start
   
   # Install database schema
   make db-schema
   
   # (Optional) Seed test data
   make db-seed
   ```

3. **Build all packages**:
   ```bash
   npm run build
   ```

4. **Run development servers**:
   ```bash
   # Run all apps in development mode
   npm run dev
   
   # Or run individual apps
   cd apps/web && npm run dev
   cd apps/pwa && npm run dev
   cd apps/api && npm run dev
   ```

## Workspace Commands

### Root-level commands
- `npm run build` - Build all workspaces
- `npm run dev` - Start all development servers
- `npm run test` - Run tests across all workspaces
- `npm run lint` - Lint all workspaces
- `npm run format` - Format code with Prettier
- `npm run type-check` - Type check all TypeScript projects

### Individual workspace commands
Each workspace (app or package) can be run independently:
```bash
cd apps/web
npm run dev
npm run build
npm run lint
```

## Path Aliases

All projects support path aliases for cleaner imports:

- `@/*` - App-specific imports (e.g., `@/components/Button`)
- `@trainhive/shared` - Shared package imports
- `@trainhive/shared/*` - Shared package subpath imports
- `@trainhive/db` - Database package imports
- `@trainhive/auth` - Auth package imports

Example usage:
```typescript
import { someUtil } from '@trainhive/shared/utils';
import { User } from '@trainhive/db';
import { Button } from '@/components/Button';
```

## Independent Builds

Each high-level component (web, pwa, api) can be built independently:

```bash
# Build web app only
cd apps/web && npm run build

# Build PWA only
cd apps/pwa && npm run build

# Build API only
cd apps/api && npm run build
```

## Adding Dependencies

### To a specific workspace
```bash
cd apps/web
npm install some-package
```

### To root (shared dev dependencies)
```bash
npm install -D some-dev-tool
```

### To a package (for use by apps)
```bash
cd packages/shared
npm install some-package
```

## TypeScript Project References

The monorepo uses TypeScript project references for type-safe cross-package imports. When you modify a package:

1. Build the package: `cd packages/shared && npm run build`
2. Dependent apps will automatically pick up type changes

## Testing

Run tests from the root:
```bash
npm run test
```

Or run tests for a specific workspace:
```bash
cd apps/web
npm run test
```

## Code Style

- Use Prettier for formatting: `npm run format`
- Use ESLint for linting: `npm run lint`
- TypeScript strict mode is enabled across all projects

### Linting

The project uses Airbnb ESLint configuration for consistent code quality across all TypeScript projects.

- **Root configuration**: Base Airbnb TypeScript rules are defined in `.eslintrc.json`
- **Next.js apps**: Extend root config + Next.js `core-web-vitals` rules
- **Packages**: Extend root config

To run linting:
```bash
# Lint all workspaces
npm run lint

# Lint a specific workspace
cd apps/web && npm run lint
```

To auto-fix linting issues:
```bash
npm run lint -- --fix
```

**Reference**: [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) and [Airbnb TypeScript Style Guide](https://github.com/airbnb/javascript/tree/master/packages/eslint-config-airbnb-typescript)

## Database Management

The project uses Docker for local MySQL database management.

### Makefile Commands

- `make db-start` - Start MySQL database container
- `make db-stop` - Stop MySQL database container
- `make db-restart` - Restart database container
- `make db-status` - Check database container status
- `make db-logs` - View database logs
- `make db-reset` - Drop and recreate database (destructive)
- `make db-shell` - Access MySQL CLI
- `make db-schema` - Install database schema (run migrations)
- `make db-seed` - Seed test data

### Database Setup

1. Ensure Docker is running
2. Copy `.env.local.example` to `.env.local` and adjust if needed
3. Run `make db-start` to start the database
4. Run `make db-schema` to install schema
5. Run `make db-seed` to add test data (optional)

### Database Scripts

- `npm run db:schema` - Run schema installation script
- `npm run db:seed` - Run test data seeding script

## Development Workflow

1. Make changes in the appropriate workspace
2. Build shared packages if they changed
3. Test your changes
4. Run linting and formatting
5. Submit a pull request

