## ADDED Requirements

### Requirement: Docker MySQL Container
The system SHALL provide a MySQL 8 database running in a Docker container for local development and testing.

#### Scenario: Start database container
- **WHEN** a developer runs `make db-start`
- **THEN** a MySQL 8 container is started
- **AND** the database is accessible on the configured port
- **AND** the database data persists in a Docker volume

#### Scenario: Stop database container
- **WHEN** a developer runs `make db-stop`
- **THEN** the MySQL container is stopped
- **AND** database data is preserved in the volume
- **AND** the container can be restarted without data loss

### Requirement: Database Schema Management
The system SHALL provide a script to install and manage database tables using TypeORM migrations.

#### Scenario: Install database schema
- **WHEN** a developer runs the schema installation script
- **THEN** all TypeORM migrations are executed
- **AND** all required database tables are created
- **AND** the database schema matches the current entity definitions

#### Scenario: Schema script execution
- **WHEN** the schema script is run
- **THEN** it connects to the local MySQL database
- **AND** runs pending migrations in order
- **AND** reports success or errors clearly
- **AND** can be run multiple times safely (idempotent)

### Requirement: Test Data Seeding
The system SHALL provide a script to seed the database with test data.

#### Scenario: Seed test data
- **WHEN** a developer runs the test data seeding script
- **THEN** test data is inserted into the database
- **AND** includes sample data for BJJ positions, techniques, users, etc.
- **AND** the script can be run multiple times safely (idempotent)

#### Scenario: Seed script execution
- **WHEN** the seed script is run
- **THEN** it connects to the local MySQL database
- **AND** checks for existing data before inserting
- **AND** inserts test data if not already present
- **AND** reports what data was created

### Requirement: Makefile Database Commands
The system SHALL provide Makefile commands for managing the database container.

#### Scenario: Start database
- **WHEN** a developer runs `make db-start`
- **THEN** the MySQL container starts if not running
- **AND** the database becomes available for connections

#### Scenario: Stop database
- **WHEN** a developer runs `make db-stop`
- **THEN** the MySQL container stops
- **AND** database connections are closed gracefully

#### Scenario: Check database status
- **WHEN** a developer runs `make db-status`
- **THEN** the system reports whether the container is running
- **AND** shows container status and port information

#### Scenario: Reset database
- **WHEN** a developer runs `make db-reset`
- **THEN** the database is dropped and recreated
- **AND** schema is reinstalled
- **AND** test data can be reseeded if needed

### Requirement: TypeORM Datasource Configuration
The REST API SHALL be configured to connect to the local MySQL database via TypeORM datasource.

#### Scenario: API connects to database
- **WHEN** the REST API starts
- **THEN** it connects to the local MySQL database using TypeORM
- **AND** the connection uses the `DATABASE_URL` environment variable
- **AND** connection errors are handled gracefully

#### Scenario: Database connection configuration
- **WHEN** the datasource is configured
- **THEN** it reads connection details from environment variables
- **AND** uses appropriate connection pooling settings
- **AND** supports both local Docker MySQL and production databases

