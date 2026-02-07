# CLAUDE.md

This file provides guidance to Claude Code when working with the SkillHive codebase.

## Project Overview

SkillHive is a training content management platform for collecting external video knowledge and instructionals and organizing them into repeatable, shareable curricula. Built for martial arts training (BJJ, JKD), it lets users collect, tag, categorize, and organize video links into structured curricula.

### Key Concepts

- Techniques and skills are reflected by referenced assets (primarily video links)
- We do not upload or host videos — we reference streaming platforms and respect their constraints, licenses, and paywalls
- Users collect video links, extract metadata, tag and categorize them
- Curricula are ordered lists of techniques, assets, and text notes

## Architecture

Two-directory structure at repo root:

```
frontend/     Vue 3 SPA (Vite + PrimeVue + Firebase Auth)
backend/      Go REST API (Chi + Firebase Admin SDK + Firestore)
```

**Web UI (Vue 3):** SPA behind Firebase Auth login. All data comes from the Go API. No direct database access.

**API (Go + Chi):** Stateless REST API. Firebase Auth for token verification. Firestore for persistence. Designed to serve multiple frontends.

**Database (Firestore):** Document-based. String IDs (Firestore doc IDs). Owner-based access via `ownerUid` field. Disciplines are system-seeded read-only data.

## Tech Stack

- **Frontend:** Vue 3.5, Vite 7, TypeScript 5.9, PrimeVue 4 (Aura theme), Pinia, vue-router 4, Zod, DOMPurify, marked
- **Backend:** Go 1.25, Chi v5, Firebase Admin SDK, Firestore, bluemonday
- **Auth:** Firebase Authentication (Google + email/password)
- **Database:** Cloud Firestore
- **Deployment:** Firebase Hosting (frontend), Cloud Run (backend)
- **CI/CD:** GitHub Actions (`.github/workflows/ci.yml` + `deploy.yml`)

## Specialists

Use specialist agents for the listed tasks:

- frontend-dev: Expert developer for Vue 3, PrimeVue, and responsive design

## Project Structure

### Backend (`backend/`)

```
main.go                          Chi router, middleware stack, graceful shutdown
cmd/seed/main.go                 Firestore seeder for disciplines/categories/techniques
internal/
  config/config.go               Env loading (PORT, GCP_PROJECT, FIREBASE_KEY_PATH)
  middleware/
    auth.go                      Firebase ID token verification, UID in context
    cors.go                      CORS config
    logging.go                   slog request logging
  handler/
    health.go                    GET /healthz
    disciplines.go               GET /api/v1/disciplines (read-only)
    tags.go                      CRUD /api/v1/tags
    categories.go                CRUD /api/v1/categories
    techniques.go                CRUD /api/v1/techniques
    assets.go                    CRUD /api/v1/assets
    oembed.go                    POST /api/v1/youtube/resolve
    curricula.go                 CRUD /api/v1/curricula (+ public listing)
    curriculum_elements.go       CRUD /api/v1/curricula/{id}/elements (+ reorder)
    helpers.go                   JSON response/error helpers
  model/                         Go structs for all entities
  store/client.go                Firestore + Firebase Auth client init
  validate/                      String validation, HTML sanitization, slug generation
Dockerfile                       Multi-stage build (golang:1.22-alpine -> alpine:3.19)
```

### Frontend (`frontend/`)

```
src/
  main.ts                        App bootstrap (Vue, PrimeVue, router, Pinia)
  App.vue                        Root component
  plugins/
    primevue.ts                  PrimeVue config with Aura preset
    firebase.ts                  Firebase JS SDK init + emulator connect in dev
  router/
    index.ts                     Route definitions (lazy-loaded views)
    guards.ts                    Auth navigation guard
  stores/
    auth.ts                      User state, login/logout actions
    discipline.ts                Active discipline, discipline list (persisted to localStorage)
    tags.ts                      Tags CRUD
    categories.ts                Categories CRUD
    techniques.ts                Techniques CRUD
    assets.ts                    Assets CRUD
    curricula.ts                 Curricula + elements CRUD
  composables/
    useApi.ts                    Authenticated fetch wrapper (Bearer token from Firebase)
    useDebounce.ts               Debounced ref composable
  views/                         Page-level components (11 views)
  components/
    layout/                      AppLayout, AppSidebar, DisciplinePicker
    common/                      MarkdownRenderer
    tags/                        TagList, TagForm, TagBadge
    categories/                  CategoryTree, CategoryForm
    techniques/                  TechniqueList, TechniqueCard, TechniqueForm
    assets/                      AssetList, AssetCard, AssetForm, UrlResolver
    curricula/                   CurriculumList, CurriculumForm, ElementList, ElementCard, AddElementMenu
    curricula/modals/            TechniqueSearchModal, AssetSearchModal, TextElementModal
    dashboard/                   QuickStats, RecentCurricula, QuickSaveVideo
  types/index.ts                 TypeScript interfaces for all entities
  validation/schemas.ts          Zod schemas + form data types (TagFormData, TechniqueFormData, etc.)
```

