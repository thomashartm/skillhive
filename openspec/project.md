# Project Context

## 1. Purpose, Mission & Principles

**Purpose** 
One‑stop application platform to organize your BJJ training and personal knowledge path around public media (esp. YouTube), enriched by training ideas and custom metadata. 
* Build reusable training blocks
* Map techniques and their metadata such as athlete, name, situation, position and others to videos
* Tag & search techniques and videos
* Plan your training sessions with a specific curriculum
* Reuse any curriculum
* Share curricula with followers
* Users can register their account and manage their curriculums and videos

**Mission:** Turn scattered videos and notes into structured, reusable training curricula that are easy to schedule and share.

**Principles**

* **Reuse first:** Techniques & drills are canonical and referenced anywhere.
* **Explainable structure:** Blocks → Sessions → Units → Techniques/Drills/Exercises.
* **Open media:** Link to public media (YouTube, docs, images, PDFs) with clear attribution.
* **Portable data:** SQL schema with migrations; clean exports.
* **Pragmatic sharing:** Public/Unlisted/Private share links with SEO-ready pages.
* **Future extensibility:** We start with BJJ initially but it can be extended to other disciplines using different taxonomies.

**Out-of-scope (v1):** In-app video hosting, paywalls, forums, native mobile (PWA ok), advanced LMS assessments.


## 2. Tech Stack (authoritative for v1)
**High Level Components**

The application project is structured in three main components
* **Web application** which implements the described features.
* **PWA APP** for mobile support to:
** Collect videos and information
** Organize and use curriculum during training hours
** Data ise synced with the core backend.
* **REST API** which serves the frontend and the backend
** Stores all information in a database.
** Requires OIDC authentication and supports federation via google and facebook

**Architecture Components**
* **Frontend:** Next.js 15 (App Router) + React 18, TypeScript.
* **UI:** shadcdn, Tailwind optional for utilities.
* **Backend:** Next.js Route Handlers / API routes (Node 20, TypeScript).
* **DB:** MySQL 8 (InnoDB). ORM: TypeORM
* **Auth:** NextAuth.js (Email/Password + Google OAuth for YouTube linking).
* **Storage:** External links for media; small uploads (cover images) via S3-compatible bucket (v1.1).
* **Search:** MySQL full‑text (natural language) over assets/techniques; (optional) migration path to OpenSearch later.
* **Queues/Jobs:** In‑process background tasks via Next.js Route Handlers + periodic cron (Vercel/Cloud cron) for metadata refresh.
* **CI/CD:** GitHub Actions → deploy to Vercel (Frontend + Edge) and AWS for API if needed. Database in AWS RDS with IAM roles based STS auth
* **Testing:** Vitest + Testing Library, Playwright e2e. Pact-style contract tests for API DTOs.

## 3. High‑Level Scope

* Build and organize **training blocks** (blocks → sessions → units → techniques/drills/exercises).
* **Map assets** (videos, docs, images, PDFs) to techniques/drills; focus on YouTube.
* **Tagging & categories** for everything; reusable techniques across curricula.
* **Search** by tag/taxonomy/duration/provider with full‑text over titles/descriptions/transcripts.
* **Scheduling** with RRULE for recurring sessions; ICS export (v1.1).
* **Sharing** curricula via public pages & social cards (OpenGraph/Twitter).


## 4. Architecture Overview

**Runtime shape**

* **Next.js app** serves: UI, SSR/ISR pages, API routes (`/api/...`).
* **API layers**: `core` (curricula/techniques/sessions), `assets` (ingest/metadata), `share` (public pages), `auth`.
* **Backend API** serves the different frontend applications as their single point of truth
* **DB access** via TypeORM repositories. Entities map 1:1 to tables.
* **Background jobs**: Asset metadata fetch (YouTube), transcript ingestion, thumbnail refresh.

```
[Browser]\
   → Next.js (App Router + MUI)\
   → API Routes (/api/core, /api/assets, /api/share, /api/auth)\
   → TypeORM → MySQL
   → Cron jobs (metadata refresh, transcript parse)
```

**Key modules**

* `core`: curricula, blocks, sessions, units, techniques, skills, tags, progress, schedules.
* `assets`: external media ingestion, transcripts, attachments with timestamps.
* `share`: public renderers, SEO, OpenGraph, share‑link validation.
* `auth`: sign‑in/up, JWT session, roles/permissions.



## 5. Data Model (MySQL + TypeORM)

**Entities (abridged)**

* `Discipline { id, name, description, slug}`
* `User { id, handle, name, email, role, avatarUrl }`
* `Curriculum { id, discipline, ownerId(FK), title, slug, summary, visibility: enum('Public','Unlisted','Private'), coverImage, version, createdAt, updatedAt }`
* `Block { id, curriculumId(FK), title, objective, ord, color }`
* `Session { id, blockId(FK), title, startsAt(datetime NULL), durationMin, location, ord, notes }`
* `Unit { id, sessionId(FK), title, type enum('Technique','Drill','Exercise'), ord, durationMin, intensity, notes }`
* `Technique { id, discipline, title, taxonomy JSON, description, prerequisites JSON, tags JSON, canonicalAssetId NULL }`
* `Skill { id, discipline, title, taxonomy JSON, description, prerequisites JSON, tags JSON, canonicalAssetId NULL }`
* `Asset { id, discipline, type enum('Video','PDF','Image','Doc','Link'), provider enum('YouTube','Vimeo','Upload','Other'), url, title, description, durationSec, thumbnails JSON, transcript LONGTEXT, language, tags JSON, attribution JSON, license }`
* `Attachment { id, entityType enum('Unit','Technique'), entityId, assetId(FK), role enum('Primary','Reference','Alternative'), startTs INT NULL, endTs INT NULL }`
* `Tag { id, discipline, label, kind, parentId NULL }`
* `Schedule { id, entityType enum('Curriculum','Block','Session'), entityId, rule, startsAt, timezone }`
* `Progress { id, userId, entityType enum('Curriculum','Session','Unit','Technique'), entityId, status enum('NotStarted','InProgress','Completed'), rating TINYINT NULL, notes, lastViewedAt }`
* `ShareLink { id, entityType enum('Curriculum','Block'), entityId, token, visibility enum('Public','Unlisted','Private'), expiresAt NULL }`

