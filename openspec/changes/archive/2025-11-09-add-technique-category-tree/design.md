## Context

The current data model has:
- `Technique` entity with `taxonomy JSON` field (suggests hierarchical paths)
- `Tag` entity with `parentId NULL` (could be used for categories but currently for tags)

Users need to:
- Organize techniques into hierarchical categories
- View and manage the category tree
- Associate techniques with categories at any level
- Use standard BJJ positions as default categories

## Goals / Non-Goals

### Goals
- Unlimited nesting support in database schema
- UI limits nesting to 5 levels for usability
- Standard BJJ positions as seed data
- Tree view for categories and techniques
- Ability to create, edit, delete categories and techniques
- Association of techniques with categories

### Non-Goals
- Drag-and-drop reordering in initial version (can be added later)
- Bulk import/export of categories
- Category templates or presets beyond BJJ positions
- Category-level permissions (all users see all categories)

## Decisions

### Decision: Create separate `Category` entity
**Rationale**: 
- Clear separation of concerns: Categories are organizational structures, Tags are metadata
- Categories have hierarchical relationships (parent-child), Tags may not always be hierarchical
- Easier to query and manage category trees
- Can reuse Tag entity for other tagging needs

**Alternatives considered**:
- **Use Tag entity**: Would mix organizational categories with descriptive tags, less clear separation
- **Use Technique.taxonomy JSON**: Not queryable, harder to manage relationships

### Decision: Self-referential Category entity with parentId
**Rationale**:
- Standard pattern for hierarchical data
- Supports unlimited nesting levels
- Easy to query children/parents
- Can use recursive CTEs or application-level tree building

**Schema**:
```
Category {
  id: UUID
  disciplineId: FK
  name: string
  slug: string
  parentId: FK (nullable, self-reference)
  description: text (nullable)
  ord: int (for ordering siblings)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Decision: Many-to-many relationship between Technique and Category
**Rationale**:
- Techniques can belong to multiple categories
- Categories can contain multiple techniques
- Flexible for future use cases (e.g., cross-position techniques)

**Schema**:
```
TechniqueCategory {
  techniqueId: FK
  categoryId: FK
  primary: boolean (one primary category per technique)
}
```

### Decision: UI nesting limit of 5 levels
**Rationale**:
- BJJ taxonomy typically doesn't exceed 5 levels (Position → Guard → Specific Guard → Technique Type → Specific Technique)
- UI becomes unwieldy beyond 5 levels
- Database supports unlimited nesting for future flexibility
- Can show warning/error when user tries to nest deeper than 5 levels

### Decision: Standard BJJ positions as seed data
**Rationale**:
- Provides immediate value for users
- Common starting point for BJJ practitioners
- Can be customized later by users

**Seed structure** (example):
```
Position
├── Guard
│   ├── Closed Guard
│   ├── Open Guard
│   │   ├── De La Riva Guard
│   │   ├── Spider Guard
│   │   └── ...
│   └── ...
├── Side Control
├── Mount
├── Back Control
└── ...
```

### Decision: Tree view component with expand/collapse
**Rationale**:
- Standard pattern for hierarchical data
- Allows navigation of deep trees
- Can implement lazy loading for performance
- Expand/collapse state managed per node

## Risks / Trade-offs

### Risk: Performance with deep nesting
**Mitigation**: Use recursive queries efficiently, implement pagination/lazy loading for large trees, add database indexes on parentId

### Risk: UI complexity with 5-level nesting
**Mitigation**: Use clear visual hierarchy (indentation, icons), implement expand/collapse, consider breadcrumb navigation

### Risk: Users want more than 5 levels
**Mitigation**: Database supports unlimited nesting; can increase UI limit later if needed, or allow deeper nesting with warning

### Risk: Category name conflicts
**Mitigation**: Use slug for uniqueness within parent, validate on creation, show conflicts clearly

## Migration Plan

1. Create Category entity and migration
2. Create TechniqueCategory join table and migration
3. Seed BJJ position categories
4. Create API endpoints
5. Build UI components
6. Migrate existing techniques (optional: assign to root categories)

## Open Questions

- Should categories be discipline-specific or global?
  - **Decision**: Discipline-specific (BJJ categories differ from other disciplines)
- Can techniques exist without categories?
  - **Decision**: Yes, but encourage categorization
- Should there be a "root" category level?
  - **Decision**: Yes, categories without parentId are root-level

