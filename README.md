# SkillHive 
WORK in PROGRESS

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

- **apps/web** - Next.js 15 web application (frontend + NextAuth.js)
- **apps/api** - NestJS REST API (primary CRUD API with OAuth2/OIDC authentication)
- **packages/shared** - Shared utilities, types, and constants (including OAuth scopes)
- **packages/db** - Database entities, migrations, and TypeORM configuration
- **packages/auth** - NextAuth.js configuration and authorization helpers

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- MySQL 8.0+ database

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

**Required Configuration:**

```bash
# Database
DATABASE_URL=mysql://user:password@localhost:3306/trainhive

# Authentication - IMPORTANT: Generate a secure secret!
NEXTAUTH_SECRET=your-secure-secret-here
NEXTAUTH_URL=http://localhost:3000

# API Configuration
API_PORT=3001
CORS_ORIGIN=http://localhost:3000
```

**Generate a secure NEXTAUTH_SECRET:**

```bash
# On Linux/macOS
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**⚠️ IMPORTANT:** Never commit your `.env` file. The `.env.example` file is provided as a template.

### 3. Build All Packages

```bash
npm run build
```

### 4. Start Development Servers

**Option A: Start both frontend and API together**
```bash
npm run dev:all
```

**Option B: Start separately**
```bash
# Terminal 1 - Web app
npm run dev

# Terminal 2 - API
npm run dev:api
```

### 5. Access the Application

- **Web App**: http://localhost:3000
- **API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs (Swagger UI)

## Dashboard

The main dashboard (`/`) provides quick access to key features:
- **Training Sessions** - View and manage scheduled training sessions
- **Curricula** - Create and organize training curricula
- **Techniques** - Browse and manage your technique library
- **Save Video** - Add and enrich video URLs with metadata

For more details, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Authentication & Authorization

### Overview

SkillHive uses a multi-layered authentication and authorization system:

- **NextAuth.js v4** for frontend authentication (supports credentials + OAuth providers)
- **JWT tokens** shared between frontend and API (7-day expiration)
- **NestJS guards** for API authentication and authorization
- **OAuth2/OIDC** support for Google and Microsoft (optional)

### Local Development (Offline-Capable)

By default, the app works **completely offline** using email/password authentication:

1. Create an account at http://localhost:3000/register
2. Login at http://localhost:3000/login
3. The frontend receives a JWT token
4. API validates the JWT token automatically

**No OAuth configuration required for local development!**

### OAuth Configuration (Optional)

To enable social login with Google or Microsoft:

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Add to `.env`:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

#### Microsoft/Azure AD OAuth

1. Go to [Azure Portal](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps)
2. Register new application
3. Add redirect URI: `http://localhost:3000/api/auth/callback/azure-ad`
4. Create client secret
5. Add to `.env`:
   ```bash
   MICROSOFT_CLIENT_ID=your-client-id
   MICROSOFT_CLIENT_SECRET=your-client-secret
   MICROSOFT_TENANT_ID=common
   ```

### User Roles & Permissions

SkillHive has a hierarchical role system with scope-based permissions:

**Roles (Hierarchy: ADMIN > MANAGER > PROFESSOR > USER)**

- **USER**: Can view public content and manage own profile
- **PROFESSOR**: Can create/edit techniques, curricula, and videos
- **MANAGER**: Professor permissions + user management + delete operations
- **ADMIN**: Full system access including user role management

**OAuth Scopes**: Each role has associated scopes (e.g., `read:techniques`, `write:curricula`, `delete:users`). See `packages/shared/src/constants/scopes.ts` for complete scope definitions.

### API Authentication

All API endpoints (except public ones) require authentication:

**Public Endpoints:**
- `GET /api/v1/health` - Health check
- `GET /api/v1/disciplines` - List disciplines
- `POST /api/v1/users` - User registration

**Protected Endpoints:**
Send JWT token in Authorization header:
```bash
curl -H "Authorization: Bearer <jwt-token>" \
  http://localhost:3001/api/v1/users/me
```

For complete API documentation, visit http://localhost:3001/api/docs

## Production Deployment

### Prerequisites

