## Context

The project requires:
- MySQL 8 database (mentioned in tech stack)
- TypeORM for database access
- Local development environment with Docker MySQL (mentioned in project.md)
- Database migrations via TypeORM CLI

Current state:
- No Docker configuration exists
- No Makefile exists
- Database package structure exists but no migrations or scripts
- No local database setup

## Goals / Non-Goals

### Goals
- MySQL 8 database in Docker container
- Makefile for database lifecycle management (start/stop)
- Script for installing/managing database schema (migrations)
- Script for seeding test data
- TypeORM datasource configuration for REST API
- Easy setup for new developers

### Non-Goals
- Production database setup (handled separately)
- Database backup/restore scripts (can be added later)
- Multiple database environments in Docker (single test DB)
- Database GUI tools (developers can use their own)

## Decisions

### Decision: Use Docker Compose for MySQL container
**Rationale**: 
- Standard approach for local development
- Easy to configure and manage
- Can include initialization scripts
- Works across platforms
- Matches project.md mention of "Docker MySQL"

**Configuration**:
- MySQL 8.0 image
- Persistent volume for data
- Environment variables for root password and database name
- Port mapping (3306)
- Health checks

### Decision: Makefile for database commands
**Rationale**:
- Simple, standard interface
- Easy to remember commands (`make db-start`, `make db-stop`)
- Can chain commands
- Works on Unix-like systems (macOS, Linux)

**Commands**:
- `make db-start` - Start database container
- `make db-stop` - Stop database container
- `make db-restart` - Restart database container
- `make db-status` - Check database status
- `make db-logs` - View database logs

### Decision: TypeORM migrations for schema management
**Rationale**:
- Already using TypeORM (mentioned in tech stack)
- Standard migration pattern
- Version-controlled schema changes
- Can run migrations programmatically

**Script approach**:
- Create `scripts/db/schema.ts` that runs TypeORM migrations
- Can be run via npm script or directly
- Uses TypeORM CLI or programmatic API

### Decision: Separate test data seeding script
**Rationale**:
- Schema and data are separate concerns
- Can reset data without recreating schema
- Can seed different datasets for different purposes
- Easier to maintain

**Script approach**:
- Create `scripts/db/seed.ts` for test data
- Uses TypeORM repositories to insert data
- Can be run independently of schema setup
- Includes BJJ position categories, sample techniques, etc.

### Decision: Environment-based datasource configuration
**Rationale**:
- Different connection strings for different environments
- Local development uses Docker MySQL
- Production uses managed MySQL (RDS/PlanetScale)
- Easy to switch between environments

**Configuration**:
- `.env.local` for local development
- `DATABASE_URL` environment variable
- TypeORM reads from environment
- Default to local Docker MySQL for development

### Decision: Database initialization scripts
**Rationale**:
- Need to create database and user on first run
- Can use Docker init scripts or separate setup script
- Ensures consistent initial state

**Approach**:
- Docker init script creates database and user
- Or separate setup script runs before migrations
- Handles first-time setup automatically

## Risks / Trade-offs

### Risk: Port conflicts with existing MySQL
**Mitigation**: Use non-standard port or check if port is available, document port usage

### Risk: Data persistence across container restarts
**Mitigation**: Use Docker volumes for data persistence, document volume location

### Risk: Migration script complexity
**Mitigation**: Use TypeORM CLI which handles migrations, keep script simple

### Risk: Test data script maintenance
**Mitigation**: Structure seed data clearly, use TypeScript for type safety, document data structure

## Migration Plan

1. Create Docker Compose file
2. Create Makefile with database commands
3. Create schema installation script
4. Create test data seeding script
5. Configure TypeORM datasource
6. Test full setup workflow
7. Document usage

## Open Questions

- Should the database container be part of docker-compose.yml or separate?
  - **Decision**: Use `docker-compose.yml` at root for simplicity
- What port should MySQL use?
  - **Decision**: Default 3306, but allow override via environment variable
- Should we include database reset command?
  - **Decision**: Yes, `make db-reset` to drop and recreate
- Should seed script be idempotent?
  - **Decision**: Yes, check for existing data before inserting

