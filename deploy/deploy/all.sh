#!/bin/bash
# Full deployment: Firestore, Backend, Frontend
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../env.sh" 2>/dev/null || {
    echo "Error: env.sh not found. Copy env.example.sh to env.sh and configure it."
    exit 1
}

VERSION="${1:-latest}"
DRY_RUN="${DRY_RUN:-false}"

echo "=============================================="
echo "  SkillHive Full Deployment"
echo "=============================================="
echo ""
echo "Project:  ${PROJECT_ID}"
echo "Region:   ${REGION}"
echo "Version:  ${VERSION}"
echo "Dry Run:  ${DRY_RUN}"
echo ""
echo "This will deploy:"
echo "  1. Firestore rules and indexes"
echo "  2. Backend API to Cloud Run"
echo "  3. Frontend to Firebase Hosting"
echo ""

if [[ "${DRY_RUN}" != "true" ]]; then
    read -p "Continue? (y/N): " confirm
    if [[ "${confirm}" != "y" && "${confirm}" != "Y" ]]; then
        echo "Deployment cancelled."
        exit 0
    fi
fi

echo ""
echo "=============================================="
echo "  Phase 1: Firestore"
echo "=============================================="
"${SCRIPT_DIR}/firestore.sh"

echo ""
echo "=============================================="
echo "  Phase 2: Backend"
echo "=============================================="
"${SCRIPT_DIR}/backend.sh" "${VERSION}"

echo ""
echo "=============================================="
echo "  Phase 3: Frontend"
echo "=============================================="
"${SCRIPT_DIR}/frontend.sh"

echo ""
echo "=============================================="
echo "  Deployment Complete!"
echo "=============================================="
echo ""
echo "URLs:"
echo "  Frontend: https://${PROJECT_ID}.web.app"
echo "  API:      https://${API_DOMAIN}"
echo ""
echo "Health check:"
echo "  curl https://${API_DOMAIN}/health"
