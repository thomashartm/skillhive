# Library Consolidation - Implementation Tasks

**Status:** Not Started
**Plan Document:** [LIB_CONSOLIDATION_PLAN.md](./LIB_CONSOLIDATION_PLAN.md)
**Estimated Time:** 5-6 hours
**Started:** TBD
**Completed:** TBD

---

## 🎯 Instructions for Implementation

### What This Is

This is a **step-by-step task list** for restructuring the Next.js web app to use a proper `src/` directory with consolidated shared code under `src/lib/`.

### Current Problem

The current structure has:
- No `src/` directory (code mixed with config at root)
- Confusing naming: `app/lib/api` is actually a backend client, not API routes
- Components scattered at `app/components/`
- Unclear separation between routes and shared code

### Expected Outcome

After completing all tasks, the structure will be:

```
apps/web/
├── src/
│   ├── app/                 # Routes only (pages, layouts, API routes)
│   └── lib/                 # All shared code (SIBLING to app/)
│       ├── backend/         # NestJS backend client (renamed from lib/api)
│       ├── components/      # All React components
│       ├── types/           # Shared TypeScript types
│       └── utils/           # Utility functions
├── public/
└── package.json
```

**Key principle:** If it's a route, it's in `src/app/`. If it's shared code, it's in `src/lib/`.

### Import Path Changes

| Before | After |
|--------|-------|
| `from '@/lib/api'` | `from '@/lib/backend'` |
| `from '@/lib/api/dtos'` | `from '@/lib/types/api'` |
| `from '@/components/...'` | `from '@/lib/components/...'` |

### How to Execute

1. **Read the full plan first:** Review `LIB_CONSOLIDATION_PLAN.md` for context
2. **Work sequentially:** Complete tasks in order (Phase 0 → Phase 6)
3. **Check off tasks:** Mark `[ ]` as `[x]` when completed
4. **Validate checkpoints:** Don't skip validation steps
5. **Use git:** Commit after each phase for easy rollback

### Critical Checkpoints

- **After Phase 0.4:** Dev server must work with `src/` structure
- **After Phase 5.1:** Type check must pass
- **After Phase 5.2:** Dev server must run without errors

If any checkpoint fails, **STOP** and debug before proceeding.

### What to Tell Claude

In a new session, tell Claude:

> "Continue the library consolidation migration. Review `LIB_CONSOLIDATION_TASKS.md` and proceed with the next pending task. Update task status as you work."

Claude will:
1. Read this file to understand context
2. Find the next pending task
3. Execute it step-by-step
4. Mark it complete and move to next task

### Rollback

If anything goes wrong:
```bash
git checkout -- .
git clean -fd
```

See `LIB_CONSOLIDATION_PLAN.md` for detailed rollback instructions.

---

## Progress Overview

- **Phase 0:** 0/4 tasks completed (Create src/ structure)
- **Phase 1:** 0/2 tasks completed (Create lib/ structure)
- **Phase 2:** 0/9 tasks completed (Move backend client)
- **Phase 3:** 0/2 tasks completed (Move components)
- **Phase 4:** 0/4 tasks completed (Update imports)
- **Phase 5:** 0/4 tasks completed (Validation)
- **Phase 6:** 0/1 tasks completed (Documentation)
- **TOTAL:** 0/26 tasks completed

---

## Phase 0: Create `src/` Structure

### Task 0.1: Create src/ directory and move app/
- [ ] Create `src/` directory: `mkdir -p apps/web/src`
- [ ] Move `app/` into `src/`: `mv apps/web/app apps/web/src/app`
- [ ] Verify structure: `ls -la apps/web/src/` shows `app/`

**Validation:**
```bash
ls -la apps/web/src/
# Should show: app/
```

---

### Task 0.2: Update tsconfig.json to use src/* paths
- [ ] Open `apps/web/tsconfig.json`
- [ ] Update `paths` from `"@/*": ["./app/*"]` to `"@/*": ["./src/*"]`
- [ ] Update `include` to reference `src/**/*`
- [ ] Save file

**Changes:**
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

---

### Task 0.3: Update tailwind.config.js to use src/ paths
- [ ] Open `apps/web/tailwind.config.js`
- [ ] Update `content` paths to `./src/app/**` and `./src/lib/components/**`
- [ ] Save file

**Changes:**
```javascript
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
}
```

---

