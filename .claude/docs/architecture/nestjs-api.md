# NestJS API Architecture

**Port:** 3001 (default)
**Base path:** `/api/v1/`
**Documentation:** http://localhost:3001/api/docs (Swagger UI)

## Architecture

### Module-based Structure
Each entity has its own module in `apps/api/src/modules/`:
- users
- disciplines
- categories
- techniques
- tags
- reference-assets
- curricula

### Layer Pattern

**Controller Layer**
- HTTP request handling
- Route definitions
- Request validation using DTOs
- Response transformation

**Service Layer**
- Business logic encapsulation
- Database operations
- Data transformation
- Error handling

**DTO Layer**
- Request/response shapes
- Class-validator decorators
- Type safety

## CRUD Endpoints

All entities follow standard REST patterns:

- `GET /api/v1/{resource}` - List all (with optional query filters)
- `POST /api/v1/{resource}` - Create new
- `GET /api/v1/{resource}/{id}` - Get by ID
- `PATCH /api/v1/{resource}/{id}` - Update by ID
- `DELETE /api/v1/{resource}/{id}` - Delete by ID

## Available Resources

- `/api/v1/users` - User management
- `/api/v1/disciplines` - Martial arts disciplines
- `/api/v1/categories` - Technique categories (hierarchical)
- `/api/v1/techniques` - Techniques with category associations
- `/api/v1/tags` - Tags for techniques and assets
- `/api/v1/reference-assets` - Media assets (videos, images, links)
- `/api/v1/curricula` - Training curricula

## Key Patterns

### Validation
class-validator with DTOs for all inputs:

```typescript
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTechniqueDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
```

### Error Handling
Standard HTTP status codes:
- 400 - Bad Request (validation errors)
- 404 - Not Found
- 409 - Conflict (duplicate slugs, etc.)
- 500 - Internal Server Error

### Slug Generation
Auto-generated from name if not provided:

```typescript
if (!dto.slug && dto.name) {
  dto.slug = generateSlug(dto.name);
}
```

### Uniqueness Checks
Prevent duplicate slugs within discipline scope:

```typescript
const existing = await this.repository.findOne({
  where: { disciplineId, slug }
});

if (existing) {
  throw new ConflictException('Slug already exists in this discipline');
}
```

### Relationship Validation
Verify parent existence, prevent self-reference for categories:

```typescript
if (dto.parentId) {
  const parent = await this.categoryRepository.findOne({
    where: { id: dto.parentId }
  });

  if (!parent) {
    throw new NotFoundException('Parent category not found');
  }

  if (dto.parentId === id) {
    throw new BadRequestException('Category cannot be its own parent');
  }
}
```

## OpenAPI Documentation

**Location:** `apps/api/openapi.yaml`

Covers all CRUD endpoints with request/response schemas. Use for:
- API client generation
- Integration testing
- Third-party integrations

### Swagger Decorators

```typescript
@ApiTags('techniques')
@Controller('techniques')
export class TechniquesController {
  @Get(':id')
  @ApiOperation({ summary: 'Get technique by ID' })
  @ApiResponse({ status: 200, description: 'Technique found', type: TechniqueDto })
  @ApiResponse({ status: 404, description: 'Technique not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
```

## Adding a NestJS API Endpoint

1. Identify which module (or create new module in `apps/api/src/modules/`)
2. Update DTO files in `dto/` folder:
   - `create-{entity}.dto.ts` - for POST requests
   - `update-{entity}.dto.ts` - for PATCH requests
3. Add method to service (`{entity}.service.ts`)
4. Add controller endpoint with decorators:
   ```typescript
   @Get(':id')
   @ApiOperation({ summary: 'Get item by ID' })
   @ApiResponse({ status: 200, description: 'Item found' })
   findOne(@Param('id', ParseIntPipe) id: number) {
     return this.service.findOne(id);
   }
   ```
5. Rebuild API and regenerate openapi.yaml

## Important Notes

1. **Module resolution**: NestJS API uses CommonJS, packages use ESM (be careful with imports)
2. **Always update openapi.yaml** when adding/modifying endpoints
3. **Use ParseIntPipe** for ID parameters to ensure type safety
4. **Implement proper error handling** in services, not controllers
5. **Use transactions** for operations that modify multiple entities
