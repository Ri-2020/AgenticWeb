"""Shared runtime helpers for the shopping agent."""

from __future__ import annotations

import base64
import hashlib
import json
import logging
import os
import traceback
import warnings
from datetime import datetime, timezone
from typing import Any

from cryptography.fernet import Fernet

warnings.filterwarnings("ignore", category=SyntaxWarning, module="pysbd")

logger = logging.getLogger(__name__)

_firestore_client = None


def get_project_id() -> str:
    """Return the configured GCP project id, if any."""
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
    """Return a Firestore client when the dependency and project id are available."""
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
    """Update a Firestore job document when Firestore is available."""
    db = get_firestore_client()
    if db is None:
        logger.info("Skipping Firestore update for job %s: Firestore is unavailable.", job_id)
        return False

    fields["updatedAt"] = datetime.now(timezone.utc)
    try:
        db.collection("jobs").document(job_id).update(fields)
        return True
    except Exception:
        logger.warning("Failed to update Firestore job %s: %s", job_id, traceback.format_exc())
        return False


def run_crew(query: str, country: str, api_key_override: str | None = None) -> dict[str, Any]:
    """Run the shopping agent crew and normalize the result."""
    from shopping_agent.crew import ShoppingAgent

    original_key = os.environ.get("GEMINI_API_KEY")
    try:
        if api_key_override:
            os.environ["GEMINI_API_KEY"] = api_key_override

        inputs = {"user_query": query, "country": country}
        result = ShoppingAgent().crew().kickoff(inputs=inputs)
    finally:
        if api_key_override is not None:
            if original_key is not None:
                os.environ["GEMINI_API_KEY"] = original_key
            else:
                os.environ.pop("GEMINI_API_KEY", None)

    if hasattr(result, "json_dict") and result.json_dict:
        return result.json_dict

    raw = str(result)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"recommendations": [], "raw_output": raw}


def extract_pubsub_payload(body: dict[str, Any]) -> dict[str, Any]:
    """Accept either a Pub/Sub push envelope or a direct JSON payload."""
    if "message" in body:
        message = body.get("message", {})
        data = message.get("data")
        if not data:
            raise ValueError("Missing Pub/Sub message data")
        decoded = base64.b64decode(data).decode("utf-8")
        return json.loads(decoded)

    return body


def process_job_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Run the crew for a single job payload and persist status when possible."""
    job_id = payload.get("jobId") or payload.get("job_id")
    query = payload.get("query")
    country = payload.get("country", "India")
    user_key_enc = payload.get("geminiKeyEnc") or payload.get("gemini_key_enc")

    if not job_id or not query:
        raise ValueError("Missing jobId or query")

    logger.info("Processing job %s: %r (%s)", job_id, query, country)
    update_job(job_id, status="processing")

    try:
        user_api_key = decrypt_key(user_key_enc)
        results = run_crew(query, country, api_key_override=user_api_key)
        update_job(job_id, status="completed", results=results, error=None)
        logger.info("Job %s completed successfully", job_id)
        return {"status": "completed", "jobId": job_id, "results": results}
    except Exception as exc:
        logger.error("Job %s failed: %s", job_id, traceback.format_exc())
        update_job(job_id, status="failed", error=str(exc))
        return {"status": "failed", "jobId": job_id, "error": str(exc)}
