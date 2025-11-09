## Context

The current application has:
- Placeholder home page (`apps/web/app/page.tsx`) with just a title
- Project mentions navigation: Library (All Assets), Techniques, Curricula, Schedule, Share
- Next.js 15 App Router structure
- shadcn/ui components available for UI

Users need:
- Central dashboard as main entry point
- Quick access to: Training Sessions, Curricula, Techniques, Save Video
- Clear navigation to key features

## Goals / Non-Goals

### Goals
- Dashboard as main landing page
- Quick access to four main areas: Training Sessions, Curricula, Techniques, Save Video
- Clear visual navigation
- Responsive design
- Simple, focused initial implementation

### Non-Goals
- Complex analytics or statistics (can be added later)
- Personalized content or recommendations (can be added later)
- Recent activity feed (can be added later)
- Quick actions beyond navigation (can be added later)

## Decisions

### Decision: Dashboard as root route (`/`)
**Rationale**: 
- Standard pattern for web applications
- Main entry point for authenticated users
- Can redirect unauthenticated users to login if needed

### Decision: Card-based navigation layout
**Rationale**:
- Clear visual hierarchy
- Easy to scan and understand
- Works well on mobile and desktop
- Can add icons/thumbnails for visual appeal

**Layout options**:
- Grid layout: 2x2 on desktop, stacked on mobile
- Each card links to respective section
- Cards show section name and brief description

### Decision: Four main navigation areas
**Rationale**:
- Training Sessions: Access to scheduled/past training sessions
- Curricula: Access to training curricula management
- Techniques: Access to technique library and management
- Save Video: Quick access to video saving/ingestion

**Routes**:
- Training Sessions → `/sessions` (or `/training-sessions`)
- Curricula → `/curricula`
- Techniques → `/techniques`
- Save Video → `/videos/save` (or `/assets/ingest`)

### Decision: Simple initial implementation
**Rationale**:
- Focus on navigation first
- Can add stats, recent items, quick actions later
- Keeps initial scope manageable
- Follows "straightforward, minimal implementations first" principle

### Decision: Use shadcn/ui components
**Rationale**:
- Already available in project
- Consistent with project tech stack
- Provides Card, Button, and other components needed

## Risks / Trade-offs

### Risk: Dashboard feels empty initially
**Mitigation**: Start simple, can add stats/summaries later. Focus on clear navigation.

### Risk: Navigation structure may change
**Mitigation**: Use consistent routing patterns, easy to update links later.

### Risk: Mobile responsiveness
**Mitigation**: Use responsive grid layout, test on mobile devices.

## Migration Plan

1. Create dashboard component
2. Update root page (`/`) to use dashboard
3. Create placeholder routes for navigation targets (if not exist)
4. Test navigation flow
5. Add responsive styling

## Open Questions

- Should dashboard require authentication?
  - **Decision**: Yes, redirect to login if not authenticated
- Should there be a sidebar navigation in addition to dashboard?
  - **Decision**: Not in initial scope, can be added later
- Should dashboard show recent items or stats?
  - **Decision**: Not in initial scope, focus on navigation first

