#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Deploy backend Cloud Function (create_job)
# ============================================================
# Usage: ./deploy.sh
# Requires: gcloud CLI authenticated
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
REGION="${GCP_REGION:-asia-south1}"
FUNCTION_NAME="create_job"
PUBSUB_TOPIC="${PUBSUB_TOPIC:-agent-jobs}"
CREDENTIAL_SECRET="${CREDENTIAL_SECRET:-}"
DAILY_JOB_LIMIT="${DAILY_JOB_LIMIT:-3}"
USER_ACCESS_COLLECTION="${USER_ACCESS_COLLECTION:-user_access}"
DAILY_USAGE_COLLECTION="${DAILY_USAGE_COLLECTION:-user_daily_usage}"

if [ -z "$PROJECT_ID" ]; then
  echo "ERROR: No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

# Ensure Pub/Sub topic exists
echo "==> Ensuring Pub/Sub topic '$PUBSUB_TOPIC' exists..."
gcloud pubsub topics describe "$PUBSUB_TOPIC" >/dev/null 2>&1 || \
  gcloud pubsub topics create "$PUBSUB_TOPIC"

# Get the frontend URL for CORS (if deployed)
FRONTEND_URL=$(gcloud run services describe shopassist-frontend --region "$REGION" --format="value(status.url)" 2>/dev/null || echo "")
ALLOWED_ORIGINS="http://localhost:3000"
if [ -n "$FRONTEND_URL" ]; then
  ALLOWED_ORIGINS="$ALLOWED_ORIGINS,$FRONTEND_URL"
fi

echo "==> Deploying Cloud Function: $FUNCTION_NAME..."
gcloud functions deploy "$FUNCTION_NAME" \
  --gen2 \
  --region "$REGION" \
  --runtime python312 \
  --source ./create_job \
  --entry-point create_job \
  --trigger-http \
  --allow-unauthenticated \
  --memory 256Mi \
  --timeout 30s \
  --set-env-vars "GCP_PROJECT_ID=$PROJECT_ID,PUBSUB_TOPIC=$PUBSUB_TOPIC,ALLOWED_ORIGINS=$ALLOWED_ORIGINS,CREDENTIAL_SECRET=$CREDENTIAL_SECRET,DAILY_JOB_LIMIT=$DAILY_JOB_LIMIT,USER_ACCESS_COLLECTION=$USER_ACCESS_COLLECTION,DAILY_USAGE_COLLECTION=$DAILY_USAGE_COLLECTION"

echo ""
echo "==> Cloud Function deployed!"
FUNCTION_URL=$(gcloud functions describe "$FUNCTION_NAME" --gen2 --region "$REGION" --format="value(serviceConfig.uri)")
echo "    URL: $FUNCTION_URL"
echo ""
echo "NOTE: Set this URL as NEXT_PUBLIC_CREATE_JOB_URL in frontend/.env.local"
