# TrainHive API Client

Centralized, type-safe API client for the TrainHive NestJS REST API.

## Features

- ✅ **Type-safe**: Full TypeScript support with DTOs matching the NestJS API
- ✅ **Automatic authentication**: JWT tokens from NextAuth automatically included
- ✅ **Error handling**: Comprehensive error transformation and user-friendly messages
- ✅ **Retry logic**: Automatic retries for 5xx server errors
- ✅ **Request logging**: Development mode logging for debugging
- ✅ **Request cancellation**: AbortController support for in-flight requests
- ✅ **Zero dependencies**: Built on native fetch API

## Installation

No installation needed - the API client is already set up in the project.

## Configuration

Add these environment variables to your `.env` file:

```bash
# Required: Base URL for the NestJS REST API
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

# Optional: Request timeout in milliseconds (default: 30000)
NEXT_PUBLIC_API_TIMEOUT=30000

# Optional: Enable API logging (default: false, auto-enabled in development)
NEXT_PUBLIC_ENABLE_API_LOGGING=false
```

## Basic Usage

```typescript
import { apiClient } from '@/lib/backend';

// Simple API call
const disciplines = await apiClient.disciplines.list();

// With error handling
try {
  const technique = await apiClient.techniques.getById(1);
  console.log(technique);
} catch (error) {
  if (isApiError(error)) {
    console.error(error.getUserMessage());
  }
}
```

## Authentication

The API client automatically includes JWT tokens from your NextAuth session. No manual token management needed!

```typescript
// Authenticated endpoints automatically include Bearer token
const user = await apiClient.users.getMe();
const myVideos = await apiClient.videos.getMyVideos({ page: 1 });

// Public endpoints work without authentication
const disciplines = await apiClient.disciplines.list();
const categories = await apiClient.categories.list({ disciplineId: 1 });
```

## Available Resources

### Authentication

```typescript
// Login (returns JWT token compatible with NextAuth)
const response = await apiClient.auth.login({
  email: 'user@example.com',
  password: 'password123'
});
```

### Users

```typescript
// Register new user
const user = await apiClient.users.register({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'securePassword123'
});

// Get current user
const me = await apiClient.users.getMe();

// Update current user
await apiClient.users.updateMe({ name: 'Jane Doe' });

// List all users (MANAGER+ only)
const users = await apiClient.users.list();
```

### Disciplines

```typescript
// List all disciplines (public)
const disciplines = await apiClient.disciplines.list();

// Get by ID or slug (public)
const discipline = await apiClient.disciplines.getById(1);
const bjj = await apiClient.disciplines.getBySlug('brazilian-jiu-jitsu');

// Create (MANAGER+ only)
const newDiscipline = await apiClient.disciplines.create({
  name: 'Judo',
  description: 'Japanese martial art'
});

// Seed initial data (ADMIN only)
await apiClient.disciplines.seed();
```

### Categories

```typescript
// List categories (public)
const categories = await apiClient.categories.list({ disciplineId: 1 });

// Get category tree (public)
const tree = await apiClient.categories.getTree(1);

// Get single category (public)
const category = await apiClient.categories.getById(1);
const category = await apiClient.categories.getBySlug(1, 'guard-passes');

// Create (PROFESSOR+ only)
const newCategory = await apiClient.categories.create({
  disciplineId: 1,
  name: 'Submissions',
  description: 'Submission techniques'
});

// Update (PROFESSOR+ only)
await apiClient.categories.update(1, { name: 'Updated Name' });

// Delete (MANAGER+ only)
await apiClient.categories.delete(1);

// Get techniques in category (public)
const techniques = await apiClient.categories.getTechniques(1);
```

### Techniques

