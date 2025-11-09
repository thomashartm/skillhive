# @trainhive/db

Database entities, migrations, and TypeORM configuration for TrainHive.

## Usage

```typescript
import { User, Category, Technique, TechniqueCategory } from '@trainhive/db';
```

## Structure

- `src/entities/` - TypeORM entities
- `src/migrations/` - Database migrations
- `src/data-source.ts` - TypeORM data source configuration

## Entities

### User
User accounts and authentication data.

### Category
Hierarchical categories for organizing techniques (e.g., Position → Guard → De La Riva).
- Supports unlimited nesting via self-referential `parentId`
- Scoped by `disciplineId`
- Ordered by `ord` field within siblings

### Technique
Martial arts techniques.
- Associated with a discipline
- Can have multiple categories (many-to-many via `TechniqueCategory`)
- Optional `taxonomy` JSON field for additional metadata

### TechniqueCategory
Join table for many-to-many relationship between techniques and categories.
- Includes `primary` flag to mark the primary category for a technique

## Migrations

Run migrations:
```bash
npm run db:migrate
```

Seed data:
```bash
npm run db:seed
```

