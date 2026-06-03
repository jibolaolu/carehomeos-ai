"""
CareHomeOS local-development auth middleware.

Validates ``local-demo-token:{user_id}`` bearer tokens against DEMO_USERS and
falls back to the default registered-manager stub when no recognised token is
present.

In production this layer would verify Auth0 JWTs and fill scope state with
real claims — the interface (x-user-id header + scope["state"]["user"]) stays
the same.

Scope mutations (in-place, so RequestLogMiddleware sees them in its finally
block):
  • scope["headers"]       — x-user-id injected / replaced
  • scope["state"]["user"] — full user dict for route handlers

Emits one ``[AuthService]`` log line per API request, matching
CareOrchestrator's JWT auth-guard format:

  [CareHomeOS]  PID  - timestamp      LOG [AuthService] JWT auth:
        sub=usr-admin-001 email=manager@oakfield.local
        role=care_home_admin care_home_id=home-oakfield
"""
from __future__ import annotations

import logging
from starlette.types import ASGIApp, Receive, Scope, Send

from app.logging_config import log_auth

_SKIP_PATHS = frozenset({
    "/health", "/ready", "/favicon.ico",
    "/docs", "/redoc", "/openapi.json",
    "/",
})

# ── Default local-dev identity ────────────────────────────────────────────────
_DEFAULT_USER: dict[str, object] = {
    "id": "local-manager",
    "name": "Local Registered Manager",
    "email": "manager@oakfield.local",
    "role": "care_home_admin",
    "care_home_id": "home-oakfield",
    "care_home_name": "Oakfield Care Home",
}

logger = logging.getLogger(__name__)


# ── Token → user resolution ───────────────────────────────────────────────────

def _resolve_user(headers: list[tuple[bytes, bytes]]) -> dict[str, object]:
    """
    Return a DEMO_USERS entry matched by the bearer token, or _DEFAULT_USER.

    Supported token forms:
      • ``local-demo-token:{user_id}``  — issued by /auth/login
      • absent / unrecognised          — falls back to default manager
    """
    auth_value = ""
    for name, value in headers:
        if name == b"authorization":
            auth_value = value.decode("utf-8", errors="replace")
            break

    if auth_value.lower().startswith("bearer "):
        token = auth_value[7:].strip()
        if token.startswith("local-demo-token:"):
            user_id = token[len("local-demo-token:"):]
            # Lazy import to avoid circular dependency with demo_data
            from app.demo_data import DEMO_USERS  # noqa: PLC0415
            match = next((u for u in DEMO_USERS if u["id"] == user_id), None)
            if match:
                return match  # type: ignore[return-value]

    return _DEFAULT_USER


# ── Middleware ────────────────────────────────────────────────────────────────

class LocalAuthMiddleware:
    """
    Pure-ASGI middleware — safe with StreamingResponse / SSE.

    Mutates *scope* in-place (not a copy) so that the surrounding
    RequestLogMiddleware sees the injected ``x-user-id`` header when its
    ``finally`` block runs ``_extract_user_id(scope)``.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path: str = scope.get("path", "")

        # ── resolve user from bearer token ────────────────────────────────────
        raw_headers: list[tuple[bytes, bytes]] = list(scope.get("headers", []))
        user = _resolve_user(raw_headers)
        user_id = str(user.get("id", "local-manager"))

        # ── inject x-user-id into scope headers (in-place mutation) ──────────
        # Strip any existing x-user-id then append the resolved one.
        new_headers = [(n, v) for n, v in raw_headers if n != b"x-user-id"]
        new_headers.append((b"x-user-id", user_id.encode()))
        scope["headers"] = new_headers  # type: ignore[assignment]

        # ── store user dict for route handlers via request.state.user ─────────
        state: dict = scope.setdefault("state", {})  # type: ignore[arg-type]
        state["user"] = user

        # ── emit [AuthService] line for API routes ────────────────────────────
        if "/api/" in path and path not in _SKIP_PATHS:
            log_auth(
                sub=user_id,
                email=str(user.get("email", "")),
                role=str(user.get("role", "")),
                care_home_id=str(user.get("care_home_id") or ""),
                care_home_name=str(user.get("care_home_name") or ""),
            )

        await self.app(scope, receive, send)
