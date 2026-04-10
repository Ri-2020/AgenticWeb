# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AgentHub** — a unified multi-agent platform built with **crewAI** (v1.10.1), **Firebase**, and **Next.js**. Users pick from a registry of AI agents, describe their task, and watch agents collaborate step-by-step in real time.

## Project Structure

```
agentic_web/
├── frontend/          # Next.js 16 + React 19 + Tailwind CSS 4
├── backend/           # Google Cloud Function (create_job)
└── agents/            # Unified crewAI agent platform
    ├── src/agents/
    │   ├── shared/    # Runtime, API, tools (shared across all agents)
    │   ├── shopping/  # Shopping agent
    │   ├── research/  # Deep Research agent
    │   ├── trip_planner/ # Trip Planner agent
    │   └── router.py  # Routes agentType → crew class
    ├── pyproject.toml
    ├── Dockerfile
    └── deploy.sh
```

## Commands

```bash
# === Agents (from agents/ directory) ===
cd agents
uv sync                              # Install dependencies
uv run agents                        # Interactive CLI (pick agent, provide inputs)
uv run serve                         # Start FastAPI server (port 8080)
uv run listen                        # Pub/Sub pull listener (local dev)
uv run run_with_trigger '<json>'     # Run with JSON payload (bypasses HTTP)
./deploy.sh local                    # Local Pub/Sub listener
./deploy.sh cloud                    # Deploy to Cloud Run

# === Frontend (from frontend/ directory) ===
cd frontend
npm install
npm run dev                          # Dev server
npm run build                        # Production build
npm run lint                         # ESLint

# === Backend (from backend/ directory) ===
cd backend
./deploy.sh                          # Deploy Cloud Function

# === Initial GCP Setup (one-time) ===
# See SETUP.md for full walkthrough
./setup_gcp.sh                       # Bootstrap GCP project, Pub/Sub, Firestore, IAM
```

## Architecture

### Data Flow

```
User → Frontend → Cloud Function → Pub/Sub (agent-jobs topic)
                                        ↓
                                   Agent Platform (Cloud Run)
                                   → Router (selects crew by agentType)
                                   → crewAI pipeline (step-by-step)
                                   → Firestore updates (real-time)
                                        ↓
                                   Frontend (onSnapshot listener)
                                   → Step progress UI
                                   → Results
```

### Agent Registry (Firestore `agents` collection)

Agents register themselves in Firestore only when `AGENT_SYNC_ON_STARTUP=true` (or `1`/`yes`/`on`). The default is **disabled** — set this flag explicitly when deploying to sync agent metadata. The frontend reads the `agents` collection to dynamically render available agents, their forms, and step names.

### Agent Input Convention

All crew `kickoff()` calls receive `{"user_query": ..., "country": ...}` regardless of the agent. The frontend field named `query` maps to `user_query` in the crew inputs — see `shared/main.py:run()`.

### Adding a New Agent

1. Create `agents/src/agents/<name>/` with:
   - `__init__.py` — `METADATA` dict (name, description, icon, color, status, outputType, inputFields, steps)
   - `crew.py` — `@CrewBase` class with agents/tasks/crew; set `_task_callback = None` as class attr
   - `models.py` — Pydantic model for `output_json` (structured output schema)
   - `config/agents.yaml` + `config/tasks.yaml`
2. Register in `agents/src/agents/router.py` (import METADATA + crew class, add to `AGENTS` dict)
3. Add a result renderer in `frontend/src/components/results/` for the new `outputType`
4. Register the renderer in `frontend/src/components/results/ResultRenderer.tsx`
5. Deploy — the agent appears in the frontend automatically

### Output Types → Frontend Renderers

| `outputType` | Renderer component |
|---|---|
| `product_grid` | `ProductGrid.tsx` |
| `research_brief` | `ResearchBrief.tsx` |
| `trip_itinerary` | `TripItinerary.tsx` |

### Key Files

