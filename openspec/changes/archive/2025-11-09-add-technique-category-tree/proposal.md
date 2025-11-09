## Why

Users need to organize techniques into hierarchical categories which are effecively base positions (e.g., Position › Guard › De La Riva › Sweeps) to create a structured taxonomy. This enables better organization, discovery, and reuse of techniques across curricula. The system should support unlimited nesting in the database for flexibility, while the UI limits nesting to 5 levels for usability.

## What Changes

- Create `Category` entity with self-referential parent relationship for unlimited nesting
- Create API endpoints for CRUD operations on categories and techniques
- Create tree view UI component for displaying and managing categories and techniques
- Implement UI-level nesting limit of 5 levels (database supports unlimited)
- Add seed data with standard BJJ positions as default categories
- Create technique-category association (many-to-many relationship)
- Implement drag-and-drop or similar interaction for organizing the tree
- Create category test data for the following high level bjj positions: Closing the Distance, Takedown, Guard, Half-Guard, Side-Control, Knee on Belly, Mount, Back

## Impact

- Affected specs: New capabilities `technique-management` and `ui-components`
- Affected code: Database entities, API routes, frontend components
- Migration: New entities and relationships; existing techniques may need category assignment

