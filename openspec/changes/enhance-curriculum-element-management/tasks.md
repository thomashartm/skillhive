## 0. Change Readiness
- [ ] 0.1 Read `proposal.md` and `design.md` for this change
- [ ] 0.2 Review `openspec/AGENTS.md` quality gates and workflow
- [ ] 0.3 Run project checks to establish baseline
  - [ ] Build: `npm run build -w @trainhive/web`
  - [ ] Lint: `npm run lint -w @trainhive/web`
  - [ ] Types: `npm run type-check -w @trainhive/web`

## 1. Dependencies and Setup
- [ ] 1.1 Add drag-and-drop dependencies to the web app
  - [ ] Add packages: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
  - [ ] Install/de-dupe workspace deps and ensure lockfile is updated
- [ ] 1.2 Verify compatibility with React 18 and Next.js 15 (strict mode)
- [ ] 1.3 Confirm tree-shaking and bundle sizing are acceptable
- [ ] 1.4 Rebuild and lint to verify the dependency addition does not break CI gates

## 2. API Enhancements (Search + Batch Fetch)
- [ ] 2.1 Techniques API: extend `/apps/web/app/api/v1/techniques/route.ts`
  - [ ] Add optional `search` query param for name/title filtering
  - [ ] Add optional `ids` query param (CSV) for batch fetch by IDs
  - [ ] Validate inputs with Zod; maintain existing auth patterns
  - [ ] Ensure indexes/queries are efficient for `search` usage
  - [ ] Add unit/integration tests for new query params
- [ ] 2.2 Videos API: extend `/apps/web/app/api/v1/videos/route.ts`
  - [ ] Add optional `search` query param for title filtering
  - [ ] Add optional `ids` query param (CSV) for batch fetch by IDs
  - [ ] Validate inputs with Zod; maintain existing auth patterns
  - [ ] Add unit/integration tests for new query params
- [ ] 2.3 Document new query params in code comments and JSDoc
- [ ] 2.4 Rebuild, lint, and type-check

## 3. Component Structure and Scaffolding
Create new components under `apps/web/app/components/curricula/`:

- [ ] 3.1 Base layout for elements section
  - [ ] `CurriculumElementsSection`
  - [ ] `ElementList` (DnD container)
  - [ ] `AddElementButton`
- [ ] 3.2 Draggable item and subcomponents
  - [ ] `ElementPanel` (draggable card wrapper)
  - [ ] `DragHandle` (explicit handle for accessibility)
  - [ ] `ElementContent` (type-aware content renderer)
  - [ ] `ElementActions` (edit/delete)
- [ ] 3.3 Modals (lazy-loaded where appropriate)
  - [ ] `TechniqueSelectionModal`
  - [ ] `AssetSelectionModal`
  - [ ] `TextElementModal`
- [ ] 3.4 Types and utilities
  - [ ] Shared prop types for element inputs/outputs
  - [ ] Lookup map types for techniques/videos
  - [ ] Debounce utility for search
- [ ] 3.5 Styling hooks
  - [ ] Tailwind classes for hover, focus, active, and drop states
  - [ ] Motion/transition classes for reorder feedback

## 4. Drag-and-Drop Implementation
- [ ] 4.1 Implement `ElementList` with `@dnd-kit/core` and `@dnd-kit/sortable`
  - [ ] Sensors for mouse, touch, and keyboard
  - [ ] Vertical sorting strategy; restrict axis as needed
  - [ ] Accessible keyboard reordering
- [ ] 4.2 Implement `ElementPanel` as `Sortable` item
  - [ ] Attach `DragHandle` and proper aria attributes
  - [ ] Visual “ghost” during drag; drop target highlighting
- [ ] 4.3 Smooth animations for item position changes
- [ ] 4.4 Ensure focus management after drop (accessibility)

## 5. Selection and Editing UX
- [ ] 5.1 Technique selection modal
  - [ ] Search input with debounced calls to techniques endpoint
  - [ ] Scrollable results with name/category preview
  - [ ] Select action to attach technique to element
- [ ] 5.2 Asset selection modal
  - [ ] Search input with debounced calls to videos endpoint
  - [ ] Scrollable results with thumbnail/title/duration
  - [ ] Select action to attach video asset to element
