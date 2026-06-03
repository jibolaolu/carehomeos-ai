"""
CareHomeOS HTTP access + audit logging middleware.

Mirrors CareOrchestrator's RequestTimingMiddleware + AuditLogMiddleware pattern.
Pure-ASGI (no BaseHTTPMiddleware) so it is safe with StreamingResponse / SSE.

Emits two lines per API request:

  [CareHomeOS]  1234  - 24/5/2026, 10:24:02 AM      LOG [HTTP]     GET    /api/v1/residents  200  +38ms  (auth0|abc123)
  [CareHomeOS]  1234  - 24/5/2026, 10:24:02 AM      LOG [AuditLog] GET /api/v1/residents → 200  (user=auth0|abc123  ip=::1)
"""
from __future__ import annotations

import asyncio
import json
import time
from starlette.types import ASGIApp, Receive, Scope, Send

from app.logging_config import log_http, log_audit

# Paths that produce noise with no diagnostic value
_SKIP_PATHS = frozenset({
    "/health", "/ready", "/favicon.ico",
    "/docs", "/redoc", "/openapi.json",
})

# Sensitive body keys to redact from POST/PATCH logs
_SENSITIVE_KEYS = frozenset({
    "password", "token", "secret", "access_token", "refresh_token",
})


def _extract_user_id(scope: Scope) -> str:
    """Best-effort user identifier from request headers."""
    headers: list[tuple[bytes, bytes]] = scope.get("headers", [])
    # Prefer explicit x-user-id header
    for name, value in headers:
        if name == b"x-user-id":
            return value.decode("utf-8", errors="replace")
    # Fall back to JWT sub claim
    auth = ""
    for name, value in headers:
        if name == b"authorization":
            auth = value.decode("utf-8", errors="replace")
            break
    if auth.lower().startswith("bearer "):
        token = auth[7:].strip()
        if token and token not in ("dev-token", "local-dev"):
            try:
                import base64
                payload_b64 = token.split(".")[1]
                padding = "=" * (-len(payload_b64) % 4)
                payload = json.loads(base64.urlsafe_b64decode(payload_b64 + padding))
                sub = payload.get("sub") or payload.get("email") or ""
                if isinstance(sub, str) and sub.strip():
                    return sub.strip()[:64]
            except Exception:
                pass
    return "anonymous"


def _extract_ip(scope: Scope) -> str:
    client = scope.get("client")
    if client:
        return client[0]
    headers: list[tuple[bytes, bytes]] = scope.get("headers", [])
    for name, value in headers:
        if name in (b"x-forwarded-for", b"x-real-ip"):
            return value.decode("utf-8", errors="replace").split(",")[0].strip()
    return "unknown"


class RequestLogMiddleware:
    """
    Pure-ASGI middleware that emits:
      - [HTTP]     line — method, path, status, duration, user
      - [AuditLog] line — method, path, status, user, ip

    Applied as the outermost middleware so it wraps all routes including CORS.
    """

    def __init__(self, app: ASGIApp, is_production: bool = False) -> None:
        self.app = app
        self.is_production = is_production

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")

        if path in _SKIP_PATHS:
            await self.app(scope, receive, send)
            return

        method: str = scope.get("method", "?")
        qs: str = scope.get("query_string", b"").decode("utf-8", errors="replace")
        full_path = f"{path}?{qs}" if qs else path
        if len(full_path) > 140:
            full_path = full_path[:137] + "…"

        status_code: list[int] = [200]
        started_at = time.perf_counter()

        async def send_wrapper(message: dict) -> None:
            if message["type"] == "http.response.start":
                status_code[0] = message.get("status", 200)
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except (asyncio.CancelledError, KeyboardInterrupt):
            return
        finally:
            if status_code[0] == 0:
                return
            duration_ms = (time.perf_counter() - started_at) * 1000
            user_id = _extract_user_id(scope)
            ip = _extract_ip(scope)

            # ── [HTTP] line (every request) ───────────────────────────────────
            log_http(method, full_path, status_code[0], duration_ms, user_id)

            # ── [AuditLog] line (API routes only) ────────────────────────────
            if "/api/" in path:
                log_audit(method, path, status_code[0], user_id, ip)
