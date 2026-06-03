"""
NestJS-inspired structured terminal logging for CareHomeOS.

Output format (mirrors CareOrchestrator/NestJS Logger):

  [CareHomeOS]  1234  - 24/5/2026, 10:23:45 AM      LOG [Bootstrap] Starting CareHomeOS API...
  [CareHomeOS]  1234  - 24/5/2026, 10:24:02 AM      LOG [HTTP] POST /api/v1/shift-notes  201  +842ms  (auth0|abc123)
  [CareHomeOS]  1234  - 24/5/2026, 10:24:03 AM      LOG [AuditLog] POST /api/v1/residents → 201  (user=auth0|abc123  ip=::1)
  [CareHomeOS]  1234  - 24/5/2026, 10:24:04 AM      LOG [AuthService] JWT auth: sub=auth0|abc123 email=manager@oakfield.local role=care_home_admin care_home_id=home-oakfield
  [CareHomeOS]  1234  - 24/5/2026, 10:24:05 AM     WARN [RateLimit] IP 10.0.0.1 approaching limit
  [CareHomeOS]  1234  - 24/5/2026, 10:24:06 AM    ERROR [ExceptionHandler] Unhandled: ValueError

Level column is right-justified in 7 characters:
     LOG (green)  WARN (yellow)  ERROR (red)  DEBUG (magenta)  VERBOSE (cyan)  FATAL (bold red)
"""
from __future__ import annotations

import logging
import os
import sys

# ── ANSI colour helpers ───────────────────────────────────────────────────────

_IS_TTY: bool = (
    hasattr(sys.stdout, "isatty") and sys.stdout.isatty()
    or os.environ.get("FORCE_COLOR", "").lower() in ("1", "true", "yes")
)


def _c(code: str) -> str:
    return code if _IS_TTY else ""


# Base colours
_RESET   = _c("\033[0m")
_BOLD    = _c("\033[1m")
_DIM     = _c("\033[2m")
_GREEN   = _c("\033[32m")
_YELLOW  = _c("\033[33m")
_RED     = _c("\033[31m")
_MAGENTA = _c("\033[35m")
_CYAN    = _c("\033[36m")
_WHITE   = _c("\033[97m")
_GREY    = _c("\033[90m")

# HTTP method colours
_METHOD_COLOURS: dict[str, str] = {
    "GET":     _c("\033[32m"),   # green
    "HEAD":    _c("\033[32m"),
    "POST":    _c("\033[34m"),   # blue
    "PUT":     _c("\033[33m"),   # yellow
    "PATCH":   _c("\033[33m"),
    "DELETE":  _c("\033[31m"),   # red
    "OPTIONS": _c("\033[90m"),   # grey
}

# NestJS level names → (display_name, colour)
_LEVEL_STYLES: dict[int, tuple[str, str]] = {
    logging.DEBUG:    ("DEBUG",   _MAGENTA),
    5:                ("VERBOSE", _CYAN),     # custom VERBOSE level (< DEBUG)
    logging.INFO:     ("LOG",     _GREEN),
    logging.WARNING:  ("WARN",    _YELLOW),
    logging.ERROR:    ("ERROR",   _RED),
    logging.CRITICAL: ("FATAL",   _RED + _BOLD),
}

# ── Logger-name → NestJS context label ───────────────────────────────────────

