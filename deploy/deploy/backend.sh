#!/bin/bash
# Deploy Go API backend to Cloud Run
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/../env.sh" 2>/dev/null || {
    echo "Error: env.sh not found. Copy env.example.sh to env.sh and configure it."
    exit 1
}

# Parse arguments
VERSION="${1:-latest}"
DRY_RUN="${DRY_RUN:-false}"

echo "=== Deploying Backend to Cloud Run ==="
echo ""
echo "Project:  ${PROJECT_ID}"
echo "Region:   ${REGION}"
echo "Service:  ${CLOUD_RUN_SERVICE}"
echo "Version:  ${VERSION}"
echo "Image:    ${IMAGE_NAME}:${VERSION}"
echo ""

# Step 1: Build container image using Cloud Build
echo "=== Step 1: Building container image ==="
if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[DRY RUN] Would run: gcloud builds submit"
else
    gcloud builds submit "${ROOT_DIR}/backend" \
        --tag "${IMAGE_NAME}:${VERSION}" \
        --project="${PROJECT_ID}" \
        --quiet
fi

# Step 2: Deploy to Cloud Run
echo ""
echo "=== Step 2: Deploying to Cloud Run ==="

# Build the --set-secrets value. CORS is required; runtime API keys are
# included only if the secret already exists in Secret Manager. This keeps
# the deploy script idempotent and safe to run before/after configuring
# new secrets via setup/03-setup-secrets.sh — existing prod deploys keep
# working unchanged when the new secrets aren't configured yet.
SECRETS_LIST="CORS_ALLOWED_ORIGINS=${SECRET_CORS_ORIGINS}:latest"

maybe_add_secret() {
    local env_var="$1"
    local secret_name="$2"
    if gcloud secrets describe "${secret_name}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
        SECRETS_LIST="${SECRETS_LIST},${env_var}=${secret_name}:latest"
        echo "  + ${env_var} <- ${secret_name}"
    else
        echo "  - ${env_var} unset (secret '${secret_name}' not found; run setup/03-setup-secrets.sh to enable)"
    fi
}

echo ""
echo "Resolving runtime secrets:"
maybe_add_secret "GEMINI_API_KEY" "${SECRET_GEMINI_API_KEY:-skillhive-gemini-api-key}"
maybe_add_secret "YOUTUBE_API_KEY" "${SECRET_YOUTUBE_API_KEY:-skillhive-youtube-api-key}"
echo ""

DEPLOY_ARGS=(
    "--image=${IMAGE_NAME}:${VERSION}"
    "--region=${REGION}"
    "--platform=managed"
    "--allow-unauthenticated"
    "--port=8080"
    "--cpu=1"
    "--memory=512Mi"
    "--min-instances=0"
    "--max-instances=10"
    "--timeout=3600"
    "--set-env-vars=GCP_PROJECT=${PROJECT_ID},ENV=production"
    "--set-secrets=${SECRETS_LIST}"
    "--project=${PROJECT_ID}"
)

if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[DRY RUN] Would run: gcloud run deploy ${CLOUD_RUN_SERVICE}"
    echo "  Args: ${DEPLOY_ARGS[*]}"
else
    gcloud run deploy "${CLOUD_RUN_SERVICE}" "${DEPLOY_ARGS[@]}"
fi

# Step 3: Get service URL
echo ""
echo "=== Step 3: Verifying deployment ==="

if [[ "${DRY_RUN}" != "true" ]]; then
    SERVICE_URL=$(gcloud run services describe "${CLOUD_RUN_SERVICE}" \
        --region="${REGION}" \
        --project="${PROJECT_ID}" \
        --format="value(status.url)")
    
    echo ""
    echo "=== Deployment successful ==="
    echo ""
    echo "Service URL: ${SERVICE_URL}"
    echo "Custom Domain: https://${API_DOMAIN} (after DNS setup)"
    echo ""
    echo "Test the health endpoint:"
    echo "  curl ${SERVICE_URL}/health"
else
    echo "[DRY RUN] Deployment would complete here"
fi
