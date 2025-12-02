# API Route Handlers

This directory contains the business logic for Next.js API routes.

## Structure

- `auth/` - Authentication handlers
- `v1/` - Legacy API route handlers

## Pattern

Route files in `src/app/api/` should be thin layers that call handlers from this directory:

```typescript
// src/app/api/auth/token/route.ts
import { handleTokenRequest } from '@/lib/api/auth/handlers';

export async function GET(request: Request) {
  return handleTokenRequest(request);
}
```

This separates routing from business logic and makes the logic testable.
