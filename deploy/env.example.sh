#!/bin/bash
# SkillHive Deployment Configuration
# Copy this file to env.sh and fill in your values
# Usage: source deploy/env.sh

# =============================================================================
# GCP Project Configuration
# =============================================================================
export PROJECT_ID="level-dragon-478821-t3"
export PROJECT_NUMBER="551873236818"
export REGION="europe-west1"

# =============================================================================
# Domain Configuration
# =============================================================================
export API_DOMAIN="skillhive.thartm.net"
export FRONTEND_URL="https://level-dragon-478821-t3.web.app"

# =============================================================================
# GitHub Configuration (for Workload Identity Federation)
# =============================================================================
export GITHUB_ORG="your-github-username-or-org"
export GITHUB_REPO="skillhive"

# =============================================================================
# Service Account Names
# =============================================================================
export DEPLOYER_SA="skillhive-deployer"
export DEPLOYER_SA_EMAIL="${DEPLOYER_SA}@${PROJECT_ID}.iam.gserviceaccount.com"

# =============================================================================
# Artifact Registry
# =============================================================================
export AR_REPOSITORY="skillhive"
export AR_LOCATION="${REGION}"
export IMAGE_NAME="${AR_LOCATION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPOSITORY}/api"

# =============================================================================
# Cloud Run
# =============================================================================
export CLOUD_RUN_SERVICE="skillhive-api"

# =============================================================================
# Secret Names (in Secret Manager)
# =============================================================================
export SECRET_CORS_ORIGINS="skillhive-cors-origins"
export SECRET_API_URL="skillhive-api-url"
export SECRET_FIREBASE_API_KEY="skillhive-firebase-api-key"
export SECRET_FIREBASE_AUTH_DOMAIN="skillhive-firebase-auth-domain"
export SECRET_FIREBASE_PROJECT_ID="skillhive-firebase-project-id"
export SECRET_FIREBASE_STORAGE_BUCKET="skillhive-firebase-storage-bucket"
export SECRET_FIREBASE_MESSAGING_SENDER_ID="skillhive-firebase-messaging-sender-id"
export SECRET_FIREBASE_APP_ID="skillhive-firebase-app-id"
