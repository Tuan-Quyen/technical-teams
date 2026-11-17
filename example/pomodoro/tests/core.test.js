process.env.TZ = "UTC";
const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../src/core.js");

const T0 = Date.UTC(2026, 0, 15, 10, 0, 0);
const MIN = 60000;

function run(state, type, now) {
  return core.reduce(state, { type }, now);
}

test("namespace is registered", () => {
  assert.equal(globalThis.Pomodoro.core, core);
});

test("AC1: initial state is Focus idle 25:00, count 0", () => {
  const s = core.initialState(T0);
  assert.deepEqual(s.settings, { focusMin: 25, shortMin: 5, longMin: 15, notify: false });
  assert.deepEqual(s.timer, { phase: "focus", status: "idle", endAt: null, remainingMs: null });
  assert.deepEqual(s.today, { date: "2026-01-15", count: 0, lastCountedEndAt: null });
  assert.equal(s.notice, null);
  assert.equal(core.formatClock(core.remainingMs(s, T0)), "25:00");
  assert.equal(core.phaseName(s.timer.phase), "Focus");
});

test("AC2: start runs and counts down with ceil", () => {
  const { state, effects } = run(core.initialState(T0), "start", T0);
  assert.equal(state.timer.status, "running");
  assert.equal(state.timer.endAt, T0 + 25 * MIN);
  assert.deepEqual(effects, [{ type: "persist" }]);
  assert.equal(core.formatClock(core.remainingMs(state, T0)), "25:00");
  assert.equal(core.formatClock(core.remainingMs(state, T0 + 1)), "25:00");
  assert.equal(core.formatClock(core.remainingMs(state, T0 + 1000)), "24:59");
  assert.equal(core.formatClock(core.remainingMs(state, T0 + 2000)), "24:58");
  assert.equal(core.remainingMs(state, T0 + 26 * MIN), 0);
});

test("AC3: pause holds remaining, resume continues", () => {
  const s0 = run(core.initialState(T0), "start", T0).state;
  const at = T0 + 12.5 * MIN; // 12:30 remaining
  const p = run(s0, "pause", at);
  assert.equal(p.state.timer.status, "paused");
  assert.equal(p.state.timer.endAt, null);
  assert.equal(p.state.timer.remainingMs, 12.5 * MIN);
  assert.deepEqual(p.effects, [{ type: "persist" }]);
  assert.equal(core.formatClock(core.remainingMs(p.state, at + 10000)), "12:30");
  const r = run(p.state, "resume", at + 10000);
  assert.equal(r.state.timer.status, "running");
  assert.equal(r.state.timer.endAt, at + 10000 + 12.5 * MIN);
  assert.equal(r.state.timer.remainingMs, null);
  assert.equal(core.formatClock(core.remainingMs(r.state, at + 10000)), "12:30");
});

test("AC4: reset from running and paused returns to idle, count kept", () => {
  let s = core.initialState(T0);
  s = { ...s, today: { ...s.today, count: 2 } };
  const running = run(s, "start", T0).state;
  const r1 = run(running, "reset", T0 + 15 * MIN);
  assert.deepEqual(r1.state.timer, { phase: "focus", status: "idle", endAt: null, remainingMs: null });
  assert.equal(r1.state.today.count, 2);
  assert.equal(core.formatClock(core.remainingMs(r1.state, T0 + 15 * MIN)), "25:00");
  assert.deepEqual(r1.effects, [{ type: "persist" }]);
  const paused = run(running, "pause", T0 + 15 * MIN).state;
  const r2 = run(paused, "reset", T0 + 16 * MIN);
  assert.equal(r2.state.timer.status, "idle");
  assert.equal(r2.state.today.count, 2);
});

test("reset keeps the current phase", () => {
  const s = core.initialState(T0);
  const brk = { ...s, timer: { phase: "short", status: "running", endAt: T0 + MIN, remainingMs: null } };
  const r = run(brk, "reset", T0);
  assert.equal(r.state.timer.phase, "short");
  assert.equal(core.formatClock(core.remainingMs(r.state, T0)), "05:00");
});

