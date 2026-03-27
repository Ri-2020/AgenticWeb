"""Uvicorn server launcher."""

import os
import logging

import uvicorn

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")


def main() -> None:
    port = int(os.environ.get("PORT", "8080"))
    uvicorn.run("agents.shared.api:app", host="0.0.0.0", port=port, log_level="info")


if __name__ == "__main__":
    main()
