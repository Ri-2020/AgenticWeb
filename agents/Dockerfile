FROM python:3.12-slim

WORKDIR /app

# System build deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install --no-cache-dir uv

# Copy dependency files first (layer cache)
COPY pyproject.toml uv.lock ./

# Copy source so uv can build the local package
COPY src/ ./src/

# Sync exact versions from lock file into a venv at /app/.venv
# --extra cloud pulls in gunicorn + firestore
# --no-dev skips dev-only dependencies
RUN uv sync --frozen --no-dev --extra cloud

# Copy knowledge files (crewAI agent knowledge bases)
COPY knowledge/ ./knowledge/

ENV PYTHONUNBUFFERED=1
ENV PORT=8080
# Put the venv on PATH so gunicorn/python resolve to it
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8080

# Use gunicorn + uvicorn worker — more robust than bare python -m uvicorn.
# --workers 1  : single worker (Cloud Run scales via instances, not workers)
# --timeout 600: match Cloud Run's request timeout
# --graceful-timeout 30: clean shutdown window before SIGKILL
CMD ["gunicorn", "agents.shared.api:app", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--workers", "1", \
     "--bind", "0.0.0.0:8080", \
     "--timeout", "600", \
     "--graceful-timeout", "30", \
     "--log-level", "info"]
