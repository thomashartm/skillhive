#!/bin/bash
# Enable required GCP APIs for SkillHive deployment
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../env.sh" 2>/dev/null || {
    echo "Error: env.sh not found. Copy env.example.sh to env.sh and configure it."
    exit 1
}

echo "=== Enabling GCP APIs for project: ${PROJECT_ID} ==="

APIS=(
    # Core infrastructure
    "run.googleapis.com"                    # Cloud Run
    "cloudbuild.googleapis.com"             # Cloud Build
    "artifactregistry.googleapis.com"       # Artifact Registry (container images)
    
    # Security & IAM
    "secretmanager.googleapis.com"          # Secret Manager
    "iam.googleapis.com"                    # IAM
    "iamcredentials.googleapis.com"         # IAM Credentials (for WIF)
    
    # Firebase
    "firebase.googleapis.com"               # Firebase Management
    "firestore.googleapis.com"              # Firestore
    "firebasehosting.googleapis.com"        # Firebase Hosting
    "firebaserules.googleapis.com"          # Firebase Security Rules
    
    # Monitoring (optional but recommended)
    "logging.googleapis.com"                # Cloud Logging
    "monitoring.googleapis.com"             # Cloud Monitoring
)

echo "Enabling ${#APIS[@]} APIs..."

for api in "${APIS[@]}"; do
    echo "  - ${api}"
done

gcloud services enable "${APIS[@]}" --project="${PROJECT_ID}"

echo ""
echo "=== APIs enabled successfully ==="
echo ""
echo "Next step: Run 02-create-service-accounts.sh"
