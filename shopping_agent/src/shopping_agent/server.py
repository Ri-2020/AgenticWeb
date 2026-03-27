"""Compatibility wrapper for the shopping agent FastAPI app."""

from shopping_agent.api import app


if __name__ == "__main__":
    import os

    import uvicorn

    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("shopping_agent.api:app", host="0.0.0.0", port=port)
