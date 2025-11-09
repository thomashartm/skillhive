## Why

Users need to register and authenticate using their existing Google or Facebook accounts through OIDC federation. This provides a seamless registration and login experience without requiring users to create and manage separate credentials. Role-based access control ensures appropriate permissions for different user types (user, admin, manager, professor).

## What Changes

- Configure NextAuth.js with Google and Facebook OIDC providers
- Implement user registration flow via OIDC federation
- Create User entity with role field (enum: user, admin, manager, professor)
- Set default role to 'user' for new registrations
- Implement login flow using federated OIDC
- Create authentication API routes and session management
- Add role-based access control utilities
- Create login/registration UI components

## Impact

- Affected specs: New capabilities `user-authentication` and `role-management`
- Affected code: User entity, authentication configuration, API routes, frontend components
- Migration: User entity already has role field; may need to set default values for existing users

