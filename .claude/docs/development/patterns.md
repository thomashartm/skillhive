# Common Development Patterns

This document covers frequently used patterns and best practices for developing in the TrainHive codebase.

## Working with Slugs

Always use the shared slug utility from `@trainhive/shared`:

```typescript
import { generateSlug } from '@trainhive/shared';

const slug = generateSlug('My Category Name'); // 'my-category-name'
```

**Important:**
- Slugs are unique within a discipline scope, not globally
- Auto-generated from name if not provided in DTOs
- Always lowercase with hyphens

## Role-Based Authorization

### Using Role Helpers

```typescript
import { UserRole, isAdmin, isManagerOrHigher, isProfessorOrHigher } from '@trainhive/shared';

// Hierarchy: ADMIN > MANAGER > PROFESSOR > USER

// Check if user is admin
if (isAdmin(user.role)) {
  // Admin-only logic
}

// Check if user is manager or higher
if (isManagerOrHigher(user.role)) {
  // Manager and Admin logic
}

// Check if user is professor or higher
if (isProfessorOrHigher(user.role)) {
  // Professor, Manager, and Admin logic
}
```

### In NestJS Controllers

```typescript
import { Roles } from '../../auth/decorators';
import { UserRole } from '@trainhive/shared';

@Post()
@Roles(UserRole.MANAGER, UserRole.ADMIN)
create(@Body() dto: CreateDto) {
  return this.service.create(dto);
}
```

## Adding a NestJS API Endpoint

### Step-by-Step Process

1. **Identify the module** (or create new module in `apps/api/src/modules/`)

2. **Update DTO files** in the `dto/` folder:
   ```typescript
   // create-{entity}.dto.ts
   export class CreateTechniqueDto {
     @IsString()
     @IsNotEmpty()
     name: string;

     @IsString()
     @IsOptional()
     slug?: string;
   }

   // update-{entity}.dto.ts
   export class UpdateTechniqueDto extends PartialType(CreateTechniqueDto) {}
   ```

3. **Add method to service** (`{entity}.service.ts`):
   ```typescript
   async findOne(id: number): Promise<Technique> {
     const technique = await this.repository.findOne({ where: { id } });

     if (!technique) {
       throw new NotFoundException(`Technique #${id} not found`);
     }

     return technique;
   }
   ```

4. **Add controller endpoint** with decorators:
   ```typescript
   @Get(':id')
   @ApiOperation({ summary: 'Get technique by ID' })
   @ApiResponse({ status: 200, description: 'Technique found' })
   @ApiResponse({ status: 404, description: 'Technique not found' })
   findOne(@Param('id', ParseIntPipe) id: number) {
     return this.service.findOne(id);
   }
   ```

5. **Rebuild API and regenerate OpenAPI spec**:
   ```bash
   npm run build:api
   npm run openapi:generate
   ```

## Adding a New Entity

### Complete Process

1. **Create entity file**: `packages/db/src/entities/YourEntity.ts`
   ```typescript
   import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

   @Entity('your_table_name')
   export class YourEntity {
     @PrimaryGeneratedColumn('increment')
     id: number;

     @Column({ unique: true })
     slug: string;

     @Column()
     name: string;

     @Column({ type: 'text', nullable: true })
     description: string;

     @CreateDateColumn()
     createdAt: Date;

     @UpdateDateColumn()
     updatedAt: Date;
   }
   ```

2. **Export from** `packages/db/src/index.ts`:
   ```typescript
   export { YourEntity } from './entities/YourEntity';
   ```

3. **Create NestJS module structure**:
   ```
   apps/api/src/modules/your-entity/
   ├── dto/
   │   ├── create-your-entity.dto.ts
   │   └── update-your-entity.dto.ts
   ├── your-entity.controller.ts
   ├── your-entity.service.ts
   └── your-entity.module.ts
   ```

4. **Import module** in `apps/api/src/app.module.ts`:
   ```typescript
   import { YourEntityModule } from './modules/your-entity/your-entity.module';

   @Module({
     imports: [
       // ... other modules
       YourEntityModule,
     ],
   })
   ```

5. **Rebuild packages and API**:
   ```bash
   npm run build
   ```

## Working with Database Connections

### In Next.js API Routes

Use the `wrapDb` helper:

```typescript
import { wrapDb } from '@app/lib/wrapDb';
import { Discipline } from '@trainhive/db';

export const GET = wrapDb(async (request, { db }) => {
  const repository = db.getRepository(Discipline);
  const disciplines = await repository.find();

  return Response.json(disciplines);
});
```

### In NestJS Services

Inject the repository:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Technique } from '@trainhive/db';

@Injectable()
export class TechniquesService {
  constructor(
    @InjectRepository(Technique)
    private repository: Repository<Technique>,
  ) {}

  async findAll(): Promise<Technique[]> {
    return this.repository.find();
  }
}
```

## Validation Patterns

### In DTOs (NestJS)

```typescript
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTechniqueDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  disciplineId: number;

  @IsEnum(DifficultyLevel)
  @IsOptional()
  difficulty?: DifficultyLevel;
}
```

### In Next.js (Zod)

```typescript
import { z } from 'zod';

const techniqueSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  disciplineId: z.number().int().positive(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});

// Validate
const result = techniqueSchema.safeParse(data);
if (!result.success) {
  // Handle validation errors
  console.error(result.error);
}
```

## Error Handling

### In NestJS Services

```typescript
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

async findOne(id: number): Promise<Technique> {
  const technique = await this.repository.findOne({ where: { id } });

  if (!technique) {
    throw new NotFoundException(`Technique #${id} not found`);
  }

  return technique;
}

async create(dto: CreateTechniqueDto): Promise<Technique> {
  // Check for duplicate slug
  const existing = await this.repository.findOne({
    where: { disciplineId: dto.disciplineId, slug: dto.slug }
  });

  if (existing) {
    throw new ConflictException('Technique with this slug already exists');
  }

  const technique = this.repository.create(dto);
  return this.repository.save(technique);
}
```

### In Next.js API Routes

```typescript
export const GET = wrapDb(async (request, { db }) => {
  try {
    const data = await fetchData(db);
    return Response.json(data);
  } catch (error) {
    console.error('Error fetching data:', error);
    return Response.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
});
```

## Working with Relationships

### Loading Relations

```typescript
// Load single relation
const technique = await this.repository.findOne({
  where: { id },
  relations: ['categories'],
});

// Load nested relations
const technique = await this.repository.findOne({
  where: { id },
  relations: ['categories', 'categories.parent', 'tags'],
});

// Using query builder for complex queries
const techniques = await this.repository
  .createQueryBuilder('technique')
  .leftJoinAndSelect('technique.categories', 'category')
  .where('technique.disciplineId = :disciplineId', { disciplineId })
  .getMany();
```

## Important Reminders

1. **Always build packages first**: Run `npm run build` before running apps
2. **Slugs are discipline-scoped**: Check uniqueness within discipline, not globally
3. **Use transactions** for multi-step database operations
4. **Validate parent existence**: For hierarchical entities like categories
5. **Prevent self-reference**: Categories cannot be their own parent
6. **JWT sessions**: Sessions are JWT-based, not database-backed
7. **Auto-sync in dev**: Database schema auto-syncs in development mode
8. **Password security**: Always use bcryptjs from `@trainhive/auth`
9. **Update OpenAPI**: Always regenerate openapi.yaml after API changes
10. **Module resolution**: NestJS uses CommonJS, packages use ESM
