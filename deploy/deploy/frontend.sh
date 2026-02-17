#!/bin/bash
# Deploy Vue frontend to Firebase Hosting
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/../env.sh" 2>/dev/null || {
    echo "Error: env.sh not found. Copy env.example.sh to env.sh and configure it."
    exit 1
}

DRY_RUN="${DRY_RUN:-false}"

echo "=== Deploying Frontend to Firebase Hosting ==="
echo ""
echo "Project: ${PROJECT_ID}"
echo ""

# Step 1: Fetch secrets for Vite build
echo "=== Step 1: Fetching secrets from Secret Manager ==="

fetch_secret() {
    local secret_name="$1"
    gcloud secrets versions access latest \
        --secret="${secret_name}" \
        --project="${PROJECT_ID}" 2>/dev/null || echo ""
}

export VITE_API_URL=$(fetch_secret "${SECRET_API_URL}")
export VITE_FIREBASE_API_KEY=$(fetch_secret "${SECRET_FIREBASE_API_KEY}")
export VITE_FIREBASE_AUTH_DOMAIN=$(fetch_secret "${SECRET_FIREBASE_AUTH_DOMAIN}")
export VITE_FIREBASE_PROJECT_ID=$(fetch_secret "${SECRET_FIREBASE_PROJECT_ID}")
export VITE_FIREBASE_STORAGE_BUCKET=$(fetch_secret "${SECRET_FIREBASE_STORAGE_BUCKET}")
export VITE_FIREBASE_MESSAGING_SENDER_ID=$(fetch_secret "${SECRET_FIREBASE_MESSAGING_SENDER_ID}")
export VITE_FIREBASE_APP_ID=$(fetch_secret "${SECRET_FIREBASE_APP_ID}")

# Validate required secrets
MISSING_SECRETS=()
[[ -z "${VITE_API_URL}" ]] && MISSING_SECRETS+=("${SECRET_API_URL}")
[[ -z "${VITE_FIREBASE_API_KEY}" ]] && MISSING_SECRETS+=("${SECRET_FIREBASE_API_KEY}")
[[ -z "${VITE_FIREBASE_AUTH_DOMAIN}" ]] && MISSING_SECRETS+=("${SECRET_FIREBASE_AUTH_DOMAIN}")
[[ -z "${VITE_FIREBASE_PROJECT_ID}" ]] && MISSING_SECRETS+=("${SECRET_FIREBASE_PROJECT_ID}")

if [[ ${#MISSING_SECRETS[@]} -gt 0 ]]; then
    echo "Error: Missing required secrets:"
    for secret in "${MISSING_SECRETS[@]}"; do
        echo "  - ${secret}"
    done
    echo ""
    echo "Run ./deploy/setup/03-setup-secrets.sh to configure secrets."
    exit 1
fi

echo "  VITE_API_URL=${VITE_API_URL}"
echo "  VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}"
echo "  (other secrets loaded)"

# Step 2: Install dependencies
echo ""
echo "=== Step 2: Installing dependencies ==="
cd "${ROOT_DIR}/frontend"

if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[DRY RUN] Would run: npm ci"
else
    npm ci
fi

# Step 3: Build the application
echo ""
echo "=== Step 3: Building frontend ==="

if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[DRY RUN] Would run: npm run build"
else
    npm run build
fi

# Step 4: Deploy to Firebase Hosting
echo ""
echo "=== Step 4: Deploying to Firebase Hosting ==="

if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[DRY RUN] Would run: firebase deploy --only hosting"
else
    firebase deploy --only hosting --project="${PROJECT_ID}"
fi

echo ""
echo "=== Frontend deployment complete ==="
echo ""
echo "URLs:"
echo "  Default: https://${PROJECT_ID}.web.app"
echo "  Alt:     https://${PROJECT_ID}.firebaseapp.com"
