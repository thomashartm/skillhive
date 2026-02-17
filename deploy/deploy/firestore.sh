#!/bin/bash
# Deploy Firestore security rules and indexes
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/../env.sh" 2>/dev/null || {
    echo "Error: env.sh not found. Copy env.example.sh to env.sh and configure it."
    exit 1
}

DRY_RUN="${DRY_RUN:-false}"

echo "=== Deploying Firestore Configuration ==="
echo ""
echo "Project: ${PROJECT_ID}"
echo ""

# Check if firestore files exist
if [[ ! -f "${ROOT_DIR}/firestore.rules" ]]; then
    echo "Error: firestore.rules not found at ${ROOT_DIR}/firestore.rules"
    exit 1
fi

if [[ ! -f "${ROOT_DIR}/firestore.indexes.json" ]]; then
    echo "Error: firestore.indexes.json not found at ${ROOT_DIR}/firestore.indexes.json"
    exit 1
fi

# Step 1: Deploy security rules
echo "=== Step 1: Deploying security rules ==="
echo "  File: firestore.rules"

if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[DRY RUN] Would run: firebase deploy --only firestore:rules"
else
    cd "${ROOT_DIR}"
    firebase deploy --only firestore:rules --project="${PROJECT_ID}"
fi

# Step 2: Deploy indexes
echo ""
echo "=== Step 2: Deploying indexes ==="
echo "  File: firestore.indexes.json"

if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[DRY RUN] Would run: firebase deploy --only firestore:indexes"
else
    cd "${ROOT_DIR}"
    firebase deploy --only firestore:indexes --project="${PROJECT_ID}"
fi

echo ""
echo "=== Firestore deployment complete ==="
echo ""
echo "Note: Index creation may take several minutes."
echo "Check status: https://console.firebase.google.com/project/${PROJECT_ID}/firestore/indexes"