**Agents:**
- `agents/src/agents/router.py` — Agent registry, maps agentType → crew class + metadata
- `agents/src/agents/shared/runtime.py` — Job processing, Firestore updates, step tracking via crewAI `task_callback`; also has `run_agent()` and `process_job_payload()`
- `agents/src/agents/shared/api.py` — Unified FastAPI app: Pub/Sub push handler (`POST /`), direct trigger (`POST /trigger`), agent list (`GET /agents`), health (`GET /health`)
- `agents/src/agents/shared/server.py` — Uvicorn launcher (entry point for `uv run serve`)
- `agents/src/agents/shared/observability.py` — Langtrace init + `run_with_job_trace()` for distributed tracing
- `agents/src/agents/shared/tools/` — Shared tools (ProductScraperTool, etc.)

**Frontend:**
- `frontend/src/app/page.tsx` — Landing page (hero + agent cards from Firestore)
- `frontend/src/app/agents/[agentId]/page.tsx` + `client.tsx` — Agent workspace (form + step progress + results + history)
- `frontend/src/app/jobs/[jobId]/page.tsx` + `client.tsx` — Direct job view
- `frontend/src/lib/agents.ts` — Listens to Firestore `agents` collection
- `frontend/src/lib/jobs.ts` — Creates jobs, listens for real-time updates
- `frontend/src/components/agent/StepProgress.tsx` — Step-by-step progress visualization
- `frontend/src/components/results/ResultRenderer.tsx` — Routes outputType to correct view
- `frontend/src/types/index.ts` — All shared TypeScript types

**Backend:**
- `backend/create_job/main.py` — Cloud Function: Firebase auth verification, waitlist/access control, daily quota enforcement (Firestore transaction), Pub/Sub publish

### Backend Access Control

The Cloud Function (`create_job`) enforces a waitlist + per-user daily quota system:
- `user_access/{userId}` — access status (`allowed`/`waitlisted`/`blocked`) and per-user `dailyLimit`
- `user_daily_usage/{userId}_{date}` — transactional job count per day
- Default global limit: 3 jobs/day (override with `DAILY_JOB_LIMIT` env var)
- Users can save their own Gemini API key (`save_key` action) to use instead of the platform key; keys are Fernet-encrypted using `CREDENTIAL_SECRET`

### Firestore Collections

- `agents/{agentId}` — Agent metadata (name, inputFields, steps, outputType, etc.)
- `jobs/{jobId}` — Job state (agentType, status, steps[], currentStep, results, error)
- `user_settings/{userId}` — Encrypted Gemini API keys
- `user_access/{userId}` — Access status and per-user daily limit
- `user_daily_usage/{userId}_{date}` — Daily job counts (transactional)

### Environment Variables

**Agents:**
- `MODEL` / `GEMINI_API_KEY` — LLM config (e.g. `gemini/gemini-2.5-flash-lite`); swap to `ollama/qwen3:8b` + `API_BASE=http://127.0.0.1:11434` for local Ollama
- `SERPER_API_KEY` — Web search (SerperDevTool)
- `GCP_PROJECT_ID` — Google Cloud project
- `CREDENTIAL_SECRET` — Fernet encryption key (must match backend)
- `PUBSUB_TOPIC` — Pub/Sub topic name (default: `agent-jobs`)
- `PUBSUB_LISTEN_MODE=pull` + `PUBSUB_SUBSCRIPTION` — Pull mode for local dev
- `AGENT_SYNC_ON_STARTUP=true` — Enable Firestore agent registry sync on startup (default: disabled)
- `LANGTRACE_API_KEY` — Observability tracing (optional; gracefully no-ops if absent)
- `LANGTRACE_SERVICE_NAME` — Service name for traces (default: `agent-platform`)

**Backend (Cloud Function):**
- `ALLOWED_ORIGINS` — Comma-separated CORS origins
- `DAILY_JOB_LIMIT` — Default daily job limit per user (default: `3`)
- `USER_ACCESS_COLLECTION` / `DAILY_USAGE_COLLECTION` — Firestore collection names

## Frontend Note

This project uses a newer version of Next.js that may have breaking API changes. Before writing frontend code, check `node_modules/next/dist/docs/` for the relevant guide.
