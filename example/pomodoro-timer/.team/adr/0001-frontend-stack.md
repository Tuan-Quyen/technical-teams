# ADR 0001 — Frontend stack and tooling

Status: accepted · Date: 2026-11-19 · Item: pomodoro-timer

> Owner: **team-architect**. File: `.team/adr/NNNN-<decision>.md`; the lead gives NNNN in the brief.
> **Budget:** ≤ 60 lines. Context ≤ 5 bullets; the decision in 1–3 lines; link the system design for detail.

## Context
- User fixed the core: React, TypeScript strict, Vite, Tailwind CSS, Zustand, Framer Motion, Lucide React, LocalStorage (`BRIEF.md:13`, `:17`).
- Timer must be timestamp-based, survive background tabs and refresh (BR-3, POMO-AC18–POMO-AC21); no backend, Timer Core only (BR-6).
- Done needs `npm install`, `npm run build`, lint and tests green on Windows 11 (Node v24.13.1, npm 11.8.0), standalone `package.json` in `example/pomodoro-timer/`.
- Seven open choices C1–C7 were put to the user; answer 2026-11-19: "All A (Recommended)".
- At scaffold (POMO-T1) the current `create-vite` `react-ts` template ships oxlint and TypeScript 7, not ESLint; typescript-eslint does not support TS 7 yet (developer POMO-T1 handoff).

## Decision
- Scaffold `create-vite` `react-ts`, npm, current stable majors at install except TypeScript held at 6.x (6.0.3) for typescript-eslint; core stack as named by the user.
- C1 Vitest + jsdom + Testing Library · C2 hand-written ESLint flat config (`@eslint/js` recommended, typescript-eslint `strict`, react-hooks flat recommended, react-refresh `vite`) replacing the template's oxlint + Prettier check · C3 Tailwind v4 via `@tailwindcss/vite`, tokens in CSS `@theme` · C4 `motion` imported from `motion/react` · C5 Zustand `persist` + `createJSONStorage` over `localStorage` with `partialize`, `version`/`migrate`, validating `merge` · C6 chime synthesised with Web Audio · C7 main-thread tick + one-shot timeout at `endAt` + resync on `visibilitychange`/`focus`, no Web Worker.

## Alternatives
| Option | Why not |
|---|---|
| C1-B Vitest + Playwright e2e smoke | Browser download, slower runs; qa live check covers real-browser gap |
| C1-C Vitest browser mode | Heavier setup for a single screen |
| C2-B ESLint only | Style unenforced |
| C2-C Biome | Drops the react-hooks / react-refresh ESLint plugins |
| Template oxlint (+ TS 7) | Not the user's C2-A choice; switching needs the user |
| C3-B Tailwind v4 via PostCSS | Extra config, slower than the Vite plugin |
| C3-C Tailwind v3 + `tailwind.config.js` | Older line |
| C4-B `framer-motion` package | Legacy name of the same library |
| C5-B Hand-rolled `subscribe` + load | More code for the same result |
| C6-B Bundled audio file | Needs a licensed asset |
| C7-B Web Worker ticker | More code; throttling only delays the alert, display is exact on return |

## Consequences
- Good: zero runtime deps beyond the user's list; pure `src/domain/` engine is unit-testable without a browser.
- Good: Tailwind v4 needs no JS config; `persist` versioning covers schema changes.
- Bad: no real-browser automation; qa checks POMO-AC7, POMO-AC14, POMO-AC17–POMO-AC23 live at 360 / 1280 px.
- Bad: C7 — in a hidden tab the end alert can fire late if the browser throttles timers (per browser, unverified); display is exact on return.
- Bad: `createJSONStorage` does no runtime validation (Zustand persist docs), so the validating `merge` and a safe storage wrapper are mandatory.
- Bad: `eslint.config.js` is ours to maintain, not template-tracked; TypeScript stays on 6.x until typescript-eslint supports 7 — revisit then.
- Rule: static assets (Inter variable font, OFL) are committed files, not npm packages, so the dependency list stays as decided.
- Detail: `.team/archive/pomodoro-timer/system-design/pomodoro-timer.md`.
