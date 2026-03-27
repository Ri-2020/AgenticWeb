#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Deploy unified agent platform
#   cloud  — Cloud Run + Pub/Sub push subscription
#   local  — Local Pub/Sub pull listener
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

MODE="${1:-local}"
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
REGION="${GCP_REGION:-asia-south1}"
SERVICE_NAME="agent-platform"
PUBSUB_TOPIC="${PUBSUB_TOPIC:-agent-jobs}"
PUSH_SUBSCRIPTION_NAME="${PUSH_SUBSCRIPTION_NAME:-agent-jobs-push}"
LOCAL_SUBSCRIPTION_NAME="${LOCAL_SUBSCRIPTION_NAME:-agent-jobs-local}"

if [ -z "$PROJECT_ID" ]; then
  echo "ERROR: No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

# Read env values
GEMINI_API_KEY="${GEMINI_API_KEY:-}"
SERPER_API_KEY="${SERPER_API_KEY:-}"
MODEL="${MODEL:-gemini/gemini-2.5-flash-lite}"
CREDENTIAL_SECRET="${CREDENTIAL_SECRET:-}"

if [ -f .env ]; then
  set -o allexport
  source .env
  set +o allexport
fi

if [ -z "$GEMINI_API_KEY" ]; then echo "ERROR: GEMINI_API_KEY not found in .env"; exit 1; fi
if [ -z "$SERPER_API_KEY" ]; then echo "ERROR: SERPER_API_KEY not found in .env"; exit 1; fi

if [ "$MODE" = "cloud" ]; then
  echo "==> Building and deploying Cloud Run service: $SERVICE_NAME..."
  gcloud run deploy "$SERVICE_NAME" \
    --source . \
    --region "$REGION" \
    --platform managed \
    --no-allow-unauthenticated \
    --memory 2Gi \
    --timeout 600 \
    --cpu 2 \
    --min-instances 0 \
    --max-instances 5 \
    --set-env-vars "GCP_PROJECT_ID=$PROJECT_ID,GEMINI_API_KEY=$GEMINI_API_KEY,SERPER_API_KEY=$SERPER_API_KEY,MODEL=$MODEL,PUBSUB_LISTEN_MODE=push,CREDENTIAL_SECRET=$CREDENTIAL_SECRET"

  AGENT_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format="value(status.url)")

  echo "==> Setting up Pub/Sub push subscription..."
  SA_EMAIL="${PROJECT_ID}@appspot.gserviceaccount.com"

  if gcloud pubsub subscriptions describe "$PUSH_SUBSCRIPTION_NAME" >/dev/null 2>&1; then
    gcloud pubsub subscriptions delete "$PUSH_SUBSCRIPTION_NAME" --quiet
  fi

  gcloud pubsub subscriptions create "$PUSH_SUBSCRIPTION_NAME" \
    --topic "$PUBSUB_TOPIC" \
    --push-endpoint "$AGENT_URL" \
    --push-auth-service-account "$SA_EMAIL" \
    --ack-deadline 600 \
    --message-retention-duration 1h

  echo ""
  echo "==> Agent platform deployed!"
  echo "    Service URL: $AGENT_URL"
  echo "    Pub/Sub: $PUSH_SUBSCRIPTION_NAME -> $AGENT_URL"
  exit 0
fi

if [ "$MODE" = "local" ]; then
  echo "==> Ensuring Pub/Sub topic '$PUBSUB_TOPIC' exists..."
  gcloud pubsub topics describe "$PUBSUB_TOPIC" >/dev/null 2>&1 || \
    gcloud pubsub topics create "$PUBSUB_TOPIC"

  echo "==> Ensuring local pull subscription '$LOCAL_SUBSCRIPTION_NAME' exists..."
  if ! gcloud pubsub subscriptions describe "$LOCAL_SUBSCRIPTION_NAME" >/dev/null 2>&1; then
    gcloud pubsub subscriptions create "$LOCAL_SUBSCRIPTION_NAME" --topic "$PUBSUB_TOPIC"
  fi

  echo "==> Starting local Pub/Sub pull listener..."
  export GCP_PROJECT_ID="$PROJECT_ID"
  export PUBSUB_LISTEN_MODE="pull"
  export PUBSUB_SUBSCRIPTION="$LOCAL_SUBSCRIPTION_NAME"
  uv run listen
  exit 0
fi

echo "ERROR: Unknown mode '$MODE'. Use 'cloud' or 'local'."
exit 1
