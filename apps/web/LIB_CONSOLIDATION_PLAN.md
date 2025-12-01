# Web App Library Consolidation Plan

**Status:** Planning - Not Yet Implemented
**Created:** 2025-12-01
**Updated:** 2025-12-01
**Goal:** Restructure project with `src/` directory and consolidate all shared code under `src/lib/` (NOT `src/app/lib/`)

## Table of Contents

- [Overview](#overview)
- [Current Structure](#current-structure)
- [Target Structure](#target-structure)
- [Migration Steps](#migration-steps)
- [Import Path Changes](#import-path-changes)
- [File Moves](#file-moves)
- [Configuration Updates](#configuration-updates)
- [Validation](#validation)
- [Rollback Plan](#rollback-plan)

## Overview

### Problem Statement

The current structure has several organizational issues:

1. **No `src/` directory**: All code at project root makes it harder to separate source from config
2. **Confusing naming**: `app/lib/api` contains an API *client* for the NestJS backend, not API routes
3. **Unclear separation**: Components and shared code mixed with route directories
4. **Poor discoverability**: Difficult to distinguish between routes and shared modules
5. **Inconsistent patterns**: No clear convention for where to place shared code

### Solution

1. **Create `src/` directory** at project root
2. **Move `app/` into `src/app/`** - Keep only Next.js routes
3. **Create `src/lib/`** at the same level as `src/app/` - All shared code goes here
4. **Clear separation**: Routes in `src/app/`, everything else in `src/lib/`

**Key principle:** `src/lib/` is a sibling of `src/app/`, NOT a child of it.

```
apps/web/
├── src/                    # NEW: Source directory
│   ├── app/                # Next.js app (routes only)
│   └── lib/                # All shared code (sibling to app/)
├── public/
└── package.json
```

## Current Structure

```
apps/web/
├── app/                              # Next.js app directory
│   ├── api/                          # Next.js API routes (mixed with logic)
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts
│   │   │   └── token/route.ts
│   │   └── v1/
│   │       └── [...path]/route.ts
│   ├── components/                   # React components (at root level)
│   │   ├── actionbar/
│   │   ├── categories/
│   │   ├── common/
│   │   ├── curricula/
│   │   ├── dashboard/
│   │   ├── labels/
│   │   ├── layout/
│   │   ├── navigation/
│   │   ├── techniques/
│   │   └── videos/
│   ├── lib/
│   │   └── api/                      # CONFUSING: Actually NestJS backend client
│   │       ├── client.ts
│   │       ├── dtos.ts
│   │       ├── errors.ts
│   │       ├── types.ts
│   │       ├── resources/
│   │       ├── index.ts
│   │       └── README.md
│   ├── curricula/                    # Route
│   ├── videos/                       # Route
│   ├── techniques/                   # Route
│   ├── sessions/                     # Route
│   ├── register/                     # Route
│   ├── login/                        # Route
│   ├── layout.tsx
│   ├── page.tsx
│   ├── providers.tsx
│   └── globals.css
├── public/
├── package.json
└── tsconfig.json
```

### Current Import Patterns

```typescript
// Backend client (confusing name)
import { apiClient } from '@/lib/api';

// Components (at root level under app)
import { TechniqueManager } from '@/components/techniques/TechniqueManager';
import { AppLayout } from '@/components/layout/AppLayout';

// Types mixed with backend client
import type { Technique } from '@/lib/api/dtos';

// API route logic mixed with route files
// (logic embedded directly in route.ts files)
```

## Target Structure

```
apps/web/
├── src/                              # NEW: Source directory
│   ├── app/                          # Next.js app (ROUTES ONLY)
│   │   ├── api/                      # Next.js API routes (thin layer)
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/
│   │   │   │   │   └── route.ts      # Imports from @/lib/api/auth/handlers
│   │   │   │   └── token/
│   │   │   │       └── route.ts
│   │   │   └── v1/
│   │   │       └── [...path]/
│   │   │           └── route.ts
│   │   ├── curricula/                # Route: curricula pages
│   │   ├── videos/                   # Route: videos pages
│   │   ├── techniques/               # Route: techniques pages
│   │   ├── sessions/                 # Route: sessions pages
│   │   ├── register/                 # Route: register pages
│   │   ├── login/                    # Route: login pages
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Home page
│   │   ├── providers.tsx             # App providers
│   │   └── globals.css               # Global styles
│   │
│   └── lib/                          # ALL SHARED CODE (sibling to app/)
│       ├── api/                      # Next.js API route handlers (extracted logic)
│       │   ├── auth/
│       │   │   ├── handlers.ts       # Auth endpoint handlers
│       │   │   ├── jwt.ts            # JWT utilities
│       │   │   └── session.ts        # Session utilities
│       │   ├── v1/
│       │   │   └── handlers.ts       # Legacy API handlers
│       │   └── README.md
│       │
│       ├── backend/                  # NestJS backend client (RENAMED from lib/api)
│       │   ├── http/
│       │   │   ├── client.ts         # HTTP client implementation
│       │   │   └── errors.ts         # Error handling
│       │   ├── resources/            # API resource methods
│       │   │   ├── auth.ts
│       │   │   ├── categories.ts
│       │   │   ├── curricula.ts
│       │   │   ├── disciplines.ts
│       │   │   ├── oembed.ts
│       │   │   ├── tags.ts
│       │   │   ├── techniques.ts
│       │   │   ├── users.ts
│       │   │   └── videos.ts
│       │   ├── types.ts              # HTTP types (RequestConfig, etc.)
│       │   ├── index.ts              # Main export
│       │   └── README.md
│       │
│       ├── components/               # All React components
│       │   ├── actionbar/
│       │   ├── categories/
│       │   ├── common/
│       │   ├── curricula/
│       │   ├── dashboard/
│       │   ├── labels/
│       │   ├── layout/
│       │   ├── navigation/
│       │   ├── techniques/
│       │   └── videos/
│       │
│       ├── types/                    # Shared TypeScript types
│       │   ├── api.ts                # DTOs from NestJS (moved from backend/dtos.ts)
│       │   ├── models.ts             # Frontend-specific types
│       │   └── index.ts
│       │
│       └── utils/                    # Utility functions
│           ├── formatting.ts
│           ├── validation.ts
│           └── index.ts
│
├── public/                           # Static assets
├── package.json
├── tsconfig.json
├── next.config.js
└── tailwind.config.js
```

### Target Import Patterns

```typescript
// Backend client (clear naming)
import { apiClient } from '@/lib/backend';
// OR
import { backend } from '@/lib/backend';

// Components (under lib/, sibling to app/)
import { TechniqueManager } from '@/lib/components/techniques/TechniqueManager';
import { AppLayout } from '@/lib/components/layout/AppLayout';

// Types (centralized)
import type { Technique, CreateTechniqueDto } from '@/lib/types/api';
import type { User } from '@/lib/types/models';

// API handlers (extracted and testable)
import { handleTokenRequest } from '@/lib/api/auth/handlers';

// Utils
import { formatDate, validateEmail } from '@/lib/utils';
```

**Note:** All imports use `@/lib/*` because `lib/` is at `src/lib/`, not `src/app/lib/`.

## Migration Steps

### Phase 0: Create `src/` Directory Structure

This is the foundational change that enables everything else.

1. **Create `src/` directory**
   ```bash
   mkdir -p apps/web/src
   ```

2. **Move `app/` into `src/`**
   ```bash
   mv apps/web/app apps/web/src/app
   ```

3. **Update Next.js config to recognize `src/`**

   Next.js automatically recognizes `src/app/` - no config change needed!

4. **Verify the move**
   ```bash
   # Check structure
   ls -la apps/web/src/
   # Should show: app/

   # Test dev server
   npm run dev
   # Should still work with app in src/
   ```

### Phase 1: Create `src/lib/` Structure

Now that we have `src/`, create the lib directory as a sibling to app.

1. **Create new directories under `src/lib/`**
   ```bash
   mkdir -p apps/web/src/lib/backend/http
   mkdir -p apps/web/src/lib/backend/resources
   mkdir -p apps/web/src/lib/api/auth
   mkdir -p apps/web/src/lib/api/v1
   mkdir -p apps/web/src/lib/components
   mkdir -p apps/web/src/lib/types
   mkdir -p apps/web/src/lib/utils
   ```

2. **Create initial files**
   ```bash
   touch apps/web/src/lib/types/index.ts
   touch apps/web/src/lib/utils/index.ts
   touch apps/web/src/lib/api/README.md
   ```

### Phase 2: Move Backend Client

Move from `src/app/lib/api/` to `src/lib/backend/`

1. **Move and reorganize backend client files**
   ```bash
   # HTTP client and errors
   mv src/app/lib/api/client.ts src/lib/backend/http/client.ts
   mv src/app/lib/api/errors.ts src/lib/backend/http/errors.ts

   # Types
   mv src/app/lib/api/types.ts src/lib/backend/types.ts

   # Resources (all files)
   mv src/app/lib/api/resources/* src/lib/backend/resources/

   # Main exports and docs
   mv src/app/lib/api/index.ts src/lib/backend/index.ts
   mv src/app/lib/api/README.md src/lib/backend/README.md
   ```

2. **Extract DTOs to shared types**
   ```bash
   mv src/app/lib/api/dtos.ts src/lib/types/api.ts
   ```

3. **Update internal imports in backend client**

   In `src/lib/backend/http/client.ts`:
   ```typescript
   // OLD
   import { ApiError, transformError } from './errors';
   import type { RequestConfig, ApiResponse } from './types';

   // NEW
   import { ApiError, transformError } from './errors';  // Still same directory
   import type { RequestConfig, ApiResponse } from '../types';  // Now parent dir
   ```

   In `src/lib/backend/index.ts`:
   ```typescript
   // OLD
   export type * from './dtos';
   export { ApiError, getErrorMessage } from './errors';
   export { httpClient } from './client';

   // NEW
   export type * from '../types/api';
   export { ApiError, getErrorMessage } from './http/errors';
   export { httpClient } from './http/client';
   ```

4. **Remove old directory**
   ```bash
   rm -rf src/app/lib
   ```

### Phase 3: Move Components

Move from `src/app/components/` to `src/lib/components/`

1. **Move entire components directory**
   ```bash
   mv src/app/components/* src/lib/components/
   rmdir src/app/components
   ```

2. **Verify structure preserved**
   ```bash
   ls -la src/lib/components/
   # Should show: actionbar/, categories/, common/, curricula/, etc.
   ```

### Phase 4: Extract API Route Logic

Extract business logic from route files into testable handlers.

1. **Review existing API routes**
   - `src/app/api/auth/[...nextauth]/route.ts`
   - `src/app/api/auth/token/route.ts`
   - `src/app/api/v1/[...path]/route.ts`

2. **Extract token handler**

   **Before:** `src/app/api/auth/token/route.ts` (everything mixed)
   ```typescript
   import { getServerSession } from 'next-auth';
   import { NextResponse } from 'next/server';
   import { authOptions } from '@/lib/auth';

   export async function GET(request: Request) {
     const session = await getServerSession(authOptions);
     if (!session?.user?.id) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
     }

     const token = encodeJWT({
       userId: session.user.id,
       email: session.user.email,
       role: session.user.role,
     });

     return NextResponse.json({ token });
   }
   ```

   **After:** `src/app/api/auth/token/route.ts` (thin layer)
   ```typescript
   import { handleTokenRequest } from '@/lib/api/auth/handlers';

   export async function GET(request: Request) {
     return handleTokenRequest(request);
   }
   ```

   **New:** `src/lib/api/auth/handlers.ts` (testable logic)
   ```typescript
   import { getServerSession } from 'next-auth';
   import { NextResponse } from 'next/server';
   import { authOptions } from '@trainhive/auth';
   import { encodeJWT } from './jwt';

   export async function handleTokenRequest(request: Request) {
     const session = await getServerSession(authOptions);
     if (!session?.user?.id) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
     }

     const token = encodeJWT({
       userId: session.user.id,
       email: session.user.email,
       role: session.user.role,
     });

     return NextResponse.json({ token });
   }
   ```

   **New:** `src/lib/api/auth/jwt.ts` (JWT utilities)
   ```typescript
   import { sign, verify } from 'jsonwebtoken';

   export function encodeJWT(payload: any): string {
     // JWT encoding logic
   }

   export function decodeJWT(token: string): any {
     // JWT decoding logic
   }
   ```

3. **Repeat for other API routes as needed**

### Phase 5: Update All Imports

This is the most extensive phase. Need to update imports across the entire codebase.

#### Strategy

1. **Find all files with old import paths**
   ```bash
   # Backend client imports
   grep -r "from '@/lib/api'" src/ --include="*.ts" --include="*.tsx"

   # Component imports
   grep -r "from '@/components/" src/ --include="*.ts" --include="*.tsx"

   # DTO imports
   grep -r "from '@/lib/api/dtos'" src/ --include="*.ts" --include="*.tsx"
   ```

2. **Replace patterns using search/replace**

   | Old Import | New Import |
   |------------|------------|
   | `from '@/lib/api'` | `from '@/lib/backend'` |
   | `from '@/lib/api/errors'` | `from '@/lib/backend/http/errors'` |
   | `from '@/lib/api/client'` | `from '@/lib/backend/http/client'` |
   | `from '@/lib/api/dtos'` | `from '@/lib/types/api'` |
   | `from '@/components/X'` | `from '@/lib/components/X'` |

3. **Automated replacement (use with caution)**
   ```bash
   # Backend client main import
   find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' "s|from '@/lib/api'|from '@/lib/backend'|g" {} +

   # Components
   find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' "s|from '@/components/|from '@/lib/components/|g" {} +

   # DTOs
   find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' "s|from '@/lib/api/dtos'|from '@/lib/types/api'|g" {} +
   ```

4. **Manual verification**
   - Open each modified file
   - Verify imports are correct
   - Check for any edge cases

#### Files That Will Need Updates (Estimated)

- **All page components:** ~15-20 files
  - `src/app/curricula/**/*.tsx`
  - `src/app/videos/**/*.tsx`
  - `src/app/techniques/**/*.tsx`
  - etc.

- **All components:** ~30-40 files
  - Components importing other components
  - Components using backend client
  - Components using types

- **API route files:** ~5 files
  - After extracting handlers, need to import from `@/lib/api/`

### Phase 6: Update Configuration

Update TypeScript and Next.js configuration for the new structure.

1. **Update `tsconfig.json`**

   **Before:**
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./app/*"]
       }
     }
   }
   ```

   **After:**
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./src/*"]
       }
     },
     "include": [
       "next-env.d.ts",
       "**/*.ts",
       "**/*.tsx",
       ".next/types/**/*.ts",
       "src/**/*"
     ],
     "exclude": ["node_modules"]
   }
   ```

2. **Verify `next.config.js`** (usually no changes needed)

   Next.js automatically detects `src/app/` directory.

3. **Update `tailwind.config.js`**

   **Before:**
   ```javascript
   module.exports = {
     content: [
       './app/**/*.{js,ts,jsx,tsx,mdx}',
     ],
   }
   ```

   **After:**
   ```javascript
   module.exports = {
     content: [
       './src/app/**/*.{js,ts,jsx,tsx,mdx}',
       './src/lib/components/**/*.{js,ts,jsx,tsx,mdx}',
     ],
   }
   ```

4. **Update `.gitignore`** (if needed)
   ```
   # Next.js
   /.next/
   /out/

   # No changes needed - src/ is already included
   ```

### Phase 7: Update Documentation

1. **Update `README.md`**
   - Update project structure diagram
   - Update import examples
   - Update setup instructions

2. **Update `CLAUDE.md`**
   - Update architecture section
   - Update development patterns
   - Update file paths

3. **Update backend client README**
   - `src/lib/backend/README.md`
   - Update all import examples
   - Update file paths

4. **Update this plan**
   - Mark as "Implemented"
   - Add implementation date
   - Document any deviations

### Phase 8: Clean Up

1. **Verify old directories are removed**
   ```bash
   # These should NOT exist
   ls src/app/lib          # Should be error: No such file or directory
   ls src/app/components   # Should be error: No such file or directory
   ```

2. **Run type checking**
   ```bash
   npm run type-check
   ```

3. **Run linter**
   ```bash
   npm run lint
   ```

4. **Run build**
   ```bash
   npm run build
   ```

5. **Find any remaining old imports**
   ```bash
   # These should return empty
   grep -r "from '@/lib/api'" src/ --include="*.ts" --include="*.tsx" | grep -v "from '@/lib/api/auth/handlers'"
   grep -r "from '@/components/" src/ --include="*.ts" --include="*.tsx"
   grep -r "from '@/lib/api/dtos'" src/ --include="*.ts" --include="*.tsx"
   ```

## Import Path Changes

### Comprehensive Import Mapping

#### Backend Client

```typescript
// OLD (before migration)
import { apiClient } from '@/lib/api';
import { ApiError, getErrorMessage } from '@/lib/api/errors';
import { httpClient } from '@/lib/api/client';
import type { Technique, CreateTechniqueDto } from '@/lib/api/dtos';

// NEW (after migration)
import { apiClient } from '@/lib/backend';
import { ApiError, getErrorMessage } from '@/lib/backend/http/errors';
import { httpClient } from '@/lib/backend/http/client';
import type { Technique, CreateTechniqueDto } from '@/lib/types/api';
```

#### Components

```typescript
// OLD
import { TechniqueManager } from '@/components/techniques/TechniqueManager';
import { TechniqueTile } from '@/components/techniques/TechniqueTile';
import { CategoryManager } from '@/components/categories/CategoryManager';
import { AppLayout } from '@/components/layout/AppLayout';
import { Sidebar } from '@/components/navigation/Sidebar';

// NEW
import { TechniqueManager } from '@/lib/components/techniques/TechniqueManager';
import { TechniqueTile } from '@/lib/components/techniques/TechniqueTile';
import { CategoryManager } from '@/lib/components/categories/CategoryManager';
import { AppLayout } from '@/lib/components/layout/AppLayout';
import { Sidebar } from '@/lib/components/navigation/Sidebar';
```

#### API Handlers (New)

```typescript
// NEW - Extracted from route files
import { handleTokenRequest } from '@/lib/api/auth/handlers';
import { handleLogin, handleLogout } from '@/lib/api/auth/handlers';
import { encodeJWT, decodeJWT } from '@/lib/api/auth/jwt';
```

#### Types (New centralized location)

```typescript
// NEW
import type {
  Technique,
  Category,
  Tag,
  Curriculum
} from '@/lib/types/api';

import type {
  User,
  Session
} from '@/lib/types/models';
```

## File Moves

### Phase 0: Create `src/` Structure

| Current Path | New Path |
|--------------|----------|
| `app/` | `src/app/` |

### Backend Client Files

| Current Path | New Path |
|--------------|----------|
| `src/app/lib/api/client.ts` | `src/lib/backend/http/client.ts` |
| `src/app/lib/api/errors.ts` | `src/lib/backend/http/errors.ts` |
| `src/app/lib/api/types.ts` | `src/lib/backend/types.ts` |
| `src/app/lib/api/dtos.ts` | `src/lib/types/api.ts` |
| `src/app/lib/api/resources/auth.ts` | `src/lib/backend/resources/auth.ts` |
| `src/app/lib/api/resources/categories.ts` | `src/lib/backend/resources/categories.ts` |
| `src/app/lib/api/resources/curricula.ts` | `src/lib/backend/resources/curricula.ts` |
| `src/app/lib/api/resources/disciplines.ts` | `src/lib/backend/resources/disciplines.ts` |
| `src/app/lib/api/resources/oembed.ts` | `src/lib/backend/resources/oembed.ts` |
| `src/app/lib/api/resources/tags.ts` | `src/lib/backend/resources/tags.ts` |
| `src/app/lib/api/resources/techniques.ts` | `src/lib/backend/resources/techniques.ts` |
| `src/app/lib/api/resources/users.ts` | `src/lib/backend/resources/users.ts` |
| `src/app/lib/api/resources/videos.ts` | `src/lib/backend/resources/videos.ts` |
| `src/app/lib/api/index.ts` | `src/lib/backend/index.ts` |
| `src/app/lib/api/README.md` | `src/lib/backend/README.md` |

### Component Files

| Current Path | New Path |
|--------------|----------|
| `src/app/components/actionbar/*` | `src/lib/components/actionbar/*` |
| `src/app/components/categories/*` | `src/lib/components/categories/*` |
| `src/app/components/common/*` | `src/lib/components/common/*` |
| `src/app/components/curricula/*` | `src/lib/components/curricula/*` |
| `src/app/components/dashboard/*` | `src/lib/components/dashboard/*` |
| `src/app/components/labels/*` | `src/lib/components/labels/*` |
| `src/app/components/layout/*` | `src/lib/components/layout/*` |
| `src/app/components/navigation/*` | `src/lib/components/navigation/*` |
| `src/app/components/techniques/*` | `src/lib/components/techniques/*` |
| `src/app/components/videos/*` | `src/lib/components/videos/*` |

### New Files to Create

| File | Purpose |
|------|---------|
| `src/lib/types/index.ts` | Export all shared types |
| `src/lib/types/models.ts` | Frontend-specific models |
| `src/lib/utils/index.ts` | Export all utilities |
| `src/lib/utils/formatting.ts` | Formatting utilities |
| `src/lib/utils/validation.ts` | Validation utilities |
| `src/lib/api/README.md` | API handler documentation |
| `src/lib/api/auth/handlers.ts` | Auth endpoint handlers |
| `src/lib/api/auth/jwt.ts` | JWT utilities |
| `src/lib/api/auth/session.ts` | Session utilities |
| `src/lib/api/v1/handlers.ts` | Legacy API handlers |

## Configuration Updates

### `tsconfig.json`

**Key changes:**
- Update `paths` to point to `src/*`
- Update `include` to start from `src/`

**Before:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./app/*"]
    }
  }
}
```

**After:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    "src/**/*"
  ]
}
```

### `tailwind.config.js`

**Before:**
```javascript
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
}
```

**After:**
```javascript
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
}
```

### `next.config.js`

**No changes needed** - Next.js automatically detects `src/app/` directory.

### Package.json scripts

**No changes needed** - All scripts work with `src/` directory.

## Validation

### Automated Checks

```bash
# 1. Type checking
npm run type-check

# 2. Build check
npm run build

# 3. Lint check
npm run lint

# 4. Find remaining old imports (should return empty)
grep -r "from '@/lib/api'" src/ --include="*.ts" --include="*.tsx" | grep -v "from '@/lib/api/auth/handlers'"
grep -r "from '@/components/" src/ --include="*.ts" --include="*.tsx"
grep -r "from '@/lib/api/dtos'" src/ --include="*.ts" --include="*.tsx"

# 5. Verify old directories don't exist
ls src/app/lib 2>&1 | grep "No such file"
ls src/app/components 2>&1 | grep "No such file"
```

### Manual Verification

1. **Start development servers**
   ```bash
   npm run dev:all
   ```

2. **Test key pages**
   - [ ] Home page loads: http://localhost:3000
   - [ ] Login works: http://localhost:3000/login
   - [ ] Techniques page: http://localhost:3000/techniques
   - [ ] Curricula page: http://localhost:3000/curricula
   - [ ] Videos page: http://localhost:3000/videos

3. **Test API endpoints**
   - [ ] GET /api/auth/token
   - [ ] POST /api/auth/login (via NextAuth)
   - [ ] Verify API routes call handlers from `@/lib/api/`

4. **Test backend client**
   ```typescript
   // In browser console
   import { apiClient } from '@/lib/backend';
   const techniques = await apiClient.techniques.list({ disciplineId: 1 });
   console.log(techniques);
   ```

5. **Check browser console**
   - No module resolution errors
   - No 404s for imports
   - No runtime errors

6. **Verify file structure**
   ```bash
   # Verify src/ structure
   ls -la src/
   # Should show: app/, lib/

   # Verify lib/ structure
   ls -la src/lib/
   # Should show: api/, backend/, components/, types/, utils/

   # Verify old structure is gone
   ls app/ 2>&1
   # Should be error: No such file or directory
   ```

### Success Criteria

- ✅ `src/` directory created with `app/` and `lib/` as siblings
- ✅ All TypeScript files compile without errors
- ✅ All pages load successfully
- ✅ All API endpoints respond correctly
- ✅ Backend client methods work
- ✅ No broken imports or missing modules
- ✅ Development server runs without errors
- ✅ Build completes successfully
- ✅ Old directories (`app/lib/`, `app/components/`) are removed
- ✅ No old import paths remain (except where intentional)

## Rollback Plan

If issues arise, rollback by reversing the migration.

### Quick Rollback (Git)

```bash
# If changes are committed
git revert <commit-hash>

# If changes are not committed
git checkout -- .
git clean -fd
```

### Manual Rollback

1. **Move app back to root**
   ```bash
   mv src/app/* ./app/
   rmdir src/app
   rmdir src
   ```

2. **Restore backend client**
   ```bash
   mkdir -p app/lib/api
   # Copy back from backup or git
   ```

3. **Restore components**
   ```bash
   mkdir -p app/components
   # Copy back from backup or git
   ```

4. **Revert configuration changes**
   ```bash
   git checkout tsconfig.json
   git checkout tailwind.config.js
   ```

5. **Revert import changes**
   - Use git diff to see changes
   - Manually revert or use search/replace in reverse

6. **Verify functionality**
   ```bash
   npm run type-check
   npm run dev:all
   ```

### Backup Before Migration

**Strongly recommended:**
```bash
# Create backup branch
git checkout -b backup-before-lib-consolidation

# Or create tarball backup
tar -czf ../web-backup-$(date +%Y%m%d).tar.gz .
```

## Benefits After Migration

### Clear Structure

```
src/
├── app/          → Routes only (pages, layouts, API routes)
└── lib/          → Everything shared (components, backend, types, utils)
```

**Principle:** If it's a route, it's in `app/`. If it's shared code, it's in `lib/`.

### Developer Experience

1. **Obvious separation**: Routes vs shared code immediately clear
2. **Better discoverability**: Know exactly where to find things
3. **Consistent imports**: All shared code uses `@/lib/*`
4. **Standard structure**: Follows modern Next.js conventions
5. **Easier onboarding**: New developers understand structure immediately

### Code Quality

1. **Testability**: Extracted API handlers can be unit tested
2. **Type safety**: Centralized types reduce duplication
3. **Maintainability**: Clearer structure easier to maintain
4. **Scalability**: Easy to add new shared modules

### Import Clarity

```typescript
// Routes
import Page from '@/app/curricula/page';

// Shared lib code
import { apiClient } from '@/lib/backend';
import { TechniqueManager } from '@/lib/components/techniques/TechniqueManager';
import type { Technique } from '@/lib/types/api';
import { formatDate } from '@/lib/utils';
```

Every import's purpose is immediately clear from the path.

## Timeline Estimate

| Phase | Estimated Time | Risk Level |
|-------|----------------|------------|
| Phase 0: Create src/ structure | 15 minutes | Low |
| Phase 1: Create lib/ structure | 15 minutes | Low |
| Phase 2: Move backend client | 30 minutes | Medium |
| Phase 3: Move components | 15 minutes | Low |
| Phase 4: Extract API handlers | 1 hour | Medium |
| Phase 5: Update imports | 2-3 hours | High |
| Phase 6: Update configuration | 15 minutes | Low |
| Phase 7: Update documentation | 30 minutes | Low |
| Phase 8: Clean up & validate | 30 minutes | Low |
| **Total** | **5.5-6.5 hours** | **Medium** |

**Recommendation:** Perform migration in a dedicated branch and thoroughly test before merging.

## Pre-Migration Checklist

Before starting the migration:

- [ ] Commit all current changes
- [ ] Create backup branch: `git checkout -b backup-before-lib-consolidation`
- [ ] Create migration branch: `git checkout -b feature/lib-consolidation`
- [ ] Ensure all tests pass
- [ ] Ensure dev server runs without errors
- [ ] Document current import patterns (for reference)
- [ ] Notify team members (if applicable)

## Post-Migration Checklist

After completing the migration:

- [ ] All automated checks pass
- [ ] All manual tests pass
- [ ] Documentation updated
- [ ] Team members notified
- [ ] Create PR with detailed description
- [ ] Request code review
- [ ] Merge to main after approval

## References

- [Next.js Project Structure](https://nextjs.org/docs/getting-started/project-structure)
- [Next.js src Directory](https://nextjs.org/docs/app/building-your-application/configuring/src-directory)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- Project CLAUDE.md documentation

---

**Document Version:** 2.0
**Last Updated:** 2025-12-01
**Status:** Ready for implementation
**Key Change:** Added `src/` directory with `lib/` as sibling to `app/`, not child of `app/`
