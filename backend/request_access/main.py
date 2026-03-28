"""Cloud Function: request_access

Handles two flows:
1) POST (from frontend) — waitlisted user joins the waitlist, admin gets a Telegram
   notification with a one-click approve link.
2) GET  ?action=approve&uid=...&token=... (from Telegram link) — admin approves user.
"""

import hashlib
import hmac
import json
import os
import urllib.request
from datetime import datetime, timezone
from typing import Any

import functions_framework
from flask import Request, jsonify
from google.cloud import firestore
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "")
GCP_REGION = os.environ.get("GCP_REGION", "asia-south1")
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
USER_ACCESS_COLLECTION = os.environ.get("USER_ACCESS_COLLECTION", "user_access")

db = firestore.Client(project=PROJECT_ID)

ACCESS_WAITLISTED = "waitlisted"
KNOWN_ACCESS_STATUSES = {"allowed", "waitlisted", "blocked"}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_utc(dt: datetime | None) -> str | None:
    if not isinstance(dt, datetime):
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def normalize_access_status(value: Any) -> str:
    status = str(value or ACCESS_WAITLISTED).strip().lower()
    return status if status in KNOWN_ACCESS_STATUSES else ACCESS_WAITLISTED


def claims_profile(claims: dict) -> dict[str, str]:
    return {
        "email": str(claims.get("email") or "").strip(),
        "displayName": str(claims.get("name") or "").strip(),
    }


def verify_firebase_token(token: str) -> dict | None:
    try:
        return google_id_token.verify_firebase_token(
            token,
            google_requests.Request(),
            audience=PROJECT_ID,
        )
    except Exception:
        return None


def extract_user_id(claims: dict) -> str | None:
    user_id = claims.get("uid") or claims.get("user_id") or claims.get("sub")
    return user_id if isinstance(user_id, str) and user_id.strip() else None


def cors_headers(origin: str) -> dict:
    if origin in ALLOWED_ORIGINS:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
        }
    return {}


def admin_token_for(user_id: str) -> str:
    """Derive a per-user HMAC token from the Telegram bot token. Only the admin can
    produce or verify these because only the admin knows the bot token."""
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    return hmac.new(bot_token.encode(), user_id.encode(), hashlib.sha256).hexdigest()[:24]


def approve_url(user_id: str) -> str:
    """Build the one-click approve URL for the Telegram message."""
    base = f"https://{GCP_REGION}-{PROJECT_ID}.cloudfunctions.net/request_access"
    token = admin_token_for(user_id)
    return f"{base}?action=approve&uid={user_id}&token={token}"


def handle_approve(request: Request):
    """GET handler: admin clicks the approve link from Telegram."""
    uid = request.args.get("uid", "").strip()
    token = request.args.get("token", "").strip()

    if not uid or not token:
        return ("Missing uid or token.", 400)

    expected = admin_token_for(uid)
    if not hmac.compare_digest(token, expected):
        return ("Invalid token.", 403)

    ref = db.collection(USER_ACCESS_COLLECTION).document(uid)
    snap = ref.get()
    if not snap.exists:
        return ("User not found.", 404)

    data = snap.to_dict() or {}
    if data.get("status") == "allowed":
        name = data.get("displayName") or data.get("email") or uid
        return (f"<html><body style='font-family:system-ui;padding:2rem'>"
                f"<h2>Already approved</h2><p>{name} already has access.</p></body></html>",
                200, {"Content-Type": "text/html"})

    now = utc_now()
    ref.set({"status": "allowed", "allowedAt": now, "updatedAt": now}, merge=True)

    name = data.get("displayName") or data.get("email") or uid
    return (f"<html><body style='font-family:system-ui;padding:2rem'>"
            f"<h2>Approved &#10003;</h2><p>{name} now has access to AgentHub.</p></body></html>",
            200, {"Content-Type": "text/html"})


def send_telegram_notification(user_id: str, profile: dict, requested_at: datetime) -> None:
    """Send a Telegram message to the admin when a user requests access."""
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "")

    if not bot_token or not chat_id:
        return  # Telegram not configured — skip silently

    name = profile.get("displayName") or "N/A"
    email = profile.get("email") or "N/A"
    link = approve_url(user_id)
    text = (
        f"🔔 *New AgentHub Waitlist Request*\n\n"
        f"*Name:* {name}\n"
        f"*Email:* {email}\n"
        f"*User ID:* `{user_id}`\n"
        f"*Requested:* {iso_utc(requested_at)}\n\n"
        f"[✅ Tap here to approve]({link})"
    )

    payload = json.dumps({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown",
        "disable_web_page_preview": True,
    }).encode("utf-8")

    req = urllib.request.Request(
        f"https://api.telegram.org/bot{bot_token}/sendMessage",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    urllib.request.urlopen(req, timeout=10)


@functions_framework.http
def request_access(request: Request):
    """HTTP Cloud Function entry point."""
    # GET with action=approve → admin one-click approve from Telegram
    if request.method == "GET" and request.args.get("action") == "approve":
        return handle_approve(request)

    origin = request.headers.get("Origin", "")
    headers = cors_headers(origin)

    if request.method == "OPTIONS":
        return ("", 204, headers)

    if request.method != "POST":
        return (jsonify({"error": "Method not allowed"}), 405, headers)

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

    ref = db.collection(USER_ACCESS_COLLECTION).document(user_id)
    snap = ref.get()

    if snap.exists:
        data = snap.to_dict() or {}
        status = normalize_access_status(data.get("status"))
        if status == "allowed":
            return (jsonify({"status": "allowed", "message": "You already have access."}), 200, headers)
        # Already on waitlist — no duplicate notification
        return (
            jsonify({
                "status": "already_waitlisted",
                "message": "You're already on the waitlist. We'll notify you once approved.",
                "waitlistedAt": iso_utc(data.get("waitlistedAt")),
            }),
            200,
            headers,
        )

    # New user joining the waitlist
    now = utc_now()
    profile = claims_profile(claims)
    ref.set({
        "userId": user_id,
        "status": ACCESS_WAITLISTED,
        "email": profile["email"],
        "displayName": profile["displayName"],
        "waitlistedAt": now,
        "createdAt": now,
        "updatedAt": now,
    })

    try:
        send_telegram_notification(user_id, profile, now)
    except Exception:
        pass  # Don't fail the request if Telegram fails

    return (
        jsonify({
            "status": "waitlisted",
            "message": "You've joined the waitlist! We'll notify you once approved.",
            "waitlistedAt": iso_utc(now),
        }),
        200,
        headers,
    )
