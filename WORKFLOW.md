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
  root: ./symphony-workspaces
hooks:
  after_create: |
    set -eu
    git clone --depth 1 "${SYMPHONY_SOURCE_REPO_URL:-https://github.com/mqleaf-maker/symphony-archery-game.git}" .
    git remote rename origin source 2>/dev/null || true
    if [ -n "${GITHUB_REPO_URL:-}" ]; then
      git remote add github "$GITHUB_REPO_URL"
    fi
    git config --local user.name "${SYMPHONY_GIT_AUTHOR_NAME:-Symphony Bot}"
    git config --local user.email "${SYMPHONY_GIT_AUTHOR_EMAIL:-symphony-bot@users.noreply.github.com}"
agent:
  max_concurrent_agents: 1
  max_turns: 1
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
