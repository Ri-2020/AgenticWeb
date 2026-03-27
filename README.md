# AgentHub

AgentHub is a production-style multi-agent AI platform.
It lets users sign in, choose a specialized agent, submit a task, and watch real-time progress as the backend orchestrates agent execution and writes structured results.

## What This Project Does

AgentHub provides a unified interface for multiple AI agents:

- `Deep Research` for multi-source research briefs
- `Shopping Assistant` for product discovery and comparison
- `Trip Planner` for itinerary generation

The system is designed to be extensible: new agents can be added with metadata + crew definitions, then automatically surfaced in the frontend.

## Core Capabilities

- Google sign-in with Firebase Auth
- Real-time job updates via Firestore listeners
- Async orchestration with Cloud Function + Pub/Sub + agent runtime
- Multi-agent execution pipeline (crewAI)
- Waitlist/allowlist access control (`allowed`, `waitlisted`, `blocked`)
- Daily usage quota enforcement (default: 3 jobs/day/user)
- Encrypted user Gemini key storage (`user_settings`)
- Modern Next.js UI with per-agent task forms and result renderers

## High-Level Architecture

```text
┌──────────────────────────────┐
│ Frontend (Next.js App Router)│
│ - Auth, agent pages, jobs UI │
│ - Firestore realtime listens │
└───────────────┬──────────────┘
                │ HTTPS (Bearer token)
                ▼
┌──────────────────────────────┐
│ Cloud Function: create_job   │
│ - Verify Firebase ID token   │
│ - Access check / waitlist    │
│ - Enforce daily quota        │
│ - Create jobs/{jobId} doc    │
│ - Publish Pub/Sub message    │
└───────────────┬──────────────┘
                │ Pub/Sub
                ▼
┌──────────────────────────────┐
│ Agent Runtime (Cloud Run or  │
│ local pull listener)         │
│ - Routes to selected agent   │
│ - Runs crew workflow         │
│ - Writes progress + results  │
│   back to Firestore          │
└──────────────────────────────┘
```

## Data Flow

1. User signs in and opens an agent page.
2. Frontend submits to `create_job` with auth token + task input.
3. Cloud Function validates access and quota, creates a Firestore job, then publishes Pub/Sub.
4. Agent runtime consumes the message, runs the chosen workflow, and updates the job document.
5. Frontend receives snapshot updates and renders live progress and final output.

## Firestore Model

- `agents/{agentId}`: public agent metadata shown in UI
- `jobs/{jobId}`: per-user job state, steps, and final results
- `user_access/{uid}`: access state (`allowed|waitlisted|blocked`) and limits
- `user_daily_usage/{uid_YYYY-MM-DD}`: daily counter for quota enforcement
- `user_settings/{uid}`: encrypted Gemini key payload

## Repo Structure

```text
agentic_web/
├── frontend/                 # Next.js 16 + React 19 + Tailwind 4
│   ├── src/app/              # Pages/routes
│   ├── src/components/       # UI building blocks
│   ├── src/lib/              # Firebase/auth/jobs helpers
│   └── src/types/            # Shared TS interfaces
├── backend/
│   ├── create_job/main.py    # Cloud Function entrypoint
│   └── deploy.sh             # Function deployment script
├── agents/
│   ├── src/agents/           # Multi-agent runtime + agent modules
│   ├── register_agents.py    # Seeds Firestore agents collection
│   └── deploy.sh             # Cloud Run / local pull listener modes
├── shopping_agent/           # Legacy single-agent module (optional)
├── SETUP.md                  # Full infra setup walkthrough
└── setup_gcp.sh              # Initial project bootstrap helper
```

## Quick Start

For the full production setup, use [`SETUP.md`](./SETUP.md).

Minimal local flow:

```bash
# 1) Frontend
cd frontend
npm install
npm run dev

# 2) Agents runtime (local pull mode)
cd ../agents
uv sync
./deploy.sh local
```

Make sure your `.env` files are configured (`frontend/.env.local`, `agents/.env`, backend env vars).

## Deployment Order

1. Deploy backend Cloud Function (`backend/deploy.sh`)
2. Deploy agent runtime (`agents/deploy.sh cloud`)
3. Deploy frontend (`frontend/deploy.sh`)

## Access Control and Quota Notes

- New users are automatically inserted into `user_access` as `waitlisted`.
- Users must be marked `allowed` to create jobs.
- Daily limit is enforced server-side (default 3 jobs/day).
- Optional frontend access-status UI is controlled by:
  - `NEXT_PUBLIC_ENABLE_ACCESS_STATUS=true`

## Add a New Agent

1. Create `agents/src/agents/<agent_name>/__init__.py` with `METADATA`
2. Add crew/task implementation files
3. Register in router mapping
4. Run `agents/register_agents.py` to publish metadata

The frontend will automatically render it from Firestore metadata.

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Firebase Web SDK
- Backend API: Python 3.12 Cloud Functions (Gen2)
- Queue: Google Pub/Sub
- Agent runtime: Cloud Run + crewAI
- Data/Auth: Firestore + Firebase Auth

## Troubleshooting

- Firestore `permission-denied`: verify published rules in `SETUP.md`
- `Missing 'query' field`: empty form submission or outdated backend action handling
- Access-status 400 on load: set `NEXT_PUBLIC_ENABLE_ACCESS_STATUS=false` until backend is redeployed
- No realtime updates: check Firestore listeners + Pub/Sub consumer logs

## License

MIT
