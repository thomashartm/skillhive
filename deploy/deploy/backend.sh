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
    "--set-env-vars=GCP_PROJECT=${PROJECT_ID},ENV=production"
    "--set-secrets=CORS_ALLOWED_ORIGINS=${SECRET_CORS_ORIGINS}:latest"
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
