# Curricula Feature Architecture

**Last Updated:** December 2025
**Status:** Production-ready, fully refactored from 1000-line monolith into modular architecture

## Overview

The curricula feature enables users to create, manage, and share training curricula composed of three element types: techniques, video assets, and instructional text. The architecture uses React hooks for data management, reusable components for UI consistency, and @dnd-kit for drag-and-drop reordering.

**Key Metrics:**
- 6 route pages (42-442 lines each, down from 130-630)
- 3 custom hooks (data fetching & state management)
- 12+ focused UI components
- 60-70% code duplication eliminated

## Directory Structure

```
app/
├── curricula/
│   ├── CLAUDE.md                          # This file
│   ├── page.tsx                           # All curricula (42 lines)
│   ├── my-curricula/page.tsx              # User's curricula (99 lines)
│   ├── shared/page.tsx                    # Public curricula from others (81 lines)
│   ├── create/page.tsx                    # Create form (156 lines)
│   ├── [id]/page.tsx                      # Detail view (144 lines)
│   ├── [id]/edit/page.tsx                 # Edit & element management (442 lines)
│   └── _components/                       # Route-specific components
│       ├── CurriculumCard.tsx
│       ├── CurriculumGrid.tsx
│       ├── LoadingState.tsx
│       └── ErrorState.tsx
│
└── components/curricula/                  # Shared components
    ├── index.ts                           # Barrel export
    ├── types.ts                           # Type definitions
    ├── constants.ts                       # Config & limits
    ├── utils.ts                           # Helper functions
    ├── icons.tsx                          # Icon components
    ├── hooks/
    │   ├── useCurriculaList.ts           # List fetching & filtering
    │   ├── useCurriculumDetail.ts        # Single curriculum CRUD
    │   └── useCurriculumElements.ts      # Element management & DnD
    ├── elements/
    │   ├── ElementContent.tsx            # Type-specific rendering
    │   ├── ElementPanel.tsx              # Individual element UI
    │   ├── ElementList.tsx               # Sortable list with DnD
    │   ├── CurriculumElementsSection.tsx # Container & controls
    │   └── InlineTextEditor.tsx          # Text editing
    ├── modals/
    │   ├── TechniqueSelectionModal.tsx   # Technique picker
    │   └── AssetSelectionModal.tsx       # Video picker
    └── buttons/
        ├── AddElementButton.tsx
        ├── DragHandle.tsx
        └── ElementActions.tsx
```

## Core Hooks

### `useCurriculaList(filters?)`

Fetch and filter curriculum lists.

```typescript
const { curricula, loading, error, refresh } = useCurriculaList({
  onlyMine: true,  // Filter to user's curricula
  isPublic: true   // Filter to public curricula
});
```

**Returns:** `{ curricula, loading, error, refresh }`

### `useCurriculumDetail(id, options?)`

Manage single curriculum metadata.

```typescript
const {
  curriculum,
  loading,
  error,
  update,           // Update metadata
  deleteCurriculum, // Delete curriculum
  togglePublic      // Toggle public/private
} = useCurriculumDetail(curriculumId);
```

**Options:** `{ autoFetch?: boolean }` - Set to `false` to skip initial fetch

### `useCurriculumElements(curriculumId, options?)`

Manage curriculum elements with full CRUD + reordering.

```typescript
const {
  elements,         // Ordered array of elements
  techniqueMap,     // Technique data lookup
  videoMap,         // Video data lookup
  disciplineId,     // Associated discipline
  loading,
  error,
  addElement,       // (kind, data?) => Promise<void>
  updateElement,    // (id, data) => Promise<void>
  deleteElement,    // (id) => Promise<void>
  reorderElements,  // (orderedIds) => Promise<void>
  refresh
} = useCurriculumElements(curriculumId);
```

**Element Kinds:** `'text' | 'technique' | 'asset'`

## Key Types

```typescript
// Element types
export type ElementKind = 'text' | 'technique' | 'asset';

export interface CurriculumElement {
  id: string;
  ord: number;
  kind: ElementKind;
  techniqueId?: number | null;
  assetId?: number | null;
  text?: string | null;
}

// Curriculum metadata
export interface Curriculum {
  id: number;
  title: string;
  description: string | null;
  isPublic: boolean;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

// Lookup maps for element references
export type TechniqueMap = Record<number, TechniqueSummary>;
export type VideoMap = Record<number, VideoSummary>;
```

## Constants

```typescript
// From components/curricula/constants.ts
export const CURRICULUM_LIMITS = {
  MAX_ELEMENTS: 50,
  MAX_TITLE_LENGTH: 255,
};

export const sidebarItems = [
  { href: '/curricula', label: 'All Curricula' },
  { href: '/curricula/my-curricula', label: 'My Curricula' },
  { href: '/curricula/shared', label: 'Shared with Me' },
  { href: '/curricula/create', label: 'Create Curriculum' },
];
```

## Architecture Principles

### 1. Separation of Concerns
- **Routes:** Layout composition only, minimal logic
- **Hooks:** All data fetching, state management, API calls
- **Components:** Pure presentation, user interactions
- **Types:** Shared contracts between layers

### 2. Composition Over Duplication
- Hooks eliminate 60-70% of duplicated API logic
- `<CurriculumGrid>` provides consistent loading/error states
- `<ElementList>` handles all DnD complexity
- Modals are reusable across all routes

### 3. Colocation
- Route-specific components in `_components/`
- Shared components in `components/curricula/`
- All curricula logic grouped together

## Extending the Feature

### Adding a New Route