### Firebase Config (repo root)

```
firebase.json                    Hosting, Firestore rules path, emulator config
.firebaserc                      Project alias (skillhive)
firestore.rules                  Security rules (owner-based access)
firestore.indexes.json           Composite indexes for common queries
```

## API Routes

All protected routes require Firebase Auth token (`Authorization: Bearer <token>`).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/healthz` | Health check (public) |
| GET | `/api/v1/disciplines` | List disciplines |
| GET/POST | `/api/v1/tags` | List / create tags |
| GET/PATCH/DELETE | `/api/v1/tags/{id}` | Get / update / delete tag |
| GET/POST | `/api/v1/categories` | List / create categories |
| GET/PATCH/DELETE | `/api/v1/categories/{id}` | Get / update / delete category |
| GET/POST | `/api/v1/techniques` | List / create techniques |
| GET/PATCH/DELETE | `/api/v1/techniques/{id}` | Get / update / delete technique |
| GET/POST | `/api/v1/assets` | List / create assets |
| GET/PATCH/DELETE | `/api/v1/assets/{id}` | Get / update / delete asset |
| POST | `/api/v1/youtube/resolve` | Resolve YouTube URL to metadata |
| GET/POST | `/api/v1/curricula` | List / create curricula |
| GET | `/api/v1/curricula/public` | List public curricula |
| GET/PATCH/DELETE | `/api/v1/curricula/{id}` | Get / update / delete curriculum |
| GET/POST | `/api/v1/curricula/{id}/elements` | List / create elements |
| PUT/DELETE | `/api/v1/curricula/{id}/elements/{elemId}` | Update / delete element |
| PUT | `/api/v1/curricula/{id}/elements/reorder` | Reorder elements |

## Important Rules

1. **Slug uniqueness**: Slugs are unique per discipline, not globally
2. **Hierarchical categories**: Prevent self-reference and validate parent existence
3. **Owner-based access**: All user entities have `ownerUid` field; only owner can update/delete
4. **Firestore IDs**: All IDs are strings (Firestore document IDs), never numeric
5. **Discipline store**: File is `stores/discipline.ts` (singular). Exports `activeDisciplineId` (ref) and `activeDiscipline` (computed)
6. **Form data types**: `TechniqueFormData`, `AssetFormData`, etc. live in `validation/schemas.ts`, NOT in `types/index.ts`
7. **Port conflicts**: If ports are in use, kill the existing process. Don't start on different ports
8. **NO ALERT() OR CONFIRM()**: Use PrimeVue Toast, ConfirmDialog, and Dialog components
9. **BE FULLY HONEST**: Never claim to have fixed or completed a task without testing it
10. **ALWAYS TEST OUTPUT**: Verify results before claiming completeness

## Quick Start

```bash
# Backend
cd backend
cp .env.example .env
go run .                           # Starts on :8080

# Frontend
cd frontend
npm install
npm run dev                        # Starts on :5173

# Firebase emulators (requires Java)
npx firebase-tools emulators:start

# Seed Firestore
cd backend && go run cmd/seed/main.go
```

## Environment Variables

### Backend (`backend/.env`)
- `PORT` — Server port (default: 8080)
- `GCP_PROJECT` — Firebase project ID
- `FIREBASE_KEY_PATH` — Path to service account key JSON
- `CORS_ALLOWED_ORIGINS` — Comma-separated allowed origins
- `ENV` — development | production

### Frontend (`frontend/.env`)
- `VITE_API_URL` — Backend API URL (default: http://localhost:8080)
- `VITE_FIREBASE_API_KEY` — Firebase web API key (for Auth only)
- `VITE_FIREBASE_AUTH_DOMAIN` — Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID` — Firebase project ID

> The frontend has NO direct access to Firestore, Storage, or any cloud infrastructure. All data flows through the Go API. Firebase is only used client-side for authentication.