### Task 0.4: Verify dev server still works with src/ structure
- [ ] Run `npm run dev` (web only)
- [ ] Check http://localhost:3000 loads
- [ ] Check for any console errors
- [ ] Stop dev server
- [ ] **CHECKPOINT:** If this fails, rollback and debug before proceeding

**Validation:**
```bash
cd apps/web
npm run dev
# Open http://localhost:3000
# Verify no errors in console
```

---

## Phase 1: Create `src/lib/` Structure

### Task 1.1: Create src/lib/ directory structure
- [ ] Create backend directories:
  - `mkdir -p apps/web/src/lib/backend/http`
  - `mkdir -p apps/web/src/lib/backend/resources`
- [ ] Create api directories:
  - `mkdir -p apps/web/src/lib/api/auth`
  - `mkdir -p apps/web/src/lib/api/v1`
- [ ] Create other directories:
  - `mkdir -p apps/web/src/lib/components`
  - `mkdir -p apps/web/src/lib/types`
  - `mkdir -p apps/web/src/lib/utils`

**Validation:**
```bash
ls -la apps/web/src/lib/
# Should show: api/, backend/, components/, types/, utils/
```

---

### Task 1.2: Create initial index.ts files
- [ ] Create `src/lib/types/index.ts` (empty export file)
- [ ] Create `src/lib/utils/index.ts` (empty export file)
- [ ] Create `src/lib/api/README.md` (placeholder)

**Files to create:**
```bash
touch apps/web/src/lib/types/index.ts
touch apps/web/src/lib/utils/index.ts
touch apps/web/src/lib/api/README.md
```

---

## Phase 2: Move Backend Client

### Task 2.1: Move client.ts and errors.ts to src/lib/backend/http/
- [ ] Move client: `mv src/app/lib/api/client.ts src/lib/backend/http/client.ts`
- [ ] Move errors: `mv src/app/lib/api/errors.ts src/lib/backend/http/errors.ts`
- [ ] Verify files moved correctly

**Commands:**
```bash
cd apps/web
mv src/app/lib/api/client.ts src/lib/backend/http/client.ts
mv src/app/lib/api/errors.ts src/lib/backend/http/errors.ts
```

---

### Task 2.2: Move types.ts to src/lib/backend/
- [ ] Move types: `mv src/app/lib/api/types.ts src/lib/backend/types.ts`
- [ ] Verify file moved correctly

**Command:**
```bash
mv src/app/lib/api/types.ts src/lib/backend/types.ts
```

---

### Task 2.3: Move all resource files to src/lib/backend/resources/
- [ ] Move all resources: `mv src/app/lib/api/resources/* src/lib/backend/resources/`
- [ ] Verify all files moved:
  - auth.ts
  - categories.ts
  - curricula.ts
  - disciplines.ts
  - oembed.ts
  - tags.ts
  - techniques.ts
  - users.ts
  - videos.ts

**Command:**
```bash
mv src/app/lib/api/resources/* src/lib/backend/resources/
ls src/lib/backend/resources/
```

---

### Task 2.4: Move dtos.ts to src/lib/types/api.ts
- [ ] Move DTOs: `mv src/app/lib/api/dtos.ts src/lib/types/api.ts`
- [ ] Verify file moved correctly

**Command:**
```bash
mv src/app/lib/api/dtos.ts src/lib/types/api.ts
```

---

### Task 2.5: Move index.ts and README.md to src/lib/backend/
- [ ] Move index: `mv src/app/lib/api/index.ts src/lib/backend/index.ts`
- [ ] Move README: `mv src/app/lib/api/README.md src/lib/backend/README.md`
- [ ] Verify files moved correctly

**Commands:**
```bash
mv src/app/lib/api/index.ts src/lib/backend/index.ts
mv src/app/lib/api/README.md src/lib/backend/README.md
```

---

### Task 2.6: Update internal imports in src/lib/backend/http/client.ts
- [ ] Open `src/lib/backend/http/client.ts`
- [ ] Update import for errors (stays same directory)
- [ ] Update import for types (change `./types` to `../types`)
- [ ] Save file

**Import changes:**
```typescript
// Change this:
import type { RequestConfig, ApiResponse } from './types';

// To this:
import type { RequestConfig, ApiResponse } from '../types';
```

---

### Task 2.7: Update internal imports in src/lib/backend/index.ts
- [ ] Open `src/lib/backend/index.ts`
- [ ] Update export for dtos: change `'./dtos'` to `'../types/api'`
- [ ] Update export for errors: change `'./errors'` to `'./http/errors'`
- [ ] Update export for client: change `'./client'` to `'./http/client'`
- [ ] Update resource imports to add `./resources/` prefix
- [ ] Save file

