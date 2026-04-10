#!/usr/bin/env bash
set -euo pipefail
# need deploy

# ============================================================
# Deploy backend Cloud Function (create_job)
# ============================================================
# Usage: ./deploy.sh
# Requires: gcloud CLI authenticated
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Load .env files (shell env takes precedence)
for env_file in ./.env ./create_job/.env ./request_access/.env; do
  if [ -f "$env_file" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
  fi
done

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
REGION="${GCP_REGION:-asia-south1}"
PUBSUB_TOPIC="${PUBSUB_TOPIC:-agent-jobs}"
CREDENTIAL_SECRET="${CREDENTIAL_SECRET:-}"
DAILY_JOB_LIMIT="${DAILY_JOB_LIMIT:-3}"
USER_ACCESS_COLLECTION="${USER_ACCESS_COLLECTION:-user_access}"
DAILY_USAGE_COLLECTION="${DAILY_USAGE_COLLECTION:-user_daily_usage}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"
GCP_REGION="${GCP_REGION:-asia-south1}"

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
FIREBASE_HOSTING_URL="${FIREBASE_HOSTING_URL:-}"   # e.g. https://notesa.web.app
ALLOWED_ORIGINS="http://localhost:3000"
if [ -n "$FRONTEND_URL" ]; then
  ALLOWED_ORIGINS="$ALLOWED_ORIGINS,$FRONTEND_URL"
fi
if [ -n "$FIREBASE_HOSTING_URL" ]; then
  ALLOWED_ORIGINS="$ALLOWED_ORIGINS,$FIREBASE_HOSTING_URL"
fi

# ── Deploy create_job ──────────────────────────────────────────────────────────
echo "==> Deploying Cloud Function: create_job..."
gcloud functions deploy create_job \
  --gen2 \
  --region "$REGION" \
  --runtime python312 \
  --source ./create_job \
  --entry-point create_job \
  --trigger-http \
  --allow-unauthenticated \
  --memory 256Mi \
  --timeout 30s \
  --set-env-vars "^|^GCP_PROJECT_ID=$PROJECT_ID|PUBSUB_TOPIC=$PUBSUB_TOPIC|ALLOWED_ORIGINS=$ALLOWED_ORIGINS|CREDENTIAL_SECRET=$CREDENTIAL_SECRET|DAILY_JOB_LIMIT=$DAILY_JOB_LIMIT|USER_ACCESS_COLLECTION=$USER_ACCESS_COLLECTION|DAILY_USAGE_COLLECTION=$DAILY_USAGE_COLLECTION"

CREATE_JOB_URL=$(gcloud functions describe create_job --gen2 --region "$REGION" --format="value(serviceConfig.uri)")
echo "    URL: $CREATE_JOB_URL"

# ── Deploy request_access ──────────────────────────────────────────────────────
echo ""
echo "==> Deploying Cloud Function: request_access..."
gcloud functions deploy request_access \
  --gen2 \
  --region "$REGION" \
  --runtime python312 \
  --source ./request_access \
  --entry-point request_access \
  --trigger-http \
  --allow-unauthenticated \
  --memory 256Mi \
  --timeout 30s \
  --set-env-vars "^|^GCP_PROJECT_ID=$PROJECT_ID|GCP_REGION=$REGION|ALLOWED_ORIGINS=$ALLOWED_ORIGINS|USER_ACCESS_COLLECTION=$USER_ACCESS_COLLECTION|TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID=$TELEGRAM_CHAT_ID"

REQUEST_ACCESS_URL=$(gcloud functions describe request_access --gen2 --region "$REGION" --format="value(serviceConfig.uri)")
echo "    URL: $REQUEST_ACCESS_URL"

echo ""
echo "==> Both functions deployed!"
echo ""
echo "NOTE: Set these in frontend/.env.local:"
echo "  NEXT_PUBLIC_CREATE_JOB_URL=$CREATE_JOB_URL"
echo "  NEXT_PUBLIC_REQUEST_ACCESS_URL=$REQUEST_ACCESS_URL"
