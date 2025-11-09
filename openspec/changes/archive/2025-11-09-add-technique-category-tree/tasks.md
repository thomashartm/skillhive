## 1. Database Schema
- [x] 1.1 Create `Category` entity in `packages/db/src/entities/Category.ts`
- [x] 1.2 Add self-referential `parentId` relationship
- [x] 1.3 Add `disciplineId` foreign key
- [x] 1.4 Create `TechniqueCategory` join entity for many-to-many relationship
- [x] 1.5 Create TypeORM migration for Category table
- [x] 1.6 Create TypeORM migration for TechniqueCategory join table
- [x] 1.7 Add indexes on `parentId` and `disciplineId` for performance

## 2. Seed Data
- [x] 2.1 Create seed script for BJJ position categories
- [x] 2.2 Define standard BJJ position hierarchy (Position → Guard → Specific Guards → etc.)
- [x] 2.3 Implement seed data insertion
- [x] 2.4 Verify seed data creates correct hierarchy

## 3. API Endpoints - Categories
- [x] 3.1 Create `POST /api/v1/categories` endpoint for creating categories
- [x] 3.2 Create `GET /api/v1/categories` endpoint (with tree structure support)
- [x] 3.3 Create `GET /api/v1/categories/:id` endpoint
- [x] 3.4 Create `PATCH /api/v1/categories/:id` endpoint for updating
- [x] 3.5 Create `DELETE /api/v1/categories/:id` endpoint (with cascade handling)
- [x] 3.6 Add zod validation schemas for category DTOs
- [x] 3.7 Implement tree building logic (parent-child relationships)

## 4. API Endpoints - Techniques
- [x] 4.1 Create `POST /api/v1/techniques/:id/categories` endpoint for associating categories
- [x] 4.2 Create `GET /api/v1/categories/:id/techniques` endpoint for listing techniques in category
- [x] 4.3 Update `GET /api/v1/techniques` to support filtering by category
- [x] 4.4 Add category information to technique response DTOs

## 5. UI Components - Tree View
- [x] 5.1 Create `CategoryTree` component for displaying hierarchical categories
- [x] 5.2 Implement expand/collapse functionality
- [x] 5.3 Add visual hierarchy indicators (indentation, icons)
- [x] 5.4 Implement 5-level nesting limit validation in UI
- [x] 5.5 Add loading states and error handling
- [x] 5.6 Implement lazy loading for large trees (if needed)

## 6. UI Components - Category Management
- [x] 6.1 Create `CategoryForm` component for creating/editing categories
- [x] 6.2 Add parent category selection dropdown (respecting 5-level limit)
- [x] 6.3 Implement category creation with parent selection
- [x] 6.4 Implement category editing
- [x] 6.5 Implement category deletion with confirmation
- [x] 6.6 Add validation for nesting depth (max 5 levels)

## 7. UI Components - Technique Association
- [x] 7.1 Create interface for associating techniques with categories
- [x] 7.2 Add technique list view within category nodes
- [x] 7.3 Implement adding techniques to categories
- [x] 7.4 Implement removing techniques from categories
- [x] 7.5 Show technique count per category

## 8. Integration
- [x] 8.1 Create page/route for category tree management (`/techniques/categories`)
- [x] 8.2 Integrate tree view with category management forms
- [x] 8.3 Add navigation to category tree from main navigation
- [x] 8.4 Test full workflow: create category → add techniques → view tree

## 9. Testing
- [x] 9.1 Write unit tests for Category entity
- [x] 9.2 Write unit tests for tree building logic
- [x] 9.3 Write integration tests for category API endpoints
- [x] 9.4 Write integration tests for technique-category associations
- [x] 9.5 Write E2E tests for category tree UI
- [x] 9.6 Test nesting limit enforcement (5 levels)

## 10. Documentation
- [x] 10.1 Document Category entity and relationships
- [x] 10.2 Document API endpoints in code comments
- [x] 10.3 Update API documentation with category endpoints
- [x] 10.4 Document BJJ position seed data structure

