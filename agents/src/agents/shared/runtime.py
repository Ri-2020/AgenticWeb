"""Shared runtime: Firestore helpers, job processing, step tracking."""

from __future__ import annotations

import base64
import hashlib
import json
import logging
import os
import traceback
import warnings
from datetime import datetime, timezone
from typing import Any, Callable

from cryptography.fernet import Fernet

from agents.shared.observability import init_langtrace, run_with_job_trace

warnings.filterwarnings("ignore", category=SyntaxWarning, module="pysbd")

logger = logging.getLogger(__name__)

_firestore_client = None


# ---------------------------------------------------------------------------
# GCP / Firestore helpers
# ---------------------------------------------------------------------------

def get_project_id() -> str:
    return os.environ.get("GCP_PROJECT_ID") or os.environ.get("GOOGLE_CLOUD_PROJECT", "")


def _fernet() -> Fernet | None:
    secret = os.environ.get("CREDENTIAL_SECRET")
    if not secret:
        return None
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def decrypt_key(ciphertext: str | None) -> str | None:
    if not ciphertext:
        return None
    f = _fernet()
    if not f:
        return None
    try:
        return f.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except Exception:
        logger.warning("Failed to decrypt user key")
        return None


def get_firestore_client():
    global _firestore_client
    if _firestore_client is not None:
        return _firestore_client

    project_id = get_project_id()
    if not project_id:
        logger.info("Firestore disabled: no GCP project id configured.")
        return None

    try:
        from google.cloud import firestore
    except ImportError:
        logger.info("Firestore disabled: google-cloud-firestore is not installed.")
        return None

    try:
        _firestore_client = firestore.Client(project=project_id)
    except Exception:
        logger.warning("Firestore client could not be created: %s", traceback.format_exc())
        _firestore_client = None

    return _firestore_client


def update_job(job_id: str, **fields: Any) -> bool:
    db = get_firestore_client()
    if db is None:
        logger.info("Skipping Firestore update for job %s: Firestore unavailable.", job_id)
        return False

    fields["updatedAt"] = datetime.now(timezone.utc)
    try:
        db.collection("jobs").document(job_id).update(fields)
        return True
    except Exception:
        logger.warning("Failed to update Firestore job %s: %s", job_id, traceback.format_exc())
        return False


# ---------------------------------------------------------------------------
# Step-tracking callback for crewAI
# ---------------------------------------------------------------------------

def create_step_callback(job_id: str, step_names: list[str]) -> Callable:
    """Return a crewAI task_callback that updates Firestore after each task."""
    completed = {"count": 0}

    def callback(task_output):
        idx = completed["count"]
        completed["count"] += 1

        step_statuses = []
        for i, name in enumerate(step_names):
            if i <= idx:
                step_statuses.append({"name": name, "status": "completed"})
            elif i == idx + 1:
                step_statuses.append({"name": name, "status": "in_progress"})
            else:
                step_statuses.append({"name": name, "status": "pending"})

        next_idx = idx + 1
        message = step_names[next_idx] if next_idx < len(step_names) else "Finalizing..."

        update_job(
            job_id,
            currentStep=next_idx,
            totalSteps=len(step_names),
            stepMessage=message,
            steps=step_statuses,
        )

    return callback


def _init_step_state(job_id: str, step_names: list[str]) -> None:
    """Set the initial step state when a job begins processing."""
    steps = [{"name": name, "status": "pending"} for name in step_names]
    if steps:
        steps[0]["status"] = "in_progress"
    update_job(
        job_id,
        status="processing",
        currentStep=0,
        totalSteps=len(step_names),
        stepMessage=step_names[0] if step_names else "Starting...",
        steps=steps,
    )


# ---------------------------------------------------------------------------
# Cost tracking
# ---------------------------------------------------------------------------

# Gemini pricing (USD per 1M tokens) — update as pricing changes.
_GEMINI_COST_TABLE: dict[str, dict[str, float]] = {
    "gemini-2.5-pro":           {"input": 1.25,  "output": 10.0},
    "gemini-2.5-flash":         {"input": 0.15,  "output": 0.60},
    "gemini-2.5-flash-lite":    {"input": 0.10,  "output": 0.40},
    "gemini-2.0-flash":         {"input": 0.10,  "output": 0.40},
    "gemini-2.0-flash-lite":    {"input": 0.075, "output": 0.30},
    "gemini-1.5-pro":           {"input": 1.25,  "output": 5.00},
    "gemini-1.5-flash":         {"input": 0.075, "output": 0.30},
}


