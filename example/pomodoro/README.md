# Pomodoro

A small single-page Pomodoro timer that runs in the browser with no backend and no build step.

- Focus 25 min, short break 5 min, long break 15 min. All three are editable in Settings (1 to 180 minutes).
- A long break follows every 4th focus session. The daily count resets at local midnight.
- The next phase never starts on its own: you click Start.
- State is saved in `localStorage`, so a reload resumes the running or paused timer.
- When a phase ends you get a short sound and a new tab title ("Short break - 05:00"). Desktop notifications are opt-in in Settings.
- Two open tabs stay in sync, and a finished focus session is counted once.

This is a throwaway test project, kept small and not polished. It was built end to end by the `technical-team` Claude Code plugin in this repository (`plugins/team/`), using its `new` pipeline. The team's working files are in `.team/`: `PRODUCT.md`, `ARCHITECTURE.md`, the system design, tickets, and the review and QA reports.

## Open it

Open `index.html` in a browser. It works from `file://`.

For desktop notifications, serve it over http, because the permission prompt may not work from `file://`:

```
python3 -m http.server 8765
```

Then go to http://127.0.0.1:8765/.

## Run the tests

Needs Node 22 or newer (`engines` in `package.json`). There are no dependencies to install.

```
npm test
```

This runs `node --test "tests/**/*.test.js"`. At the last review it passed 66 tests.

## Files

```
index.html      page markup and script order
styles.css      design tokens and styles
src/core.js     pure timer state machine (no DOM, no storage)
src/storage.js  localStorage with an in-memory fallback
src/alerts.js   sound, tab title, desktop notification
src/app.js      rendering, buttons, settings dialog, two-tab sync
tests/          unit tests for core and storage (node:test)
.team/          the team's product, design, task and report files
```

## Known issues and not done

From the code review (R-) and QA (Q-) reports in `.team/reports/pomodoro/`:

- R-11: moving the clock back to an earlier day resets today's count.
- R-12, R-13: restoring accepts some tampered saved data (an array as the phase, a huge paused time).
- R-15: pausing after the end time has already passed stores 0, so Resume ends the phase at once.
- R-18: the Settings checkbox can show "on" after the browser permission was revoked.
- Q-01: after a reload, the screen-reader status is stale after Pause or Resume.
- Q-02: there is no favicon, so the console shows a 404 over http.
- Two tabs ending a phase in the same millisecond may both beep. The count still goes up once.
- No browser (Playwright) tests (milestone M4 was skipped), no CI, no release check.
- QA did not verify how the sound actually sounds, the real notification prompt, or long hidden-tab throttling.
