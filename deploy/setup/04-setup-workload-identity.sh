#!/bin/bash
# Setup Workload Identity Federation for GitHub Actions
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../env.sh" 2>/dev/null || {
    echo "Error: env.sh not found. Copy env.example.sh to env.sh and configure it."
    exit 1
}

echo "=== Setting up Workload Identity Federation for GitHub Actions ==="
echo ""

WIF_POOL="github-actions"
WIF_PROVIDER="github"

# Create Workload Identity Pool
echo "Creating Workload Identity Pool: ${WIF_POOL}"
if gcloud iam workload-identity-pools describe "${WIF_POOL}" \
    --location="global" \
    --project="${PROJECT_ID}" &>/dev/null; then
    echo "  Pool already exists"
else
    gcloud iam workload-identity-pools create "${WIF_POOL}" \
        --location="global" \
        --display-name="GitHub Actions Pool" \
        --description="Workload Identity Pool for GitHub Actions CI/CD" \
        --project="${PROJECT_ID}"
    echo "  Pool created"
fi

# Create Workload Identity Provider
echo ""
echo "Creating Workload Identity Provider: ${WIF_PROVIDER}"
if gcloud iam workload-identity-pools providers describe "${WIF_PROVIDER}" \
    --workload-identity-pool="${WIF_POOL}" \
    --location="global" \
    --project="${PROJECT_ID}" &>/dev/null; then
    echo "  Provider already exists"
else
    gcloud iam workload-identity-pools providers create-oidc "${WIF_PROVIDER}" \
        --workload-identity-pool="${WIF_POOL}" \
        --location="global" \
        --issuer-uri="https://token.actions.githubusercontent.com" \
        --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
        --attribute-condition="assertion.repository_owner == '${GITHUB_ORG}'" \
        --project="${PROJECT_ID}"
    echo "  Provider created"
fi

# Get the full provider name
PROVIDER_FULL_NAME="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL}/providers/${WIF_PROVIDER}"

# Bind the service account to the Workload Identity Pool
echo ""
echo "Binding service account to Workload Identity Pool"

# Allow the GitHub repo to impersonate the deployer service account
gcloud iam service-accounts add-iam-policy-binding "${DEPLOYER_SA_EMAIL}" \
    --project="${PROJECT_ID}" \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL}/attribute.repository/${GITHUB_ORG}/${GITHUB_REPO}" \
    --condition=None

echo ""
echo "=== Workload Identity Federation configured successfully ==="
echo ""
echo "Add these secrets to your GitHub repository:"
echo "  Repository: https://github.com/${GITHUB_ORG}/${GITHUB_REPO}/settings/secrets/actions"
echo ""
echo "┌─────────────────────────────────────────────────────────────────────────────┐"
echo "│ WIF_PROVIDER                                                                │"
echo "├─────────────────────────────────────────────────────────────────────────────┤"
echo "│ ${PROVIDER_FULL_NAME} │"
echo "└─────────────────────────────────────────────────────────────────────────────┘"
echo ""
echo "┌─────────────────────────────────────────────────────────────────────────────┐"
echo "│ WIF_SERVICE_ACCOUNT                                                         │"
echo "├─────────────────────────────────────────────────────────────────────────────┤"
echo "│ ${DEPLOYER_SA_EMAIL}                                                        │"
echo "└─────────────────────────────────────────────────────────────────────────────┘"
echo ""
echo "Next step: Run 05-setup-artifact-registry.sh"