test("idle display uses configured duration of the phase", () => {
  const s = core.initialState(T0);
  const custom = { ...s, settings: { ...s.settings, focusMin: 30, shortMin: 10, longMin: 180 } };
  assert.equal(core.formatClock(core.remainingMs(custom, T0)), "30:00");
  const long = { ...custom, timer: { ...custom.timer, phase: "long" } };
  assert.equal(core.formatClock(core.remainingMs(long, T0)), "180:00");
});

test("invalid events are no-ops without effects", () => {
  const idle = core.initialState(T0);
  for (const type of ["pause", "resume", "bogus"]) {
    const r = run(idle, type, T0);
    assert.deepEqual(r.state, idle);
    assert.deepEqual(r.effects, []);
  }
  const running = run(idle, "start", T0).state;
  const again = run(running, "start", T0 + 5000);
  assert.deepEqual(again.state, running);
  assert.deepEqual(again.effects, []);
  assert.deepEqual(run(running, "resume", T0 + 5000).effects, []);
});

test("reduce does not mutate its input", () => {
  const s = core.initialState(T0);
  const snapshot = JSON.stringify(s);
  run(s, "start", T0);
  assert.equal(JSON.stringify(s), snapshot);
});

test("reduce rolls today over at local midnight (E7)", () => {
  let s = core.initialState(T0);
  s = { ...s, today: { date: "2026-01-14", count: 5, lastCountedEndAt: 123 } };
  const r = run(s, "reset", T0);
  assert.equal(r.state.today.date, "2026-01-15");
  assert.equal(r.state.today.count, 0);
});

test("formatClock rounds seconds up and handles edges", () => {
  assert.equal(core.formatClock(0), "00:00");
  assert.equal(core.formatClock(1), "00:01");
  assert.equal(core.formatClock(999), "00:01");
  assert.equal(core.formatClock(1000), "00:01");
  assert.equal(core.formatClock(1001), "00:02");
  assert.equal(core.formatClock(25 * MIN), "25:00");
  assert.equal(core.formatClock(180 * MIN), "180:00");
  assert.equal(core.formatClock(-5), "00:00");
});

test("phaseName", () => {
  assert.equal(core.phaseName("focus"), "Focus");
  assert.equal(core.phaseName("short"), "Short break");
  assert.equal(core.phaseName("long"), "Long break");
});

test("dateKey uses local date (TZ=UTC here)", () => {
  assert.equal(core.dateKey(Date.UTC(2026, 0, 5, 23, 59, 59)), "2026-01-05");
  assert.equal(core.dateKey(Date.UTC(2026, 0, 6, 0, 0, 0)), "2026-01-06");
  assert.equal(core.dateKey(Date.UTC(2026, 11, 31, 12)), "2026-12-31");
});

// ---- T-4: cycle, skip, settings, validation, rollover ----

function runningFocus(count, now, extra) {
  let s = core.initialState(now);
  s = { ...s, today: { ...s.today, count, ...(extra || {}) } };
  return run(s, "start", now).state;
}

test("AC6: focus end counts 1 and goes to short break idle", () => {
  const s = runningFocus(0, T0);
  const end = T0 + 25 * MIN;
  const r = run(s, "tick", end);
  assert.equal(r.state.today.count, 1);
  assert.equal(r.state.today.lastCountedEndAt, end);
  assert.deepEqual(r.state.timer, { phase: "short", status: "idle", endAt: null, remainingMs: null });
  assert.equal(core.formatClock(core.remainingMs(r.state, end)), "05:00");
  assert.deepEqual(r.effects, [{ type: "phaseEnded", finished: "focus", next: "short", live: true }, { type: "persist" }]);
});

test("tick before endAt or when not running does nothing", () => {
  const s = runningFocus(0, T0);
  const r = run(s, "tick", T0 + 25 * MIN - 1);
  assert.deepEqual(r.state, s);
  assert.deepEqual(r.effects, []);
  const idle = core.initialState(T0);
  assert.deepEqual(run(idle, "tick", T0 + 99 * MIN).effects, []);
  const paused = run(s, "pause", T0 + MIN).state;
  assert.deepEqual(run(paused, "tick", T0 + 99 * MIN).effects, []);
});

