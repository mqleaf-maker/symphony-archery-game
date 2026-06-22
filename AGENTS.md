# Agent Instructions

## Project Shape

This is a dependency-free browser game. Prefer focused changes in:

- `index.html` for document structure.
- `src/styles.css` for layout and visual styling.
- `src/game.js` for game logic, rendering, and interaction.
- `scripts/validate.mjs` for static validation.

## Working Rules

- Keep the game playable by opening `index.html` through a local HTTP server.
- Preserve keyboard and pointer controls.
- Keep UI text concise and avoid instructional walls in the game surface.
- Use Canvas for gameplay rendering.
- Do not add build tooling unless the issue explicitly requires it.
- Run `npm test` before handoff.

## Verification

For user-facing changes, verify:

- The page loads without console-breaking syntax errors.
- The bow can draw and release an arrow.
- The target can be hit and score updates.
- The game remains usable around 390px mobile width and desktop width.
