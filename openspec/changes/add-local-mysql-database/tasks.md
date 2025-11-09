## 1. Docker Configuration
- [x] 1.1 Create `docker-compose.yml` at project root
- [x] 1.2 Configure MySQL 8.0 service
- [x] 1.3 Set up environment variables (root password, database name)
- [x] 1.4 Configure persistent volume for database data
- [x] 1.5 Set up port mapping (3306)
- [x] 1.6 Add health check configuration
- [x] 1.7 Create `.env.local.example` with database configuration template

## 2. Makefile Setup
- [x] 2.1 Create `Makefile` at project root
- [x] 2.2 Add `db-start` target to start database container
- [x] 2.3 Add `db-stop` target to stop database container
- [x] 2.4 Add `db-restart` target to restart database container
- [x] 2.5 Add `db-status` target to check container status
- [x] 2.6 Add `db-logs` target to view database logs
- [x] 2.7 Add `db-reset` target to drop and recreate database
- [x] 2.8 Add `db-shell` target to access MySQL CLI

## 3. Database Schema Script
- [x] 3.1 Create `scripts/db/schema.ts` script
- [x] 3.2 Configure TypeORM datasource for script execution
- [x] 3.3 Implement migration runner using TypeORM
- [x] 3.4 Add error handling and logging
- [x] 3.5 Create npm script `db:schema` to run schema installation
- [x] 3.6 Test schema installation script

## 4. Test Data Seeding Script
- [x] 4.1 Create `scripts/db/seed.ts` script
- [x] 4.2 Configure TypeORM datasource for seeding
- [x] 4.3 Implement idempotent data insertion (check before insert) - placeholder for now
- [ ] 4.4 Add seed data for BJJ positions (from category tree proposal) - pending entities
- [ ] 4.5 Add sample techniques, users, curricula - pending entities
- [x] 4.6 Create npm script `db:seed` to run seeding
- [x] 4.7 Test seed script execution

## 5. TypeORM Datasource Configuration
- [x] 5.1 Create TypeORM datasource configuration in `packages/db`
- [x] 5.2 Configure connection to read from `DATABASE_URL` environment variable
- [x] 5.3 Set up migration paths
- [x] 5.4 Configure entity paths
- [x] 5.5 Add connection pooling settings
- [x] 5.6 Test datasource connection

## 6. Environment Configuration
- [x] 6.1 Create `.env.local.example` with database URL template
- [x] 6.2 Document required environment variables
- [x] 6.3 Add `.env.local` to `.gitignore` (if not already)
- [ ] 6.4 Create script to generate `.env.local` from template - not needed, manual copy is fine
- [x] 6.5 Document how to set up local environment

## 7. Database Initialization
- [x] 7.1 Create Docker init script or setup script for first-time database creation
- [x] 7.2 Ensure database and user are created on first run
- [x] 7.3 Test initialization flow
- [x] 7.4 Handle initialization errors gracefully

## 8. Integration with REST API
- [ ] 8.1 Configure REST API (`apps/api`) to use TypeORM datasource - pending API implementation
- [ ] 8.2 Test API connection to local database - pending API implementation
- [ ] 8.3 Verify API can read/write to database - pending API implementation
- [ ] 8.4 Test with seeded test data - pending API implementation

## 9. Documentation
- [x] 9.1 Document Docker setup in README or CONTRIBUTING.md
- [x] 9.2 Document Makefile commands
- [x] 9.3 Document schema installation process
- [x] 9.4 Document test data seeding process
- [x] 9.5 Add troubleshooting section

## 10. Testing
- [x] 10.1 Test database startup and shutdown
- [x] 10.2 Test schema installation script
- [x] 10.3 Test seed script execution
- [x] 10.4 Test database reset functionality
- [ ] 10.5 Test API connection to database - pending API implementation
- [x] 10.6 Verify data persistence across container restarts

