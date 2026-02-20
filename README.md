# SkillHive

Training content management platform for organizing video instructionals into structured curricula. Built for martial arts training (BJJ, JKD), but adaptable to any discipline-based learning.

## What It Does

- Collect and organize video links from YouTube and other platforms
- Tag and categorize techniques with hierarchical categories
- Build ordered curricula from techniques, video assets, and text notes
- Share public curricula with others
- YouTube metadata auto-extraction via oEmbed

### Dashboard View
<img width="800" height="469" alt="dashboard" src="https://github.com/user-attachments/assets/cf89fcec-d3c2-4da8-80fa-dceb2a04b8c1" />

### Training Organization / Curricula 
<img width="800" height="515" alt="curricula" src="https://github.com/user-attachments/assets/628bc616-09ae-4e06-b388-c50e8df24ae0" />

### Video Asset Management
<img width="800" height="461" alt="assets" src="https://github.com/user-attachments/assets/6057e1d1-2684-404f-b34a-9a2fe5255141" />


## Architecture

```
frontend/     Vue 3 SPA — UI, routing, Firebase Auth
backend/      Go REST API — business logic, Firestore persistence
```

- **Frontend:** Vue 3 + Vite + PrimeVue 4 + Pinia + Firebase JS SDK
- **Backend:** Go + Chi v5 + Firebase Admin SDK + Cloud Firestore
- **Auth:** Firebase Authentication (Google sign-in + email/password)
- **Database:** Cloud Firestore (NoSQL document store)
- **Hosting:** Firebase Hosting (frontend) + Cloud Run (backend)

## Prerequisites

