# Symphony Archery Game

A small browser archery game used as a Symphony orchestration proof of concept.

The game is intentionally dependency-free so agents can work on it in isolated
workspaces with a low setup burden.

## Run

```bash
npm run dev
```

Open `http://localhost:5173`.

## Validate

```bash
npm test
```

## Controls

- Move the pointer to aim.
- Hold the mouse button or space bar to draw the bow.
- Release to fire.
- Hit closer to the bullseye for a higher score.

## Symphony Experiment Goal

This repository is shaped for issue-driven agent work:

- Small, visible tasks.
- Clear acceptance criteria.
- Local validation command.
- No package install required for the first iteration.
