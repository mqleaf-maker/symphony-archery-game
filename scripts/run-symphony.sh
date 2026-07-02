#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="${SYMPHONY_ENV_FILE:-$repo_dir/.env}"
symphony_bin="${SYMPHONY_BIN:-$repo_dir/../openai-symphony/elixir/bin/symphony}"
port="${SYMPHONY_PORT:-4000}"

if [ -f "$env_file" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$env_file"
  set +a
fi

if [ -z "${LINEAR_API_KEY:-}" ]; then
  echo "LINEAR_API_KEY is missing. Add it to $env_file or export it before running this script." >&2
  exit 1
fi

if [ ! -x "$symphony_bin" ]; then
  echo "Symphony executable not found at $symphony_bin." >&2
  echo "Build it from ../openai-symphony/elixir with: mise exec -- mix build" >&2
  exit 1
fi

cd "$repo_dir"

exec mise exec erlang@28 elixir@1.19.5 -- \
  "$symphony_bin" \
  --i-understand-that-this-will-be-running-without-the-usual-guardrails \
  --port "$port" \
  ./WORKFLOW.md
