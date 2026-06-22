---
tracker:
  kind: linear
  project_slug: "98b7f5980897"
  required_labels: []
  active_states:
    - Todo
    - In Progress
  terminal_states:
    - Done
    - Closed
    - Canceled
    - Cancelled
    - Duplicate
polling:
  interval_ms: 30000
workspace:
  root: /Users/minxuan/Documents/learning/symphony-archery-game/symphony-workspaces
hooks:
  after_create: |
    set -eu
    ENV_FILE="${SYMPHONY_ENV_FILE:-/Users/minxuan/Documents/learning/symphony-archery-game/.env}"
    if [ -f "$ENV_FILE" ]; then
      set -a
      . "$ENV_FILE"
      set +a
    fi
    if [ "$(find . -mindepth 1 -maxdepth 1 | wc -l | tr -d ' ')" != "0" ]; then
      echo "Workspace is not empty before clone; refusing to overwrite it." >&2
      exit 1
    fi
    git clone --depth 1 "${SYMPHONY_SOURCE_REPO_URL:-file:///Users/minxuan/Documents/learning/symphony-archery-game}" .
    if [ -f "$ENV_FILE" ]; then
      cp "$ENV_FILE" .env
      chmod 600 .env
    fi
    git remote rename origin source 2>/dev/null || true
    if [ -n "${GITHUB_REPO_URL:-}" ]; then
      git remote add github "$GITHUB_REPO_URL"
    fi
    git config --local user.name "${SYMPHONY_GIT_AUTHOR_NAME:-Symphony Bot}"
    git config --local user.email "${SYMPHONY_GIT_AUTHOR_EMAIL:-symphony-bot@users.noreply.github.com}"
  before_run: |
    set -eu
    ENV_FILE="${SYMPHONY_ENV_FILE:-/Users/minxuan/Documents/learning/symphony-archery-game/.env}"
    load_env() {
      if [ -f "$ENV_FILE" ]; then
        cp "$ENV_FILE" .env
        chmod 600 .env
        set -a
        . ./.env
        set +a
      elif [ -f .env ]; then
        set -a
        . ./.env
        set +a
      fi
    }

    promote_repo_dir() {
      if [ -f .env ] && [ ! -f repo/.env ]; then
        cp .env repo/.env
        chmod 600 repo/.env
      fi
      find repo -mindepth 1 -maxdepth 1 -exec mv {} . \;
      rmdir repo
    }

    ensure_repo_workspace() {
      if [ -d .git ] && [ -f package.json ]; then
        return
      fi

      if [ -d repo/.git ] && [ -f repo/package.json ]; then
        extra_entry="$(find . -mindepth 1 -maxdepth 1 ! -name .env ! -name repo | head -n 1)"
        if [ -n "$extra_entry" ]; then
          echo "Workspace is missing .git but contains unexpected files; refusing to self-heal: $extra_entry" >&2
          exit 1
        fi
        promote_repo_dir
        return
      fi

      extra_entry="$(find . -mindepth 1 -maxdepth 1 ! -name .env | head -n 1)"
      if [ -n "$extra_entry" ]; then
        echo "Workspace is missing .git but contains unexpected files; refusing to self-heal: $extra_entry" >&2
        exit 1
      fi
      git clone --depth 1 "${SYMPHONY_SOURCE_REPO_URL:-file:///Users/minxuan/Documents/learning/symphony-archery-game}" repo
      promote_repo_dir
    }

    load_env
    ensure_repo_workspace
    if git remote get-url origin >/dev/null 2>&1 && ! git remote get-url source >/dev/null 2>&1; then
      git remote rename origin source
    fi
    if [ -n "${GITHUB_REPO_URL:-}" ]; then
      if git remote get-url github >/dev/null 2>&1; then
        git remote set-url github "$GITHUB_REPO_URL"
      else
        git remote add github "$GITHUB_REPO_URL"
      fi
    fi
    git config --local user.name "${SYMPHONY_GIT_AUTHOR_NAME:-Symphony Bot}"
    git config --local user.email "${SYMPHONY_GIT_AUTHOR_EMAIL:-symphony-bot@users.noreply.github.com}"
agent:
  max_concurrent_agents: 1
  max_turns: 3
  max_retry_backoff_ms: 600000
codex:
  command: codex --config shell_environment_policy.inherit=all app-server
  approval_policy: never
  thread_sandbox: workspace-write
  turn_sandbox_policy:
    type: workspaceWrite
    networkAccess: true
  turn_timeout_ms: 900000
  read_timeout_ms: 3000
  stall_timeout_ms: 120000
---

You are working on one Linear issue for `symphony-archery-game`.

Issue: {{ issue.identifier }} - {{ issue.title }}
Status: {{ issue.state }}
URL: {{ issue.url }}

{% if issue.description %}
Description:
{{ issue.description }}
{% endif %}

## Mission

Finish this in one focused turn. Keep the change small.

Required steps:

1. Move `Todo` issues to `In Progress`.
2. Read `AGENTS.md`.
3. Implement only what the issue asks for.
4. Run `npm test`.
5. If tests pass, run:
   `npm run github:pr -- {{ issue.identifier }} "{{ issue.title }}"`
6. Add one Linear comment with changed files, validation, PR URL, and residual risk.
7. Move the issue to `Done` only when `npm test` passes and a GitHub PR URL was created or found.

If blocked by missing GitHub remote/token/repository or unclear requirements, comment the blocker in Linear and leave the issue in `In Progress`.

Budget: target under 80k tokens. Do not start broad refactors, dependency changes, or extra exploratory work.