**Import changes:**
```typescript
// Change:
export type * from './dtos';
export { ApiError, getErrorMessage } from './errors';
export { httpClient } from './client';

// To:
export type * from '../types/api';
export { ApiError, getErrorMessage } from './http/errors';
export { httpClient } from './http/client';
```

---

### Task 2.8: Update imports in all backend resource files
- [ ] Open each resource file in `src/lib/backend/resources/`
- [ ] Update imports that reference `../dtos` to `../../types/api`
- [ ] Update imports that reference `../client` to `../http/client`
- [ ] Update imports that reference `../errors` to `../http/errors`
- [ ] Save all files

**Files to update:**
- auth.ts
- categories.ts
- curricula.ts
- disciplines.ts
- oembed.ts
- tags.ts
- techniques.ts
- users.ts
- videos.ts

**Import pattern changes:**
```typescript
// Change:
import type { SomeDto } from '../dtos';
import { httpClient } from '../client';

// To:
import type { SomeDto } from '../../types/api';
import { httpClient } from '../http/client';
```

---

### Task 2.9: Remove old src/app/lib directory
- [ ] Verify directory is empty: `ls src/app/lib/api/`
- [ ] Remove resources dir: `rmdir src/app/lib/api/resources`
- [ ] Remove api dir: `rmdir src/app/lib/api`
- [ ] Remove lib dir: `rmdir src/app/lib`
- [ ] Verify removal: `ls src/app/lib` should fail

**Commands:**
```bash
rmdir src/app/lib/api/resources
rmdir src/app/lib/api
rmdir src/app/lib
ls src/app/lib  # Should error: No such file or directory
```

---

## Phase 3: Move Components

### Task 3.1: Move all components to src/lib/components/
- [ ] Move components: `mv src/app/components/* src/lib/components/`
- [ ] Verify all subdirectories moved:
  - actionbar/
  - categories/
  - common/
  - curricula/
  - dashboard/
  - labels/
  - layout/
  - navigation/
  - techniques/
  - videos/

**Command:**
```bash
mv src/app/components/* src/lib/components/
ls src/lib/components/
```

---

### Task 3.2: Remove old src/app/components directory
- [ ] Verify directory is empty: `ls src/app/components/`
- [ ] Remove directory: `rmdir src/app/components`
- [ ] Verify removal: `ls src/app/components` should fail

**Commands:**
```bash
ls src/app/components/  # Should be empty
rmdir src/app/components
```

---

## Phase 4: Update All Imports

### Task 4.1: Find and update all '@/lib/api' imports to '@/lib/backend'
- [ ] Find all occurrences: `grep -r "from '@/lib/api'" src/ --include="*.ts" --include="*.tsx"`
- [ ] Review the list of files
- [ ] Run replacement: `find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' "s|from '@/lib/api'|from '@/lib/backend'|g" {} +`
- [ ] Verify changes with git diff

**Commands:**
```bash
# Find
grep -r "from '@/lib/api'" src/ --include="*.ts" --include="*.tsx"

# Replace (macOS)
find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' "s|from '@/lib/api'|from '@/lib/backend'|g" {} +

# Verify
git diff
```

---

### Task 4.2: Find and update all '@/lib/api/dtos' imports to '@/lib/types/api'
- [ ] Find all occurrences: `grep -r "from '@/lib/api/dtos'" src/ --include="*.ts" --include="*.tsx"`
- [ ] Review the list of files
- [ ] Run replacement: `find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' "s|from '@/lib/api/dtos'|from '@/lib/types/api'|g" {} +`
- [ ] Verify changes with git diff

**Commands:**
```bash
# Find
grep -r "from '@/lib/api/dtos'" src/ --include="*.ts" --include="*.tsx"

# Replace (macOS)
find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' "s|from '@/lib/api/dtos'|from '@/lib/types/api'|g" {} +

# Verify
git diff
```

---

### Task 4.3: Find and update all '@/components/' imports to '@/lib/components/'
- [ ] Find all occurrences: `grep -r "from '@/components/" src/ --include="*.ts" --include="*.tsx"`
- [ ] Review the list of files (should be many)
- [ ] Run replacement: `find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' "s|from '@/components/|from '@/lib/components/|g" {} +`
- [ ] Verify changes with git diff

