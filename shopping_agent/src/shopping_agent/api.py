"""FastAPI app for the shopping agent."""

from __future__ import annotations

import json
import logging
import os
import threading

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from shopping_agent.runtime import extract_pubsub_payload, process_job_payload

logger = logging.getLogger(__name__)

app = FastAPI(title="Shopping Agent")
_listener_thread: threading.Thread | None = None


def _should_start_pull_listener() -> bool:
    mode = os.environ.get("PUBSUB_LISTEN_MODE", "push").strip().lower()
    return mode in {"pull", "subscriber", "listen"}


def _start_pull_listener() -> None:
    """Start a background Pub/Sub pull subscriber for local development."""
    global _listener_thread

    if _listener_thread and _listener_thread.is_alive():
        return

    try:
        from google.cloud import pubsub_v1
    except ImportError:
        logger.warning("PUBSUB_LISTEN_MODE=pull was requested, but google-cloud-pubsub is not installed.")
        return

    project_id = os.environ.get("GCP_PROJECT_ID") or os.environ.get("GOOGLE_CLOUD_PROJECT", "")
    subscription_name = os.environ.get("PUBSUB_SUBSCRIPTION", "").strip()
    if not project_id or not subscription_name:
        logger.warning(
            "PUBSUB_LISTEN_MODE=pull needs GCP_PROJECT_ID and PUBSUB_SUBSCRIPTION. Listener will not start."
        )
        return

    def _run() -> None:
        client = pubsub_v1.SubscriberClient()
        subscription_path = (
            subscription_name
            if "/" in subscription_name
            else client.subscription_path(project_id, subscription_name)
        )

        def callback(message) -> None:
            try:
                payload = json.loads(message.data.decode("utf-8"))
                result = process_job_payload(payload)
                logger.info("Pulled message processed: %s", result)
            except Exception:
                logger.exception("Error while processing pulled Pub/Sub message.")
            finally:
                message.ack()

        streaming_pull_future = client.subscribe(subscription_path, callback=callback)
        logger.info("Listening to Pub/Sub subscription %s", subscription_path)
        try:
            streaming_pull_future.result()
        except Exception:
            logger.exception("Pub/Sub listener stopped unexpectedly.")

    _listener_thread = threading.Thread(target=_run, name="pubsub-listener", daemon=True)
    _listener_thread.start()


@app.on_event("startup")
async def startup_event() -> None:
    if _should_start_pull_listener():
        _start_pull_listener()


@app.get("/health")
async def health():
    return {"status": "healthy"}


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
        logger.exception("Unexpected error while handling Pub/Sub request.")
        return JSONResponse({"error": str(exc)}, status_code=500)


@app.post("/trigger")
async def trigger_job(request: Request):
    """Manual local trigger that accepts the direct job payload."""
    try:
        payload = await request.json()
        result = process_job_payload(payload)
        return JSONResponse(result, status_code=200)
    except ValueError as exc:
        return JSONResponse({"error": str(exc)}, status_code=400)
    except Exception as exc:
        logger.exception("Unexpected error while triggering a job.")
        return JSONResponse({"error": str(exc)}, status_code=500)
