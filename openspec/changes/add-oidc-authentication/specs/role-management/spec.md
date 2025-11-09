## ADDED Requirements

### Requirement: User Roles
The system SHALL support user roles: user, admin, manager, and professor.

#### Scenario: Role assignment on registration
- **WHEN** a new user account is created via OIDC registration
- **THEN** the user is assigned the default role 'user'
- **AND** the role is stored in the User entity

#### Scenario: Role storage
- **WHEN** a user account exists
- **THEN** the user has exactly one role
- **AND** the role is one of: 'user', 'admin', 'manager', 'professor'
- **AND** the role is stored as an enum in the database

### Requirement: Default Role Assignment
New user registrations SHALL be assigned the default role 'user'.

#### Scenario: Default role for new users
- **WHEN** a user registers via OIDC for the first time
- **THEN** the user account is created with role 'user'
- **AND** no manual role assignment is required
- **AND** the user can access standard user features

#### Scenario: Role in session
- **WHEN** a user authenticates and a session is created
- **THEN** the user's role is included in the session/JWT token
- **AND** the role is available for authorization checks

### Requirement: Role-Based Access Control
The system SHALL use user roles for access control decisions.

#### Scenario: Role check in API
- **WHEN** an API endpoint requires a specific role
- **THEN** the system checks the user's role from the session
- **AND** allows access if role matches requirement
- **AND** denies access if role does not match

#### Scenario: Role-based UI visibility
- **WHEN** a user views the application
- **THEN** UI elements are shown/hidden based on user role
- **AND** admin/manager/professor features are only visible to users with appropriate roles

