#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Temporarily take down the entire system (or specific parts)
#
#   ./takedown.sh          — take down everything
#   ./takedown.sh agents   — only the agent platform
#   ./takedown.sh backend  — only the Cloud Functions
#   ./takedown.sh frontend — only the frontend
# ============================================================

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
REGION="${GCP_REGION:-asia-south1}"

if [ -z "$PROJECT_ID" ]; then
  echo "ERROR: No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

TARGET="${1:-all}"

takedown_agents() {
  echo "==> Scaling agent-platform to 0 instances..."
  gcloud run services update agent-platform \
    --region "$REGION" \
    --max-instances 0 \
    --min-instances 0 \
    2>/dev/null && echo "    Done." || echo "    Skipped (service not found)."
}

takedown_backend() {
  for fn in create_job request_access; do
    echo "==> Disabling Cloud Function: $fn..."
    # Set max-instances to 0 effectively disables the function
    gcloud functions deploy "$fn" \
      --gen2 \
      --region "$REGION" \
      --update-env-vars "DISABLED=true" \
      --max-instances 0 \
      2>/dev/null && echo "    Done." || echo "    Skipped ($fn not found)."
  done
}

takedown_frontend() {
  echo "==> Scaling shopassist-frontend to 0 instances..."
  gcloud run services update shopassist-frontend \
    --region "$REGION" \
    --max-instances 0 \
    --min-instances 0 \
    2>/dev/null && echo "    Done." || echo "    Skipped (service not found)."
}

case "$TARGET" in
  agents)
    takedown_agents
    ;;
  backend)
    takedown_backend
    ;;
  frontend)
    takedown_frontend
    ;;
  all)
    takedown_frontend
    takedown_backend
    takedown_agents
    ;;
  *)
    echo "ERROR: Unknown target '$TARGET'. Use: all, agents, backend, or frontend."
    exit 1
    ;;
esac

echo ""
echo "==> Takedown complete. To bring services back up, redeploy them:"
echo "    Frontend:  cd frontend && ./deploy.sh"
echo "    Backend:   cd backend  && ./deploy.sh"
echo "    Agents:    cd agents   && ./deploy.sh cloud"
