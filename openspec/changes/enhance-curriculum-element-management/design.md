## Context

The current curriculum element management exists in `/apps/web/app/curricula/[id]/edit/page.tsx` with:
- `CurriculumElement` entity with type (technique/asset/text), ord field, and foreign keys
- Basic CRUD API endpoints at `/api/v1/curricula/[id]/elements`
- Reorder endpoint at `/api/v1/curricula/[id]/elements/reorder`
- UI with up/down arrows for reordering
- Manual ID entry for selecting techniques and assets
- No visual previews of selected techniques/assets

Users need to:
- Efficiently build training curricula with drag-and-drop element ordering
- Browse and search for techniques/assets instead of entering IDs manually
- See visual previews of what each element contains
- Inline edit text elements without opening edit forms
- Quickly remove or reorder elements with keyboard shortcuts

## Goals / Non-Goals

### Goals
- Modern drag-and-drop interface for element reordering
- Rich element panels showing technique names, asset thumbnails, and text previews
- Modal dialogs for selecting techniques and assets with search functionality
- Inline editing for text elements
- Visual drag feedback (ghost elements, drop zones, hover states)
- Keyboard shortcuts (delete, arrow keys for reordering)
- Optimized API calls to fetch technique/asset details
- Maintain existing API structure (no breaking changes)

### Non-Goals
- Video playback in element panels (thumbnails only)
- Rich text editing for text elements (plain text is sufficient)
- Bulk element operations (select multiple, batch delete)
- Element templates or presets
- Undo/redo functionality (can be added later)
- Collaborative editing (real-time updates)

## Decisions

### Decision: Use @dnd-kit for drag-and-drop
**Rationale**:
- Modern, accessible, and performant DnD library
- Better than react-beautiful-dnd (deprecated) or react-dnd (complex)
- Built-in keyboard support for accessibility
- Works well with React 18 and Next.js 15
- Supports touch devices for future mobile PWA

**Packages needed**:
- `@dnd-kit/core` - Core DnD functionality
- `@dnd-kit/sortable` - Sortable list utilities
- `@dnd-kit/utilities` - Helper functions

**Alternatives considered**:
- **react-beautiful-dnd**: No longer maintained, doesn't support React 18 strict mode
- **react-dnd**: More complex API, harder to implement
- **HTML5 Drag and Drop API**: Poor mobile support, accessibility issues

### Decision: Create reusable component structure
**Rationale**:
- Separates concerns and improves maintainability
- Allows reuse in other parts of the application
- Easier to test individual components

**Component hierarchy**:
```
EditCurriculumPage
├── CurriculumInfoSection (existing, minor updates)
└── CurriculumElementsSection
    ├── ElementList (drag-and-drop container)
    │   └── ElementPanel (draggable item)
    │       ├── DragHandle
    │       ├── ElementContent (technique/asset/text preview)
    │       └── ElementActions (edit/delete buttons)
    ├── AddElementButton
    └── ElementModals
        ├── TechniqueSelectionModal
        ├── AssetSelectionModal
        └── TextElementModal
```

### Decision: Technique and Asset selection with search
**Rationale**:
- Manual ID entry is error-prone and user-unfriendly
- Users need to browse available techniques/assets
- Search allows quick filtering by name/title
- Can reuse existing GET endpoints with search params

**Implementation**:
- Modal dialog with search input
- Debounced API calls to filter results
- Display results in a scrollable list with preview
- Click to select and populate element form

**API requirements**:
- `GET /api/v1/techniques?disciplineId=X&search=query` - already exists, may need search param
- `GET /api/v1/videos?search=query` - need to check if exists or create

### Decision: Inline editing for text elements
**Rationale**:
- Faster workflow (no modal required)
- Immediate visual feedback
- Common pattern in modern content builders

**Implementation**:
- Double-click or click "Edit" to activate inline editing
- Show textarea in place of readonly content
- Save/Cancel buttons appear inline
- Auto-save on blur or Enter key (with confirmation)

### Decision: Fetch technique/asset details on mount
**Rationale**:
- Element entity only stores IDs, not names/titles
- Need to show rich previews in element panels
- Can batch fetch to minimize API calls

**Implementation**:
- When elements are loaded, extract all unique techniqueIds and assetIds
- Make batch API calls: `GET /api/v1/techniques?ids=1,2,3` and `GET /api/v1/videos?ids=4,5,6`
- Store in component state as lookup maps
- Display in element panels

