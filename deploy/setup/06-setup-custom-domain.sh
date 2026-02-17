#!/bin/bash
# Setup custom domain mapping for Cloud Run
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../env.sh" 2>/dev/null || {
    echo "Error: env.sh not found. Copy env.example.sh to env.sh and configure it."
    exit 1
}

echo "=== Setting up Custom Domain for Cloud Run ==="
echo ""
echo "Domain: ${API_DOMAIN}"
echo "Service: ${CLOUD_RUN_SERVICE}"
echo "Region: ${REGION}"
echo ""

# Check if Cloud Run service exists
if ! gcloud run services describe "${CLOUD_RUN_SERVICE}" \
    --region="${REGION}" \
    --project="${PROJECT_ID}" &>/dev/null; then
    echo "Error: Cloud Run service '${CLOUD_RUN_SERVICE}' does not exist."
    echo "Please deploy the backend first using: ./deploy/deploy/backend.sh"
    exit 1
fi

# Check if domain mapping already exists
if gcloud run domain-mappings describe \
    --domain="${API_DOMAIN}" \
    --region="${REGION}" \
    --project="${PROJECT_ID}" &>/dev/null 2>&1; then
    echo "Domain mapping already exists for ${API_DOMAIN}"
    gcloud run domain-mappings describe \
        --domain="${API_DOMAIN}" \
        --region="${REGION}" \
        --project="${PROJECT_ID}"
else
    echo "Creating domain mapping..."
    gcloud beta run domain-mappings create \
        --service="${CLOUD_RUN_SERVICE}" \
        --domain="${API_DOMAIN}" \
        --region="${REGION}" \
        --project="${PROJECT_ID}"
fi

echo ""
echo "=== Domain mapping created ==="
echo ""
echo "Now add this DNS record to your domain (thartm.net):"
echo ""
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│ Type:  CNAME                                                 │"
echo "│ Name:  skillhive                                             │"
echo "│ Value: ghs.googlehosted.com.                                 │"
echo "│ TTL:   3600 (or default)                                     │"
echo "└──────────────────────────────────────────────────────────────┘"
echo ""
echo "After adding the DNS record, it may take up to 24 hours for"
echo "SSL certificate provisioning to complete."
echo ""
echo "Check status with:"
echo "  gcloud run domain-mappings describe --domain=${API_DOMAIN} --region=${REGION} --project=${PROJECT_ID}"
