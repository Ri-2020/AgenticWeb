"""Cloud Function: create_job

Receives authenticated requests from the frontend and supports:
1) checking user access/waitlist status,
2) saving encrypted Gemini API keys,
3) creating jobs with strict daily quota enforcement.
"""

import base64
import hashlib
import json
import os
from datetime import datetime, timezone
from typing import Any

import functions_framework
from flask import Request, jsonify
from cryptography.fernet import Fernet
from google.cloud import firestore, pubsub_v1
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "")
PUBSUB_TOPIC = os.environ.get("PUBSUB_TOPIC", "agent-jobs")
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
CREDENTIAL_SECRET = os.environ.get("CREDENTIAL_SECRET", "")
USER_ACCESS_COLLECTION = os.environ.get("USER_ACCESS_COLLECTION", "user_access")
DAILY_USAGE_COLLECTION = os.environ.get("DAILY_USAGE_COLLECTION", "user_daily_usage")
DAILY_JOB_LIMIT = int(os.environ.get("DAILY_JOB_LIMIT", "3"))

db = firestore.Client(project=PROJECT_ID)
publisher = pubsub_v1.PublisherClient()

ACCESS_ALLOWED = "allowed"
ACCESS_WAITLISTED = "waitlisted"
ACCESS_BLOCKED = "blocked"
ACCESS_NONE = "none"
KNOWN_ACCESS_STATUSES = {ACCESS_ALLOWED, ACCESS_WAITLISTED, ACCESS_BLOCKED}


