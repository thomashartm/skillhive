# NestJS API Module Development Guide

This guide documents mandatory requirements and best practices for all API modules to ensure consistent, secure, and functional implementations.

## Table of Contents

- [Authentication Requirements](#authentication-requirements)
- [Query Parameter Validation](#query-parameter-validation)
- [Controller Best Practices](#controller-best-practices)
- [Service Implementation](#service-implementation)
- [Common Pitfalls](#common-pitfalls)

---

## Authentication Requirements

### Global Authentication Guard

**CRITICAL:** All API endpoints are protected by a global JWT authentication guard by default. This is configured in the main application module.

### Rule: Never Skip Authentication Unless Explicitly Required

```typescript
// ❌ WRONG - Do NOT skip auth in API client calls
const response = await httpClient.get<Technique[]>(endpoint, { skipAuth: true });

// ✅ CORRECT - Let the auth guard handle authentication
const response = await httpClient.get<Technique[]>(endpoint);
```

### When to Skip Authentication

Only skip authentication for:
- Public health check endpoints
- Login/registration endpoints
- Explicitly public API endpoints (rare)

If an endpoint should be public, use the `@Public()` decorator in the controller:

```typescript
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Get('health')
healthCheck() {
  return { status: 'ok' };
}
```

### Frontend API Client Rules

1. **Default behavior:** All requests include JWT token from session
2. **Never use `skipAuth: true`** unless the endpoint is explicitly marked as `@Public()` in the controller
3. **Token handling:** Managed automatically by the HTTP client via NextAuth session

---

## Query Parameter Validation

### The ParseIntPipe Problem

**ISSUE:** Using `ParseIntPipe` with `optional: true` can cause validation errors when other query parameters are present.

```typescript
// ❌ PROBLEMATIC - Can fail when other params are present
@Get()
findAll(
  @Query('disciplineId', new ParseIntPipe({ optional: true })) disciplineId?: number,
  @Query('search') search?: string,
) {
  // When called with ?search=foo, ParseIntPipe may throw validation error
}
```

**ERROR:** `Validation failed (numeric string is expected)`

### Solution: Manual Parameter Parsing

For endpoints with **multiple optional query parameters**, especially when mixing numeric and string parameters:

```typescript
// ✅ CORRECT - Manual parsing for complex query parameters
@Get()
@ApiQuery({ name: 'disciplineId', required: false, type: Number })
@ApiQuery({ name: 'categoryId', required: false, type: Number })
@ApiQuery({ name: 'search', required: false, type: String })
@ApiQuery({ name: 'ids', required: false, type: String })
findAll(@Query() query: any) {
  // Parse numeric parameters manually
  const disciplineId = query.disciplineId ? parseInt(query.disciplineId, 10) : undefined;
  const categoryId = query.categoryId ? parseInt(query.categoryId, 10) : undefined;

  // String parameters can be used directly
  const search = query.search;
  const ids = query.ids;

  return this.service.findAll(disciplineId, categoryId, search, ids);
}
```

### When to Use ParseIntPipe

ParseIntPipe is safe to use for:

1. **Required parameters:**
```typescript
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  return this.service.findOne(id);
}
```

2. **Single optional parameter:**
```typescript
@Get()
findAll(@Query('disciplineId', new ParseIntPipe({ optional: true })) disciplineId?: number) {
  return this.service.findAll(disciplineId);
}
```

### Validation Rule Summary

| Scenario | Use ParseIntPipe? | Implementation |
|----------|-------------------|----------------|
| Required path parameter | ✅ Yes | `@Param('id', ParseIntPipe)` |
| Single optional query param | ✅ Yes | `new ParseIntPipe({ optional: true })` |
| Multiple optional query params | ❌ No | Manual parsing with `@Query() query: any` |
| Mixed numeric/string query params | ❌ No | Manual parsing with `@Query() query: any` |

---

## Controller Best Practices

### Complete Controller Template

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ExampleService } from './example.service';
import { CreateExampleDto } from './dto/create-example.dto';
import { UpdateExampleDto } from './dto/update-example.dto';

@ApiTags('examples')
@Controller('examples')
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new example' })
  @ApiResponse({ status: 201, description: 'Example created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all examples with optional filters' })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'include', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of examples' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query() query: any) {
    const categoryId = query.categoryId ? parseInt(query.categoryId, 10) : undefined;
    const search = query.search;
    const include = query.include;

    return this.exampleService.findAll(categoryId, search, include);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an example by ID' })
  @ApiResponse({ status: 200, description: 'Example found' })
  @ApiResponse({ status: 404, description: 'Example not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an example' })
  @ApiResponse({ status: 200, description: 'Example updated successfully' })
  @ApiResponse({ status: 404, description: 'Example not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateExampleDto: UpdateExampleDto,
  ) {
    return this.exampleService.update(id, updateExampleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an example' })
  @ApiResponse({ status: 200, description: 'Example deleted successfully' })
  @ApiResponse({ status: 404, description: 'Example not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.remove(id);
  }
}
```

### Required Controller Elements

1. **API Documentation:**
   - `@ApiTags()` for grouping in Swagger
   - `@ApiOperation()` for endpoint description
   - `@ApiResponse()` for all possible status codes (200, 201, 400, 401, 404, etc.)
   - `@ApiQuery()` for all query parameters

2. **Validation:**
   - DTOs for all request bodies
   - Manual parsing for complex query parameters
   - ParseIntPipe only for simple cases (see validation rules above)

3. **Error Responses:**
   - Always document 401 (Unauthorized) - global auth guard
   - Document 404 for entity-not-found scenarios
   - Document 400 for validation errors
   - Document 409 for conflict errors (duplicate slugs, etc.)

---

## Service Implementation

### Service with Query Filters

When implementing service methods that accept multiple filter parameters:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Example } from '@trainhive/db';

@Injectable()
export class ExampleService {
  constructor(
    @InjectRepository(Example)
    private exampleRepository: Repository<Example>,
  ) {}

  async findAll(
    categoryId?: number,
    tagId?: number,
    search?: string,
    ids?: string,
    include?: string,
  ): Promise<Example[]> {
    const query = this.exampleRepository.createQueryBuilder('example');

    // Filter by category (using join)
    if (categoryId) {
      query
        .innerJoin('example.categories', 'ec')
        .andWhere('ec.categoryId = :categoryId', { categoryId });
    }

    // Filter by tag (using join)
    if (tagId) {
      query
        .innerJoin('example.tags', 'et')
        .andWhere('et.tagId = :tagId', { tagId });
    }

    // Search by text fields
    if (search) {
      query.andWhere(
        '(example.name LIKE :search OR example.description LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Filter by specific IDs
    if (ids) {
      const idArray = ids
        .split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id));

      if (idArray.length > 0) {
        query.andWhere('example.id IN (:...ids)', { ids: idArray });
      }
    }

    // Include relations
    if (include) {
      const relations = include.split(',').map(r => r.trim());
      relations.forEach(relation => {
        if (relation === 'categories') {
          query
            .leftJoinAndSelect('example.categories', 'categories')
            .leftJoinAndSelect('categories.category', 'category');
        } else if (relation === 'tags') {
          query
            .leftJoinAndSelect('example.tags', 'tags')
            .leftJoinAndSelect('tags.tag', 'tag');
        }
      });
    }

    return query.orderBy('example.name', 'ASC').getMany();
  }

  async findOne(id: number): Promise<Example> {
    const example = await this.exampleRepository.findOne({ where: { id } });

    if (!example) {
      throw new NotFoundException(`Example with ID ${id} not found`);
    }

    return example;
  }
}
```

### Service Best Practices

1. **Always throw NotFoundException** when entity not found
2. **Use QueryBuilder** for complex filtering
3. **Use `andWhere`** instead of `where` for chaining conditions
4. **Validate IDs** when parsing from comma-separated strings
5. **Filter out NaN** values after parseInt
6. **Use parameterized queries** to prevent SQL injection

---

## Common Pitfalls

### 1. Authentication Issues

**Problem:** Frontend receives 401 Unauthorized errors

**Causes:**
- Using `skipAuth: true` in API client calls
- Missing or expired JWT token
- Frontend not including Authorization header

**Solution:**
- Remove `skipAuth: true` from all authenticated endpoints
- Ensure NextAuth session is valid
- Check that HTTP client includes token automatically

### 2. Query Parameter Validation Errors

**Problem:** `Validation failed (numeric string is expected)`

**Causes:**
- Using ParseIntPipe with multiple optional query parameters
- Mixing numeric and string query parameters with ParseIntPipe

**Solution:**
- Use manual parameter parsing with `@Query() query: any`
- Parse numeric parameters with `parseInt()`
- See [Query Parameter Validation](#query-parameter-validation)

### 3. Missing API Documentation

**Problem:** Swagger docs incomplete or incorrect

**Causes:**
- Missing `@ApiQuery()` decorators
- Missing `@ApiResponse()` decorators
- Incorrect parameter types in decorators

**Solution:**
- Add all decorators as shown in controller template
- Keep OpenAPI schema files updated
- Document all possible response codes

### 4. Improper Error Handling

**Problem:** Generic 500 errors instead of specific error codes

**Causes:**
- Not throwing specific NestJS exceptions
- Not validating input before processing
- Missing try-catch blocks

**Solution:**
- Use NestJS built-in exceptions:
  - `NotFoundException` → 404
  - `BadRequestException` → 400
  - `ConflictException` → 409
  - `UnauthorizedException` → 401
- Let NestJS global exception filter handle exceptions

### 5. TypeORM Query Issues

**Problem:** Queries not returning expected results

**Causes:**
- Using `where()` instead of `andWhere()` for chaining
- Not using parameterized queries
- Incorrect join types (inner vs left)

**Solution:**
- Use `andWhere()` for all filter conditions
- Always use parameterized queries: `{ parameter: value }`
- Use `innerJoin` to filter, `leftJoinAndSelect` to include

---

## Checklist for New Endpoints

Before deploying a new endpoint, verify:

- [ ] Controller has all required `@Api*` decorators
- [ ] Authentication is NOT skipped unless endpoint is `@Public()`
- [ ] Query parameters use manual parsing if multiple/mixed types
- [ ] Service throws `NotFoundException` when entity not found
- [ ] DTOs are properly validated with class-validator
- [ ] OpenAPI schema is updated (if applicable)
- [ ] Frontend API client does NOT use `skipAuth: true`
- [ ] All error responses are documented in `@ApiResponse`
- [ ] TypeORM queries use parameterized values
- [ ] Filter conditions use `andWhere()` for chaining

---

## Related Documentation

- [NestJS API Architecture](../../../../.claude/docs/architecture/nestjs-api.md)
- [Authentication & Authorization](../../../../.claude/docs/architecture/authentication.md)
- [Database Layer](../../../../.claude/docs/architecture/database.md)

---

## Questions?

When implementing new endpoints or fixing issues, refer to existing implementations:

**Good Examples:**
- `/apps/api/src/modules/techniques/techniques.controller.ts` - Query parameter handling
- `/apps/api/src/modules/curricula/curricula.controller.ts` - Complete CRUD with nested resources
- `/apps/api/src/modules/techniques/techniques.service.ts` - Complex filtering

**Frontend API Client:**
- `/apps/web/app/lib/api/resources/techniques.ts` - Proper auth handling (after fix)
- `/apps/web/app/lib/api/client.ts` - HTTP client configuration