1. Create page file in `/app/curricula/[route]/page.tsx`
2. Use existing hooks for data management
3. Use `<CurriculumGrid>` for list views
4. Add route to `sidebarItems` in `constants.ts`

**Example:**
```typescript
export default function TemplatesPage() {
  const { curricula, loading, error } = useCurriculaList({ isTemplate: true });

  return (
    <AppLayout sidebarItems={sidebarItems} sidebarTitle="Curricula">
      <CurriculumGrid
        curricula={curricula}
        loading={loading}
        error={error}
        renderCard={(curriculum) => <CurriculumCard curriculum={curriculum} />}
      />
    </AppLayout>
  );
}
```

### Adding a New Element Type

**Assumption:** Element types must be defined at the database schema level first.

1. **Update types** (`components/curricula/types.ts`):
   ```typescript
   export type ElementKind = 'text' | 'technique' | 'asset' | 'quiz';
   ```

2. **Add rendering logic** (`components/curricula/elements/ElementContent.tsx`):
   ```typescript
   case 'quiz':
     return <QuizPreview quizId={element.quizId} />;
   ```

3. **Create selection modal** (`components/curricula/modals/QuizSelectionModal.tsx`)

4. **Update add controls** (`components/curricula/buttons/AddElementButton.tsx`):
   ```typescript
   <button onClick={() => onAdd('quiz')}>+ Quiz</button>
   ```

5. **Hook integration** (`components/curricula/hooks/useCurriculumElements.ts`):
   - Add quiz data fetching to initial load
   - Add quiz lookup map to return value

### Adding a New Curriculum Action

**Example: Clone curriculum**

1. **Add API method** (`lib/api/resources/curricula.ts`):
   ```typescript
   async clone(id: number): Promise<Curriculum> {
     const response = await httpClient.post(`/curricula/${id}/clone`);
     return response.data;
   }
   ```

2. **Add to hook** (`hooks/useCurriculumDetail.ts`):
   ```typescript
   const clone = async () => {
     await apiClient.curricula.clone(id);
     refresh();
   };
   return { ...existing, clone };
   ```

3. **Add UI** (`_components/CurriculumCard.tsx` or action bar):
   ```typescript
   <button onClick={() => clone()}>Clone</button>
   ```

### Modifying Element Limits

Update `CURRICULUM_LIMITS` in `constants.ts`:
```typescript
export const CURRICULUM_LIMITS = {
  MAX_ELEMENTS: 100,  // Changed from 50
  MAX_TITLE_LENGTH: 255,
};
```

**Note:** Also update backend validation to match.

## Common Patterns

### Pattern: Add Loading States to Actions

```typescript
const [deleting, setDeleting] = useState(false);

const handleDelete = async (id: number) => {
  setDeleting(true);
  try {
    await deleteCurriculum();
    router.push('/curricula/my-curricula');
  } catch (err) {
    showNotification('error', getErrorMessage(err));
  } finally {
    setDeleting(false);
  }
};
```

### Pattern: Optimistic Updates

```typescript
const handleTogglePublic = async (curriculum: Curriculum) => {
  // Update UI immediately
  setCurricula(prev =>
    prev.map(c => c.id === curriculum.id
      ? { ...c, isPublic: !c.isPublic }
      : c
    )
  );

  // Then sync with server
  try {
    await togglePublic();
  } catch (err) {
    // Revert on error
    refresh();
    showNotification('error', getErrorMessage(err));
  }
};
```

### Pattern: Debounced Search

```typescript
import { debounce } from '@/app/components/curricula';

const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    apiClient.techniques.list({ search: query })
      .then(setResults);
  }, 300),
  []
);
```

## Dependencies

- **@dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities** - Drag-and-drop
- **next** - Framework (App Router)
- **react** - UI library

## Assumptions for Future Development

1. **Element IDs:** Elements use string IDs from backend; reordering uses these IDs
2. **Discipline Context:** Curricula belong to a discipline; techniques filtered by discipline
3. **Pagination:** Not currently implemented; lists fetch all items (acceptable for MVP)
4. **Permissions:** Public/private toggle only; no granular sharing permissions
5. **Element Limit:** Hard limit of 50 elements enforced client-side and server-side
6. **Maps Over Nested Data:** `techniqueMap` and `videoMap` provide O(1) lookup; prefer this over nested element data
7. **Mutations Refresh Data:** All CRUD operations call `refresh()` to re-fetch from source of truth
8. **No Offline Support:** All operations require network connection
9. **Single Discipline:** Each curriculum belongs to exactly one discipline (inferred from techniques)

## Performance Notes

- **Route Splitting:** Automatic with Next.js App Router
- **Modal Loading:** Modals load with parent route (not lazy-loaded currently)
- **DnD Library:** Loads with edit route only (~50KB)
- **Debouncing:** Search inputs use 300ms debounce to reduce API calls
- **No Virtualization:** Element lists limited to 50 items; virtualization not needed

## Maintenance Guidelines

1. **Route Size:** Keep routes under 150 lines; extract complex logic to hooks
2. **Hook Responsibility:** One hook per data domain (list, detail, elements)
3. **Component Files:** One component per file (except tightly coupled helpers)
4. **Barrel Exports:** All public APIs exported through `index.ts`
5. **Error Handling:** Use `getErrorMessage()` for consistent error formatting
6. **Notifications:** Use inline notifications in edit page; alerts for destructive actions

## Related Documentation

- [Next.js Web App Architecture](../../.claude/docs/architecture/nextjs-web.md)
- [API Module Development](../../../../api/src/modules/CLAUDE.md)
- [Database Layer](../../.claude/docs/architecture/database.md)
