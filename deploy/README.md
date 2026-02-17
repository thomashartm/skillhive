# SkillHive Deployment

This directory contains scripts to deploy SkillHive to Google Cloud Platform.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions                            │
│                   (Workload Identity)                        │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
     ┌─────────────────┐             ┌─────────────────┐
     │   Cloud Run     │             │    Firebase     │
     │  (europe-west1) │             │    Hosting      │
     │  skillhive-api  │             │  frontend/dist  │
     └─────────────────┘             └─────────────────┘
              │                               │
              │         ┌─────────────────────┤
              │         │                     │
              ▼         ▼                     ▼
     ┌─────────────────────┐         ┌─────────────────┐
     │   Secret Manager    │         │    Firestore    │
     │   (runtime secrets) │         │   (database)    │
     └─────────────────────┘         └─────────────────┘
```

## Prerequisites

- [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed and authenticated
- [Firebase CLI](https://firebase.google.com/docs/cli) installed (`npm install -g firebase-tools`)
- Node.js 20+
- Go 1.21+

## Quick Start

### 1. Configure Environment

```bash
cd deploy
cp env.example.sh env.sh
# Edit env.sh with your values (especially GITHUB_ORG)
```

### 2. Run Setup Scripts (First Time Only)

```bash
# Make scripts executable
chmod +x setup/*.sh deploy/*.sh

# Run setup in order
./setup/01-enable-apis.sh
./setup/02-create-service-accounts.sh
./setup/03-setup-secrets.sh          # Interactive - prompts for values
./setup/04-setup-workload-identity.sh # Outputs GitHub secrets to add
./setup/05-setup-artifact-registry.sh
```

### 3. Deploy

```bash
# Deploy everything
./deploy/all.sh

# Or deploy individually
./deploy/backend.sh
./deploy/frontend.sh
./deploy/firestore.sh
```

### 4. Setup Custom Domain (After First Backend Deploy)

```bash
./setup/06-setup-custom-domain.sh
# Then add the DNS CNAME record as instructed
```

### 5. Configure GitHub Actions

Add these secrets to your GitHub repository:
- `WIF_PROVIDER` - Output from step 2
- `WIF_SERVICE_ACCOUNT` - Output from step 2

## Directory Structure

```
deploy/
├── README.md                    # This file
├── env.example.sh               # Environment template
├── env.sh                       # Your config (git-ignored)
│
├── setup/                       # One-time setup scripts
│   ├── 01-enable-apis.sh        # Enable GCP APIs
│   ├── 02-create-service-accounts.sh  # Create SAs
│   ├── 03-setup-secrets.sh      # Configure Secret Manager
│   ├── 04-setup-workload-identity.sh  # GitHub OIDC
│   ├── 05-setup-artifact-registry.sh  # Container registry
│   └── 06-setup-custom-domain.sh      # Cloud Run domain
│
├── deploy/                      # Deployment scripts
│   ├── all.sh                   # Full deployment
│   ├── backend.sh               # Cloud Run deployment
│   ├── frontend.sh              # Firebase Hosting
│   └── firestore.sh             # Rules and indexes
│
└── secrets/
    └── secrets.example.yaml     # Secret values template
```

## Scripts Reference

### Setup Scripts

| Script | Purpose | Run When |
|--------|---------|----------|
| `01-enable-apis.sh` | Enable required GCP APIs | First time |
| `02-create-service-accounts.sh` | Create deployer SA with roles | First time |
| `03-setup-secrets.sh` | Create secrets in Secret Manager | First time, or to update secrets |
| `04-setup-workload-identity.sh` | Configure GitHub Actions OIDC | First time |
| `05-setup-artifact-registry.sh` | Create container image repo | First time |
| `06-setup-custom-domain.sh` | Map custom domain to Cloud Run | After first backend deploy |

### Deploy Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `all.sh [version]` | Full deployment | `./deploy/all.sh v1.2.3` |
| `backend.sh [version]` | Deploy API to Cloud Run | `./deploy/backend.sh latest` |
| `frontend.sh` | Deploy to Firebase Hosting | `./deploy/frontend.sh` |
| `firestore.sh` | Deploy rules & indexes | `./deploy/firestore.sh` |

### Dry Run Mode

Set `DRY_RUN=true` to see what would be executed without making changes:

```bash
DRY_RUN=true ./deploy/all.sh
```

## Secrets

Secrets are stored in Google Cloud Secret Manager and injected at runtime:

| Secret | Used By | Description |
|--------|---------|-------------|
| `skillhive-cors-origins` | Cloud Run | Allowed CORS origins |
| `skillhive-api-url` | Frontend build | API endpoint URL |
| `skillhive-firebase-*` | Frontend build | Firebase configuration |

### Updating Secrets

```bash
# Update a specific secret
gcloud secrets versions add skillhive-cors-origins \
  --data-file=- \
  --project=level-dragon-478821-t3 <<< "https://new-origin.com"

# Redeploy to pick up changes
./deploy/backend.sh  # For runtime secrets
./deploy/frontend.sh # For build-time secrets
```

## Troubleshooting

### "Permission denied" on scripts

```bash
chmod +x setup/*.sh deploy/*.sh
```

### "env.sh not found"

```bash
cp env.example.sh env.sh
# Edit env.sh with your values
```

### Cloud Run deployment fails

1. Check that Artifact Registry exists:
   ```bash
   gcloud artifacts repositories list --project=level-dragon-478821-t3
   ```

2. Check that image was built:
   ```bash
   gcloud artifacts docker images list europe-west1-docker.pkg.dev/level-dragon-478821-t3/skillhive
   ```

### Frontend build fails with missing secrets

Run `./setup/03-setup-secrets.sh` to configure all required secrets.

### Custom domain SSL not working

SSL provisioning can take up to 24 hours. Check status:
```bash
gcloud run domain-mappings describe \
  --domain=skillhive.thartm.net \
  --region=europe-west1 \
  --project=level-dragon-478821-t3
```

## CI/CD with GitHub Actions

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that:

1. Authenticates via Workload Identity Federation (no service account keys!)
2. Fetches secrets from Secret Manager
3. Builds and deploys backend to Cloud Run
4. Builds and deploys frontend to Firebase Hosting

### Required GitHub Secrets

| Secret | Value |
|--------|-------|
| `WIF_PROVIDER` | `projects/551873236818/locations/global/workloadIdentityPools/github-actions/providers/github` |
| `WIF_SERVICE_ACCOUNT` | `skillhive-deployer@level-dragon-478821-t3.iam.gserviceaccount.com` |

These values are output by `./setup/04-setup-workload-identity.sh`.

## Manual Deployment (Without GitHub Actions)

If you need to deploy manually:

```bash
# Login to GCP
gcloud auth login
gcloud config set project level-dragon-478821-t3

# Login to Firebase
firebase login

# Deploy
./deploy/all.sh
```