```typescript
// List techniques (public)
const techniques = await apiClient.techniques.list({
  disciplineId: 1,
  categoryId: 5,
  tagId: 2,
  search: 'arm bar',
  include: ['categories', 'tags', 'assets']
});

// Search techniques (public)
const results = await apiClient.techniques.search('triangle choke', 1);

// Get single technique (public)
const technique = await apiClient.techniques.getById(1, {
  include: ['categories', 'tags', 'assets']
});

// Create (PROFESSOR+ only)
const newTechnique = await apiClient.techniques.create({
  disciplineId: 1,
  name: 'Rear Naked Choke',
  description: 'A submission from back control',
  categoryIds: [1, 2],
  tagIds: [3]
});

// Update (PROFESSOR+ only)
await apiClient.techniques.update(1, { name: 'Updated Name' });

// Delete (MANAGER+ only)
await apiClient.techniques.delete(1);

// Manage categories (PROFESSOR+ only)
await apiClient.techniques.addCategory(1, 5, true); // true = primary
await apiClient.techniques.removeCategory(1, 5);
await apiClient.techniques.updateCategoryPrimary(1, 5, false);

// Manage tags (PROFESSOR+ only)
await apiClient.techniques.addTag(1, 3);
await apiClient.techniques.removeTag(1, 3);
```

### Tags

```typescript
// List tags (public)
const tags = await apiClient.tags.list({
  disciplineId: 1,
  includeUsageCount: true
});

// Get single tag (public)
const tag = await apiClient.tags.getById(1);
const tag = await apiClient.tags.getBySlug(1, 'beginner-friendly');

// Create (PROFESSOR+ only)
const newTag = await apiClient.tags.create({
  disciplineId: 1,
  name: 'Advanced',
  slug: 'advanced',
  color: '#FF5733'
});

// Update (PROFESSOR+ only)
await apiClient.tags.update(1, { color: '#00FF00' });

// Delete (MANAGER+ only)
await apiClient.tags.delete(1);
```

### Videos (Reference Assets)

```typescript
// List videos (public)
const videos = await apiClient.videos.list({
  disciplineId: 1,
  techniqueId: 5,
  search: 'tutorial',
  include: ['technique', 'categories']
});

// Get single video (public)
const video = await apiClient.videos.getById(1, {
  include: ['technique', 'categories']
});

// Get current user's videos with pagination (authenticated)
const myVideos = await apiClient.videos.getMyVideos({
  page: 1,
  limit: 20,
  title: 'tutorial',
  sortBy: 'createdAt',
  sortOrder: 'DESC'
});

// Create video (authenticated)
const newVideo = await apiClient.videos.create({
  type: 'video',
  url: 'https://youtube.com/watch?v=example',
  title: 'Triangle Choke Tutorial',
  description: 'Step by step guide',
  techniqueId: 5,
  videoType: 'instructional'
});

// Update video (owner or admin)
await apiClient.videos.update(1, { title: 'Updated Title' });

// Delete video (owner or admin)
await apiClient.videos.delete(1);
```

### Curricula

```typescript
// List curricula (authenticated)
const curricula = await apiClient.curricula.list({
  onlyMine: true, // only user's own curricula
  isPublic: false // filter by public/private
});

// Get single curriculum (authenticated)
const curriculum = await apiClient.curricula.getById(1);

// Create curriculum (authenticated)
const newCurriculum = await apiClient.curricula.create({
  title: 'BJJ Fundamentals',
  description: 'Core techniques for beginners',
  isPublic: false
});

// Update curriculum (owner or admin)
await apiClient.curricula.update(1, { title: 'Updated Title' });

// Delete curriculum (owner or admin)
await apiClient.curricula.delete(1);

// Manage curriculum elements
const elements = await apiClient.curricula.elements.list(1);

await apiClient.curricula.elements.add(1, {
  type: 'technique',
  techniqueId: 5
});

await apiClient.curricula.elements.add(1, {
  type: 'text',
  title: 'Section: Guard Passing',
  details: 'In this section we will cover...'
});

await apiClient.curricula.elements.update(1, 2, {
  title: 'Updated Title'
});

await apiClient.curricula.elements.delete(1, 2);

await apiClient.curricula.elements.reorder(1, [3, 1, 2]); // new order
```

### oEmbed

```typescript
// Fetch video metadata (public)
const metadata = await apiClient.oembed.fetch('https://youtube.com/watch?v=...');
console.log(metadata.title, metadata.author_name, metadata.thumbnail_url);
```

## Error Handling

The API client provides comprehensive error handling utilities:

