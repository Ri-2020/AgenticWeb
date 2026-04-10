#!/usr/bin/env bash
set -euo pipefail
# need deploy

# ============================================================
# Deploy frontend
# - firebase: static export + Firebase Hosting
# - cloud:    Cloud Run container deploy
# ============================================================
# Usage:
#   ./deploy.sh
#   ./deploy.sh firebase
#   ./deploy.sh cloud
# Requires: gcloud CLI authenticated, .env.local configured
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

MODE="${1:-firebase}"

# Load project config
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
REGION="${GCP_REGION:-asia-south1}"
SERVICE_NAME="shopassist-frontend"

if [ -z "$PROJECT_ID" ]; then
  echo "ERROR: No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

if [ "$MODE" = "firebase" ]; then
  if ! command -v firebase >/dev/null 2>&1; then
    echo "ERROR: Firebase CLI not found. Install with: npm i -g firebase-tools"
    exit 1
  fi

  if [ ! -f firebase.json ]; then
    cat > firebase.json <<'FIREBASEJSON'
{
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "cleanUrls": true,
    "rewrites": [
      { "source": "/jobs/**", "destination": "/jobs/__ph__.html" },
      { "source": "/agents/**", "destination": "/agents/__ph__.html" }
    ]
  }
}
FIREBASEJSON
  fi

  echo "==> Building Next.js static export for Firebase Hosting..."
  npm ci
  NEXT_OUTPUT_MODE=export npm run build

  echo "==> Deploying to Firebase Hosting (project: $PROJECT_ID)..."
  firebase deploy --only hosting --project "$PROJECT_ID"

  echo ""
  echo "==> Frontend deployed to Firebase Hosting!"
  echo "NOTE: Add the Hosting domain to Firebase Auth authorized domains and backend ALLOWED_ORIGINS."
  exit 0
fi

if [ "$MODE" != "cloud" ]; then
  echo "ERROR: Unknown mode '$MODE'. Use 'firebase' or 'cloud'."
  exit 1
fi

DOCKERFILE_BACKUP=""
GCLOUDIGNORE_BACKUP=""

cleanup() {
  rm -f Dockerfile
  if [ -n "$DOCKERFILE_BACKUP" ] && [ -f "$DOCKERFILE_BACKUP" ]; then
    mv "$DOCKERFILE_BACKUP" Dockerfile
  fi
  rm -f .gcloudignore
  if [ -n "$GCLOUDIGNORE_BACKUP" ] && [ -f "$GCLOUDIGNORE_BACKUP" ]; then
    mv "$GCLOUDIGNORE_BACKUP" .gcloudignore
  fi
}

trap cleanup EXIT

if [ -f Dockerfile ]; then
  DOCKERFILE_BACKUP=".Dockerfile.backup.$$"
  mv Dockerfile "$DOCKERFILE_BACKUP"
fi

echo "==> Creating Dockerfile for production..."
cat > Dockerfile <<'DOCKERFILE'
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN NEXT_OUTPUT_MODE=standalone npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
DOCKERFILE

if [ -f .gcloudignore ]; then
  GCLOUDIGNORE_BACKUP=".gcloudignore.backup.$$"
  mv .gcloudignore "$GCLOUDIGNORE_BACKUP"
fi

cat > .gcloudignore <<'GCLOUDIGNORE'
.gcloudignore
.git
.gitignore
node_modules
.next
.env*
*.log
.DS_Store
GCLOUDIGNORE

echo "==> Deploying to Cloud Run: $SERVICE_NAME in $REGION..."
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"
gcloud builds submit --tag "$IMAGE" .

# Deploy the built image
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --set-env-vars "NODE_ENV=production,HOSTNAME=0.0.0.0"

echo ""
echo "==> Frontend deployed!"
FRONTEND_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format="value(status.url)")
echo "    URL: $FRONTEND_URL"
echo ""
echo "NOTE: Make sure to add $FRONTEND_URL to:"
echo "  1. Firebase Auth > Authorized domains"
echo "  2. Backend ALLOWED_ORIGINS env var"
