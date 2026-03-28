"""Unified FastAPI server for all agents."""

from __future__ import annotations

import json
import logging
import os
import threading

from dotenv import load_dotenv

load_dotenv()

# Langtrace MUST be initialized before any crewAI imports.
from agents.shared.observability import init_langtrace
init_langtrace()

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from agents.shared.runtime import (
    extract_pubsub_payload,
    process_job_payload,
    sync_agent_registry,
)
from agents.router import get_all_agents

logger = logging.getLogger(__name__)

app = FastAPI(title="Agent Platform")
_listener_thread: threading.Thread | None = None


def _should_start_pull_listener() -> bool:
    mode = os.environ.get("PUBSUB_LISTEN_MODE", "push").strip().lower()
    return mode in {"pull", "subscriber", "listen"}


def _start_pull_listener() -> None:
    global _listener_thread
    if _listener_thread and _listener_thread.is_alive():
        return

    try:
        from google.cloud import pubsub_v1
    except ImportError:
        logger.warning("google-cloud-pubsub is not installed — pull listener disabled.")
        return

    project_id = os.environ.get("GCP_PROJECT_ID") or os.environ.get("GOOGLE_CLOUD_PROJECT", "")
    subscription_name = os.environ.get("PUBSUB_SUBSCRIPTION", "agent-jobs-local").strip()
    if not project_id:
        logger.warning("Pull listener needs GCP_PROJECT_ID.")
        return

    def _run() -> None:
        client = pubsub_v1.SubscriberClient()
        sub_path = (
            subscription_name
            if "/" in subscription_name
            else client.subscription_path(project_id, subscription_name)
        )

        def callback(message) -> None:
            try:
                payload = json.loads(message.data.decode("utf-8"))
                result = process_job_payload(payload)
                logger.info("Pulled message processed: %s", result.get("status"))
            except Exception:
                logger.exception("Error processing pulled Pub/Sub message.")
            finally:
                message.ack()

        future = client.subscribe(sub_path, callback=callback)
        logger.info("Listening to Pub/Sub subscription %s", sub_path)
        try:
            future.result()
        except Exception:
            logger.exception("Pub/Sub listener stopped unexpectedly.")

    _listener_thread = threading.Thread(target=_run, name="pubsub-listener", daemon=True)
    _listener_thread.start()


@app.on_event("startup")
async def startup_event() -> None:
    if _should_start_pull_listener():
        _start_pull_listener()
    sync_on_startup = os.environ.get("AGENT_SYNC_ON_STARTUP", "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    if sync_on_startup:
        try:
            sync_agent_registry()
        except Exception:
            logger.exception("Failed to sync agent registry on startup.")
    else:
        logger.info("Skipping agent registry sync on startup.")


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/agents")
async def list_agents():
    """Return metadata for all registered agents."""
    return JSONResponse(get_all_agents())


@app.post("/")
async def handle_pubsub(request: Request):
    """Handle a Pub/Sub push envelope or a direct JSON payload."""
    try:
        body = await request.json()
        payload = extract_pubsub_payload(body)
        result = process_job_payload(payload)
        return JSONResponse(result, status_code=200)
    except ValueError as exc:
        return JSONResponse({"error": str(exc)}, status_code=400)
    except Exception as exc:
        logger.exception("Unexpected error handling Pub/Sub request.")
        return JSONResponse({"error": str(exc)}, status_code=500)


@app.post("/trigger")
async def trigger_job(request: Request):
    """Direct trigger for local testing."""
    try:
        payload = await request.json()
        result = process_job_payload(payload)
        return JSONResponse(result, status_code=200)
    except ValueError as exc:
        return JSONResponse({"error": str(exc)}, status_code=400)
    except Exception as exc:
        logger.exception("Unexpected error triggering job.")
        return JSONResponse({"error": str(exc)}, status_code=500)
