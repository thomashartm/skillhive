# SkillHive 

SkillHive is your onestop shop to organize your personal knowledge 
path or your training curriculum around existing public media, enriched by your ideas.
Bring structure into your martial arts training e.g. let's pick BJJ.
SkillHive gives you the tools to organize your BJJ Curriculum around existing videos tutorials.

* build and organize complete training blocks
* keep track of your schedule
* map your training curriculum with assets such as videos 
* all techniques, drills and exercises tagged and ready to be reused and shared
* categorized, searchable training media and make your bookmarks transparent

## Monorepo Structure

This project uses a monorepo structure with npm workspaces:

- **apps/web** - Next.js web application
- **apps/pwa** - Progressive Web App for mobile devices
- **apps/api** - REST API backend
- **packages/shared** - Shared utilities, types, and constants
- **packages/db** - Database entities, migrations, and TypeORM configuration
- **packages/auth** - Authentication utilities and shared auth logic

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build all packages:
   ```bash
   npm run build
   ```

3. Start development servers:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

## Dashboard

The main dashboard (`/`) provides quick access to key features:
- **Training Sessions** - View and manage scheduled training sessions
- **Curricula** - Create and organize training curricula
- **Techniques** - Browse and manage your technique library
- **Save Video** - Add and enrich video URLs with metadata

For more details, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Next Steps (Implementing Agent Checklist)

1. Scaffold Next.js (App Router) + MUI + NextAuth + TypeORM + MySQL.
2. Define TypeORM entities & initial migration from section **5**.
3. Implement `/api/v1/*` endpoints from section **7** with zod DTOs.
4. Build Curriculum Builder UI (section **8**) with drag‑reorder.
5. Implement YouTube ingest (paste URL → metadata fetch → attachment).
6. Add full‑text search endpoints + filters.
7. Ship public **Share** pages with OG cards & SEO.
8. E2E tests + seed dataset.

Open Questions

* Policy for referencing **private/unlisted YouTube** playlists?
* Public search indexing for **Unlisted** share pages?
* Versioning strategy for techniques reused across multiple curricula (lock vs live ref)?