```typescript
import { apiClient, ApiError, isApiError, getErrorMessage, formatErrorForDisplay } from '@/lib/backend';

try {
  const technique = await apiClient.techniques.getById(999);
} catch (error) {
  // Check if it's an API error
  if (isApiError(error)) {
    console.log('Status:', error.statusCode);
    console.log('Message:', error.message);
    console.log('URL:', error.url);

    // Check error type
    if (error.isNotFound()) {
      console.log('Technique not found');
    } else if (error.isUnauthorized()) {
      console.log('Please log in');
    } else if (error.isForbidden()) {
      console.log('You do not have permission');
    } else if (error.isValidationError()) {
      console.log('Validation errors:', error.validationErrors);
    }

    // Get user-friendly message
    const userMessage = error.getUserMessage();
    alert(userMessage);
  } else {
    // Handle other errors
    console.error('Unexpected error:', error);
  }
}
```

### Error Display Formatting

For UI components:

```typescript
import { formatErrorForDisplay } from '@/lib/backend';

try {
  await apiClient.techniques.create(data);
} catch (error) {
  const errorDisplay = formatErrorForDisplay(error);

  // Show in your UI
  showErrorModal({
    title: errorDisplay.title,
    message: errorDisplay.message,
    details: errorDisplay.details,
    showRetry: errorDisplay.canRetry
  });
}
```

## Advanced Usage

### Custom Request Configuration

```typescript
// Skip authentication
const disciplines = await httpClient.get('/disciplines', { skipAuth: true });

// Custom timeout
const data = await httpClient.get('/endpoint', { timeout: 60000 });

// Disable retry
const data = await httpClient.post('/endpoint', body, { retry: false });

// Custom headers
const data = await httpClient.get('/endpoint', {
  headers: { 'X-Custom-Header': 'value' }
});
```

### Using the HTTP Client Directly

```typescript
import { httpClient } from '@/lib/backend';

// Low-level HTTP methods
const response = await httpClient.get('/custom/endpoint');
const response = await httpClient.post('/custom/endpoint', { data: 'value' });
const response = await httpClient.patch('/custom/endpoint', { data: 'value' });
const response = await httpClient.delete('/custom/endpoint');

// Access response details
console.log(response.data);
console.log(response.status);
console.log(response.headers);
```

## Testing

When testing components that use the API client:

```typescript
import { apiClient } from '@/lib/backend';

// Mock the API client
jest.mock('@/lib/backend', () => ({
  apiClient: {
    techniques: {
      list: jest.fn(),
      getById: jest.fn(),
    },
  },
}));

// In your test
apiClient.techniques.list.mockResolvedValue([
  { id: 1, name: 'Test Technique' }
]);
```

## Troubleshooting

### API requests failing with CORS errors

Ensure the NestJS API has CORS enabled for your Next.js origin:

```env
CORS_ORIGIN=http://localhost:3000
```

### Authentication not working

1. Verify `NEXTAUTH_SECRET` is the same in both apps/web and apps/api
2. Check that NextAuth session includes the JWT token
3. Verify the JWT token is valid and not expired

### Request timeout errors

Increase the timeout in your `.env`:

```env
NEXT_PUBLIC_API_TIMEOUT=60000
```

### Cannot read API base URL

Verify `NEXT_PUBLIC_API_URL` is set in your `.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## Architecture

```
apps/web/src/lib/
├── backend/                # API Client (formerly at app/lib/api)
│   ├── http/
│   │   ├── client.ts       # Base HTTP client with fetch
│   │   └── errors.ts       # Error handling utilities
│   ├── types.ts            # Common types (RequestConfig, ApiResponse, etc.)
│   ├── resources/          # Domain-specific API clients
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── disciplines.ts
│   │   ├── categories.ts
│   │   ├── techniques.ts
│   │   ├── tags.ts
│   │   ├── videos.ts
│   │   ├── curricula.ts
│   │   └── oembed.ts
│   ├── index.ts            # Main export
│   └── README.md           # This file
├── types/
│   ├── api.ts              # DTOs matching NestJS API
│   └── index.ts
├── components/             # Shared UI components (formerly at app/components)
└── utils/                  # Utility functions
```

## Contributing

When adding new API endpoints:

1. Add DTOs to `src/lib/types/api.ts`
2. Create or update resource file in `src/lib/backend/resources/`
3. Export from `src/lib/backend/index.ts`
4. Update this README with usage examples
5. Add tests

## Related Documentation

- [NestJS API OpenAPI Spec](../../../../../apps/api/openapi.yaml)
- [Project Overview (CLAUDE.md)](../../../../../CLAUDE.md)
- [Migration Plan](../../../../../MIGRATION_PLAN.md)
