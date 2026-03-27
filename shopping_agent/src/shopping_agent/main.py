#!/usr/bin/env python
import os
import sys
import warnings

from datetime import datetime

from shopping_agent.crew import ShoppingAgent

warnings.filterwarnings("ignore", category=SyntaxWarning, module="pysbd")

# This main file is intended to be a way for you to run your
# crew locally, so refrain from adding unnecessary logic into this file.
# Replace with inputs you want to test with, it will automatically
# interpolate any tasks and agents information

def get_inputs_from_user() -> dict[str, str]:
    """
    Collect shopping inputs from the user via CLI.
    """
    user_query = input("Describe what you need to buy: ").strip()
    country = input("Enter your country: ").strip()
    return {"user_query": user_query, "country": country}


def run():
    """
    Run the crew.
    """
    # inputs = {
    #     "user_query": """
    #     I need a stainless steel water bottle for gym use and a blue yoga mat that is comfortable for floor workouts.
    #     """,
    #     "country": "India"
    #     ""
    # }

    inputs = get_inputs_from_user()

    try:
        ShoppingAgent().crew().kickoff(inputs=inputs)
    except Exception as e:
        raise Exception(f"An error occurred while running the crew: {e}")


def train():
    """
    Train the crew for a given number of iterations.
    """
    inputs = {
        "topic": "AI LLMs",
        'current_year': str(datetime.now().year)
    }
    try:
        ShoppingAgent().crew().train(n_iterations=int(sys.argv[1]), filename=sys.argv[2], inputs=inputs)

    except Exception as e:
        raise Exception(f"An error occurred while training the crew: {e}")

def replay():
    """
    Replay the crew execution from a specific task.
    """
    try:
        ShoppingAgent().crew().replay(task_id=sys.argv[1])

    except Exception as e:
        raise Exception(f"An error occurred while replaying the crew: {e}")

def test():
    """
    Test the crew execution and returns the results.
    """
    inputs = {
        "topic": "AI LLMs",
        "current_year": str(datetime.now().year)
    }

    try:
        ShoppingAgent().crew().test(n_iterations=int(sys.argv[1]), eval_llm=sys.argv[2], inputs=inputs)

    except Exception as e:
        raise Exception(f"An error occurred while testing the crew: {e}")

def serve():
    """Start the FastAPI server."""
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    reload = os.environ.get("UVICORN_RELOAD", "false").strip().lower() in {"1", "true", "yes"}
    uvicorn.run("shopping_agent.api:app", host="0.0.0.0", port=port, reload=reload)


def listen():
    """Start the local Pub/Sub pull listener."""
    from shopping_agent.api import _start_pull_listener

    _start_pull_listener()
    try:
        import time

        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        return


def run_with_trigger():
    """
    Run the crew with trigger payload.
    """
    import json
    from shopping_agent.runtime import process_job_payload

    if len(sys.argv) < 2:
        raise Exception("No trigger payload provided. Please provide JSON payload as argument.")

    try:
        trigger_payload = json.loads(sys.argv[1])
    except json.JSONDecodeError:
        raise Exception("Invalid JSON payload provided as argument")

    try:
        result = process_job_payload(trigger_payload)
        print(json.dumps(result, indent=2))
        return result
    except Exception as e:
        raise Exception(f"An error occurred while running the crew with trigger: {e}")
