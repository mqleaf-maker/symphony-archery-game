---
tracker:
  kind: linear
  project_slug: "symphony-archery-game-98b7f5980897"
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
  interval_ms: 7000
workspace:
  root: /Users/minxuan/Documents/learning/symphony-archery-game/symphony-workspaces
hooks:
  after_create: |
    git clone --depth 1 file:///Users/minxuan/Documents/learning/symphony-archery-game .
agent:
  max_concurrent_agents: 1
  max_turns: 8
codex:
  command: codex --config shell_environment_policy.inherit=all app-server
  approval_policy: never
  thread_sandbox: workspace-write
  turn_sandbox_policy:
    type: workspaceWrite
    networkAccess: true
---

You are working on a Linear issue for the `symphony-archery-game` repository.

Issue:
- Identifier: {{ issue.identifier }}
- Title: {{ issue.title }}
- Status: {{ issue.state }}
- URL: {{ issue.url }}

Description:
{% if issue.description %}
{{ issue.description }}
{% else %}
No description provided.
{% endif %}

## Mission

Work autonomously in the repository copy that Symphony created for this issue.
Keep the implementation small, visible, and easy to validate.

## Project Rules

- Read `AGENTS.md` before editing.
- Prefer dependency-free HTML, CSS, and JavaScript.
- Keep gameplay in `src/game.js`.
- Keep visual styling in `src/styles.css`.
- Do not add build tooling unless the issue explicitly asks for it.
- Run `npm test` before finishing.
- If you change gameplay or UI behavior, describe the manual browser validation path in your final update.

## Status Handling

- If the issue is `Todo`, move it to `In Progress` before implementation.
- If you are blocked by missing requirements, explain the blocker in a Linear comment and leave the issue in `In Progress`.
- If implementation and validation are complete, add a concise Linear comment with:
  - changed files,
  - validation run,
  - manual QA notes,
  - any residual risk.
- After that, move the issue to `Done`.

## Local Validation

Run:

```bash
npm test
```

For UI/gameplay changes, also reason through this manual path:

1. Start the app with `npm run dev`.
2. Open `http://localhost:5173`.
3. Draw the bow with pointer or space bar.
4. Release an arrow.
5. Confirm score, arrow count, and reset behavior still work.

## Final Response

Report only what changed, what validation passed, and any blocker or risk.