_CONTEXT_MAP: dict[str, str] = {
    "__main__":                                "Bootstrap",
    "app.main":                                "Bootstrap",
    "app.db":                                  "Database",
    "app.config":                              "Config",
    "app.middleware.request_log":              "HTTP",
    "app.middleware.audit_log":                "AuditLog",
    "app.middleware.auth":                     "AuthService",
    "app.middleware.rate_limit":               "RateLimit",
    "app.services.auth":                       "AuthService",
    "app.services.transcriber":                "Transcriber",
    "app.services.llm_router":                 "LLMRouter",
    "app.services.cqc_pipeline":               "CQCPipeline",
    "app.services.runtime_status":             "HealthCheck",
    # Routers
    "app.routers.auth":                        "AuthRouter",
    "app.routers.residents":                   "ResidentsRouter",
    "app.routers.staff":                       "StaffRouter",
    "app.routers.incidents":                   "IncidentsRouter",
    "app.routers.mar":                         "EMarRouter",
    "app.routers.shift_notes":                 "ShiftNotesRouter",
    "app.routers.cqc":                         "CQCRouter",
    "app.routers.rota":                        "RotaRouter",
    "app.routers.billing":                     "BillingRouter",
    "app.routers.reports":                     "ReportsRouter",
    "app.routers.admin":                       "AdminRouter",
    "app.routers.clinical":                    "ClinicalRouter",
    "app.routers.clinical.vitals":             "VitalsRouter",
    "app.routers.clinical.fluids":             "FluidsRouter",
    "app.routers.clinical.wounds":             "WoundsRouter",
    "app.routers.clinical.nutrition":          "NutritionRouter",
    "app.routers.clinical.eol":                "EoLRouter",
    "app.routers.clinical.catheter_stoma":     "CatheterRouter",
    "app.routers.onboarding":                  "OnboardingRouter",
    "app.routers.webhooks":                    "WebhooksRouter",
    "app.routers.developer":                   "DeveloperRouter",
    "app.routers.registry":                    "RouterExplorer",
    # Third-party
    "uvicorn":                                 "Uvicorn",
    "uvicorn.error":                           "Uvicorn",
    "uvicorn.access":                          "HTTP",
    "sqlalchemy.engine":                       "Database",
    "sqlalchemy.engine.Engine":                "Database",
    "sqlalchemy.pool":                         "DBPool",
    "httpx":                                   "HTTPClient",
    "httpcore":                                "HTTPClient",
    "boto3":                                   "AWS",
    "botocore":                                "AWS",
}


def _resolve_context(name: str) -> str:
    """Derive the NestJS-style [Context] label from a Python logger name."""
    if not name:
        return "App"
    if name in _CONTEXT_MAP:
        return _CONTEXT_MAP[name]
    # Walk up the hierarchy for a prefix match
    parts = name.split(".")
    for i in range(len(parts), 0, -1):
        candidate = ".".join(parts[:i])
        if candidate in _CONTEXT_MAP:
            return _CONTEXT_MAP[candidate]
    # Fallback: PascalCase the last segment
    last = parts[-1]
    return "".join(w.capitalize() for w in last.replace("-", "_").split("_"))


# ── Status / duration colour helpers ─────────────────────────────────────────

def _status_colour(status: int) -> str:
    if status < 300:
        return _GREEN
    if status < 400:
        return _CYAN
    if status < 500:
        return _YELLOW
    return _RED


def _duration_colour(ms: float) -> str:
    if ms < 100:
        return _GREEN
    if ms < 1000:
        return _YELLOW
    return _RED


# ── NestJS formatter ──────────────────────────────────────────────────────────

class NestFormatter(logging.Formatter):
    """
    Formats every LogRecord as a NestJS-style terminal line.

    Callers can inject the display context via the record extra:
        logger.info("msg", extra={"context": "MyModule"})
    """

    _APP_LABEL = f"{_GREEN}{_BOLD}[CareHomeOS]{_RESET}"

    @staticmethod
    def _timestamp(record: logging.LogRecord) -> str:
        from datetime import datetime as _dt
        now = _dt.fromtimestamp(record.created)
        h12 = now.hour % 12 or 12
        ampm = "AM" if now.hour < 12 else "PM"
        return (
            f"{now.day}/{now.month}/{now.year}, "
            f"{h12}:{now.minute:02d}:{now.second:02d} {ampm}"
        )

    def format(self, record: logging.LogRecord) -> str:
        # Level
        level_num = record.levelno
        if level_num < logging.DEBUG:
            level_num = 5
        nest_label, level_col = _LEVEL_STYLES.get(
            level_num,
            _LEVEL_STYLES[logging.INFO],
        )
        level_str = f"{level_col}{nest_label:>7}{_RESET}"

        # Context
        raw_context = getattr(record, "context", None) or _resolve_context(record.name)
        ctx_str = f"{_YELLOW}[{raw_context}]{_RESET}"

        # PID
        pid_str = f"{_DIM}{record.process}{_RESET}"

        # Timestamp
        ts_str = f"{_DIM}{self._timestamp(record)}{_RESET}"

        # Message
        msg = record.getMessage()
        if level_num >= logging.ERROR:
            msg_str = f"{_RED}{msg}{_RESET}"
        elif level_num == logging.WARNING:
            msg_str = f"{_YELLOW}{msg}{_RESET}"
        else:
            msg_str = msg

        # Exception traceback (if present)
        exc_text = ""
        if record.exc_info and record.exc_info[0] is not None:
            raw = self.formatException(record.exc_info)
            if _IS_TTY:
                exc_text = f"\n{_RED}{_DIM}{raw}{_RESET}"
            else:
                exc_text = f"\n{raw}"

        return (
            f"{self._APP_LABEL}  {pid_str}  - {ts_str}  "
            f"{level_str} {ctx_str} {msg_str}{exc_text}"
        )


