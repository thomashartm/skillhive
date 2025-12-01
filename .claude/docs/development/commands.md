# Development Commands

This document covers all available npm scripts for the TrainHive monorepo.

## Installation

```bash
# Install dependencies (first time setup)
npm install
```

## Build Commands

```bash
# Build all packages (required before running apps)
npm run build

# Build only packages (not apps)
npm run build:packages
```

**Important:** Always run `npm run build` before starting the apps for the first time, or after making changes to shared packages.

## Development Servers

```bash
# Run the Next.js web app in development mode
npm run dev                # Web app on http://localhost:3000

# Run the NestJS API in development mode
npm run dev:api            # API on http://localhost:3001

# Run both web app and API simultaneously
npm run dev:all
```

## Code Quality

### Linting

```bash
# Lint all workspaces
npm run lint

# Lint with auto-fix
npm run lint:fix
```

### Type Checking

```bash
# Type check all workspaces
npm run type-check
```

### Formatting

```bash
# Format all files with Prettier
npm run format

# Check formatting without making changes
npm run format:check
```

## Testing

```bash
# Run tests in all workspaces
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Database Operations

```bash
# View current database schema
npm run db:schema

# Seed the database with initial data
npm run db:seed

# Create a new migration (after entity changes)
npm run db:migration:create

# Run pending migrations
npm run db:migration:run

# Revert last migration
npm run db:migration:revert
```

## Production Build

```bash
# Build all packages and apps for production
npm run build

# Build specific app
npm run build:web
npm run build:api
```

## Workspace-Specific Commands

### Running commands in specific workspaces

```bash
# Run command in web app
npm run dev --workspace=apps/web

# Run command in API
npm run dev --workspace=apps/api

# Run command in specific package
npm run build --workspace=packages/db
```

## Common Workflows

### First Time Setup

```bash
npm install
npm run build
npm run db:seed
npm run dev:all
```

### After Pulling Changes

```bash
npm install              # Install new dependencies
npm run build           # Rebuild packages
npm run db:migration:run # Run new migrations
npm run dev:all         # Start development
```

### Before Committing

```bash
npm run lint            # Check for linting errors
npm run type-check      # Check for type errors
npm run test            # Run all tests
npm run format          # Format code
```

## Troubleshooting

### "Module not found" errors

Run `npm run build` to ensure all packages are compiled.

### Database connection errors

Check your `DATABASE_URL` in `.env` file.

### Port already in use

Kill the process using the port:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Stale build artifacts

Remove and rebuild:
```bash
npm run clean           # Remove all build artifacts
npm run build          # Rebuild everything
```