test("AC7: count 3 then focus end gives long break", () => {
  const r = run(runningFocus(3, T0), "tick", T0 + 25 * MIN);
  assert.equal(r.state.today.count, 4);
  assert.equal(r.state.timer.phase, "long");
  assert.equal(core.formatClock(core.remainingMs(r.state, T0)), "15:00");
  assert.equal(r.effects[0].next, "long");
  const r8 = run(runningFocus(7, T0), "tick", T0 + 25 * MIN);
  assert.equal(r8.state.timer.phase, "long");
  const r5 = run(runningFocus(4, T0), "tick", T0 + 25 * MIN);
  assert.equal(r5.state.timer.phase, "short");
});

test("AC8: break end goes to focus idle, count unchanged", () => {
  for (const phase of ["short", "long"]) {
    let s = core.initialState(T0);
    s = { ...s, today: { ...s.today, count: 4 }, timer: { phase, status: "running", endAt: T0 + MIN, remainingMs: null } };
    const r = run(s, "tick", T0 + MIN);
    assert.deepEqual(r.state.timer, { phase: "focus", status: "idle", endAt: null, remainingMs: null });
    assert.equal(r.state.today.count, 4);
    assert.deepEqual(r.effects, [{ type: "phaseEnded", finished: phase, next: "focus", live: true }, { type: "persist" }]);
  }
});

test("one transition per tick, even when far past endAt", () => {
  const s = runningFocus(0, T0);
  const r = run(s, "tick", T0 + 500 * MIN);
  assert.equal(r.state.timer.status, "idle");
  assert.equal(r.state.timer.phase, "short");
  assert.equal(r.effects.filter((e) => e.type === "phaseEnded").length, 1);
});

test("E5: lastCountedEndAt guard counts a focus end once", () => {
  const end = T0 + 25 * MIN;
  const s = runningFocus(1, T0, { lastCountedEndAt: end });
  const r = run(s, "tick", end);
  assert.equal(r.state.today.count, 1);
  assert.equal(r.state.timer.phase, "short");
});

test("AC9: skip from focus (running or idle) goes to short idle, not counted", () => {
  const idle = { ...core.initialState(T0) };
  idle.today = { ...idle.today, count: 3 };
  const r1 = run(idle, "skip", T0);
  assert.deepEqual(r1.state.timer, { phase: "short", status: "idle", endAt: null, remainingMs: null });
  assert.equal(r1.state.today.count, 3);
  assert.deepEqual(r1.effects, [{ type: "persist" }]);
  const running = run(idle, "start", T0).state;
  const r2 = run(running, "skip", T0 + MIN);
  assert.equal(r2.state.timer.phase, "short");
  assert.equal(r2.state.timer.status, "idle");
  assert.equal(r2.state.today.count, 3);
});

test("AC9b: skip during a break goes to focus idle", () => {
  for (const phase of ["short", "long"]) {
    for (const status of ["idle", "running", "paused"]) {
      const base = core.initialState(T0);
      const timer = { phase, status, endAt: status === "running" ? T0 + MIN : null, remainingMs: status === "paused" ? MIN : null };
      const r = run({ ...base, timer }, "skip", T0);
      assert.deepEqual(r.state.timer, { phase: "focus", status: "idle", endAt: null, remainingMs: null });
    }
  }
});

test("AC9c: skipped long break, next focus makes count 5 and a short break", () => {
  let s = core.initialState(T0);
  s = { ...s, today: { ...s.today, count: 4 }, timer: { phase: "long", status: "idle", endAt: null, remainingMs: null } };
  s = run(s, "skip", T0).state;
  assert.equal(s.timer.phase, "focus");
  s = run(s, "start", T0).state;
  const r = run(s, "tick", T0 + 25 * MIN);
  assert.equal(r.state.today.count, 5);
  assert.equal(r.state.timer.phase, "short");
});

test("D4: cycle uses today's count and resets at local midnight", () => {
  const day1 = Date.UTC(2026, 0, 15, 23, 0, 0);
  let s = core.initialState(day1);
  s = { ...s, today: { ...s.today, count: 3 } };
  s = run(s, "start", day1).state;
  // finishes 23:25, same day: count 4 -> long
  assert.equal(run(s, "tick", day1 + 25 * MIN).state.timer.phase, "long");
  // next day: count back to 0, first focus gives short
  const next = Date.UTC(2026, 0, 16, 9, 0, 0);
  let n = run(run(s, "reset", next).state, "start", next).state;
  assert.equal(n.today.count, 0);
  const r = run(n, "tick", next + 25 * MIN);
  assert.equal(r.state.today.count, 1);
  assert.equal(r.state.timer.phase, "short");
});

