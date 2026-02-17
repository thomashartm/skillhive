#!/bin/bash
# Create service accounts and configure IAM for SkillHive deployment
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../env.sh" 2>/dev/null || {
    echo "Error: env.sh not found. Copy env.example.sh to env.sh and configure it."
    exit 1
}

echo "=== Creating Service Accounts for project: ${PROJECT_ID} ==="

# Check if deployer SA already exists
if gcloud iam service-accounts describe "${DEPLOYER_SA_EMAIL}" --project="${PROJECT_ID}" &>/dev/null; then
    echo "Service account ${DEPLOYER_SA_EMAIL} already exists"
else
    echo "Creating service account: ${DEPLOYER_SA}"
    gcloud iam service-accounts create "${DEPLOYER_SA}" \
        --display-name="SkillHive Deployer" \
        --description="Service account for CI/CD deployments" \
        --project="${PROJECT_ID}"
fi

echo ""
echo "=== Granting IAM roles to deployer service account ==="

# Roles needed for deployment
ROLES=(
    # Cloud Run deployment
    "roles/run.admin"
    
    # Artifact Registry (push images)
    "roles/artifactregistry.writer"
    
    # Secret Manager (read secrets during deploy)
    "roles/secretmanager.secretAccessor"
    
    # IAM (to act as other service accounts)
    "roles/iam.serviceAccountUser"
    
    # Firebase Hosting deployment
    "roles/firebasehosting.admin"
    
    # Firestore (deploy rules and indexes)
    "roles/datastore.indexAdmin"
    "roles/firebaserules.admin"
    
    # Cloud Build (submit builds)
    "roles/cloudbuild.builds.builder"
    
    # Storage (for Cloud Build artifacts)
    "roles/storage.admin"
)

for role in "${ROLES[@]}"; do
    echo "  - Granting ${role}"
    gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
        --member="serviceAccount:${DEPLOYER_SA_EMAIL}" \
        --role="${role}" \
        --condition=None \
        --quiet
done

echo ""
echo "=== Granting Cloud Run service account access to secrets ==="

# The default compute service account runs Cloud Run services
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --condition=None \
    --quiet

echo ""
echo "=== Service accounts configured successfully ==="
echo ""
echo "Deployer SA: ${DEPLOYER_SA_EMAIL}"
echo "Compute SA:  ${COMPUTE_SA}"
echo ""
echo "Next step: Run 03-setup-secrets.sh"
