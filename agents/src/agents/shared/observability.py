"""Langtrace observability helpers for job-level tracing."""

from __future__ import annotations

import logging
import os
import threading
from typing import Any, Callable, TypeVar

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

T = TypeVar("T")

_langtrace = None
_langtrace_initialized = False
_langtrace_available = False
_with_langtrace_root_span = None
_inject_additional_attributes = None


def init_langtrace() -> bool:
    """Initialize Langtrace once for the current process."""
    global _langtrace, _langtrace_initialized, _langtrace_available, _with_langtrace_root_span, _inject_additional_attributes

    if _langtrace_initialized:
        return _langtrace_available

    _langtrace_initialized = True
    load_dotenv()

    api_key = (os.environ.get("LANGTRACE_API_KEY") or "").strip()
    if not api_key:
        logger.info("Langtrace disabled: LANGTRACE_API_KEY is not set.")
        return False

    try:
        from langtrace_python_sdk import (
            langtrace as sdk_langtrace,
            with_langtrace_root_span as _wlrs,
            inject_additional_attributes as _iaa,
        )
    except Exception:
        logger.warning(
            "Langtrace disabled: langtrace-python-sdk is not installed or failed to import."
        )
        return False

    service_name = (os.environ.get("LANGTRACE_SERVICE_NAME") or "agent-platform").strip()
    api_host = (os.environ.get("LANGTRACE_API_HOST") or "").strip()

    debug_console = os.environ.get("LANGTRACE_CONSOLE_DEBUG", "").strip().lower() in ("1", "true")
    init_kwargs: dict[str, Any] = {
        "api_key": api_key,
        "service_name": service_name,
        "write_spans_to_console": debug_console,
    }
    if api_host:
        init_kwargs["api_host"] = api_host

    timeout_raw = (os.environ.get("LANGTRACE_INIT_TIMEOUT_SECONDS") or "3").strip()
    try:
        timeout_seconds = float(timeout_raw)
    except ValueError:
        timeout_seconds = 3.0
    if timeout_seconds <= 0:
        timeout_seconds = 3.0

    init_error: list[Exception] = []

    def _init_sdk() -> None:
        try:
            sdk_langtrace.init(**init_kwargs)
        except Exception as exc:
            init_error.append(exc)

    init_thread = threading.Thread(target=_init_sdk, name="langtrace-init", daemon=True)
    init_thread.start()
    init_thread.join(timeout=timeout_seconds)

    if init_thread.is_alive():
        logger.warning(
            "Langtrace init timed out after %.1fs; tracing disabled for this process.",
            timeout_seconds,
        )
        return False

    if init_error:
        logger.warning("Langtrace init failed; tracing disabled.", exc_info=init_error[0])
        return False

    _langtrace = sdk_langtrace
    _with_langtrace_root_span = _wlrs
    _inject_additional_attributes = _iaa
    _langtrace_available = True
    logger.info("Langtrace enabled for service '%s'.", service_name)
    return True


def run_with_job_trace(
    *,
    span_name: str,
    attributes: dict[str, Any] | None,
    fn: Callable[[], T],
    session_id: str | None = None,
) -> T:
    """Execute ``fn`` under a Langtrace root span when Langtrace is available."""
    if not _langtrace_available or _langtrace is None:
        return fn()

    safe_attributes: dict[str, str | int | float | bool] = {}
    for key, value in (attributes or {}).items():
        if value is None:
            continue
        if isinstance(value, (str, int, float, bool)):
            safe_attributes[key] = value
        else:
            safe_attributes[key] = str(value)

    # Set session ID via env var — the SDK reads it when the root span opens.
    prev_session_id = os.environ.get("LANGTRACE_SESSION_ID")
    if session_id:
        os.environ["LANGTRACE_SESSION_ID"] = session_id

    try:
        @_with_langtrace_root_span(name=span_name)
        def _wrapped() -> T:
            if safe_attributes:
                return _inject_additional_attributes(fn, safe_attributes)
            return fn()

        return _wrapped()
    finally:
        if session_id:
            if prev_session_id is not None:
                os.environ["LANGTRACE_SESSION_ID"] = prev_session_id
            else:
                os.environ.pop("LANGTRACE_SESSION_ID", None)