test("E7: focus finishing after midnight counts toward the new date", () => {
  const start = Date.UTC(2026, 0, 15, 23, 50, 0);
  let s = core.initialState(start);
  s = { ...s, today: { ...s.today, count: 2 } };
  s = run(s, "start", start).state;
  const end = start + 25 * MIN; // 00:15 on the 16th
  const r = run(s, "tick", end);
  assert.equal(r.state.today.date, "2026-01-16");
  assert.equal(r.state.today.count, 1);
  assert.equal(r.state.timer.phase, "short");
});

test("AC17/E7: a focus that ended on a past day is not counted today", () => {
  const start = Date.UTC(2026, 0, 15, 23, 0, 0);
  const s = run(core.initialState(start), "start", start).state;
  const late = Date.UTC(2026, 0, 16, 8, 0, 0); // tick arrives next morning
  const r = run(s, "tick", late);
  assert.equal(r.state.today.date, "2026-01-16");
  assert.equal(r.state.today.count, 0);
  assert.equal(r.state.timer.phase, "short");
  assert.equal(r.state.today.lastCountedEndAt, start + 25 * MIN);
});

test("R-03: midnight rollover on a no-op event emits persist", () => {
  let s = core.initialState(T0);
  s = { ...s, today: { date: "2026-01-14", count: 3, lastCountedEndAt: 77 } };
  for (const type of ["pause", "tick", "bogus", "dismissNotice"]) {
    const r = run(s, type, T0);
    assert.equal(r.state.today.count, 0, type);
    assert.deepEqual(r.effects, [{ type: "persist" }], type);
  }
  // no rollover, no-op: no effects; rollover with real event: one persist only
  assert.deepEqual(run(core.initialState(T0), "pause", T0).effects, []);
  assert.deepEqual(run(s, "start", T0).effects, [{ type: "persist" }]);
});

test("R-09: rollover keeps lastCountedEndAt and works on a running timer", () => {
  const start = Date.UTC(2026, 0, 15, 23, 50, 0); // ends 00:15, still running at 00:05
  let s = run(core.initialState(start), "start", start).state;
  s = { ...s, today: { ...s.today, count: 2, lastCountedEndAt: 555 } };
  const at = Date.UTC(2026, 0, 16, 0, 5, 0);
  const r = run(s, "pause", at);
  assert.equal(r.state.today.date, "2026-01-16");
  assert.equal(r.state.today.count, 0);
  assert.equal(r.state.today.lastCountedEndAt, 555);
  assert.equal(r.state.timer.status, "paused");
});

test("AC12/AC14: saveSettings applies to idle display, running phase untouched", () => {
  const settings = { focusMin: 30, shortMin: 10, longMin: 20, notify: true };
  const idle = core.initialState(T0);
  const r = core.reduce(idle, { type: "saveSettings", settings }, T0);
  assert.deepEqual(r.state.settings, settings);
  assert.deepEqual(r.effects, [{ type: "persist" }]);
  assert.equal(core.formatClock(core.remainingMs(r.state, T0)), "30:00");
  const running = run(idle, "start", T0).state;
  const r2 = core.reduce(running, { type: "saveSettings", settings }, T0 + MIN);
  assert.equal(r2.state.timer.endAt, running.timer.endAt);
  assert.equal(core.formatClock(core.remainingMs(r2.state, T0 + MIN)), "24:00");
  const done = run(r2.state, "tick", T0 + 25 * MIN);
  assert.equal(core.formatClock(core.remainingMs(done.state, T0)), "10:00");
});

test("saveSettings ignores invalid durations", () => {
  const idle = core.initialState(T0);
  for (const bad of [{ focusMin: 0, shortMin: 5, longMin: 15 }, { focusMin: 25, shortMin: 181, longMin: 15 }, { focusMin: 1.5, shortMin: 5, longMin: 15 }, null]) {
    const r = core.reduce(idle, { type: "saveSettings", settings: bad }, T0);
    assert.deepEqual(r.state, idle);
    assert.deepEqual(r.effects, []);
  }
});

