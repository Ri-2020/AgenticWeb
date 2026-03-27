#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# One-time GCP Project Setup for ShopAssist AI
# ============================================================
# This script:
#   1. Helps you switch to your personal Google account
#   2. Creates a new GCP project (or uses an existing one)
#   3. Links a billing account
#   4. Enables required APIs
#   5. Creates Firestore database
#   6. Creates Pub/Sub topic
#   7. Sets up Firebase (manual step)
# ============================================================

echo "============================================"
echo "  ShopAssist AI — GCP Project Setup"
echo "============================================"
echo ""

# Step 1: Ensure correct account
echo "==> Step 1: Google Cloud Account"
echo ""
CURRENT_ACCOUNT=$(gcloud config get-value account 2>/dev/null || echo "none")
echo "Currently logged in as: $CURRENT_ACCOUNT"
echo ""
read -p "Do you want to switch to a different account? (y/N): " SWITCH_ACCOUNT

if [[ "$SWITCH_ACCOUNT" =~ ^[Yy] ]]; then
  echo "Opening browser for Google login..."
  gcloud auth login
  echo ""
fi

ACCOUNT=$(gcloud config get-value account 2>/dev/null)
echo "Using account: $ACCOUNT"
echo ""

# Step 2: Create or select project
echo "==> Step 2: GCP Project"
echo ""
read -p "Enter a project ID (e.g., shopassist-ai-prod): " PROJECT_ID

if gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1; then
  echo "Project '$PROJECT_ID' already exists. Using it."
else
  echo "Creating project '$PROJECT_ID'..."
  gcloud projects create "$PROJECT_ID" --name="ShopAssist AI"
  echo "Project created."
fi

gcloud config set project "$PROJECT_ID"
echo ""

# Step 3: Link billing
echo "==> Step 3: Billing"
echo ""
echo "Available billing accounts:"
gcloud billing accounts list 2>/dev/null || echo "  (none found — you may need to set up billing at https://console.cloud.google.com/billing)"
echo ""
read -p "Enter billing account ID (e.g., 01ABCD-EFGH12-345678), or press Enter to skip: " BILLING_ID

if [ -n "$BILLING_ID" ]; then
  gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ID"
  echo "Billing linked."
else
  echo "Skipping billing. Some APIs may not work without billing enabled."
fi
echo ""

# Step 4: Enable APIs
echo "==> Step 4: Enabling required APIs..."
APIS=(
  "cloudfunctions.googleapis.com"
  "run.googleapis.com"
  "pubsub.googleapis.com"
  "firestore.googleapis.com"
  "cloudbuild.googleapis.com"
  "artifactregistry.googleapis.com"
  "identitytoolkit.googleapis.com"
)

for api in "${APIS[@]}"; do
  echo "    Enabling $api..."
  gcloud services enable "$api" --quiet
done
echo "All APIs enabled."
echo ""

# Step 5: Create Firestore database
echo "==> Step 5: Firestore Database"
echo ""
REGION="${GCP_REGION:-asia-south1}"

if gcloud firestore databases describe --database="(default)" >/dev/null 2>&1; then
  echo "Firestore database already exists."
else
  echo "Creating Firestore database in $REGION..."
  gcloud firestore databases create --location="$REGION" --type=firestore-native
  echo "Firestore database created."
fi
echo ""

# Step 6: Create Pub/Sub topic
echo "==> Step 6: Pub/Sub Topic"
echo ""
TOPIC_NAME="shopping-agent-jobs"

if gcloud pubsub topics describe "$TOPIC_NAME" >/dev/null 2>&1; then
  echo "Topic '$TOPIC_NAME' already exists."
else
  echo "Creating topic '$TOPIC_NAME'..."
  gcloud pubsub topics create "$TOPIC_NAME"
  echo "Topic created."
fi
echo ""

# Step 7: Firebase setup instructions
echo "==> Step 7: Firebase Setup (Manual)"
echo ""
echo "You need to set up Firebase for authentication. Follow these steps:"
echo ""
echo "  1. Go to: https://console.firebase.google.com/"
echo "  2. Click 'Add project' and select your GCP project: $PROJECT_ID"
echo "  3. Go to Authentication > Sign-in method > Enable 'Google'"
echo "  4. Go to Project Settings > General > 'Add app' > Web app"
echo "  5. Copy the Firebase config values to frontend/.env.local"
echo ""
echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "Project ID: $PROJECT_ID"
echo "Region:     $REGION"
echo ""
echo "Next steps:"
echo "  1. Complete Firebase setup (see Step 7 above)"
echo "  2. Copy .env.example files and fill in values:"
echo "     cp frontend/.env.example frontend/.env.local"
echo "     cp shopping_agent/.env.example shopping_agent/.env"
echo "  3. Deploy in order: backend -> agent -> frontend"
echo "     cd backend && ./deploy.sh"
echo "     cd ../shopping_agent && ./deploy.sh"
echo "     cd ../frontend && ./deploy.sh"
