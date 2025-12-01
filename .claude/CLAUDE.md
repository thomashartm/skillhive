# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SkillHive is a training content management platform for collecting external video knowledge and instructionals and organizing them into repeatable, shareable curricula. The initial use case is creating guidance through a martial arts journey, for instance BJJ and JKD. Users can collect, organize, and share their training curriculum around existing video media.

### Key Concepts

- Techniques and skills are reflected by referenced assets, which are primarily video links
- We do not upload or host videos. We just reference streaming platforms and respect their constraints, licenses, and paywalls
- Users collect video links to all major social media platforms
- Extract and append title and metadata to organize it
- Tag the source material and categorize the videos
- Search for specific videos or video series
- Create curricula around a selected list of video instructionals

### System Design Decisions

**Web UI (Next.js):**
- Manage and organize videos, categories, tags, and curricula
- Main front-facing components and point of interaction for all user roles
- System is behind login
- Solely a frontend, interacts with API for all operations
- No database connectivity on its own
- All API calls require a valid session token reflecting user ID, role, and privileges

**API Layer (NestJS):**
- Provides backend business logic
- Responsible for CRUD operations to the database
- Expects successful session auth token
- Designed to serve multiple frontends

**Mobile App (Future):**
- Not currently in scope
- Will rely on the REST API
- Support iOS and Android

## Monorepo Structure

This is an npm workspaces monorepo with two apps and three shared packages:

**Apps:**
- `apps/web` - Next.js 15 web application (frontend + some API routes for auth)
- `apps/api` - NestJS REST API (primary CRUD API for all entities)

**Packages:**
- `packages/shared` - Foundation layer with types (UserRole), utilities (generateSlug, role helpers), and constants
- `packages/db` - TypeORM entities, migrations, and data source configuration
- `packages/auth` - NextAuth.js configuration, password hashing, and authorization helpers

**Dependency flow:** `shared` → `db` → `auth` → `apps/api` + `apps/web`

## Tech Stack

- **Runtime:** Node.js >=20.0.0, npm >=10.0.0
- **Web Framework:** Next.js 15.0.0 (App Router)
- **API Framework:** NestJS 10.3.0
- **Database:** MySQL 8.0+ via TypeORM 0.3.20
- **Auth:** NextAuth.js 4.24.5 with JWT sessions
- **Validation:** Zod (web) + class-validator (API)
- **API Documentation:** Swagger/OpenAPI 3.0
- **Styling:** Tailwind CSS 4.1.17
- **Language:** TypeScript 5.3.3 (strict mode)
- **Testing:** Vitest 1.2.0
- **Linting:** ESLint 8.56.0 with Airbnb config
- **Formatting:** Prettier 3.2.5

## Documentation

Detailed documentation is organized into focused topics:

### Architecture

- **[Database Layer](.claude/docs/architecture/database.md)** - TypeORM entities, patterns, and best practices
- **[NestJS API](.claude/docs/architecture/nestjs-api.md)** - API structure, endpoints, and conventions
- **[Next.js Web App](.claude/docs/architecture/nextjs-web.md)** - Frontend architecture and patterns
- **[Authentication & Authorization](.claude/docs/architecture/authentication.md)** - JWT, OAuth, RBAC, and scopes

### Development

- **[Development Commands](.claude/docs/development/commands.md)** - npm scripts and CLI commands
- **[Common Patterns](.claude/docs/development/patterns.md)** - Frequently used development patterns
- **[API Module Development](../apps/api/src/modules/CLAUDE.md)** - Mandatory requirements for NestJS API modules (auth, validation, best practices)

### Setup

- **[Environment Setup](.claude/docs/setup/environment.md)** - Environment variables and initial configuration

## Quick Start

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Seed the database (optional)
npm run db:seed

# Run both web app and API
npm run dev:all
```

Web app: http://localhost:3000
API: http://localhost:3001
API docs: http://localhost:3001/api/docs

## Important Notes

1. **Two-app architecture**: Monorepo contains both Next.js web app and NestJS API
2. **API migration**: Legacy Next.js API routes are being migrated to NestJS API
3. **Always build packages first**: Run `npm run build` to compile packages before running apps
4. **Module resolution**: NestJS API uses CommonJS, packages use ESM (be careful with imports)
5. **Slug uniqueness**: Slugs are unique per discipline, not globally
6. **Hierarchical categories**: Prevent self-reference and validate parent existence
7. **JWT sessions**: Sessions are JWT-based, not database-backed
8. **Auto-sync in dev**: Database schema auto-syncs in development (synchronize: true)
9. **Password security**: Use bcryptjs from `@trainhive/auth`
10. **OpenAPI documentation**: Always update openapi.yaml when adding/modifying endpoints