**Trade-off**: Initial load requires additional API calls, but improves UX significantly

### Decision: Visual drag feedback
**Rationale**:
- Users need clear indication of what they're dragging and where it will drop
- Improves usability and prevents errors

**Implementation**:
- Ghost element follows cursor during drag
- Drop zone highlights when dragging over
- Smooth animations for element reordering
- Visual drag handle icon to indicate draggable areas

### Decision: Maintain existing API structure
**Rationale**:
- No need to change backend for UI improvements
- Reorder endpoint already accepts element IDs in new order
- Only need to add search params to existing GET endpoints

**Required API changes** (minimal):
- Add `search` query param to `GET /api/v1/techniques`
- Add `search` query param to `GET /api/v1/videos` (if not exists)
- Add `ids` query param for batch fetching (optional optimization)

### Decision: Element panel content based on type
**Rationale**:
- Different element types need different visual representations
- Provides context at a glance

**Panel content**:
- **Text element**: Title in bold, details/content preview (truncated), edit icon
- **Technique element**: Technique name, category badges, description preview, technique icon
- **Asset element**: Video thumbnail (if available), title, originator/author, duration, video icon

### Decision: Keyboard shortcuts for power users
**Rationale**:
- Improves efficiency for users who create many curricula
- Common pattern in productivity tools

**Shortcuts**:
- `Delete` or `Backspace` - Delete focused element (with confirmation)
- `Ctrl/Cmd + Up/Down` - Move focused element up/down
- `Escape` - Cancel editing/close modals
- `Enter` - Confirm action/save edit
- Tab navigation through elements

## Risks / Trade-offs

### Risk: Additional API calls impact performance
**Mitigation**:
- Implement batch fetching with `ids` param
- Cache technique/asset details in component state
- Only fetch when element list changes
- Consider adding pagination for large curricula

### Risk: @dnd-kit bundle size
**Mitigation**:
- Libraries are tree-shakeable
- Combined gzipped size ~20KB (acceptable)
- Lazy load modal components with `next/dynamic`

### Risk: Complex drag-and-drop state management
**Mitigation**:
- @dnd-kit handles most complexity
- Use sortable strategy for simple vertical list
- Clear separation of concerns between DnD and business logic

### Risk: Accessibility of drag-and-drop
**Mitigation**:
- @dnd-kit has built-in keyboard support
- Provide alternative methods (buttons) for reordering
- Screen reader announcements for drag operations
- Maintain arrow buttons as fallback

### Risk: Mobile/touch device support
**Mitigation**:
- @dnd-kit supports touch events
- Test on mobile browsers
- Ensure touch targets are large enough (44px minimum)
- Consider PWA app requirements

## Implementation Plan

### Phase 1: Setup and Infrastructure
1. Install @dnd-kit packages
2. Create component directory structure
3. Add search params to technique/video API endpoints
4. Create TypeScript types for component props

### Phase 2: Component Development
1. Build `ElementPanel` component with type-specific content
2. Build selection modals (TechniqueSelectionModal, AssetSelectionModal, TextElementModal)
3. Implement inline editing for text elements
4. Create drag-and-drop container with @dnd-kit

### Phase 3: Integration
1. Integrate new components into edit page
2. Implement batch fetching for technique/asset details
3. Wire up drag-and-drop to reorder API
4. Add keyboard shortcuts

### Phase 4: Polish and Optimization
1. Add loading states and error handling
2. Implement visual drag feedback
3. Add animations and transitions
4. Optimize API calls and caching
5. Test on different devices and browsers

### Phase 5: Testing
1. Unit tests for new components
2. Integration tests for drag-and-drop behavior
3. E2E tests for full workflow
4. Accessibility testing
5. Performance testing with large curricula (50 elements)

## Open Questions

- Should we add element duplication feature?
  - **Decision**: Not in v1, can add later if needed
- Should we support bulk operations (multi-select)?
  - **Decision**: Not in v1, arrow buttons + drag-and-drop sufficient
- Should element panels show full content or truncated preview?
  - **Decision**: Truncated preview with "expand" option to avoid overwhelming UI
- Should we add search/filter within curriculum elements?
  - **Decision**: Not needed for v1 (max 50 elements), can add later
- Should we persist drag-and-drop order optimistically before API confirmation?
  - **Decision**: Yes, update UI immediately, revert on API error
