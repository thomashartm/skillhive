## ADDED Requirements

### Requirement: OIDC Provider Configuration
The system SHALL support authentication via Google and Facebook OIDC providers.

#### Scenario: Google OIDC sign-in
- **WHEN** a user initiates sign-in with Google
- **THEN** they are redirected to Google OIDC authorization endpoint
- **AND** after authorization, they are redirected back to the application
- **AND** the system receives OIDC tokens and user information

#### Scenario: Facebook OIDC sign-in
- **WHEN** a user initiates sign-in with Facebook
- **THEN** they are redirected to Facebook OIDC authorization endpoint
- **AND** after authorization, they are redirected back to the application
- **AND** the system receives OIDC tokens and user information

### Requirement: User Registration via OIDC
The system SHALL create a user account when a user signs in with OIDC for the first time.

#### Scenario: First-time OIDC sign-in creates account
- **WHEN** a user signs in with Google or Facebook for the first time
- **THEN** a new User account is created
- **AND** user information (name, email, avatar) is extracted from OIDC provider
- **AND** the user is assigned the default role 'user'
- **AND** an Account record links the OIDC provider to the User

#### Scenario: Account linking for existing email
- **WHEN** a user signs in with a different OIDC provider but same email
- **THEN** the system links the new provider to the existing User account
- **AND** no duplicate user account is created
- **AND** the user can sign in with either provider

### Requirement: User Login via OIDC
Registered users SHALL be able to log in using federated OIDC authentication.

#### Scenario: Login with Google
- **WHEN** a registered user signs in with Google
- **THEN** the system authenticates the user via Google OIDC
- **AND** creates a JWT session
- **AND** redirects the user to the dashboard or requested page

#### Scenario: Login with Facebook
- **WHEN** a registered user signs in with Facebook
- **THEN** the system authenticates the user via Facebook OIDC
- **AND** creates a JWT session
- **AND** redirects the user to the dashboard or requested page

#### Scenario: Session creation
- **WHEN** a user successfully authenticates via OIDC
- **THEN** a JWT session is created
- **AND** the session includes user ID and role
- **AND** the session is stored and accessible for API requests

### Requirement: Authentication API Endpoints
The system SHALL provide API endpoints for authentication operations.

#### Scenario: Sign-in endpoint
- **WHEN** a client requests sign-in with an OIDC provider
- **THEN** the system initiates OIDC authorization flow
- **AND** returns redirect URL to OIDC provider

#### Scenario: Sign-out endpoint
- **WHEN** a user signs out
- **THEN** the session is invalidated
- **AND** the user is redirected to login page

#### Scenario: Session endpoint
- **WHEN** a client requests current session
- **THEN** the system returns session information including user ID and role
- **AND** returns null if no active session