def _record_usage_metrics(usage: Any) -> None:
    """Write token counts and estimated cost onto the current OTel span."""
    if usage is None:
        return
    try:
        from opentelemetry import trace as otel_trace
        span = otel_trace.get_current_span()
        if not span.is_recording():
            return

        prompt_tokens = getattr(usage, "prompt_tokens", 0) or 0
        completion_tokens = getattr(usage, "completion_tokens", 0) or 0
        total_tokens = getattr(usage, "total_tokens", 0) or (prompt_tokens + completion_tokens)
        requests = getattr(usage, "successful_requests", 0) or 0

        span.set_attribute("llm.usage.prompt_tokens", prompt_tokens)
        span.set_attribute("llm.usage.completion_tokens", completion_tokens)
        span.set_attribute("llm.usage.total_tokens", total_tokens)
        span.set_attribute("llm.usage.successful_requests", requests)

        # Estimate cost using the active model.
        model_env = (os.environ.get("MODEL") or "").strip()
        # Strip provider prefix e.g. "gemini/gemini-2.5-flash" → "gemini-2.5-flash"
        model_key = model_env.split("/")[-1].lower() if model_env else ""
        pricing = _GEMINI_COST_TABLE.get(model_key)
        if pricing:
            cost = (
                prompt_tokens * pricing["input"] / 1_000_000
                + completion_tokens * pricing["output"] / 1_000_000
            )
            span.set_attribute("llm.usage.cost", round(cost, 8))
            span.set_attribute("llm.usage.cost_currency", "USD")
    except Exception:
        pass  # Never let observability crash the agent


# ---------------------------------------------------------------------------
# Agent execution
# ---------------------------------------------------------------------------

def run_agent(
    agent_type: str,
    inputs: dict[str, Any],
    job_id: str | None = None,
    api_key_override: str | None = None,
) -> dict[str, Any]:
    """Run the specified agent crew and return normalised JSON results."""
    # Initialize tracing before importing router/crews so LLM calls can be instrumented.
    init_langtrace()
    from agents.router import get_agent_info

    info = get_agent_info(agent_type)
    if info is None:
        raise ValueError(f"Unknown agent type: {agent_type}")

    crew_class = info["crew_class"]
    step_names = info["metadata"].get("steps", [])

    original_key = os.environ.get("GEMINI_API_KEY")
    usage = None
    try:
        if api_key_override:
            os.environ["GEMINI_API_KEY"] = api_key_override

        instance = crew_class()

        # Inject step callback if we have a job to track
        task_callback = None
        if job_id and step_names:
            task_callback = create_step_callback(job_id, step_names)

        instance._task_callback = task_callback
        crew_obj = instance.crew()
        result = crew_obj.kickoff(inputs=inputs)
        usage = getattr(crew_obj, "usage_metrics", None)
    finally:
        if api_key_override is not None:
            if original_key is not None:
                os.environ["GEMINI_API_KEY"] = original_key
            else:
                os.environ.pop("GEMINI_API_KEY", None)

    _record_usage_metrics(usage)

    if hasattr(result, "json_dict") and result.json_dict:
        return result.json_dict

    raw = str(result)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"raw_output": raw}


# ---------------------------------------------------------------------------
# Pub/Sub payload handling
# ---------------------------------------------------------------------------

def extract_pubsub_payload(body: dict[str, Any]) -> dict[str, Any]:
    if "message" in body:
        message = body.get("message", {})
        data = message.get("data")
        if not data:
            raise ValueError("Missing Pub/Sub message data")
        decoded = base64.b64decode(data).decode("utf-8")
        return json.loads(decoded)
    return body


def process_job_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Process a single job payload end-to-end."""
    job_id = payload.get("jobId") or payload.get("job_id")
    agent_type = payload.get("agentType") or payload.get("agent_type", "shopping")
    query = payload.get("query")
    country = payload.get("country", "India")
    user_key_enc = payload.get("geminiKeyEnc") or payload.get("gemini_key_enc")

    if not job_id or not query:
        raise ValueError("Missing jobId or query")

    logger.info("Processing job %s [%s]: %r (%s)", job_id, agent_type, query, country)

    # Initialize tracing lazily during job execution (not server startup).
    init_langtrace()

    # Get step names for this agent
    from agents.router import get_agent_info
    info = get_agent_info(agent_type)
    step_names = info["metadata"].get("steps", []) if info else []

    def _run_job() -> dict[str, Any]:
        # Set initial step state after trace context is established.
        _init_step_state(job_id, step_names)
        try:
            user_api_key = decrypt_key(user_key_enc)
            inputs = {"user_query": query, "country": country}
            results = run_agent(agent_type, inputs, job_id=job_id, api_key_override=user_api_key)
            update_job(job_id, status="completed", results=results, error=None)
            logger.info("Job %s completed successfully", job_id)
            return {"status": "completed", "jobId": job_id, "results": results}
        except Exception as exc:
            logger.error("Job %s failed: %s", job_id, traceback.format_exc())
            update_job(job_id, status="failed", error=str(exc))
            return {"status": "failed", "jobId": job_id, "error": str(exc)}

    trace_attrs = {
        "job.id": job_id,
        "agent.type": agent_type,
        "job.country": country,
    }
    return run_with_job_trace(
        span_name=f"agent_job.{agent_type}",
        attributes=trace_attrs,
        fn=_run_job,
        session_id=job_id,
    )


# ---------------------------------------------------------------------------
# Agent registry sync to Firestore
# ---------------------------------------------------------------------------

def sync_agent_registry() -> None:
    """Write all known agent metadata to the Firestore `agents` collection."""
    db = get_firestore_client()
    if db is None:
        logger.info("Skipping agent registry sync: Firestore unavailable.")
        return

    from agents.router import get_all_agents

    for agent_id, meta in get_all_agents().items():
        doc_data = {
            **meta,
            "id": agent_id,
            "updatedAt": datetime.now(timezone.utc),
        }
        db.collection("agents").document(agent_id).set(doc_data, merge=True)
        logger.info("Registered agent: %s", agent_id)
