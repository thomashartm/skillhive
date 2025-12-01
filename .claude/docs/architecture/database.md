# Database Layer

**Technology:** TypeORM with MySQL 8.0+

## Core Entities

- `User` - Incremental ID, email (unique, indexed), role (USER/PROFESSOR/MANAGER/ADMIN), optional password
- `Account` - OAuth/OIDC provider support (for NextAuth)
- `Discipline` - Top-level martial arts discipline (BJJ, Judo, etc.), unique name and slug
- `Category` - Hierarchical (self-referential parent-child), discipline-scoped, unique (disciplineId, slug) pair
- `Technique` - Training techniques/skills, discipline-scoped with slug
- `TechniqueCategory` - Many-to-many junction between techniques and categories with primary flag
- `Tag` - Flexible tagging system, discipline-scoped with slug and color
- `TechniqueTag`, `ReferenceAssetTag` - Junction tables for tag associations
- `ReferenceAsset` - Media assets (videos, web links, images) with metadata, linked to techniques
- `Curriculum` - Training curriculum/program with title, description, and public/private visibility
- `CurriculumElement` - Elements within a curriculum (technique, asset, or text) with ordering

## Important Patterns

### Data Source Reuse
AppDataSource is globally cached to avoid multiple initializations. Always check if the connection exists before creating a new one.

### Auto-sync in Development
`synchronize: true` is enabled in development mode for rapid iteration. This automatically syncs entity changes to the database schema.

**WARNING:** Never enable synchronize in production as it can cause data loss.

### Connection Pooling
- Maximum 20 connections
- Keep-alive enabled
- Automatic reconnection on connection loss

### Cascading Deletes
- Parent categories cascade to children
- Technique associations cascade on both sides
- Configure carefully to avoid unintended data loss

### Slug Generation
Always use `generateSlug()` from `@trainhive/shared` for URL-friendly slugs:

```typescript
import { generateSlug } from '@trainhive/shared';

const slug = generateSlug('My Category Name'); // 'my-category-name'
```

### Unique Constraints
Most entities use (disciplineId, slug) for uniqueness, not global slugs. This allows:
- Same slug across different disciplines
- Better organization by discipline
- Prevents slug collisions

## Database Configuration

Connection via `DATABASE_URL` environment variable (defaults to local MySQL):

```
mysql://trainhive_user:trainhive_password@localhost:3306/trainhive
```

## Adding a New Entity

1. Create entity file: `packages/db/src/entities/YourEntity.ts`
2. Define entity with TypeORM decorators:
   ```typescript
   import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

   @Entity('your_table_name')
   export class YourEntity {
     @PrimaryGeneratedColumn('increment')
     id: number;

     // Your columns...

     @CreateDateColumn()
     createdAt: Date;

     @UpdateDateColumn()
     updatedAt: Date;
   }
   ```
3. Export from `packages/db/src/index.ts`
4. Create Nest.js module, service, controller, and DTOs in `apps/api/src/modules/your-entity/`
5. Import module in `apps/api/src/app.module.ts`
6. Rebuild packages and API

## Best Practices

1. **Always use transactions** for multi-step operations
2. **Index foreign keys** for better query performance
3. **Use soft deletes** for important data (add `deletedAt` column)
4. **Validate relationships** before creating associations
5. **Prevent self-reference** for hierarchical entities like categories