test("dismissNotice clears the notice without effects", () => {
  const s = { ...core.initialState(T0), notice: { kind: "focusFinished", at: T0 } };
  const r = run(s, "dismissNotice", T0);
  assert.equal(r.state.notice, null);
  assert.deepEqual(r.effects, []);
});

test("R-16: start clears the focus-finished notice, pause keeps it", () => {
  const s = { ...core.initialState(T0), notice: { kind: "focusFinished", at: T0 } };
  const started = run(s, "start", T0);
  assert.equal(started.state.notice, null);
  assert.deepEqual(started.effects, [{ type: "persist" }]);
  const paused = run({ ...started.state, notice: { kind: "focusFinished", at: T0 } }, "pause", T0 + 1000);
  assert.deepEqual(paused.state.notice, { kind: "focusFinished", at: T0 });
});

test("AC13/E8: validateDuration boundaries 1 / 180 / 0 / 181", () => {
  assert.deepEqual(core.validateDuration("1"), { ok: true, value: 1 });
  assert.deepEqual(core.validateDuration("180"), { ok: true, value: 180 });
  assert.deepEqual(core.validateDuration(" 25 "), { ok: true, value: 25 });
  const err = "Enter a whole number from 1 to 180";
  for (const bad of ["0", "181", "-5", "1.5", "", "   ", "abc", "1e2", "25m", null, undefined, 25]) {
    assert.deepEqual(core.validateDuration(bad), { ok: false, error: err }, String(bad));
  }
});

test("R-05: titleFor is '<Phase> - mm:ss' for every status", () => {
  const idle = core.initialState(T0);
  assert.equal(core.titleFor(idle, T0), "Focus - 25:00");
  const running = run(idle, "start", T0).state;
  assert.equal(core.titleFor(running, T0 + 1000), "Focus - 24:59");
  const paused = run(running, "pause", T0 + 60 * 1000).state;
  assert.equal(core.titleFor(paused, T0 + 99 * MIN), "Focus - 24:00");
  const brk = run(running, "tick", T0 + 25 * MIN).state;
  assert.equal(core.titleFor(brk, T0 + 25 * MIN), "Short break - 05:00");
});

test("R-07: formatClock guards non-finite input", () => {
  for (const bad of [NaN, undefined, null, Infinity, "x"]) assert.equal(core.formatClock(bad), "00:00");
});

// ---- T-5: restore / adopt ----
const SET = { focusMin: 30, shortMin: 10, longMin: 20, notify: true };
const TODAY = (count, last = null) => ({ date: "2026-01-15", count, lastCountedEndAt: last });
const timer = (phase, status, endAt = null, remainingMs = null) => ({ phase, status, endAt, remainingMs });

test("AC16: idle timer restores settings, count and phase, no effects", () => {
  const r = core.restore({ settings: SET, timer: timer("short", "idle"), today: TODAY(2) }, T0);
  assert.deepEqual(r.state.settings, SET);
  assert.deepEqual(r.state.timer, timer("short", "idle"));
  assert.equal(r.state.today.count, 2);
  assert.equal(r.state.notice, null);
  assert.deepEqual(r.effects, []);
});

test("AC18: running with endAt in the future keeps endAt and counts down", () => {
  const endAt = T0 + 15 * MIN;
  const r = core.restore({ settings: null, timer: timer("focus", "running", endAt), today: TODAY(0) }, T0);
  assert.deepEqual(r.state.timer, timer("focus", "running", endAt));
  assert.equal(core.formatClock(core.remainingMs(r.state, T0)), "15:00");
  assert.deepEqual(r.effects, []);
});

test("AC19: paused keeps remaining time however long ago", () => {
  const r = core.restore({ settings: null, timer: timer("focus", "paused", null, 12.5 * MIN), today: TODAY(0) }, T0 + 60 * MIN);
  assert.deepEqual(r.state.timer, timer("focus", "paused", null, 12.5 * MIN));
  assert.equal(core.formatClock(core.remainingMs(r.state, T0 + 99 * MIN)), "12:30");
  assert.deepEqual(r.effects, []);
});

