#!/usr/bin/env bash
# ci-local.sh — mirrors .github/workflows/test.yml
# Run locally before pushing: bash ci-local.sh
# Skip a job:   SKIP_DASHBOARD=1 bash ci-local.sh
# Backend only: ONLY_BACKEND=1 bash ci-local.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PASS="\033[32mPASS\033[0m"
FAIL="\033[31mFAIL\033[0m"
SKIP="\033[33mSKIP\033[0m"

declare -A RESULTS

run_job() {
  local name="$1"
  shift
  echo ""
  echo "━━ $name ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  local start=$SECONDS
  if "$@"; then
    echo -e "\n── $name ── $PASS  ($((SECONDS - start))s)"
    RESULTS[$name]="passed"
  else
    echo -e "\n── $name ── $FAIL  ($((SECONDS - start))s)"
    RESULTS[$name]="failed"
  fi
}

# ── Backend ──────────────────────────────────────────────────────────────────
job_backend() {
  cd "$ROOT/backend"

  # Prefer venv if present
  if [ -f "venv/bin/pip" ]; then
    PIP=venv/bin/pip; PYTEST=venv/bin/pytest
  elif [ -f ".venv/bin/pip" ]; then
    PIP=.venv/bin/pip; PYTEST=.venv/bin/pytest
  else
    PIP=pip; PYTEST=pytest
  fi

  $PIP install -r requirements.txt -q
  $PIP install pytest-cov -q
  $PYTEST --tb=short --cov=app --cov-report=term-missing --cov-fail-under=60
}

# ── Dashboard ─────────────────────────────────────────────────────────────────
job_dashboard() {
  cd "$ROOT/dashboard"
  npm ci --prefer-offline 2>&1 | tail -3
  echo "  → tsc --noEmit"
  npx tsc --noEmit
  echo "  → next lint"
  NEXT_TELEMETRY_DISABLED=1 npm run lint
  echo "  → next build"
  NEXT_TELEMETRY_DISABLED=1 npm run build
}

# ── Family app ────────────────────────────────────────────────────────────────
job_family_app() {
  cd "$ROOT/family-app"
  npm ci --prefer-offline 2>&1 | tail -3
  echo "  → tsc --noEmit"
  npm run typecheck
}

# ── Run jobs ──────────────────────────────────────────────────────────────────
if [ "${ONLY_BACKEND:-0}" = "1" ]; then
  run_job "backend" job_backend
else
  run_job "backend"    job_backend
  [ "${SKIP_DASHBOARD:-0}"   != "1" ] && run_job "dashboard"   job_dashboard   || { echo -e "\n── dashboard ── $SKIP";   RESULTS[dashboard]="skipped"; }
  [ "${SKIP_FAMILY_APP:-0}"  != "1" ] && run_job "family-app"  job_family_app  || { echo -e "\n── family-app ── $SKIP";  RESULTS[family-app]="skipped"; }
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "━━ CI Summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
FAILED=0
for job in "${!RESULTS[@]}"; do
  case "${RESULTS[$job]}" in
    passed)  echo -e "  $job\t$PASS" ;;
    failed)  echo -e "  $job\t$FAIL"; ((FAILED++)) ;;
    skipped) echo -e "  $job\t$SKIP" ;;
  esac
done
echo ""
if [ $FAILED -gt 0 ]; then
  echo -e "\033[31m$FAILED job(s) failed — fix before pushing.\033[0m"
  exit 1
else
  echo -e "\033[32mAll checks passed. Safe to push.\033[0m"
fi
