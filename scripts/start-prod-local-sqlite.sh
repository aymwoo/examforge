#!/usr/bin/env bash
set -euo pipefail

# ExamForge prod start (no docker)
# - API: Node.js + SQLite (Prisma)
# - Web: Vite build then `vite preview` (simple static host)
#
# Usage:
#   ./scripts/start-prod-local-sqlite.sh [--no-install] [--no-build] [--skip-mirror] [--api-only] [--web-only]
#
# Notes:
# - You likely need to prepare `apps/api/.env` (or export env vars) for production.
# - Default DATABASE_URL uses sqlite file in `apps/api/prisma/prod.db`.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

NO_INSTALL=0
NO_BUILD=0
SKIP_MIRROR=0
API_ONLY=0
WEB_ONLY=0

usage() {
  echo "Usage: $0 [--no-install] [--no-build] [--skip-mirror] [--api-only] [--web-only]"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-install) NO_INSTALL=1; shift ;;
    --no-build) NO_BUILD=1; shift ;;
    --skip-mirror) SKIP_MIRROR=1; shift ;;
    --api-only) API_ONLY=1; shift ;;
    --web-only) WEB_ONLY=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ $API_ONLY -eq 1 && $WEB_ONLY -eq 1 ]]; then
  echo "--api-only and --web-only cannot be used together" >&2
  exit 1
fi

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    return 0
  fi

  echo "pnpm not found; attempting install via npm..."
  if ! command -v npm >/dev/null 2>&1; then
    echo "Missing required command: npm" >&2
    exit 1
  fi

  npm install -g pnpm

  if ! command -v pnpm >/dev/null 2>&1; then
    echo "Failed to install pnpm. Please run: npm install -g pnpm" >&2
    exit 1
  fi
}

maybe_set_env() {
  local key="$1"
  local value="$2"
  if [[ -z "${!key:-}" ]]; then
    export "$key=$value"
  fi
}

main() {
  require_cmd node
  ensure_pnpm

  if [[ "$SKIP_MIRROR" -eq 0 ]]; then
    maybe_set_env NPM_CONFIG_REGISTRY "https://registry.npmmirror.com"
    maybe_set_env PNPM_REGISTRY "https://registry.npmmirror.com"
    maybe_set_env NODEJS_ORG_MIRROR "https://npmmirror.com/mirrors/node/"
    maybe_set_env ELECTRON_MIRROR "https://npmmirror.com/mirrors/electron/"
    maybe_set_env SASS_BINARY_SITE "https://npmmirror.com/mirrors/node-sass/"
    maybe_set_env PHANTOMJS_CDNURL "https://npmmirror.com/mirrors/phantomjs/"
    maybe_set_env PUPPETEER_DOWNLOAD_HOST "https://npmmirror.com/mirrors/"
    maybe_set_env PLAYWRIGHT_DOWNLOAD_HOST "https://npmmirror.com/mirrors/playwright/"
  fi

  if [[ "$NO_INSTALL" -eq 0 ]]; then
    echo "Installing deps..."
    (cd "$ROOT_DIR" && pnpm install)
  fi

  if [[ "$NO_BUILD" -eq 0 ]]; then
    echo "Building..."
    if [[ "$WEB_ONLY" -eq 1 ]]; then
      (cd "$ROOT_DIR" && pnpm build:web)
    elif [[ "$API_ONLY" -eq 1 ]]; then
      (cd "$ROOT_DIR" && pnpm build:api)
    else
      (cd "$ROOT_DIR" && pnpm build)
    fi
  fi

  if [[ "$WEB_ONLY" -eq 0 ]]; then
    echo "Preparing SQLite prisma client and db..."
    # Ensure sqlite file dir exists
    mkdir -p "$ROOT_DIR/apps/api/prisma"
    export DATABASE_URL="${DATABASE_URL:-file:./prisma/prod.db}"

    (cd "$ROOT_DIR/apps/api" && pnpm prisma generate)
    # For sqlite, prefer migrate deploy to avoid data loss.
    # NOTE: prisma migrate dev may reset local sqlite data.
    if [[ -d "$ROOT_DIR/apps/api/prisma/migrations" ]]; then
      (cd "$ROOT_DIR/apps/api" && pnpm prisma migrate deploy) || true
    fi

    echo "Starting API (NODE_ENV=production)..."
    export NODE_ENV="production"
    export PORT="${PORT:-3000}"
    (cd "$ROOT_DIR/apps/api" && pnpm start:prod) &
    API_PID=$!
    echo "API PID: $API_PID"
  fi

  if [[ "$API_ONLY" -eq 0 ]]; then
    echo "Starting WEB preview..."
    export NODE_ENV="production"
    (cd "$ROOT_DIR/web" && pnpm preview --host 0.0.0.0 --port 4173) &
    WEB_PID=$!
    echo "WEB PID: $WEB_PID"
  fi

  echo ""
  echo "Running:"
  if [[ "$WEB_ONLY" -eq 0 ]]; then
    echo "- API: http://localhost:${PORT:-3000}"
  fi
  if [[ "$API_ONLY" -eq 0 ]]; then
    echo "- WEB: http://localhost:4173"
  fi
  echo ""
  echo "Press Ctrl+C to stop."

  # Wait for background pids
  wait
}

main "$@"