test("AC20: focus ended while closed is counted once, silent, with notice", () => {
  const endAt = T0 - 5 * MIN;
  const r = core.restore({ settings: null, timer: timer("focus", "running", endAt), today: TODAY(1) }, T0);
  assert.equal(r.state.today.count, 2);
  assert.equal(r.state.today.lastCountedEndAt, endAt);
  assert.deepEqual(r.state.timer, timer("short", "idle"));
  assert.deepEqual(r.state.notice, { kind: "focusFinished", at: endAt });
  assert.deepEqual(r.effects, [{ type: "phaseEnded", finished: "focus", next: "short", live: false }, { type: "persist" }]);
});

test("AC20/AC7: restored 4th focus leads to a long break", () => {
  const r = core.restore({ settings: null, timer: timer("focus", "running", T0 - MIN), today: TODAY(3) }, T0);
  assert.equal(r.state.today.count, 4);
  assert.equal(r.state.timer.phase, "long");
});

test("AC21: break ended while closed goes to Focus idle, no notice, no chaining", () => {
  for (const phase of ["short", "long"]) {
    const r = core.restore({ settings: null, timer: timer(phase, "running", T0 - 600 * MIN), today: TODAY(1) }, T0);
    assert.deepEqual(r.state.timer, timer("focus", "idle"));
    assert.equal(r.state.notice, null);
    assert.equal(r.state.today.count, 1);
    assert.deepEqual(r.effects, [{ type: "phaseEnded", finished: phase, next: "focus", live: false }, { type: "persist" }]);
  }
});

test("E5: lastCountedEndAt guard stops a double count on restore", () => {
  const endAt = T0 - MIN;
  const r = core.restore({ settings: null, timer: timer("focus", "running", endAt), today: TODAY(2, endAt) }, T0);
  assert.equal(r.state.today.count, 2);
  assert.equal(r.state.timer.phase, "short");
});

test("focus that ended on a past day is not counted today", () => {
  const endAt = Date.UTC(2026, 0, 14, 23, 50);
  const stored = { settings: null, timer: timer("focus", "running", endAt), today: { date: "2026-01-14", count: 3, lastCountedEndAt: null } };
  const r = core.restore(stored, T0);
  assert.equal(r.state.today.date, "2026-01-15");
  assert.equal(r.state.today.count, 0);
  assert.equal(r.state.timer.phase, "short");
  assert.equal(r.state.notice.at, endAt);
});

test("AC22: missing or null storage gives defaults", () => {
  for (const stored of [undefined, null, {}, { settings: null, timer: null, today: null }]) {
    const r = core.restore(stored, T0);
    assert.deepEqual(r.state, core.initialState(T0));
    assert.deepEqual(r.effects, []);
  }
});

test("AC22: invalid timer keeps valid settings and today", () => {
  const bad = [
    timer("focus", "running", null),
    timer("focus", "running", NaN),
    timer("focus", "running", "x"),
    timer("focus", "paused", null, null),
    timer("focus", "paused", null, -1),
    timer("nope", "idle"),
    timer("focus", "weird"),
    timer("focus", "running", T0 + 181 * MIN + 1),
    "junk",
  ];
  for (const t of bad) {
    const r = core.restore({ settings: SET, timer: t, today: TODAY(2) }, T0);
    assert.deepEqual(r.state.timer, timer("focus", "idle"), JSON.stringify(t));
    assert.deepEqual(r.state.settings, SET);
    assert.equal(r.state.today.count, 2);
    assert.deepEqual(r.effects, []);
  }
});

test("AC22: endAt exactly 181 min ahead is valid", () => {
  const r = core.restore({ settings: null, timer: timer("focus", "running", T0 + 181 * MIN), today: null }, T0);
  assert.equal(r.state.timer.status, "running");
});

test("AC22: invalid settings or today fall back alone", () => {
  const t = timer("focus", "paused", null, 1000);
  const r = core.restore({ settings: { ...SET, focusMin: 0 }, timer: t, today: { date: "x", count: -1, lastCountedEndAt: null } }, T0);
  assert.deepEqual(r.state.settings, core.initialState(T0).settings);
  assert.deepEqual(r.state.timer, t);
  assert.deepEqual(r.state.today, core.initialState(T0).today);
});