class DailyLimitExceededError(Exception):
    """Raised when a user exceeds their daily job quota."""


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_utc(dt: datetime | None) -> str | None:
    if not isinstance(dt, datetime):
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def date_key(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")


def usage_doc_id(user_id: str, dt: datetime) -> str:
    return f"{user_id}_{date_key(dt)}"


def as_int(value: Any, fallback: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def normalize_access_status(value: Any) -> str:
    status = str(value or ACCESS_WAITLISTED).strip().lower()
    if status not in KNOWN_ACCESS_STATUSES:
        return ACCESS_WAITLISTED
    return status


def claims_profile(claims: dict) -> dict[str, str]:
    return {
        "email": str(claims.get("email") or "").strip(),
        "displayName": str(claims.get("name") or "").strip(),
        "photoURL": str(claims.get("picture") or "").strip(),
    }


def get_access_record(user_id: str) -> dict | None:
    """Read the user's access record. Returns None if user hasn't joined the waitlist."""
    ref = db.collection(USER_ACCESS_COLLECTION).document(user_id)
    snap = ref.get()

    if not snap.exists:
        return None

    data = snap.to_dict() or {}
    now = utc_now()
    ref.set({"lastSeenAt": now, "updatedAt": now}, merge=True)
    data["lastSeenAt"] = now
    data["updatedAt"] = now
    return data


def get_jobs_today(user_id: str, now: datetime | None = None) -> int:
    now = now or utc_now()
    usage_ref = db.collection(DAILY_USAGE_COLLECTION).document(usage_doc_id(user_id, now))
    usage_doc = usage_ref.get()
    if not usage_doc.exists:
        return 0
    data = usage_doc.to_dict() or {}
    return max(0, as_int(data.get("jobsCount"), 0))


def build_access_payload(access: dict | None, user_id: str, now: datetime | None = None) -> dict:
    now = now or utc_now()

    if access is None:
        return {
            "status": ACCESS_NONE,
            "jobsToday": 0,
            "dailyLimit": DAILY_JOB_LIMIT,
            "remainingToday": 0,
            "waitlistedAt": None,
            "allowedAt": None,
            "message": "Join the waitlist to request access.",
        }

    status = normalize_access_status(access.get("status"))
    daily_limit = max(1, as_int(access.get("dailyLimit"), DAILY_JOB_LIMIT))
    jobs_today = get_jobs_today(user_id, now)
    remaining = max(0, daily_limit - jobs_today)

    if status == ACCESS_ALLOWED:
        if remaining > 0:
            message = f"Access granted. You can create {remaining} more job(s) today."
        else:
            message = "Daily limit reached. Try again tomorrow."
    elif status == ACCESS_BLOCKED:
        message = "Access blocked. Contact support."
    else:
        message = "You're on the waitlist. We'll notify you once you're approved."

    return {
        "status": status,
        "jobsToday": jobs_today,
        "dailyLimit": daily_limit,
        "remainingToday": remaining,
        "waitlistedAt": iso_utc(access.get("waitlistedAt")),
        "allowedAt": iso_utc(access.get("allowedAt")),
        "message": message,
    }


def create_job_and_increment_usage(
    user_id: str,
    agent_type: str,
    user_query: str,
    country: str,
    user_key_enc: str | None,
    daily_limit: int,
) -> tuple[str, int]:
    """Create a job and increment per-day quota atomically."""
    now = utc_now()
    usage_ref = db.collection(DAILY_USAGE_COLLECTION).document(usage_doc_id(user_id, now))
    job_ref = db.collection("jobs").document()

    @firestore.transactional
    def _tx(transaction: firestore.Transaction) -> int:
        usage_doc = usage_ref.get(transaction=transaction)
        usage_data = usage_doc.to_dict() or {}
        jobs_today = max(0, as_int(usage_data.get("jobsCount"), 0))

        if jobs_today >= daily_limit:
            raise DailyLimitExceededError("Daily limit reached")

        jobs_after = jobs_today + 1
        usage_update = {
            "userId": user_id,
            "dateKey": date_key(now),
            "jobsCount": jobs_after,
            "dailyLimit": daily_limit,
            "updatedAt": now,
        }
        if not usage_doc.exists:
            usage_update["createdAt"] = now
        transaction.set(usage_ref, usage_update, merge=True)

        job_data = {
            "userId": user_id,
            "agentType": agent_type,
            "query": user_query,
            "country": country,
            "status": "pending",
            "results": None,
            "error": None,
            "currentStep": 0,
            "totalSteps": 0,
            "stepMessage": "Queued...",
            "steps": [],
            "usedUserKey": bool(user_key_enc),
            "createdAt": now,
            "updatedAt": now,
        }
        transaction.set(job_ref, job_data)
        return jobs_after

    transaction = db.transaction()
    jobs_today_after = _tx(transaction)

    topic_path = publisher.topic_path(PROJECT_ID, PUBSUB_TOPIC)
    message_data = json.dumps({
        "jobId": job_ref.id,
        "agentType": agent_type,
        "query": user_query,
        "country": country,
        "geminiKeyEnc": user_key_enc,
    }).encode("utf-8")

    try:
        publisher.publish(topic_path, data=message_data)
    except Exception:
        job_ref.update({
            "status": "failed",
            "error": "Failed to queue job. Please try again.",
            "updatedAt": utc_now(),
        })
        raise

    return job_ref.id, jobs_today_after


def verify_firebase_token(token: str) -> dict | None:
    """Verify a Firebase Auth ID token and return the decoded claims."""
    try:
        claims = google_id_token.verify_firebase_token(
            token,
            google_requests.Request(),
            audience=PROJECT_ID,
        )
        return claims
    except Exception:
        return None


def extract_user_id(claims: dict) -> str | None:
    """Extract the Firebase user id from decoded token claims."""
    user_id = claims.get("uid") or claims.get("user_id") or claims.get("sub")
    if isinstance(user_id, str) and user_id.strip():
        return user_id
    return None


def cors_headers(origin: str) -> dict:
    """Return CORS headers if origin is allowed."""
    if origin in ALLOWED_ORIGINS:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
        }
    return {}


@functions_framework.http
def create_job(request: Request):
    """HTTP Cloud Function entry point."""
    origin = request.headers.get("Origin", "")
    headers = cors_headers(origin)

    # Handle CORS preflight
    if request.method == "OPTIONS":
        return ("", 204, headers)

    if request.method != "POST":
        return (jsonify({"error": "Method not allowed"}), 405, headers)

    # Verify auth token
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return (jsonify({"error": "Missing authorization token"}), 401, headers)

    token = auth_header.split("Bearer ")[1]
    claims = verify_firebase_token(token)
    if not claims:
        return (jsonify({"error": "Invalid or expired token"}), 401, headers)

    user_id = extract_user_id(claims)
    if not user_id:
        return (jsonify({"error": "Invalid token payload"}), 401, headers)

    # Parse request body
    body = request.get_json(silent=True)
    if not body:
        return (jsonify({"error": "Missing request body"}), 400, headers)

    action = body.get("action", "create_job")

    access_record = get_access_record(user_id)
    access_payload = build_access_payload(access_record, user_id)

    if action == "access_status":
        return (jsonify(access_payload), 200, headers)

    if action == "save_key":
        api_key = (body.get("geminiApiKey") or "").strip()
        if not api_key:
            return (jsonify({"error": "Missing geminiApiKey"}), 400, headers)
        try:
            save_user_key(user_id, api_key)
            return (jsonify({"status": "saved"}), 200, headers)
        except Exception:
            return (jsonify({"error": "Failed to save API key"}), 500, headers)

    agent_type = body.get("agentType", "shopping").strip()
    user_query = body.get("query", "").strip()
    country = body.get("country", "India").strip()

    if not user_query:
        return (jsonify({"error": "Missing 'query' field"}), 400, headers)

    if access_payload["status"] == ACCESS_NONE:
        return (
            jsonify({
                "error": "Join the waitlist to request access.",
                "code": "NOT_ON_WAITLIST",
                "access": access_payload,
            }),
            403,
            headers,
        )

    if access_payload["status"] != ACCESS_ALLOWED:
        code = "WAITLISTED" if access_payload["status"] == ACCESS_WAITLISTED else "ACCESS_BLOCKED"
        return (
            jsonify({
                "error": access_payload["message"],
                "code": code,
                "access": access_payload,
            }),
            403,
            headers,
        )

    if access_payload["remainingToday"] <= 0:
        return (
            jsonify({
                "error": "Daily limit reached. Maximum 3 jobs per day.",
                "code": "DAILY_LIMIT_EXCEEDED",
                "access": access_payload,
            }),
            429,
            headers,
        )

    user_key_enc = get_user_key(user_id)
    daily_limit = max(1, as_int((access_record or {}).get("dailyLimit"), DAILY_JOB_LIMIT))

    try:
        job_id, jobs_today_after = create_job_and_increment_usage(
            user_id=user_id,
            agent_type=agent_type,
            user_query=user_query,
            country=country,
            user_key_enc=user_key_enc,
            daily_limit=daily_limit,
        )
    except DailyLimitExceededError:
        latest_access = build_access_payload(access_record, user_id)
        return (
            jsonify({
                "error": "Daily limit reached. Maximum 3 jobs per day.",
                "code": "DAILY_LIMIT_EXCEEDED",
                "access": latest_access,
            }),
            429,
            headers,
        )
    except Exception:
        return (jsonify({"error": "Failed to create job"}), 500, headers)

    return (
        jsonify({
            "jobId": job_id,
            "jobsToday": jobs_today_after,
            "dailyLimit": daily_limit,
            "remainingToday": max(0, daily_limit - jobs_today_after),
        }),
        200,
        headers,
    )


def _fernet() -> Fernet:
    if not CREDENTIAL_SECRET:
        raise RuntimeError("CREDENTIAL_SECRET is not configured")
    digest = hashlib.sha256(CREDENTIAL_SECRET.encode("utf-8")).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_key(api_key: str) -> str:
    return _fernet().encrypt(api_key.encode("utf-8")).decode("utf-8")


def decrypt_key(ciphertext: str) -> str:
    return _fernet().decrypt(ciphertext.encode("utf-8")).decode("utf-8")


def get_user_key(user_id: str) -> str | None:
    doc = db.collection("user_settings").document(user_id).get()
    if not doc.exists:
        return None
    data = doc.to_dict() or {}
    return data.get("geminiKeyEnc")


def save_user_key(user_id: str, api_key: str) -> None:
    enc = encrypt_key(api_key)
    db.collection("user_settings").document(user_id).set(
        {"geminiKeyEnc": enc, "updatedAt": utc_now()},
        merge=True,
    )
