# Linear Issue Backlog

Project: `symphony-archery-game-98b7f5980897`
Team: `SYM`

Created issues:

- `SYM-5`: https://linear.app/symphony-game/issue/SYM-5/add-target-difficulty-progression
- `SYM-6`: https://linear.app/symphony-game/issue/SYM-6/improve-hit-feedback-and-round-summary
- `SYM-7`: https://linear.app/symphony-game/issue/SYM-7/add-mobile-friendly-aiming-polish
- `SYM-8`: https://linear.app/symphony-game/issue/SYM-8/add-lightweight-audio-toggle
- Next rerun candidate: add the issue below as a fresh `SYM-*` item.

These issues are intentionally small so Symphony can run one agent at a time.

## Issue 1: Initialize browser archery game baseline

Status: Done locally; useful as the first committed baseline.

Acceptance criteria:

- Browser page loads from `index.html`.
- Canvas renders an archery range, bow, arrow, and target.
- Pointer and keyboard controls can draw and fire.
- Score, arrows, best score, and reset UI are present.
- `npm test` passes.

## Issue 2: Add target difficulty progression

Description:

Add a simple difficulty progression to the archery game. After every three fired
arrows, the target should shift to a new vertical position and the wind should
change slightly. Keep the movement readable and fair.

Acceptance criteria:

- Target position changes after every three fired arrows.
- Wind value changes visibly enough to affect arrow path but not make the game random.
- HUD or visual feedback makes the difficulty change understandable.
- Existing score, arrow count, and reset behavior still work.
- `npm test` passes.

## Issue 3: Improve hit feedback and round summary

Description:

Make successful hits feel clearer. Add a short visual feedback effect for hit
quality and improve the round-complete summary so a player can understand their
final score.

Acceptance criteria:

- Bullseye and outer-ring hits have distinct visual feedback.
- Round-complete state shows final score and best score.
- Reset starts a clean new round.
- No large instructional overlay blocks normal play.
- `npm test` passes.

## Issue 4: Add mobile-friendly aiming polish

Description:

Improve the touch controls and small-screen layout so the game feels usable on a
phone-width viewport.

Acceptance criteria:

- Layout remains usable around 390px width.
- Touch controls do not overlap the canvas or scorebar.
- Draw/fire controls work without requiring keyboard input.
- Canvas aspect ratio remains stable.
- `npm test` passes.

## Issue 5: Add lightweight audio toggle

Description:

Add optional sound effects using the Web Audio API. Keep audio muted by default
until the player explicitly enables it.

Acceptance criteria:

- UI includes a compact audio toggle.
- Drawing, firing, and hit events have subtle sound feedback when enabled.
- Game works normally when audio is disabled or unavailable.
- No external audio files are required.
- `npm test` passes.

## Issue 6: Add accessible labels for touch controls

Description:

Make the mobile touch controls easier to understand for assistive technology
without changing the visible game UI. Add explicit ARIA labels to the Draw and
Fire touch buttons, then extend the static validation script so this
accessibility affordance is covered by `npm test`.

Acceptance criteria:

- The `#draw` button has `aria-label="Draw bow"`.
- The `#fire` button has `aria-label="Fire arrow"`.
- The visible button text stays `Draw` and `Fire`.
- `scripts/validate.mjs` checks the two ARIA labels.
- `npm test` passes.

Recommended Symphony handoff:

- Create or reuse a GitHub PR through `npm run github:pr`.
- Move the Linear issue to `Human Review` if that state exists.
- If `Human Review` does not exist, move it to `Done` and state in the comment
  that `Done` means ready for human review in this PoC.
