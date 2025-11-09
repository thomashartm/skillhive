## Why

Developers need a local MySQL test database running in Docker for development and testing. The database should be easily manageable with scripts for schema installation and test data seeding, and controllable via Makefile commands. This enables consistent local development environments and simplifies database setup for new developers.

## What Changes

- Create Docker Compose configuration for MySQL 8 container
- Create Makefile with commands to start/stop the database container
- Create database schema installation script (using TypeORM migrations)
- Create test data seeding script
- Configure TypeORM datasource for REST API to connect to local database
- Add environment configuration for local database connection
- Document database setup and usage

## Impact

- Affected specs: New capability `database-infrastructure`
- Affected code: Docker configuration, Makefile, database scripts, TypeORM configuration, environment files
- Migration: N/A (new infrastructure)