- GCP Project with billing enabled
- Cloud SQL MySQL 8.0 instance
- Domain name (for production URLs)
- SSL certificate (Let's Encrypt or Cloud Load Balancer)

### 1. Generate Production Secret

**⚠️ CRITICAL: Use a strong secret in production!**

```bash
# Generate a cryptographically secure 256-bit secret
openssl rand -base64 32
```

Save this secret securely (never commit to git):
- Use GCP Secret Manager
- Or secure environment variable storage

### 2. Configure Production Environment

Create `.env.production` with:

```bash
# Database - Cloud SQL connection
DATABASE_URL=mysql://user:password@cloud-sql-proxy/trainhive

# Authentication - USE STRONG SECRET!
NEXTAUTH_SECRET=<generated-secret-from-step-1>
NEXTAUTH_URL=https://yourdomain.com

# API Configuration
API_PORT=8080
CORS_ORIGIN=https://yourdomain.com
NODE_ENV=production
```

### 3. Configure OAuth Providers for Production

#### Google OAuth (Production)

1. Add production redirect URI: `https://yourdomain.com/api/auth/callback/google`
2. Update authorized domains
3. Set environment variables in GCP Secret Manager

#### Microsoft OAuth (Production)

1. Add production redirect URI: `https://yourdomain.com/api/auth/callback/azure-ad`
2. Configure app registration for production domain
3. Set environment variables in GCP Secret Manager

### 4. Deploy to GCP

#### Option A: Cloud Run (Recommended)

```bash
# Build and deploy API
cd apps/api
gcloud run deploy trainhive-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# Build and deploy Web App
cd ../web
gcloud run deploy trainhive-web \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Option B: App Engine

```bash
# Deploy API
cd apps/api
gcloud app deploy

# Deploy Web App
cd ../web
gcloud app deploy
```

### 5. Configure Cloud SQL

1. Create Cloud SQL instance (MySQL 8.0)
2. Set up Cloud SQL Proxy or private IP
3. Update `DATABASE_URL` with Cloud SQL connection string
4. Run migrations:
   ```bash
   npm run db:migrate
   ```

### 6. Security Checklist for Production

- [ ] **NEXTAUTH_SECRET** is a strong random string (use `openssl rand -base64 32`)
- [ ] **NEXTAUTH_URL** matches your production domain (HTTPS)
- [ ] **Database credentials** are stored in Secret Manager
- [ ] **OAuth credentials** are stored in Secret Manager
- [ ] **CORS_ORIGIN** is set to your production frontend URL
- [ ] **SSL/TLS** is enabled (HTTPS only)
- [ ] **Secure cookies** are enabled (`secure: true` in production)
- [ ] **Rate limiting** is configured (consider Cloud Armor)
- [ ] **Database backups** are enabled
- [ ] **Monitoring** is set up (Cloud Monitoring/Logging)

### 7. Environment Variables in GCP

**Using Secret Manager:**

```bash
# Store NEXTAUTH_SECRET
echo -n "your-secret-here" | \
  gcloud secrets create nextauth-secret --data-file=-

# Grant access to Cloud Run/App Engine
gcloud secrets add-iam-policy-binding nextauth-secret \
  --member="serviceAccount:your-service-account@project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

**Reference in Cloud Run:**

```yaml
env:
  - name: NEXTAUTH_SECRET
    valueFrom:
      secretKeyRef:
        name: nextauth-secret
        key: latest
```

### 8. Post-Deployment Verification

1. **Health Check**: `curl https://yourdomain.com/api/v1/health`
2. **API Docs**: Visit `https://yourdomain.com/api/docs`
3. **Login Flow**: Test credentials and OAuth login
4. **CORS**: Verify frontend can call API
5. **SSL**: Ensure HTTPS is enforced
6. **Token Validation**: Test protected endpoints with JWT

### Troubleshooting Production

**Issue: "Unauthorized" errors**
- Verify `NEXTAUTH_SECRET` is identical in web app and API
- Check JWT token is being sent in Authorization header
- Verify token hasn't expired (7-day default)

**Issue: OAuth login fails**
- Verify redirect URIs match production domain
- Check OAuth credentials are correct
- Ensure `NEXTAUTH_URL` matches your domain

**Issue: CORS errors**
- Verify `CORS_ORIGIN` matches frontend URL
- Check API is accessible from frontend domain
- Ensure Cloud Load Balancer/CDN isn't blocking CORS headers

For more details, see [CLAUDE.md](./CLAUDE.md) for complete authentication architecture documentation.

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
