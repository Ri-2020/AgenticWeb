#!/usr/bin/env python3
"""Register all agents in the Firestore `agents` collection.

Usage:
    python register_agents.py
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()

project_id = os.getenv("GCP_PROJECT_ID")

if not project_id:
    print("Error: GCP_PROJECT_ID environment variable not set.")
    sys.exit(1)



# Use service account key if available
key_file = Path(__file__).resolve().parent.parent / "cred_keys" / f"{project_id}-developer.json"
if key_file.exists():
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(key_file)
    print(f"Using service account: {key_file.name}")

from google.cloud import firestore
from agents.router import get_all_agents

db = firestore.Client(project=project_id)
agents = get_all_agents()

if not agents:
    print("No agents found in router.")
    sys.exit(1)

for agent_id, meta in agents.items():
    doc_data = {
        **meta,
        "id": agent_id,
        "updatedAt": datetime.now(timezone.utc),
    }
    db.collection("agents").document(agent_id).set(doc_data, merge=True)
    print(f"  ✓ {agent_id} — {meta['name']}")

print(f"\nRegistered {len(agents)} agent(s) in Firestore `agents` collection.")
