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
echo "DNS is managed in Cloud DNS zone 'skillhive-cloud'."
echo "The CNAME record for api.skillhive.cloud -> ghs.googlehosted.com. should already exist."
echo ""
echo "Check status with:"
echo "  gcloud beta run domain-mappings list --region=${REGION} --project=${PROJECT_ID}"
echo "  gcloud dns record-sets list --zone=skillhive-cloud --project=${PROJECT_ID}"
