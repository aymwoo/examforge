#!/usr/bin/env bash
set -euo pipefail

# ExamForge one-click prod start (CN mirrors)
# Usage:
#   ./scripts/start-prod-cn.sh [--no-build] [--no-up] [--skip-mirror] [--logs]
#
# Default behavior:
#   - Enable common China mirrors (npmmirror)
#   - Ensure docker/.env exists (copy from docker/.env.example if missing)
#   - docker compose up -d --build using docker/docker-compose.yml

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker/docker-compose.yml"
ENV_EXAMPLE="$ROOT_DIR/docker/.env.example"
ENV_FILE="$ROOT_DIR/docker/.env"

NO_BUILD=0
NO_UP=0
SKIP_MIRROR=0
FOLLOW_LOGS=0

usage() {
  echo "Usage: $0 [--no-build] [--no-up] [--skip-mirror] [--logs]"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-build)
      NO_BUILD=1
      shift
      ;;
    --no-up)
      NO_UP=1
      shift
      ;;
    --skip-mirror)
      SKIP_MIRROR=1
      shift
      ;;
    --logs)
      FOLLOW_LOGS=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      exit 1
      ;;
  esac
done

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

  echo "pnpm not found; installing via npm..."
  require_cmd npm
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

check_docker_mirror_hint() {
  if command -v docker >/dev/null 2>&1; then
    # Best-effort hint; do not fail if inaccessible.
    local daemon_json="/etc/docker/daemon.json"
    if [[ -r "$daemon_json" ]]; then
      if ! grep -q 'registry-mirrors' "$daemon_json"; then
        echo "[hint] Docker registry mirror not found in $daemon_json"
        echo "       Consider configuring registry-mirrors for faster pulls in China."
      fi
    else
      echo "[hint] Cannot read /etc/docker/daemon.json; skipping docker mirror check."
    fi
  fi
}

main() {
  require_cmd docker
  ensure_pnpm

  if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo "Compose file not found: $COMPOSE_FILE" >&2
    exit 1
  fi

  local compose_cmd=(docker compose)
  if ! docker compose version >/dev/null 2>&1; then
    require_cmd docker-compose
    compose_cmd=(docker-compose)
  fi

  if [[ "$SKIP_MIRROR" -eq 0 ]]; then
    maybe_set_env NPM_CONFIG_REGISTRY "https://registry.npmmirror.com"
    maybe_set_env PNPM_REGISTRY "https://registry.npmmirror.com"

    # Common prebuilt binary mirrors
    maybe_set_env NODEJS_ORG_MIRROR "https://npmmirror.com/mirrors/node/"
    maybe_set_env ELECTRON_MIRROR "https://npmmirror.com/mirrors/electron/"
    maybe_set_env SASS_BINARY_SITE "https://npmmirror.com/mirrors/node-sass/"
    maybe_set_env PHANTOMJS_CDNURL "https://npmmirror.com/mirrors/phantomjs/"
    maybe_set_env PUPPETEER_DOWNLOAD_HOST "https://npmmirror.com/mirrors/"
    maybe_set_env PLAYWRIGHT_DOWNLOAD_HOST "https://npmmirror.com/mirrors/playwright/"
  fi

  check_docker_mirror_hint

  if [[ ! -f "$ENV_FILE" ]]; then
    if [[ -f "$ENV_EXAMPLE" ]]; then
      cp "$ENV_EXAMPLE" "$ENV_FILE"
      echo "Created $ENV_FILE from $ENV_EXAMPLE"
      echo "[important] Please edit docker/.env and set JWT_SECRET and LLM_API_KEY."
    else
      echo "Missing env example: $ENV_EXAMPLE" >&2
      exit 1
    fi
  fi

  if [[ "$NO_UP" -eq 1 ]]; then
    echo "Checks completed (--no-up)."
    exit 0
  fi

  local up_args=("-f" "$COMPOSE_FILE" "--env-file" "$ENV_FILE" "up" "-d")
  if [[ "$NO_BUILD" -eq 0 ]]; then
    up_args+=("--build")
  fi

  echo "Running: ${compose_cmd[*]} ${up_args[*]}"
  (cd "$ROOT_DIR" && "${compose_cmd[@]}" "${up_args[@]}")

  echo ""
  echo "Services started."
  echo "- Web: http://localhost"
  echo "- API: http://localhost:3000"
  echo ""
  echo "Logs: ${compose_cmd[*]} -f docker/docker-compose.yml --env-file docker/.env logs -f --tail=200"

  if [[ "$FOLLOW_LOGS" -eq 1 ]]; then
    (cd "$ROOT_DIR" && "${compose_cmd[@]}" -f docker/docker-compose.yml --env-file docker/.env logs -f --tail=200)
  fi
}

main "$@"
