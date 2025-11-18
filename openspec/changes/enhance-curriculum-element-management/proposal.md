## Why

The current curriculum element management uses a basic up/down arrow interface for reordering elements, and requires users to know technique/asset IDs when adding elements. This creates a poor user experience that doesn't align with modern content builder patterns. Users need an intuitive drag-and-drop interface with proper element selection dialogs to efficiently build and organize their training curricula.

## What Changes

- Replace up/down arrow reordering with drag-and-drop functionality using a modern DnD library (e.g., @dnd-kit/core)
- Create element panels as draggable cards with visual drag handles and hover states
- Add technique selection dialog with search/browse functionality instead of manual ID entry
- Add asset selection dialog with search/browse functionality instead of manual ID entry
- Enhance element panel UI to display rich previews (technique name, asset thumbnail/title, text content)
- Add inline editing capabilities for text elements
- Improve visual feedback during drag operations (ghost elements, drop zones)
- Optimize API calls to fetch technique and asset details for display
- Add keyboard shortcuts for element management (delete, reorder)

## Impact

- Affected specs: New capability `curriculum-builder-ux`
- Affected code: 
  - `apps/web/app/curricula/[id]/edit/page.tsx` - Complete UI overhaul for drag-and-drop
  - `apps/web/app/components/curricula/*` - New component files for element panels, selection dialogs
  - `apps/web/app/api/v1/techniques/route.ts` - May need search endpoint for technique selection
  - `apps/web/app/api/v1/videos/route.ts` - May need search endpoint for asset selection
- Dependencies: Add @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- Migration: No database changes required; UI-only enhancement
- Performance: Will require additional API calls to fetch technique/asset metadata for rich display
