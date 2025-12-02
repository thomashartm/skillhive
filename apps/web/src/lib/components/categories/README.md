# Category Management System

This directory contains components for managing hierarchical categories (technique positions) in TrainHive.

## Overview

The category system allows organizing techniques into hierarchical structures, such as:
- Position → Guard → De La Riva → Sweeps

The database supports unlimited nesting levels, but the UI enforces a maximum of 5 levels for usability.

## Components

### CategoryTree
Displays a hierarchical tree of categories with expand/collapse functionality.

**Props:**
- `disciplineId?: string` - Filter categories by discipline
- `maxLevel?: number` - Maximum nesting level (default: 5)
- `onEdit?: (category: CategoryNode) => void` - Callback when editing a category
- `onDelete?: (category: CategoryNode) => void` - Callback when deleting a category
- `onAddChild?: (parentCategory: CategoryNode) => void` - Callback when adding a child category

**Usage:**
```tsx
<CategoryTree
  disciplineId="bjj-id"
  maxLevel={5}
  onEdit={(cat) => console.log('Edit:', cat)}
  onDelete={(cat) => console.log('Delete:', cat)}
  onAddChild={(parent) => console.log('Add child to:', parent)}
/>
```

### CategoryTreeNode
Individual node in the category tree (used internally by CategoryTree).

**Props:**
- `category: CategoryNode` - The category data
- `level: number` - Current nesting level (0-based)
- `maxLevel: number` - Maximum allowed nesting level
- `onEdit?: (category: CategoryNode) => void`
- `onDelete?: (category: CategoryNode) => void`
- `onAddChild?: (parentCategory: CategoryNode) => void`

### CategoryForm
Form for creating or editing categories.

**Props:**
- `category?: CategoryNode | null` - Existing category (for editing)
- `parentCategory?: CategoryNode | null` - Parent category (when creating child)
- `disciplineId: string` - Discipline ID for the category
- `onSubmit: (data: CategoryFormData) => void` - Callback on form submission
- `onCancel: () => void` - Callback on cancel

**Usage:**
```tsx
<CategoryForm
  parentCategory={parentCat}
  disciplineId="bjj-id"
  onSubmit={(data) => console.log('Submit:', data)}
  onCancel={() => console.log('Cancel')}
/>
```

### CategoryManager
Complete category management UI with tree view and modal forms.

**Props:**
- `disciplineId: string` - Discipline ID for categories
- `maxLevel?: number` - Maximum nesting level (default: 5)

**Usage:**
```tsx
<CategoryManager disciplineId="bjj-id" maxLevel={5} />
```

### TechniqueAssociation
Component for associating techniques with categories.

**Props:**
- `techniqueId: string` - ID of the technique
- `onClose?: () => void` - Callback when closing

**Usage:**
```tsx
<TechniqueAssociation
  techniqueId="technique-id"
  onClose={() => console.log('Close')}
/>
```

## API Endpoints

### Categories

- `GET /api/v1/categories` - List all categories
  - Query params: `tree=true` (return tree structure), `disciplineId=<id>` (filter by discipline)
- `POST /api/v1/categories` - Create new category
- `GET /api/v1/categories/:id` - Get category by ID
- `PATCH /api/v1/categories/:id` - Update category
- `DELETE /api/v1/categories/:id` - Delete category

### Technique-Category Associations

- `GET /api/v1/techniques/:id/categories` - Get categories for a technique
- `POST /api/v1/techniques/:id/categories` - Associate technique with category
- `DELETE /api/v1/techniques/:techniqueId/categories/:categoryId` - Remove association
- `GET /api/v1/categories/:id/techniques` - Get techniques in a category

## Database Schema

### Category Table
- `id` (UUID) - Primary key
- `disciplineId` (UUID) - Foreign key to discipline
- `name` (string) - Category name
- `slug` (string) - URL-friendly slug
- `parentId` (UUID, nullable) - Self-referential foreign key to parent category
- `description` (text, nullable) - Optional description
- `ord` (int) - Order within siblings
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### TechniqueCategory Table (Join Table)
- `techniqueId` (UUID) - Foreign key to technique
- `categoryId` (UUID) - Foreign key to category
- `primary` (boolean) - Whether this is the primary category for the technique

## Features

- **Unlimited Nesting (Database)**: Database supports unlimited hierarchical depth
- **5-Level UI Limit**: UI enforces maximum 5 levels for usability
- **Tree Navigation**: Expand/collapse nodes, visual hierarchy with indentation
- **CRUD Operations**: Create, read, update, delete categories
- **Technique Associations**: Many-to-many relationship with primary category flag
- **Seed Data**: Pre-populated with standard BJJ positions

## Standard BJJ Positions (Seed Data)

The system comes pre-seeded with these root-level positions:
1. Closing the Distance
2. Takedown
3. Guard
4. Half-Guard
5. Side Control
6. Knee on Belly
7. Mount
8. Back