**Indexes**

* Full‑text: `Asset(title, description, transcript)`, `Technique(title, description)`.
* B‑tree: FKs, `ShareLink(token)`, `Curriculum(slug, visibility)`.

**Migrations**

* TypeORM CLI migrations; no schema drift in runtime sync. Zero‑downtime pattern: additive changes → backfill → switch → drop.


## 6. External Integrations

* **YouTube Data API v3** (read‑only): pull title, channel, duration, thumbnails, captions if public. Process the information and extract author, coach, technique or skill. Suggest tags. Store license/attribution. Do not mirror content.
* **Calendar** (v1.1): ICS export only; no Google write scope.


## 7. API Conventions (REST over JSON)

* Base path: `/api/v1/`.
* **Auth:** Bearer JWT (NextAuth session token) for private routes.
* **Idempotency:** POST creates, PATCH updates, DELETE soft‑deletes where appropriate.
* **Pagination:** `?page=1&pageSize=20` with `X-Total-Count` header.
* **Errors:** Problem+JSON: `{ type, title, status, detail, instance }`.
* **Versioning:** Path versioning; breaking changes require `/v2`.

**Representative endpoints**

* `POST /curricula` | `GET /curricula?ownerId=&q=&tags=&visibility=` | `GET /curricula/:id` | `PATCH /curricula/:id`
* `POST /blocks` | `POST /sessions` | `POST /units`
* `POST /techniques`
* `POST /skills`
* `POST /assets:ingest` (YouTube URL) → async metadata fetch
* `POST /attachments`
* `GET /search?q=&filters=` (full‑text + facets)
* `POST /share-links` | `GET /share/:token`
* `POST /schedules`
* `GET /progress?userId=&entity=`

**DTO rules**

* Strict zod validation at the edge; map to TypeORM entities in service layer.


## 8. UX Conventions

* **Navigation:** Library (All Assets), Techniques, Curricula, Schedule, Share.
* **Editor hierarchy:** Curriculum → Block → Session → Unit; drag‑reorder.
* **Attachment UX:** Add video by URL; allow timestamp trimming (start/end seconds); preview.
* **Tagging:** Multiselect with taxonomy breadcrumbs (e.g., `Position › Guard › De La Riva`).
* **Search filters:** Type, Provider, Duration, Gi/No‑Gi, Skill Level, Tags.
* **A11y:** WCAG 2.1 AA, keyboard shortcuts for structure editing.


## 9. Security & Privacy

* Row‑level checks on every read/write (owner or explicit access via ShareLink).
* ShareLink tokens are random, time‑bounded (optional) and revocable.
* Respect media licenses; block public shares that violate license metadata.
* Audit trail for share access (entity, token, ip hash, userAgent, ts).



## 10. Performance & Quality Bars

* **Web Vitals:** LCP < 2.5s, INP < 200ms on share pages; Builder pages TTFB < 500ms.
* **API p95:** < 300ms for reads, < 600ms for writes.
* **DB:** N+1 guarded by repository patterns; indexes required for list endpoints.



## 11. Testing Strategy

* **Unit:** Services, validators, utilities (Vitest).
* **Integration:** API routes against a Docker MySQL.
* **E2E:** Playwright flows (create curriculum, attach video, search, share).
* **Seeds:** Demo dataset (6‑week guard‑passing block) for preview env.



## 12. Environments & Config

* **Local:** Docker MySQL; `.env.local` for secrets. `DATABASE_URL` for TypeORM.
* **Preview:** Per‑PR deploys (Vercel) + branch DB (optional) seeded.
* **Prod:** Vercel for Next.js + managed MySQL (PlanetScale/RDS). Backups daily.
* **Secrets:** Managed via Vercel Env; no secrets in repo.



## 13. Logging & Observability

* Request logging (pino) with correlation id.
* Structured domain events: `CurriculumCreated`, `TechniqueAttached`, `ShareOpened`.
* Error tracking: Sentry (browser + server).



## 14. Analytics (Creator Insights)

* Aggregate, anonymous: curriculum views, time‑on‑page (from YouTube player events), top techniques; opt‑out for Public share.


## 15. Release & Change Management

* Feature flags for risky UX.
* Semantic versioning on API (`v1`, `v1.1`).
* Migrations are reviewed and reversible; backup before destructive ops.



## 16. Glossary

* **Curriculum:** Top‑level training plan composed of blocks.
* **Block:** Thematic collection of sessions (e.g., “Guard Passing Week 1”).
* **Session:** Time‑boxed training meeting; contains units.
* **Unit:** An item within a session (Technique/Drill/Exercise).
* **Technique:** Canonical movement definition or sequence of movement definitions, reusable.
* **Skill:** Canonical definition of a technical skill, a reflex behaviour, a habit to develop, muscle memory, reusable.
* **Asset:** External media resource (YouTube video, PDF, image, link).
* **Attachment:** Link between a Technique/Unit and an Asset (+timestamps).




