# ui-components Specification

## Purpose
TBD - created by archiving change add-technique-category-tree. Update Purpose after archive.
## Requirements
### Requirement: Category Tree View
The system SHALL provide a tree view UI component for displaying and navigating categories and techniques.

#### Scenario: Display category tree
- **WHEN** a user navigates to the category tree view
- **THEN** categories are displayed in a hierarchical tree structure
- **AND** each category node shows its name and technique count
- **AND** child categories are visually indented or nested

#### Scenario: Expand and collapse nodes
- **WHEN** a user clicks on a category node
- **THEN** the node expands to show its children (if any)
- **AND** clicking again collapses the node
- **AND** the expand/collapse state persists during the session

### Requirement: UI Nesting Limit
The UI SHALL limit category nesting to a maximum of 5 levels, even though the database supports unlimited nesting.

#### Scenario: Create category at level 5
- **WHEN** a user attempts to create a category at the 5th nesting level
- **THEN** the system allows the creation
- **AND** the category is saved successfully

#### Scenario: Attempt to create category beyond level 5
- **WHEN** a user attempts to create a category at the 6th nesting level
- **THEN** the UI prevents the action
- **AND** displays an error message indicating the 5-level limit
- **AND** the parent selection dropdown excludes options that would exceed the limit

### Requirement: Category Management UI
The system SHALL provide UI components for creating, editing, and deleting categories.

#### Scenario: Create category
- **WHEN** a user clicks "Create Category"
- **THEN** a form is displayed with fields for name, description, and parent category
- **AND** the parent category dropdown shows available categories respecting the 5-level limit
- **AND** upon submission, the category is created and appears in the tree

#### Scenario: Edit category
- **WHEN** a user clicks "Edit" on a category
- **THEN** a form is displayed with current category data
- **AND** the user can modify name, description, and parent category
- **AND** parent selection respects the 5-level nesting limit

#### Scenario: Delete category
- **WHEN** a user clicks "Delete" on a category
- **THEN** a confirmation dialog is shown
- **AND** if confirmed, the category is deleted
- **AND** child categories are handled according to system rules

### Requirement: Technique Association UI
The system SHALL provide UI for associating techniques with categories within the tree view.

#### Scenario: View techniques in category
- **WHEN** a user expands a category node
- **THEN** associated techniques are displayed under the category
- **AND** each technique shows its name and basic information

#### Scenario: Add technique to category
- **WHEN** a user selects "Add Technique" for a category
- **THEN** a dialog or form allows selecting existing techniques
- **AND** upon selection, the technique is associated with the category
- **AND** the technique appears in the category's technique list

#### Scenario: Remove technique from category
- **WHEN** a user removes a technique from a category
- **THEN** the association is removed
- **AND** the technique no longer appears in that category's list
- **AND** the technique remains in other categories if previously associated

