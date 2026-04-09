# CI/CD Pipeline

Triggered on every push to `main`. Path filtering ensures only changed components are deployed.

---

## Overview

```
push to main
     │
     ▼
 [changes]          ← detects which paths changed
   ├──▶ [deploy-frontend]   if frontend/** changed
   ├──▶ [deploy-backend]    if backend/** changed
   └──▶ [deploy-agents]     if agents/** changed
```

All three deploy jobs run in **parallel**. Failure in one does not block the others.

---

## Jobs

### `deploy-frontend` → Firebase Hosting

1. `npm ci` with cache
2. `npm run build` (Next.js static export, `NEXT_OUTPUT_MODE=export`)
3. Deploy `out/` to Firebase Hosting via `FirebaseExtended/action-hosting-deploy`

### `deploy-backend` → Cloud Functions Gen2

1. Authenticate to GCP
2. Ensure Pub/Sub topic exists (idempotent)
3. Deploy `create_job` function
4. Deploy `request_access` function
5. Print deployed URLs (update `NEXT_PUBLIC_*_URL` secrets if they changed)

### `deploy-agents` → Cloud Run

1. Authenticate to GCP
2. Ensure Artifact Registry repository exists
3. Build Docker image with GitHub Actions layer cache
4. Push image tagged with `$GITHUB_SHA` and `latest`
5. Deploy `$GITHUB_SHA`-tagged image to Cloud Run (never deploys `:latest`)
6. Recreate Pub/Sub push subscription pointing at the new service URL
7. Run `scripts/register-agents.js` to upsert agent registry in Firestore

---

## Secrets required

Set all of these under **GitHub → Settings → Secrets and variables → Actions**.

### GCP / infrastructure
| Secret | Description |
|--------|-------------|
| `GCP_PROJECT_ID` | GCP project ID |
| `GCP_SA_KEY` | Service account JSON (see IAM roles below) |
| `GCP_REGION` | Deployment region, e.g. `asia-south1` |
| `AR_REPO` | Artifact Registry repo name |

### Firebase (frontend hosting)
| Secret | Description |
|--------|-------------|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Hosting deploy SA JSON (from Firebase project settings → Service accounts) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web SDK config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase web SDK config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase web SDK config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web SDK config |

### Frontend → backend URLs
These are output at the end of each backend deploy. Update them manually after the first deploy (Cloud Functions Gen2 URLs are not deterministic on first creation).

| Secret | Description |
|--------|-------------|
| `NEXT_PUBLIC_CREATE_JOB_URL` | `create_job` Cloud Function URL |
| `NEXT_PUBLIC_REQUEST_ACCESS_URL` | `request_access` Cloud Function URL |

### Agent platform
| Secret | Description |
|--------|-------------|
| `GEMINI_API_KEY` | LLM API key |
| `SERPER_API_KEY` | Web search API key |
| `MODEL` | Model identifier, e.g. `gemini/gemini-2.5-flash-lite` |
| `CREDENTIAL_SECRET` | Fernet encryption key (must match across backend + agents) |
| `LANGTRACE_API_KEY` | Observability tracing (optional — no-ops if absent) |

### Backend functions
| Secret | Description |
|--------|-------------|
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `DAILY_JOB_LIMIT` | Max jobs per user per day |
| `TELEGRAM_BOT_TOKEN` | Waitlist notifications |
| `TELEGRAM_CHAT_ID` | Waitlist notifications |

---

## Required IAM roles for `GCP_SA_KEY`

```
roles/run.admin
roles/cloudfunctions.admin
roles/cloudbuild.builds.editor
roles/artifactregistry.writer
roles/pubsub.editor
roles/datastore.user
roles/iam.serviceAccountUser
```

Create the service account and download the key:

```bash
gcloud iam service-accounts create github-cicd \
  --display-name="GitHub Actions CI/CD"

# Grant each role
for role in run.admin cloudfunctions.admin cloudbuild.builds.editor \
            artifactregistry.writer pubsub.editor datastore.user \
            iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-cicd@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/$role"
done

# Download key → paste into GCP_SA_KEY secret
gcloud iam service-accounts keys create /tmp/github-cicd-key.json \
  --iam-account="github-cicd@$PROJECT_ID.iam.gserviceaccount.com"
```

---

## Agent registration

`scripts/register-agents.js` upserts all agents to the Firestore `agents` collection using `set({ merge: true })` — idempotent, safe to re-run.

**Primary mechanism**: `AGENT_SYNC_ON_STARTUP=true` on the Cloud Run service handles registration automatically when the container starts. The CI script is a verification / override layer.

To add a new agent:
1. Create `agents/src/agents/<id>/` with `__init__.py` (METADATA), `crew.py`, `config/`
2. Register in `agents/src/agents/router.py`
3. Add an entry to `scripts/agents-config.json`
4. Push — the pipeline picks it up automatically

---

## Architecture: unified platform vs per-agent services

All agents (shopping, research, trip_planner) share **one Docker image** deployed as one Cloud Run service (`agent-platform`). The router dispatches jobs internally.

The workflow file includes a commented-out matrix variant for when you want to split agents into separate Cloud Run services. Each agent would need its own Dockerfile and the `agents-config.json` would drive the matrix.

---

## Caching strategy

| Layer | Mechanism |
|-------|-----------|
| `node_modules` | `actions/setup-node` built-in npm cache |
| Docker layers | `docker/build-push-action` + `cache-from/to: type=gha` |

---

## Manual trigger

The workflow supports `workflow_dispatch`, so you can re-deploy any component from the GitHub Actions UI without pushing a new commit.
