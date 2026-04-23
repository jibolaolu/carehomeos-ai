from __future__ import annotations

from time import perf_counter

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        started = perf_counter()
        response = await call_next(request)
        response.headers["x-carehomeos-audit-ms"] = str(round((perf_counter() - started) * 1000, 2))
        return response
