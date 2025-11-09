## ADDED Requirements

### Requirement: Category Entity
The system SHALL provide a `Category` entity for organizing techniques into hierarchical structures.

#### Scenario: Category creation
- **WHEN** a user creates a new category
- **THEN** the category is stored with name, slug, discipline, and optional parent category
- **AND** the category can be nested under another category (unlimited depth in database)

#### Scenario: Category hierarchy
- **WHEN** a category has a parent category
- **THEN** it forms part of a hierarchical tree structure
- **AND** categories without a parent are root-level categories
- **AND** the database supports unlimited nesting levels

### Requirement: Technique-Category Association
The system SHALL allow techniques to be associated with one or more categories.

#### Scenario: Associate technique with category
- **WHEN** a user associates a technique with a category
- **THEN** the association is stored in the database
- **AND** the technique can be associated with multiple categories
- **AND** one category can be marked as primary

#### Scenario: List techniques in category
- **WHEN** a user requests techniques for a category
- **THEN** the system returns all techniques associated with that category
- **AND** includes techniques from child categories if requested

### Requirement: Category API Endpoints
The system SHALL provide REST API endpoints for managing categories.

#### Scenario: Create category
- **WHEN** a client sends `POST /api/v1/categories` with category data
- **THEN** a new category is created
- **AND** the response includes the created category with its ID

#### Scenario: Get category tree
- **WHEN** a client sends `GET /api/v1/categories?tree=true`
- **THEN** the system returns the full category hierarchy as a tree structure
- **AND** each category includes its children recursively

#### Scenario: Update category
- **WHEN** a client sends `PATCH /api/v1/categories/:id` with updated data
- **THEN** the category is updated
- **AND** the response includes the updated category

#### Scenario: Delete category
- **WHEN** a client sends `DELETE /api/v1/categories/:id`
- **THEN** the category is deleted
- **AND** child categories are handled according to cascade rules

### Requirement: BJJ Position Seed Data
The system SHALL include seed data with standard Brazilian Jiu-Jitsu positions as default categories.

#### Scenario: Seed data exists
- **WHEN** the database is initialized
- **THEN** standard BJJ position categories are created
- **AND** the hierarchy includes Position → Guard → Specific Guards → etc.
- **AND** categories are associated with the BJJ discipline