test("restore: idle timer with stray endAt is normalised", () => {
  const r = core.restore({ settings: null, timer: { phase: "long", status: "idle", endAt: 5, remainingMs: 7 }, today: null }, T0);
  assert.deepEqual(r.state.timer, timer("long", "idle"));
});

test("E5: adopt takes valid stored parts, keeps notice, no effects shape", () => {
  const mine = { ...core.initialState(T0), notice: { kind: "focusFinished", at: T0 } };
  const next = core.adopt(mine, { settings: SET, timer: timer("short", "idle"), today: TODAY(3, T0) });
  assert.deepEqual(next.settings, SET);
  assert.deepEqual(next.timer, timer("short", "idle"));
  assert.deepEqual(next.today, TODAY(3, T0));
  assert.deepEqual(next.notice, mine.notice);
  assert.notEqual(next, mine);
});

test("E5: adopt keeps own parts when stored parts are null or invalid", () => {
  const mine = run(core.initialState(T0), "start", T0).state;
  assert.deepEqual(core.adopt(mine, { settings: null, timer: null, today: null }), mine);
  assert.deepEqual(core.adopt(mine, null), mine);
  assert.deepEqual(core.adopt(mine, { timer: timer("focus", "running", NaN) }), mine);
});

test("E5: adopted running timer does not end by itself; tick after adopt of idle does nothing", () => {
  const mine = run(core.initialState(T0), "start", T0).state;
  const end = T0 + 25 * MIN;
  const adopted = core.adopt(mine, { settings: null, timer: timer("short", "idle"), today: TODAY(1, end) });
  const r = core.reduce(adopted, { type: "tick" }, end);
  assert.deepEqual(r.effects, []);
  assert.equal(r.state.today.count, 1);
});

test("R-11: clock moving to an earlier date does not reset today's count; a later date does", () => {
  const s = Object.assign(core.initialState(T0), { today: { date: "2026-01-15", count: 3, lastCountedEndAt: null } });
  const back = core.reduce(s, { type: "dismissNotice" }, T0 - 24 * 60 * MIN);
  assert.equal(back.state.today.count, 3);
  assert.equal(back.state.today.date, "2026-01-15");
  const fwd = core.reduce(s, { type: "dismissNotice" }, T0 + 24 * 60 * MIN);
  assert.equal(fwd.state.today.count, 0);
  assert.equal(fwd.state.today.date, "2026-01-16");
});

test("R-12: restore and adopt reject a non-string phase such as an array", () => {
  const bad = { phase: ["focus"], status: "idle", endAt: null, remainingMs: null };
  assert.equal(core.restore({ timer: bad }, T0).state.timer.phase, "focus");
  assert.deepEqual(core.restore({ timer: bad }, T0).state.timer, core.initialState(T0).timer);
  const mine = run(core.initialState(T0), "start", T0).state;
  assert.deepEqual(core.adopt(mine, { timer: bad }, T0), mine);
  assert.deepEqual(core.adopt(mine, { timer: { phase: "toString", status: "idle" } }, T0), mine);
});

test("R-13: paused remainingMs above 181 min is rejected, 181 min is kept", () => {
  const paused = (ms) => ({ phase: "focus", status: "paused", endAt: null, remainingMs: ms });
  assert.deepEqual(core.restore({ timer: paused(9e9) }, T0).state.timer, core.initialState(T0).timer);
  assert.deepEqual(core.restore({ timer: paused(181 * MIN) }, T0).state.timer, paused(181 * MIN));
});

test("R-15: pause after endAt has passed ends the phase instead of storing 0", () => {
  const running = run(core.initialState(T0), "start", T0).state;
  const r = run(running, "pause", T0 + 25 * MIN + 5000);
  assert.equal(r.state.timer.status, "idle");
  assert.equal(r.state.timer.phase, "short");
  assert.equal(r.state.today.count, 1);
  assert.ok(r.effects.some((e) => e.type === "phaseEnded"));
  const later = run(r.state, "tick", T0 + 26 * MIN);
  assert.equal(later.state.today.count, 1);
  assert.equal(later.state.timer.status, "idle");
});
