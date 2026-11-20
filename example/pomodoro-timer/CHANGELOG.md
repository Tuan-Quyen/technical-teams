# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- After a reload, the chime comes back on the first click, tap or key press anywhere on the page (R-01). Until then a phase end is still silent, with the notification.
- Focus mode now leaves native fullscreen when its component unmounts (R-06).

## [0.1.0] - 2026-11-19

First release. No breaking changes.

### Added

- Three phases with defaults Focus 25, Short Break 5 and Long Break 15 minutes; fixed cycle of 4, Long Break after the 4th Focus.
- Start, Pause, Resume, Reset (current phase only) and Skip (a skipped Focus does not count).
- Auto-start of the next phase (on by default, Settings toggle).
- Settings for phase durations in whole minutes (Focus 1-120, Short 1-30, Long 1-60), Sound and "Allow notifications".
- End-of-phase chime (synthesised, Sound toggle) and system notification; permission asked on the first Start or via Settings, never on load.
- Fullscreen Focus Mode with an in-app overlay when fullscreen is unavailable.
- Animated progress ring, cycle dots, display-only phase tabs and a tab title showing the remaining time.
- Timestamp-based timing that stays correct in background tabs and is restored after a refresh; a phase end handled more than 90 s late or after a reload leaves the next phase waiting, with one alert and a "while you were away" caption.
- State saved in LocalStorage under `pomodoro-timer`; two tabs follow last write wins.
- Responsive dark theme, English UI, self-hosted Inter font (SIL OFL 1.1); every control works with Tab, Enter and Space, no keyboard shortcuts.
- GitHub Actions workflow running install, lint, tests and build.

### Known limitations

- If Start was pressed only in tab A and tab B finishes the phase first, no sound plays (the notification still shows).
- Browsers without Web Locks may play the chime twice with two tabs open.
- After a reload, a missed phase end shows the notification and caption but no chime (audio needs a click first).
- The 90 s "away" margin is an estimate.
- Hidden-tab accuracy and the live browser checks (sound, notifications, two tabs, fullscreen, screen readers) were not verified in a real browser; they are covered by automated tests only.
- Strict `style-src 'self'` is unverified in a browser; see Deployment in the README.
