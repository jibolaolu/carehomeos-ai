#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT_DIR/.env"
ENV_EXAMPLE="$ROOT_DIR/.env.example"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
BACKEND_DIR="$ROOT_DIR/backend"
DASHBOARD_DIR="$ROOT_DIR/dashboard"
MOBILE_DIR="$ROOT_DIR/mobile"
FAMILY_APP_DIR="$ROOT_DIR/family-app"
BACKEND_VENV="$BACKEND_DIR/venv"
BACKEND_PYTHON=""
BACKEND_REQUIREMENTS="$BACKEND_DIR/requirements.txt"
BACKEND_REQUIREMENTS_STAMP="$BACKEND_VENV/.requirements.sha256"
DOCKER_COMPOSE_CMD=""
API_PORT="${CAREHOMEOS_API_PORT:-8105}"
WEB_PORT="${CAREHOMEOS_DASHBOARD_PORT:-3105}"
MOBILE_WEB_PORT="${CAREHOMEOS_MOBILE_WEB_PORT:-19015}"
FAMILY_WEB_PORT="${CAREHOMEOS_FAMILY_WEB_PORT:-19016}"
API_PID=""
WEB_PID=""
MOBILE_PID=""
FAMILY_PID=""
DASHBOARD_API_URL="${NEXT_PUBLIC_API_BASE_URL:-https://carehomeos-api.localtest.me}"
EXPO_API_URL="${EXPO_PUBLIC_API_URL:-https://carehomeos-api.localtest.me}"

log() {
  printf '[run-local] %s\n' "$1"
}

fail() {
  printf '[run-local] ERROR: %s\n' "$1" >&2
  exit 1
}

cleanup() {
  if [ -n "$API_PID" ] && kill -0 "$API_PID" >/dev/null 2>&1; then
    kill "$API_PID" >/dev/null 2>&1 || true
  fi

  if [ -n "$WEB_PID" ] && kill -0 "$WEB_PID" >/dev/null 2>&1; then
    kill "$WEB_PID" >/dev/null 2>&1 || true
  fi

  if [ -n "$MOBILE_PID" ] && kill -0 "$MOBILE_PID" >/dev/null 2>&1; then
    kill "$MOBILE_PID" >/dev/null 2>&1 || true
  fi

  if [ -n "$FAMILY_PID" ] && kill -0 "$FAMILY_PID" >/dev/null 2>&1; then
    kill "$FAMILY_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "Required command not found: $1"
  fi
}

python_cmd() {
  if command -v python3 >/dev/null 2>&1; then
    echo "python3"
    return 0
  fi
  if command -v python >/dev/null 2>&1; then
    echo "python"
    return 0
  fi
  fail "Required command not found: python3 or python"
}

requirements_fingerprint() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$BACKEND_REQUIREMENTS" | awk '{print $1}'
    return 0
  fi

  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$BACKEND_REQUIREMENTS" | awk '{print $1}'
    return 0
  fi

  cksum "$BACKEND_REQUIREMENTS" | awk '{print $1 "-" $2}'
}

resolve_backend_venv_tools() {
  local candidate
  for candidate in \
    "$BACKEND_VENV/bin/python" \
    "$BACKEND_VENV/bin/python3" \
    "$BACKEND_VENV/Scripts/python.exe" \
    "$BACKEND_VENV/Scripts/python"; do
    if [ -x "$candidate" ] && "$candidate" -c "import sys; print(sys.executable)" >/dev/null 2>&1; then
      BACKEND_PYTHON="$candidate"
      return 0
    fi
  done

  return 1
}

ensure_env_file() {
  if [ ! -f "$ENV_FILE" ]; then
    if [ ! -f "$ENV_EXAMPLE" ]; then
      fail "Missing .env.example"
    fi

    cp "$ENV_EXAMPLE" "$ENV_FILE"
    log "Created .env from .env.example"
  fi
}

