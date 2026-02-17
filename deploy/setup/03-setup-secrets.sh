#!/bin/bash
# Create secrets in Google Cloud Secret Manager
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../env.sh" 2>/dev/null || {
    echo "Error: env.sh not found. Copy env.example.sh to env.sh and configure it."
    exit 1
}

echo "=== Setting up Secret Manager secrets for project: ${PROJECT_ID} ==="
echo ""

# Function to create or update a secret
create_secret() {
    local secret_name="$1"
    local description="$2"
    local prompt_message="$3"
    local default_value="${4:-}"
    
    # Check if secret exists
    if gcloud secrets describe "${secret_name}" --project="${PROJECT_ID}" &>/dev/null; then
        echo "Secret '${secret_name}' already exists."
        read -p "  Update value? (y/N): " update
        if [[ "${update}" != "y" && "${update}" != "Y" ]]; then
            return
        fi
    else
        echo "Creating secret: ${secret_name}"
        gcloud secrets create "${secret_name}" \
            --project="${PROJECT_ID}" \
            --replication-policy="automatic" \
            --labels="app=skillhive"
    fi
    
    # Prompt for value
    if [[ -n "${default_value}" ]]; then
        echo "  ${prompt_message}"
        read -p "  [${default_value}]: " value
        value="${value:-${default_value}}"
    else
        read -p "  ${prompt_message}: " value
    fi
    
    if [[ -z "${value}" ]]; then
        echo "  Skipping (no value provided)"
        return
    fi
    
    # Add secret version
    echo -n "${value}" | gcloud secrets versions add "${secret_name}" \
        --project="${PROJECT_ID}" \
        --data-file=-
    
    echo "  Secret '${secret_name}' updated."
}

echo "You will be prompted for secret values."
echo "Press Enter to keep existing value or skip."
echo ""

# CORS Origins
create_secret \
    "${SECRET_CORS_ORIGINS}" \
    "Allowed CORS origins for the API" \
    "CORS origins (comma-separated)" \
    "https://skillhive.thartm.net,https://level-dragon-478821-t3.web.app,http://localhost:5173"

echo ""

# API URL
create_secret \
    "${SECRET_API_URL}" \
    "Backend API URL" \
    "API URL" \
    "https://skillhive.thartm.net"

echo ""
echo "=== Firebase Configuration Secrets ==="
echo "Get these values from: https://console.firebase.google.com/project/${PROJECT_ID}/settings/general"
echo ""

# Firebase secrets
create_secret \
    "${SECRET_FIREBASE_API_KEY}" \
    "Firebase Web API Key" \
    "Firebase API Key"

create_secret \
    "${SECRET_FIREBASE_AUTH_DOMAIN}" \
    "Firebase Auth Domain" \
    "Firebase Auth Domain" \
    "${PROJECT_ID}.firebaseapp.com"

create_secret \
    "${SECRET_FIREBASE_PROJECT_ID}" \
    "Firebase Project ID" \
    "Firebase Project ID" \
    "${PROJECT_ID}"

create_secret \
    "${SECRET_FIREBASE_STORAGE_BUCKET}" \
    "Firebase Storage Bucket" \
    "Firebase Storage Bucket" \
    "${PROJECT_ID}.appspot.com"

create_secret \
    "${SECRET_FIREBASE_MESSAGING_SENDER_ID}" \
    "Firebase Cloud Messaging Sender ID" \
    "FCM Sender ID" \
    "${PROJECT_NUMBER}"

create_secret \
    "${SECRET_FIREBASE_APP_ID}" \
    "Firebase App ID" \
    "Firebase App ID (starts with 1:...)"

echo ""
echo "=== Secrets configured successfully ==="
echo ""
echo "To view secrets:"
echo "  gcloud secrets list --project=${PROJECT_ID}"
echo ""
echo "To view a secret value:"
echo "  gcloud secrets versions access latest --secret=SECRET_NAME --project=${PROJECT_ID}"
echo ""
echo "Next step: Run 04-setup-workload-identity.sh"
