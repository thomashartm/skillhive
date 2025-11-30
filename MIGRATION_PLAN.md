# API Migration Plan

**Status:** 🎉 100% Complete (All 8 domains migrated)
**Last Updated:** 2025-11-25 (Final session completed)
**Migration Period:** Multiple sessions → Complete

---

## Current Session Completed (2025-11-25)

**Domain 7 - Curricula (Initial Migration + Corrections):**
- ✅ Migrated `/curricula/[id]/edit/page.tsx` (11 fetch calls)
  - Complex element management (create, update, delete, reorder)
  - Inline text editing
  - Technique/asset selection modals with search
- ✅ **Corrections Made (API Client Method Names):**
  - Fixed 7 method calls in edit page: changed to `curricula.elements.*` nested API
  - Fixed response handling in all 5 curriculum pages (removed `.curriculum`/`.curricula` wrappers)
  - Files corrected: edit, detail, create, list, my-curricula pages
- ✅ Deleted 5 curriculum API route files

**Domain 8 - Utilities & Cleanup:**
- ✅ Removed `wrapDb.ts` helper (no longer used)
- ✅ Verified zero TypeORM imports in web app
- ✅ Confirmed `@trainhive/db` dependency required (auth package uses TypeORM adapter)
- ✅ Verified only `/api/v1/oembed` remains (simple proxy, no database)

**UI Fixes:**
- ✅ Added ViewActionLink to `/curricula/page.tsx` (replaced "ToDo Place Editbar" placeholder)

**Authentication Fix:**
- ✅ Created `/api/auth/token` endpoint to generate JWT tokens for API authentication
  - Uses `jose` library to sign tokens with `NEXTAUTH_SECRET`
  - Extracts user data from NextAuth session (id, email, role, scopes)
  - Returns signed JWT valid for 7 days
- ✅ Updated API client `getAuthToken()` method to fetch token from endpoint
  - Location: `apps/web/app/lib/api/client.ts` (lines 65-85)
  - Automatically attaches JWT to all API requests via Authorization header
- ✅ Resolved 401 Unauthorized errors on protected API endpoints

**Session Summary:**
- 30 files modified (22 initial + 5 corrections + 1 UI fix + 2 auth fixes)
- 6 files deleted (5 curriculum routes + 1 wrapDb helper)
- 1 new file created (token endpoint)
- Migration plan created and finalized
- **Domain 7 now fully functional with correct API calls**
- **All UI placeholders resolved**
- **JWT authentication working end-to-end**

---

## Progress Summary

- ✅ Domain 1: Authentication (Complete)
- ✅ Domain 2: Disciplines (Complete)
- ✅ Domain 3: Categories (Complete)
- ✅ Domain 4: Techniques (Complete)
- ✅ Domain 5: Tags (Complete)
- ✅ Domain 6: Videos (Complete)
- ✅ Domain 7: Curricula (Complete)
- ✅ Domain 8: Utilities & Cleanup (Complete)

---

## Prerequisites

### API Must Have (✅ All Complete)

- ✅ NestJS API running on port 3001
- ✅ All CRUD endpoints implemented for all entities
- ✅ JWT authentication middleware working
- ✅ CORS configured for Next.js origin
- ✅ OpenAPI documentation at `/api/docs`

### Web App Must Have (✅ All Complete)

- ✅ API client at `apps/web/lib/api/client.ts`
- ✅ Resource modules: users, disciplines, categories, techniques, tags, videos, curricula, oembed
- ✅ Error handling utilities: `getErrorMessage()`, `isApiError()`
- ✅ NextAuth session integration for JWT tokens

---

## Domain 1: Authentication ✅

**Migrated:**
- ✅ `app/register/page.tsx` → `apiClient.users.register()`
- ✅ Deleted `/api/register/route.ts`

**Kept (OAuth):**
- NextAuth handler at `/api/auth/[...nextauth]/route.ts`

---

## Domain 2: Disciplines ✅

**Result:** No components found to migrate
- ✅ Deleted `/api/seed/disciplines/route.ts`

---

## Domain 3: Categories ✅

**Migrated:**
- ✅ `CategoryManager.tsx` - CRUD operations
- ✅ `CategoryTree.tsx` - tree rendering
- ✅ `CategoryForm.tsx` - forms
- ✅ `CategoryDetailView.tsx` - details with techniques
- ✅ `CategoryAutocomplete.tsx` - selection
- ✅ `TechniqueAssociation.tsx` - associations
- ✅ Deleted all `/api/v1/categories/` routes

