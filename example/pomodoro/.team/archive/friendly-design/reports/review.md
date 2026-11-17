Verdict: PASS · Round 1

# friendly-design — code review

> Owner: **team-code-reviewer**. PASS = no `open` blocking finding. Findings are cumulative: an ID (`R-01`…) is never reused; status open → fixed → verified (or dropped, with the reason). **Round detail** holds the latest round only.

## Findings
| ID | Severity | Where | What is wrong | Fix direction | Found | Status |
|---|---|---|---|---|---|---|
| R-01 | suggestion | `styles.css:~270` (`dialog` border) | Off-spec token `--dialog-edge` is acceptable: DESIGN.md line 45 already asks for a 1px `--color-divider` border on the dialog in dark mode, and the token is the least invasive way (transparent in light). Side effect: a 1px border also shows on the full-screen sheet below 600px in dark, and the light card gains an invisible 1px. | Add `--dialog-edge` to the DESIGN.md token table; optionally set `border: 0` in the `max-width: 599px` dialog rule. | R1 | open |
| R-02 | suggestion | `styles.css` (`.check`) | Removing the checkbox bottom margin is fine: `.dialog-actions` has `margin-top: --space-6` and `.check` has `min-height: 48px`, so spacing matches the spec (32px above actions). | Note it in DESIGN.md if the spec lists a checkbox margin; no code change. | R1 | open |
| R-03 | suggestion | `.team/frontend-design/friendly-design.md` copy table | AC-pinned strings (`Today: {n} sessions`, `Enter a whole number from 1 to 180`, `Focus finished at {hh:mm}`) are correctly kept. Their "needs user OK" proposals remain undecided. | Lead: ask the user once, or record "kept" as the decision. | R1 | open |

## Round detail (latest round only)
- Round: R1 · 2026-11-17 · diff: working tree, no git baseline (folder untracked), files compared against the spec: `index.html`, `styles.css`, `src/app.js` (core.js, alerts.js, tests unchanged)
- Checked: does what was asked · correctness · contracts · tests · design fit · readability · UI states
- Result:
  - Behaviour: `app.js` changes are strings only (timer aria-label "left", live announcements, warning text, restore text, notification bodies). Logic, listeners and effects are untouched. The `minutesOf` helper is new but is a pure copy helper.
  - Contracts: every ID, class and `data-*` attribute on the spec's do-not-rename list is present. `<input id> + "-error"` lookups still match. `role="timer"`, `aria-describedby`, `aria-labelledby` and `hidden` are intact.
  - Locked strings unchanged: "Today: {n} sessions", "Enter a whole number from 1 to 180" (core.js:55), "Focus finished at {hh:mm}". Title format "<Phase> - mm:ss" unchanged. Banner dismiss "Got it" and suffix "minutes" match the spec.
  - Offline: no `http`, `@import`, `url(` or web fonts. `ui-rounded` / system stacks only, so `file://` works.
  - Styles: `:focus-visible` is global and the checkbox has its own ring. The dark block overrides every colour token, shadow, backdrop and phase accent/tint. Reduced motion is handled. Hover, active and disabled states exist for all button variants. Error and validation styles are present. The R-01 default tokens keep the dialog (outside `#app`) themed.
  - Tests: `npm test` gives 66 pass, 0 fail.
  - Not verified: contrast ratios and rendering (no browser run in this step). QA live preview should cover both themes and 375/1280px.
- Open blocking: 0
- Needs security review: no
