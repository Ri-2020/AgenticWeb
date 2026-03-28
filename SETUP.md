# AgentHub — Setup Guide

Complete setup for GCP project `PROJECT_ID` with the unified agent platform, Cloud Function backend, and Next.js frontend.

## 1) GCP Project & Billing

```bash
gcloud projects create PROJECT_ID --name="PROJECT_ID"
gcloud config set project PROJECT_ID
```

Link billing in Console → Billing → Link project, or:
```bash
gcloud beta billing projects link PROJECT_ID --billing-account <BILLING_ACCOUNT_ID>
```

## 2) Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudfunctions.googleapis.com \
  firestore.googleapis.com \
  pubsub.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

## 3) Firestore (Native Mode)

Console → Firestore → Create DB → **Native mode** → Region `asia-south1`

Or: `gcloud firestore databases create --region=asia-south1`

## 4) Firestore Security Rules

In Firebase Console → Firestore → Rules, publish these rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /agents/{agentId} {
      allow read: if true;
      allow write: if false;
    }
    match /jobs/{jobId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow write: if false;
    }
    match /user_settings/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /user_access/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false;
    }
    match /user_daily_usage/{usageId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow write: if false;
    }
  }
}
```

## 5) Pub/Sub Topic

```bash
gcloud pubsub topics create agent-jobs --project=PROJECT_ID
```

For local development, also create a pull subscription:
```bash
gcloud pubsub subscriptions create agent-jobs-local \
  --topic=agent-jobs \
  --project=PROJECT_ID
```

## 6) Firebase Auth

1. Go to Firebase Console → Authentication → Sign-in method
2. Enable **Google** sign-in provider
3. Add authorized domains (localhost, your deployed frontend URL)

## 7) Service Account Key (for agent registration)

Create a service account key for local scripts (e.g., `register_agents.py`):

```bash
mkdir -p cred_keys
# Download from Console → IAM → Service Accounts → Keys → Add Key → JSON
# Save as cred_keys/PROJECT_ID-developer.json
```

Make sure the service account has **Cloud Datastore User** role.

## 8) Set Default Regions (optional)

```bash
gcloud config set run/region asia-south1
gcloud config set functions/region asia-south1
```

## 9) Environment Files

### `agents/.env`
```
MODEL=gemini/gemini-2.5-flash-lite
GEMINI_API_KEY=<your_gemini_api_key>
SERPER_API_KEY=<your_serper_api_key>
LANGTRACE_API_KEY=<your_langtrace_api_key>
# LANGTRACE_SERVICE_NAME=agent-platform
GCP_PROJECT_ID=PROJECT_ID
CREDENTIAL_SECRET=<at_least_32_random_chars>
PUBSUB_TOPIC=agent-jobs
PUBSUB_LISTEN_MODE=pull
PUBSUB_SUBSCRIPTION=agent-jobs-local
AGENT_SYNC_ON_STARTUP=false
```

### `frontend/.env.local`
```
NEXT_PUBLIC_FIREBASE_API_KEY=<from_firebase_console>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=PROJECT_ID.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=PROJECT_ID.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<from_firebase_console>
NEXT_PUBLIC_FIREBASE_APP_ID=<from_firebase_console>
NEXT_PUBLIC_CREATE_JOB_URL=https://asia-south1-PROJECT_ID.cloudfunctions.net/create_job
```

### `backend/.env`
```
GCP_PROJECT_ID=PROJECT_ID
PUBSUB_TOPIC=agent-jobs
CREDENTIAL_SECRET=<at_least_32_random_chars>
ALLOWED_ORIGINS=http://localhost:3000
DAILY_JOB_LIMIT=3
USER_ACCESS_COLLECTION=user_access
DAILY_USAGE_COLLECTION=user_daily_usage
```

## 10) Install Dependencies

```bash
# Agents
cd agents && uv sync

# Frontend
cd frontend && npm install


## 10) Install Dependencies

```bash
# Agents
cd agents && uv sync

# Frontend
cd frontend && npm install

# Backend (deps installed during deploy)
```

## 11) Register Agents in Firestore

This seeds the `agents` collection so the frontend can display available agents:

```bash
cd agents
uv run python ../register_agents.py
```

Requires `cred_keys/PROJECT_ID-developer.json` (step 7).

## 12) Deploy Backend (Cloud Function)

```bash
cd backend

# Set CREDENTIAL_SECRET before deploying
export CREDENTIAL_SECRET="<same_value_as_agents/.env>"

./deploy.sh
```

**Important:** The deploy script sets `GCP_PROJECT_ID` on the Cloud Function from your gcloud config. Verify after deploy:
```bash
gcloud functions describe create_job \
  --region=asia-south1 \
  --project=PROJECT_ID \
  --format="yaml(serviceConfig.environmentVariables)"
```

You should see `GCP_PROJECT_ID: PROJECT_ID` and `PUBSUB_TOPIC: agent-jobs`.

## 13) Deploy Agent Platform

**Local development (Pub/Sub pull):**
```bash
cd agents
./deploy.sh local
# or: uv run listen
```

**Cloud Run:**
```bash
cd agents
./deploy.sh cloud
```

## 14) Deploy Frontend

**Local development:**
```bash
cd frontend
npm run dev
```

**Firebase Hosting:**
```bash
cd frontend
./deploy.sh firebase
```

**Cloud Run:**
```bash
cd frontend
./deploy.sh cloud
```

After deploying, add the frontend URL to:
- Firebase Auth → Authorized domains
- Backend `ALLOWED_ORIGINS` (redeploy backend with updated CORS)

## 15) Verify Everything Works

```bash
# 1. Check Cloud Function has env vars set
gcloud functions describe create_job --region=asia-south1 \
  --format="yaml(serviceConfig.environmentVariables)"

# 2. Check Pub/Sub topic exists
gcloud pubsub topics list --project=PROJECT_ID | grep agent-jobs

# 3. Check agents are registered in Firestore
# Visit Firebase Console → Firestore → agents collection

# 4. Check agent listener is running
# Local: terminal should show "Listening to Pub/Sub subscription…"
# Cloud Run: gcloud run services describe agent-platform --region=asia-south1

# 5. End-to-end test
# Open frontend → sign in → pick an agent → submit a query
# You should see: step progress updating → results displayed
```

## 16) Approve Waitlisted Users

All new users are automatically added to `user_access/{uid}` with status `waitlisted`.

To grant access, update that user doc in Firestore:

```json
{
  "status": "allowed",
  "allowedAt": "<server timestamp>",
  "dailyLimit": 3
}
```

Blocked users can be set with:

```json
{
  "status": "blocked"
}
```

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Frontend: `permission-denied` on snapshot | Firestore rules missing | Apply rules from step 4 |
| Job created but no Pub/Sub message | `GCP_PROJECT_ID` not set on Cloud Function | Redeploy backend (step 12) |
| Agent doesn't appear on landing page | Not registered in Firestore | Run `register_agents.py` (step 11) |
| `CREDENTIAL_SECRET` mismatch | Backend and agent have different secrets | Ensure same value in both |
| Rate limit (3/day) hit | Daily quota exhausted | Wait for next UTC day reset |
