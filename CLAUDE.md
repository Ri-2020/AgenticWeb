# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AgentHub** — a unified multi-agent platform built with **crewAI** (v1.10.1), **Firebase**, and **Next.js**. Users pick from a registry of AI agents (starting with a shopping assistant), describe their task, and watch agents collaborate step-by-step in real time.

## Project Structure

```
agentic_web/
├── frontend/          # Next.js 16 + React 19 + Tailwind CSS 4
├── backend/           # Google Cloud Function (create_job)
├── agents/            # Unified crewAI agent platform (NEW)
│   ├── src/agents/
│   │   ├── shared/    # Runtime, API, tools (shared across all agents)
│   │   ├── shopping/  # Shopping agent (crew.py + config/)
│   │   └── router.py  # Routes agentType → crew class
│   ├── pyproject.toml
│   ├── Dockerfile
│   └── deploy.sh
└── shopping_agent/    # OLD — replaced by agents/
```

## Commands

```bash
# === Agents (from agents/ directory) ===
cd agents
uv sync                              # Install dependencies
uv run agents                        # Interactive CLI (pick agent, provide inputs)
uv run serve                         # Start FastAPI server
uv run listen                        # Pub/Sub pull listener (local dev)
uv run run_with_trigger '<json>'     # Run with JSON payload
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

Agents register themselves in Firestore on server startup (`sync_agent_registry()`). The frontend reads this collection to dynamically render available agents, their forms, and step names.

### Adding a New Agent

1. Create `agents/src/agents/<name>/` with:
   - `__init__.py` — `METADATA` dict (name, description, icon, inputFields, steps, outputType)
   - `crew.py` — `@CrewBase` class with agents/tasks/crew
   - `config/agents.yaml` + `config/tasks.yaml`
2. Register in `agents/src/agents/router.py`
3. (Optional) Add a result renderer in `frontend/src/components/results/`
4. Deploy — the agent appears in the frontend automatically

### Key Files

**Agents:**
- `agents/src/agents/router.py` — Agent registry, maps agentType → crew class + metadata
- `agents/src/agents/shared/runtime.py` — Job processing, Firestore updates, step tracking via crewAI `task_callback`
- `agents/src/agents/shared/api.py` — Unified FastAPI server, Pub/Sub handler, `/agents` endpoint
- `agents/src/agents/shared/observability.py` — Langtrace init + `run_with_job_trace()` for distributed tracing
- `agents/src/agents/shared/tools/` — Shared tools (ProductScraperTool, etc.)
- `agents/src/agents/shopping/crew.py` — Shopping agent crew (5 sequential agents)

**Frontend:**
- `frontend/src/app/page.tsx` — Landing page (hero + agent cards from Firestore)
- `frontend/src/app/agents/[agentId]/page.tsx` — Agent workspace (form + step progress + results + history)
- `frontend/src/lib/agents.ts` — Listens to Firestore `agents` collection
- `frontend/src/lib/jobs.ts` — Creates jobs, listens for real-time updates
- `frontend/src/components/agent/StepProgress.tsx` — Step-by-step progress visualization
- `frontend/src/components/results/ResultRenderer.tsx` — Routes outputType to correct view

**Backend:**
- `backend/create_job/main.py` — Cloud Function: auth, rate limiting, Firestore job creation, Pub/Sub publish

### Firestore Collections

- `agents/{agentId}` — Agent metadata (name, inputFields, steps, outputType, etc.)
- `jobs/{jobId}` — Job state (agentType, status, steps[], currentStep, results, error)
- `user_settings/{userId}` — Encrypted API keys

### Environment Variables

- `MODEL` / `GEMINI_API_KEY` — LLM config (e.g. `gemini/gemini-2.5-flash-lite`); swap to `ollama/qwen3:8b` + `API_BASE=http://127.0.0.1:11434` for local Ollama
- `SERPER_API_KEY` — Web search API
- `GCP_PROJECT_ID` — Google Cloud project
- `CREDENTIAL_SECRET` — Fernet encryption key (must match across backend + agents)
- `PUBSUB_TOPIC` — Pub/Sub topic name (default: `agent-jobs`)
- `LANGTRACE_API_KEY` — Observability tracing (optional; no-ops gracefully if absent)
- `PUBSUB_LISTEN_MODE=pull` + `PUBSUB_SUBSCRIPTION` — Use pull mode for local dev instead of push
- `AGENT_SYNC_ON_STARTUP=false` — Skip Firestore agent registry sync (useful for local runs)