load_env_file() {
  if [ ! -f "$ENV_FILE" ]; then
    return
  fi

  while IFS= read -r line || [ -n "$line" ]; do
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    if [ -z "$line" ] || [ "${line#\#}" != "$line" ] || [ "${line#*=}" = "$line" ]; then
      continue
    fi

    name="${line%%=*}"
    value="${line#*=}"
    name="${name%"${name##*[![:space:]]}"}"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    if [ "${value#\"}" != "$value" ] && [ "${value%\"}" != "$value" ]; then
      value="${value#\"}"
      value="${value%\"}"
    elif [ "${value#\'}" != "$value" ] && [ "${value%\'}" != "$value" ]; then
      value="${value#\'}"
      value="${value%\'}"
    fi

    export "$name=$value"
  done < "$ENV_FILE"
}

ensure_docker_compose() {
  if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
    return
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker-compose"
    return
  fi

  fail "Docker Compose is required. Install Docker Desktop, the docker compose plugin, or docker-compose."
}

ensure_backend_venv() {
  if ! resolve_backend_venv_tools; then
    log "Creating backend virtual environment"
    if [ -d "$BACKEND_VENV" ]; then
      log "Existing backend virtual environment is not runnable; recreating it with copied executables"
      if ! rm -rf "$BACKEND_VENV"; then
        fail "Could not remove backend/venv. If it was created with sudo, run: sudo rm -rf backend/venv"
      fi
    fi
    "$(python_cmd)" -m venv --copies "$BACKEND_VENV"
    resolve_backend_venv_tools || fail "Backend virtual environment was created, but Python executable was not found in bin/ or Scripts/"
  fi
}

ensure_backend_dependencies() {
  if [ -z "$BACKEND_PYTHON" ]; then
    fail "Backend Python executable has not been resolved"
  fi

  local current_fingerprint
  current_fingerprint="$(requirements_fingerprint)"
  if [ -f "$BACKEND_REQUIREMENTS_STAMP" ] && [ "$(cat "$BACKEND_REQUIREMENTS_STAMP")" = "$current_fingerprint" ]; then
    log "Backend dependencies already installed"
    return
  fi

  log "Installing backend dependencies"
  "$BACKEND_PYTHON" -m pip install --upgrade pip --retries 2 --timeout 20 >/dev/null || {
    fail "pip could not reach PyPI. Check WSL DNS/internet, then rerun ./run-local.sh"
  }
  "$BACKEND_PYTHON" -m pip install -r "$BACKEND_REQUIREMENTS" --prefer-binary --retries 2 --timeout 30 || {
    fail "Backend dependency install failed. If you see 'Temporary failure in name resolution', fix WSL DNS/internet and rerun ./run-local.sh"
  }
  printf '%s' "$current_fingerprint" > "$BACKEND_REQUIREMENTS_STAMP"
}

ensure_dashboard_dependencies() {
  if [ ! -d "$DASHBOARD_DIR/node_modules" ] || [ ! -x "$DASHBOARD_DIR/node_modules/.bin/next" ]; then
    log "Installing dashboard dependencies"
    npm install --prefix "$DASHBOARD_DIR"
  fi

  mkdir -p "$DASHBOARD_DIR/.cache/next-swc"
  if [ -f "$DASHBOARD_DIR/.next/dev/lock" ]; then
    rm -f "$DASHBOARD_DIR/.next/dev/lock" >/dev/null 2>&1 || true
  fi
}

ensure_expo_dependencies() {
  local app_dir="$1"
  if [ ! -d "$app_dir/node_modules" ]; then
    log "Installing dependencies for ${app_dir#$ROOT_DIR/}"
    npm install --prefix "$app_dir"
  fi
}

start_infrastructure() {
  log "Starting Docker infrastructure"
  $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" up -d >/dev/null
}

start_apps() {
  log "Starting backend on http://localhost:${API_PORT}"
  (
    cd "$BACKEND_DIR"
    APP_PORT="$API_PORT" "$BACKEND_PYTHON" -m uvicorn app.main:app --reload --host 0.0.0.0 --port "$API_PORT"
  ) &
  API_PID=$!

  log "Starting dashboard on http://localhost:${WEB_PORT}"
  (
    cd "$DASHBOARD_DIR"
    NEXT_DIST_DIR=".next-dev" NEXT_SWC_PATH="$DASHBOARD_DIR/.cache/next-swc" XDG_CACHE_HOME="$DASHBOARD_DIR/.cache" PORT="$WEB_PORT" NEXT_PUBLIC_API_BASE_URL="$DASHBOARD_API_URL" npm run dev -- --webpack -p "$WEB_PORT"
  ) &
  WEB_PID=$!

  if [ "${START_MOBILE:-0}" = "1" ]; then
    log "Starting staff mobile web preview on http://localhost:${MOBILE_WEB_PORT}"
    (
      cd "$MOBILE_DIR"
      EXPO_PUBLIC_API_URL="$EXPO_API_URL" EXPO_PUBLIC_API_BASE_URL="$EXPO_API_URL/api/v1" npx expo start --web --port "$MOBILE_WEB_PORT"
    ) &
    MOBILE_PID=$!
  fi

  if [ "${START_FAMILY_APP:-0}" = "1" ]; then
    log "Starting family app web preview on http://localhost:${FAMILY_WEB_PORT}"
    (
      cd "$FAMILY_APP_DIR"
      EXPO_PUBLIC_API_URL="$EXPO_API_URL" EXPO_PUBLIC_API_BASE_URL="$EXPO_API_URL/api/v1" npx expo start --web --port "$FAMILY_WEB_PORT"
    ) &
    FAMILY_PID=$!
  fi
}

main() {
  python_cmd >/dev/null
  require_command npm
  require_command docker
  ensure_docker_compose

  if [ ! -f "$COMPOSE_FILE" ]; then
    fail "Missing Docker Compose file: docker-compose.yml"
  fi

  ensure_env_file
  load_env_file
  API_PORT="${CAREHOMEOS_API_PORT:-8105}"
  WEB_PORT="${CAREHOMEOS_DASHBOARD_PORT:-3105}"
  MOBILE_WEB_PORT="${CAREHOMEOS_MOBILE_WEB_PORT:-19015}"
  FAMILY_WEB_PORT="${CAREHOMEOS_FAMILY_WEB_PORT:-19016}"
  DASHBOARD_API_URL="${NEXT_PUBLIC_API_BASE_URL:-https://carehomeos-api.localtest.me}"
  EXPO_API_URL="${EXPO_PUBLIC_API_URL:-https://carehomeos-api.localtest.me}"
  ensure_backend_venv
  ensure_backend_dependencies
  ensure_dashboard_dependencies
  ensure_expo_dependencies "$MOBILE_DIR"
  ensure_expo_dependencies "$FAMILY_APP_DIR"
  start_infrastructure

  log "Checks passed"
  log "Backend URL: http://localhost:${API_PORT}"
  log "Dashboard URL: http://localhost:${WEB_PORT}"
  log "Proxy URLs: https://carehomeos.localtest.me and https://carehomeos-api.localtest.me"
  log "Mobile web preview ports reserved: ${MOBILE_WEB_PORT}, ${FAMILY_WEB_PORT}"
  log "Set START_MOBILE=1 and/or START_FAMILY_APP=1 to launch Expo web previews"
  log "Press Ctrl+C to stop app processes"

  start_apps
  wait -n "$API_PID" "$WEB_PID" ${MOBILE_PID:+"$MOBILE_PID"} ${FAMILY_PID:+"$FAMILY_PID"}
}

main "$@"