**Commands:**
```bash
# Find
grep -r "from '@/components/" src/ --include="*.ts" --include="*.tsx"

# Replace (macOS)
find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' "s|from '@/components/|from '@/lib/components/|g" {} +

# Verify
git diff
```

---

### Task 4.4: Manually verify all import changes are correct
- [ ] Review git diff for all changes
- [ ] Check a few key files manually:
  - `src/app/techniques/page.tsx`
  - `src/lib/components/techniques/TechniqueManager.tsx`
  - `src/lib/components/layout/AppLayout.tsx`
- [ ] Look for any missed imports or incorrect replacements
- [ ] Fix any issues found

**Files to spot-check:**
```bash
# View changes
git diff src/app/techniques/page.tsx
git diff src/lib/components/techniques/TechniqueManager.tsx
git diff src/lib/components/layout/AppLayout.tsx
```

---

## Phase 5: Validation

### Task 5.1: Run type check (npm run type-check)
- [ ] Run: `npm run type-check`
- [ ] Review any errors
- [ ] Fix any type errors found
- [ ] Re-run until clean
- [ ] **CHECKPOINT:** Must pass before proceeding

**Command:**
```bash
cd apps/web
npm run type-check
```

**Expected:** No errors

---

### Task 5.2: Start dev server and verify all pages load correctly
- [ ] Start dev server: `npm run dev`
- [ ] Visit http://localhost:3000
- [ ] Check browser console for errors
- [ ] Verify home page renders correctly
- [ ] **CHECKPOINT:** Must work before proceeding

**Navigation:**
- Home: http://localhost:3000
- Check console: Should be no module resolution errors

---

### Task 5.3: Test key functionality (techniques, curricula, videos pages)
- [ ] Visit http://localhost:3000/techniques
- [ ] Verify techniques page loads
- [ ] Verify category filter works
- [ ] Visit http://localhost:3000/curricula
- [ ] Verify curricula page loads
- [ ] Visit http://localhost:3000/videos
- [ ] Verify videos page loads
- [ ] Check browser console for any errors

**Test URLs:**
- Techniques: http://localhost:3000/techniques
- Curricula: http://localhost:3000/curricula
- Videos: http://localhost:3000/videos

---

### Task 5.4: Verify no old import patterns remain
- [ ] Search for old backend imports: `grep -r "from '@/lib/api'" src/`
- [ ] Should only find imports to `@/lib/api/auth/handlers` (if Phase 4 was implemented)
- [ ] Search for old component imports: `grep -r "from '@/components/" src/`
- [ ] Should return empty
- [ ] Search for old DTO imports: `grep -r "from '@/lib/api/dtos'" src/`
- [ ] Should return empty

**Commands:**
```bash
# Should return empty (or only api/auth/handlers)
grep -r "from '@/lib/api'" src/ --include="*.ts" --include="*.tsx"

# Should return empty
grep -r "from '@/components/" src/ --include="*.ts" --include="*.tsx"

# Should return empty
grep -r "from '@/lib/api/dtos'" src/ --include="*.ts" --include="*.tsx"
```

---

## Phase 6: Documentation

### Task 6.1: Update documentation
- [ ] Update `apps/web/README.md` with new structure
- [ ] Update project root `CLAUDE.md` with new paths
- [ ] Update `src/lib/backend/README.md` with new import examples
- [ ] Mark `LIB_CONSOLIDATION_PLAN.md` as "Implemented"
- [ ] Mark this file as "Completed"

**Files to update:**
- `apps/web/README.md`
- `CLAUDE.md`
- `src/lib/backend/README.md`
- `LIB_CONSOLIDATION_PLAN.md`
- This file

---

## Post-Migration Checklist

After all tasks are complete:

- [ ] All tasks marked as completed
- [ ] Type check passes
- [ ] Dev server runs without errors
- [ ] All key pages load correctly
- [ ] No old import patterns remain
- [ ] Documentation updated
- [ ] Changes committed to git
- [ ] Create PR for review (if applicable)

---

## Rollback Instructions

If something goes wrong:

```bash
# Quick rollback via git
git checkout -- .
git clean -fd

# Or revert specific commit
git revert <commit-hash>
```

See `LIB_CONSOLIDATION_PLAN.md` for detailed rollback instructions.

---

## Notes

Add any notes, issues, or deviations from the plan here:

-
-
-

---

**Document Status:** Ready for Implementation
**Last Updated:** 2025-12-01
