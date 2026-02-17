#!/bin/bash
# Setup Artifact Registry for container images
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../env.sh" 2>/dev/null || {
    echo "Error: env.sh not found. Copy env.example.sh to env.sh and configure it."
    exit 1
}

echo "=== Setting up Artifact Registry for project: ${PROJECT_ID} ==="
echo ""

# Create Artifact Registry repository
echo "Creating Artifact Registry repository: ${AR_REPOSITORY}"

if gcloud artifacts repositories describe "${AR_REPOSITORY}" \
    --location="${AR_LOCATION}" \
    --project="${PROJECT_ID}" &>/dev/null; then
    echo "  Repository already exists"
else
    gcloud artifacts repositories create "${AR_REPOSITORY}" \
        --repository-format=docker \
        --location="${AR_LOCATION}" \
        --description="SkillHive container images" \
        --project="${PROJECT_ID}"
    echo "  Repository created"
fi

echo ""
echo "=== Artifact Registry configured successfully ==="
echo ""
echo "Repository: ${AR_LOCATION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPOSITORY}"
echo ""
echo "To push images:"
echo "  docker tag IMAGE ${IMAGE_NAME}:TAG"
echo "  docker push ${IMAGE_NAME}:TAG"
echo ""
echo "Or use Cloud Build:"
echo "  gcloud builds submit --tag ${IMAGE_NAME}:TAG ./backend"
echo ""
echo "Next step: Run 06-setup-custom-domain.sh (after first backend deployment)"