# ── Structured HTTP log line ──────────────────────────────────────────────────

_http_logger = logging.getLogger("app.http")


def log_http(
    method: str,
    path: str,
    status: int,
    duration_ms: float,
    user_id: str = "",
) -> None:
    """
    Emit a NestJS-style HTTP access line.

    Colour scheme:
      method  — per-verb colour (GET=green, POST=blue, DELETE=red, …)
      status  — 2xx green | 3xx cyan | 4xx yellow | 5xx red
      +Xms    — green <100ms | yellow <1000ms | red ≥1000ms
    """
    m_col = _METHOD_COLOURS.get(method.upper(), "")
    s_col = _status_colour(status)
    d_col = _duration_colour(duration_ms)
    d_label = (
        f"{d_col}+{int(duration_ms)}ms{_RESET}"
        if duration_ms < 10_000
        else f"{d_col}+{duration_ms / 1000:.1f}s{_RESET}"
    )
    user_part = f"  {_DIM}({user_id}){_RESET}" if user_id and user_id != "anonymous" else ""

    msg = (
        f"{m_col}{method:<7}{_RESET}"
        f"{_WHITE}{path}{_RESET}"
        f"  {s_col}{status}{_RESET}"
        f"  {d_label}"
        f"{user_part}"
    )

    level = (
        logging.ERROR   if status >= 500 else
        logging.WARNING if status >= 400 else
        logging.INFO
    )
    _http_logger.log(level, msg, extra={"context": "HTTP"})


def log_audit(
    method: str,
    path: str,
    status: int,
    user_id: str = "anonymous",
    ip: str = "unknown",
) -> None:
    """
    Emit a NestJS-style audit line:
      GET /api/v1/residents → 200  (user=auth0|abc  ip=::1)
    """
    _audit_logger = logging.getLogger("app.middleware.audit_log")
    s_col = _status_colour(status)
    _audit_logger.info(
        "%s %s → %s%d%s  (user=%s  ip=%s)",
        method,
        path,
        s_col, status, _RESET,
        user_id,
        ip,
        extra={"context": "AuditLog"},
    )


def log_auth(
    sub: str,
    email: str,
    role: str,
    care_home_id: str = "",
    care_home_name: str = "",
) -> None:
    """
    Emit a NestJS-style AuthService line:
      JWT auth: sub=auth0|abc email=manager@oakfield.local role=care_home_admin care_home_id=home-oakfield
    """
    _auth_logger = logging.getLogger("app.middleware.auth")
    parts = [f"sub={sub}", f"email={email}", f"role={role}"]
    if care_home_id:
        parts.append(f"care_home_id={care_home_id}")
    if care_home_name:
        parts.append(f"care_home_name={care_home_name}")
    _auth_logger.info(
        "JWT auth: %s",
        " ".join(parts),
        extra={"context": "AuthService"},
    )


# ── setup_logging ─────────────────────────────────────────────────────────────

def setup_logging(debug: bool = False) -> None:
    """
    Install NestJS-style formatting on the root logger and tune noisy libraries.
    Call once, before any other import that might call logging.basicConfig().
    """
    level = logging.DEBUG if debug else logging.INFO

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(NestFormatter())
    handler.setLevel(level)

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)

    # Suppress uvicorn's own access log (we emit [HTTP] lines ourselves)
    logging.getLogger("uvicorn.access").setLevel(logging.CRITICAL)
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)

    # SQLAlchemy — only show queries in debug mode
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if debug else logging.WARNING
    )
    logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.dialects").setLevel(logging.WARNING)

    # httpx / httpcore are very chatty at INFO
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    # boto3 / botocore / urllib3 spam
    logging.getLogger("boto3").setLevel(logging.WARNING)
    logging.getLogger("botocore").setLevel(logging.WARNING)
    logging.getLogger("s3transfer").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