- [ ] 5.3 Text element inline editing
  - [ ] Editable textarea on click/dblclick
  - [ ] Inline Save/Cancel, auto-save on blur/Enter
  - [ ] Validation and error states
- [ ] 5.4 Consistent empty/loading/error states across all modals

## 6. Data Fetching and Caching
- [ ] 6.1 On mount, collect unique techniqueIds and videoIds from elements
- [ ] 6.2 Batch fetch details using `ids` query param for techniques/videos
- [ ] 6.3 Store results in lookup maps (id → metadata)
- [ ] 6.4 Display rich previews in `ElementContent`
- [ ] 6.5 Cache results in component state; refetch only when element list changes

## 7. Edit Page Integration
- [ ] 7.1 Integrate new components into `apps/web/app/curricula/[id]/edit/page.tsx`
  - [ ] Replace existing up/down arrows with DnD UX
  - [ ] Keep arrow buttons as accessibility fallback
- [ ] 7.2 Wire element CRUD to existing endpoints:
  - [ ] `/api/v1/curricula/[id]/elements` (create/list)
  - [ ] `/api/v1/curricula/[id]/elements/[elementId]` (update/delete)
  - [ ] `/api/v1/curricula/[id]/elements/reorder` (persist order)
- [ ] 7.3 Implement optimistic updates for reorder and edits; revert on error
- [ ] 7.4 Global error toasts and inline field errors

## 8. Keyboard Shortcuts and Accessibility
- [ ] 8.1 Add keyboard shortcuts
  - [ ] Delete/Backspace → delete focused element (confirm)
  - [ ] Ctrl/Cmd + Up/Down → move focused element
  - [ ] Escape → cancel editing/close modal
  - [ ] Enter → confirm/save actions
- [ ] 8.2 Ensure tab order and focus traps in modals
- [ ] 8.3 Add ARIA roles/labels and live region announcements for drag events
- [ ] 8.4 Verify color contrast and target sizes (≥44px)

## 9. Visual Polish
- [ ] 9.1 Drag “ghost” element styling and drop zone highlights
- [ ] 9.2 Subtle animations for reorder and hover states
- [ ] 9.3 Truncated previews with expand-on-click for long text
- [ ] 9.4 Consistent icons for element types and actions

## 10. Testing
- [ ] 10.1 Unit tests
  - [ ] ElementContent rendering per type
  - [ ] Selection modals behavior (search, select)
  - [ ] Inline text editing state transitions
- [ ] 10.2 Integration tests
  - [ ] Drag-and-drop reorder updates UI state
  - [ ] Reorder persists via API and reconciles on refresh
  - [ ] Batch fetch populates previews
- [ ] 10.3 E2E tests (happy paths)
  - [ ] Add technique/asset/text elements; reorder; save; reload
- [ ] 10.4 Accessibility checks (axe or similar) on edit page and modals
- [ ] 10.5 Performance sanity: large curricula (≈50 elements) interactions remain smooth

## 11. Documentation and Developer Notes
- [ ] 11.1 Inline JSDoc/TSDoc for components and APIs
- [ ] 11.2 Add README section in components directory describing usage patterns
- [ ] 11.3 Document new API query params (search, ids) in route comments

## 12. Quality Gates
- [ ] 12.1 Lint passes with zero errors/warnings for changed files
- [ ] 12.2 TypeScript passes with strict mode
- [ ] 12.3 App builds successfully at the workspace and root levels
- [ ] 12.4 Manual smoke test on desktop and mobile/touch devices

## 13. OpenSpec Workflow
- [ ] 13.1 Validate change: `openspec validate enhance-curriculum-element-management --strict`
- [ ] 13.2 Ensure proposal/spec deltas (if any added later) parse correctly
- [ ] 13.3 After implementation, update this checklist to reflect completion

## 14. Post-Merge Follow-ups (Optional)
- [ ] 14.1 Consider lazy-loading modal components for improved TTI
- [ ] 14.2 Evaluate caching strategy for technique/video lookups (e.g., SWR)
- [ ] 14.3 Gather user feedback on duplication and bulk operations for future iterations