- [Go](https://go.dev/dl/) 1.22+
- [Node.js](https://nodejs.org/) 20+
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)
- [Java Runtime](https://www.java.com/) (required for Firebase emulators)
- A Firebase project with Firestore and Authentication enabled

## Getting Started

### 1. Clone and configure

```bash
git clone <repo-url>
cd skillhive
```

### 2. Set up Firebase

Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com):

1. Create a new project (or use existing)
2. Enable **Authentication** with Google and Email/Password providers
3. Create a **Firestore Database** (production mode, choose your region)
4. Generate a service account key: Project Settings > Service accounts > Generate new private key
5. Save the key as `backend/serviceAccountKey.json`
6. Get your web app config: Project Settings > General > Your apps > Add web app

### 3. Configure environment

**Backend:**

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=8080
GCP_PROJECT=your-firebase-project-id
FIREBASE_KEY_PATH=./serviceAccountKey.json
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5000
ENV=development
```

**Frontend:**

```bash
cd frontend
cp .env.example .env   # or edit the existing .env
```

Edit `frontend/.env` with your Firebase auth config:

```env
VITE_API_URL=http://localhost:8080
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

> **Important:** The frontend only uses Firebase for authentication. It has no direct access to Firestore, Storage, or any other cloud infrastructure. All data flows exclusively through the Go API.

### 4. Seed the database

Populate Firestore with initial disciplines (BJJ, JKD), categories, and sample techniques:

```bash
cd backend
go run cmd/seed/main.go
```

### 5. Start development servers

**Terminal 1 — Backend:**

```bash
cd backend
go run .
```

The API starts on `http://localhost:8080`. Verify with:

```bash
curl http://localhost:8080/healthz
# {"status":"ok"}
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm install
npm run dev
```

The app opens at `http://localhost:5173`.

### 6. Firebase emulators (optional)

For local development without connecting to production Firebase:

```bash
npx firebase-tools emulators:start
```

This starts:
- Auth emulator on port 9099
- Firestore emulator on port 8080
- Hosting emulator on port 5000
- Emulator UI at port 4000

> Note: The Firestore emulator uses port 8080, which conflicts with the Go backend default port. When using emulators, either change the backend port or run the backend against the emulator.

## Development

### Common Commands

```bash
# Backend
cd backend
go run .                         # Start dev server
go build .                       # Build binary
go vet ./...                     # Lint
go run cmd/seed/main.go          # Seed Firestore

# Frontend
cd frontend
npm run dev                      # Start Vite dev server (port 5173)
npm run build                    # Type-check + production build
npx vue-tsc --noEmit             # Type-check only
npx vite build                   # Build only (skip type-check)
npm run preview                  # Preview production build
```

### Project Structure

```
skillhive/
├── backend/
│   ├── main.go                  # Entry point, router, middleware
│   ├── cmd/seed/main.go         # Database seeder
│   ├── internal/
│   │   ├── config/              # Environment configuration
│   │   ├── handler/             # HTTP handlers (one per entity)
│   │   ├── middleware/          # Auth, CORS, logging
│   │   ├── model/               # Data structs
│   │   ├── store/               # Firestore client
│   │   └── validate/            # Input validation + sanitization
│   ├── Dockerfile
│   └── go.mod
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── composables/         # Vue composables (useApi, useDebounce)
│   │   ├── plugins/             # PrimeVue + Firebase setup
│   │   ├── router/              # Routes + auth guard
│   │   ├── stores/              # Pinia stores (one per entity)
│   │   ├── types/               # TypeScript interfaces
│   │   ├── validation/          # Zod schemas
│   │   └── views/               # Page components
│   ├── package.json
│   └── vite.config.ts
├── firebase.json                # Firebase project config
├── firestore.rules              # Firestore security rules
├── firestore.indexes.json       # Composite indexes
└── .github/workflows/           # CI/CD pipelines
```

### API Endpoints

All `/api/v1/*` routes require a Firebase Auth token in the `Authorization: Bearer <token>` header.

| Resource | Endpoints |
|----------|-----------|
| Health | `GET /healthz` |
| Disciplines | `GET /api/v1/disciplines` |
| Tags | `GET, POST /api/v1/tags` | `GET, PATCH, DELETE /api/v1/tags/{id}` |
| Categories | `GET, POST /api/v1/categories` | `GET, PATCH, DELETE /api/v1/categories/{id}` |
| Techniques | `GET, POST /api/v1/techniques` | `GET, PATCH, DELETE /api/v1/techniques/{id}` |
| Assets | `GET, POST /api/v1/assets` | `GET, PATCH, DELETE /api/v1/assets/{id}` |
| YouTube | `POST /api/v1/youtube/resolve` |
| Curricula | `GET, POST /api/v1/curricula` | `GET /api/v1/curricula/public` | `GET, PATCH, DELETE /api/v1/curricula/{id}` |
| Elements | `GET, POST /api/v1/curricula/{id}/elements` | `PUT, DELETE /api/v1/curricula/{id}/elements/{elemId}` | `PUT /api/v1/curricula/{id}/elements/reorder` |

**Common query parameters:**
- `disciplineId` — Filter by discipline (required for tags, categories, techniques, assets)
- `q` — Text search (techniques, assets)
- `categoryId` — Filter by category (techniques)
- `tagId` — Filter by tag (techniques, assets)
- `limit`, `offset` — Pagination

### Frontend Pages

| Route | View | Description |
|-------|------|-------------|
| `/` | DashboardView | Quick stats, recent curricula, quick-save video |
| `/login` | LoginView | Firebase Auth (Google + email/password) |
| `/tags` | TagsView | Tag management with color picker |
| `/categories` | CategoriesView | Hierarchical category tree |
| `/techniques` | TechniquesView | Technique list with search and filters |
| `/techniques/:id` | TechniqueDetailView | Technique detail with edit/delete |
| `/assets` | AssetsView | Video asset list with search |
| `/assets/new` | SaveAssetView | Create new asset with YouTube URL resolver |
| `/assets/:id/edit` | SaveAssetView | Edit existing asset |
| `/curricula` | CurriculaView | User's curricula list |
| `/curricula/public` | PublicCurriculaView | Browse public curricula |
| `/curricula/:id` | CurriculumDetailView | Curriculum builder (add/reorder/delete elements) |

## Deployment

### Backend — Cloud Run

Build and deploy the Docker container:

```bash
cd backend

# Build
docker build -t skillhive-api .

# Deploy to Cloud Run
gcloud run deploy skillhive-api \
  --image gcr.io/YOUR_PROJECT/skillhive-api \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars="GCP_PROJECT=YOUR_PROJECT,ENV=production,CORS_ALLOWED_ORIGINS=https://your-domain.web.app"
```

### Frontend — Firebase Hosting

```bash
cd frontend
npm run build

# Deploy
npx firebase-tools deploy --only hosting
```

### CI/CD

GitHub Actions workflows are in `.github/workflows/`:

- **`ci.yml`** — Runs on every push/PR: Go build + vet, Vue type-check + production build
- **`deploy.yml`** — Runs on push to `main`: deploys backend to Cloud Run, frontend to Firebase Hosting

Required GitHub secrets for deployment:
- `GCP_PROJECT_ID` — Firebase/GCP project ID
- `GCP_SA_KEY` — Service account key JSON (base64 encoded)
- `FIREBASE_TOKEN` — Firebase CLI token (`firebase login:ci`)

## Firestore Data Model

| Collection | Key Fields | Notes |
|------------|-----------|-------|
| `disciplines` | `name`, `slug`, `description` | Seeded, read-only |
| `tags` | `name`, `slug`, `color`, `disciplineId`, `ownerUid` | Unique slug per discipline |
| `categories` | `name`, `slug`, `parentId`, `disciplineId`, `ownerUid` | Hierarchical, self-referencing |
| `techniques` | `name`, `slug`, `description`, `categoryIds[]`, `tagIds[]`, `disciplineId`, `ownerUid` | Arrays for many-to-many |
| `assets` | `title`, `url`, `type`, `videoType`, `thumbnailUrl`, `originator`, `techniqueIds[]`, `tagIds[]`, `disciplineId`, `ownerUid` | Video metadata via oEmbed |
| `curricula` | `title`, `description`, `isPublic`, `ownerUid` | Public curricula visible to all |
| `curricula/{id}/elements` | `type`, `ord`, `techniqueId?`, `assetId?`, `title?`, `details?` | Subcollection, ordered |

All documents use Firestore auto-generated IDs. Owner-based access: users can only read/write their own data (except public curricula and seeded disciplines).

## License

Private project.
