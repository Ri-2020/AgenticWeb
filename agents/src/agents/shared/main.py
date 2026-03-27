"""CLI entry points for the agent platform."""

from __future__ import annotations

import json
import sys


def run() -> None:
    """Interactive run — pick an agent and provide inputs."""
    from agents.router import get_all_agents, get_agent_info
    from agents.shared.runtime import run_agent

    agents = get_all_agents()
    print("Available agents:")
    for i, (aid, meta) in enumerate(agents.items()):
        print(f"  [{i + 1}] {meta['name']} — {meta['description']}")

    choice = input("\nSelect agent number: ").strip()
    agent_id = list(agents.keys())[int(choice) - 1]
    info = get_agent_info(agent_id)
    meta = info["metadata"]

    inputs = {}
    for field in meta.get("inputFields", []):
        name = field["name"]
        if field.get("type") == "select":
            options = field.get("options", [])
            default = field.get("default", options[0] if options else "")
            val = input(f"{field['label']} ({'/'.join(options)}) [{default}]: ").strip()
            inputs[name] = val or default
        else:
            val = input(f"{field['label']}: ").strip()
            inputs[name] = val

    # Map standard field names to crew input variables
    crew_inputs = {"user_query": inputs.get("query", ""), "country": inputs.get("country", "India")}

    result = run_agent(agent_id, crew_inputs)
    print(json.dumps(result, indent=2))


def serve() -> None:
    from agents.shared.server import main as start_server
    start_server()


def listen() -> None:
    """Start only the Pub/Sub pull listener (no HTTP server)."""
    import os
    os.environ["PUBSUB_LISTEN_MODE"] = "pull"
    serve()


def run_with_trigger() -> None:
    """Run with a JSON trigger payload from the command line."""
    from agents.shared.runtime import process_job_payload

    if len(sys.argv) < 2:
        print("Usage: run_with_trigger '<json>'")
        sys.exit(1)

    payload = json.loads(sys.argv[1])
    result = process_job_payload(payload)
    print(json.dumps(result, indent=2))