---

## Domain 4: Techniques ✅

**Migrated:**
- ✅ `TechniqueManager.tsx` - CRUD with filters
- ✅ `TechniqueSearchAutocomplete.tsx` - search
- ✅ `TechniqueForm.tsx` - tag usage
- ✅ Deleted all `/api/v1/techniques/` routes

---

## Domain 5: Tags ✅

**Migrated:**
- ✅ `TagAutocomplete.tsx` - search/create tags
- ✅ `TechniqueForm.tsx` - tag associations
- ✅ Deleted all `/api/v1/tags/` routes

---

## Domain 6: Videos ✅

**Migrated:**
- ✅ `SaveVideoForm.tsx` - video creation with oEmbed
- ✅ `/videos/page.tsx` - main listing
- ✅ `/videos/my-videos/page.tsx` - user's videos
- ✅ `/videos/[id]/page.tsx` - detail view
- ✅ `/videos/[id]/edit/page.tsx` - editing
- ✅ `TechniqueSearchAutocomplete.tsx` - video-technique linking
- ✅ Deleted all `/api/v1/videos/` routes

---

## Domain 7: Curricula ✅

**Migrated & Corrected:**
- ✅ `/curricula/page.tsx` - all curricula listing
- ✅ `/curricula/my-curricula/page.tsx` - user's curricula with delete/toggle
- ✅ `/curricula/create/page.tsx` - creation
- ✅ `/curricula/[id]/page.tsx` - detail view
- ✅ `/curricula/[id]/edit/page.tsx` - complete element management (11 fetch calls)
  - fetchCurriculum, fetchElements, handleSaveCurriculum
  - handleCreateElement, confirmDelete, handleReorderElements
  - onTextChange, onSelect (technique/asset modals), onSearch (technique/video search)
- ✅ Deleted all `/api/v1/curricula/` routes (5 files)

**Corrections Applied:**
- Fixed nested API structure: `curricula.elements.*` (list, add, update, delete, reorder)
- Fixed response unwrapping: removed `.curriculum`/`.curricula` property access (API client already unwraps)
- Total: 12 method calls corrected across 5 pages

---

## Domain 8: Utilities & Cleanup ✅

**Completed:**
- ✅ Removed `wrapDb` helper from `apps/web/lib/wrapDb.ts` (no longer used)
- ✅ Verified no TypeORM or @trainhive/db imports in web app
- ✅ Verified only 1 remaining route: `/api/v1/oembed` (kept - simple proxy, no database)

**Cannot Remove:**
- ⚠️ `@trainhive/db` must stay in web app dependencies
  - Reason: @trainhive/auth depends on @trainhive/db for NextAuth TypeORM adapter
  - Dependency chain: web → auth → db
  - Web app no longer directly imports from db package

**Note:**
- oEmbed endpoint should be migrated to NestJS API in future work

---

## API Client Usage Pattern

All migrations follow this pattern:

```typescript
// 1. Import
import { apiClient, getErrorMessage } from '@/lib/api';

// 2. Replace fetch
// Before:
const response = await fetch('/api/v1/endpoint');
const data = await response.json();

// After:
const data = await apiClient.resource.method(params);

// 3. Error handling
try {
  const data = await apiClient.resource.method(params);
} catch (err) {
  setError(getErrorMessage(err));
}
```

---

## Migration Complete! 🎉

All 8 domains have been successfully migrated from Next.js API routes to the NestJS API.

### Summary of Work
- **43 components/pages** migrated to use API client
- **21 API route files** deleted
- **1 new API route** created (`/api/auth/token` for JWT generation)
- **API client library** created with 8 resource modules
- **12 API method calls** corrected in curricula domain
- **JWT authentication** implemented end-to-end
- **Zero TypeORM imports** in web app code (except auth package)
- **Clean separation** between frontend (Next.js) and backend (NestJS)

### Authentication Flow (Implemented)
1. User logs in via NextAuth.js (credentials or OAuth)
2. NextAuth session stored in HTTP-only cookie
3. API client calls `/api/auth/token` to get signed JWT
4. JWT sent to NestJS API in Authorization header
5. NestJS validates JWT and grants access to protected endpoints

### Future Enhancements
- Add token caching to reduce `/api/auth/token` calls
- Implement token refresh logic for expired tokens
- Migrate `/api/v1/oembed` route to NestJS API
- Consider removing @trainhive/db dependency from web app (requires auth package refactoring)
