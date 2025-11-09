## Why

Users need a central dashboard as the main entry point to access key features of the application. The dashboard provides quick access to training sessions, curricula, techniques, and video saving functionality, serving as the primary navigation hub for the application.

## What Changes

- Create dashboard page as the main landing page (root route `/`)
- Add navigation cards/links to access: Training Sessions, Curricula, Techniques, Save Video
- Design dashboard layout with clear visual hierarchy
- Implement responsive design for mobile and desktop
- Add quick stats or summaries for each section (optional, can be added later)
- Replace placeholder home page with functional dashboard

## Impact

- Affected specs: New capability `navigation`
- Affected code: Main page component (`apps/web/app/page.tsx`), navigation components, routing
- Migration: Replace existing placeholder home page

