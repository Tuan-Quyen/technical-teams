"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createStorage, KEYS } = require("../src/storage.js");

function fakeBackend(initial) {
  const data = new Map(Object.entries(initial || {}));
  const calls = { set: [], get: [] };
  return {
    data,
    calls,
    getItem(k) { calls.get.push(k); return data.has(k) ? data.get(k) : null; },
    setItem(k, v) { calls.set.push(k); data.set(k, v); },
    removeItem(k) { data.delete(k); },
  };
}
function throwingBackend() {
  const f = () => { throw new Error("SecurityError"); };
  return { getItem: f, setItem: f, removeItem: f };
}

const state = {
  settings: { focusMin: 30, shortMin: 10, longMin: 20, notify: true },
  timer: { phase: "short", status: "running", endAt: 1700000000000, remainingMs: null },
  today: { date: "2026-11-17", count: 2, lastCountedEndAt: 1699999000000 },
};

test("keys use the v1 prefix", () => {
  assert.deepEqual(KEYS, {
    settings: "pomodoro:v1:settings",
    timer: "pomodoro:v1:timer",
    today: "pomodoro:v1:today",
  });
});

test("empty backend loads three nulls and is persistent", () => {
  const s = createStorage(fakeBackend());
  assert.deepEqual(s.load(), { settings: null, timer: null, today: null });
  assert.equal(s.isPersistent, true);
});

test("save then load round-trips and stores v:1", () => {
  const be = fakeBackend();
  const s = createStorage(be);
  s.save(state);
  assert.equal(JSON.parse(be.data.get(KEYS.settings)).v, 1);
  assert.equal(JSON.parse(be.data.get(KEYS.timer)).v, 1);
  assert.equal(JSON.parse(be.data.get(KEYS.today)).v, 1);
  assert.deepEqual(createStorage(be).load(), state);
});

test("paused and idle timers round-trip", () => {
  const be = fakeBackend();
  const s = createStorage(be);
  const paused = { phase: "focus", status: "paused", endAt: null, remainingMs: 61000 };
  s.save({ timer: paused });
  assert.deepEqual(s.load().timer, paused);
  const idle = { phase: "long", status: "idle", endAt: null, remainingMs: null };
  s.save({ timer: idle });
  assert.deepEqual(s.load().timer, idle);
});

test("save writes only changed keys", () => {
  const be = fakeBackend();
  const s = createStorage(be);
  s.save(state);
  assert.equal(be.calls.set.length, 3);
  s.save(state);
  assert.equal(be.calls.set.length, 3);
  s.save({ ...state, today: { ...state.today, count: 3 } });
  assert.deepEqual(be.calls.set.slice(3), [KEYS.today]);
});

test("save after load skips keys already identical in the backend", () => {
  const be = fakeBackend();
  createStorage(be).save(state);
  const s = createStorage(be);
  s.load();
  be.calls.set.length = 0;
  s.save(state);
  assert.deepEqual(be.calls.set, []);
});

test("each key is validated on its own; invalid becomes null", () => {
  const be = fakeBackend({
    [KEYS.settings]: JSON.stringify({ v: 1, ...state.settings }),
    [KEYS.timer]: "{not json",
    [KEYS.today]: JSON.stringify({ v: 2, ...state.today }),
  });
  assert.deepEqual(createStorage(be).load(), { settings: state.settings, timer: null, today: null });
});

test("invalid settings values are rejected", () => {
  const bad = [
    { focusMin: 0 }, { focusMin: 181 }, { shortMin: 1.5 }, { longMin: "15" },
    { notify: "yes" }, { focusMin: null },
  ];
  for (const patch of bad) {
    const be = fakeBackend({ [KEYS.settings]: JSON.stringify({ v: 1, ...state.settings, ...patch }) });
    assert.equal(createStorage(be).load().settings, null, JSON.stringify(patch));
  }
  for (const m of [1, 180]) {
    const be = fakeBackend({ [KEYS.settings]: JSON.stringify({ v: 1, ...state.settings, focusMin: m }) });
    assert.equal(createStorage(be).load().settings.focusMin, m);
  }
});

test("invalid timer shapes are rejected", () => {
  const base = { v: 1, phase: "focus", status: "running", endAt: 1000, remainingMs: null };
  const bad = [
    { phase: "nap" }, { status: "stopped" }, { endAt: null }, { endAt: "1000" },
    { endAt: Infinity }, { status: "paused", endAt: null, remainingMs: null },
    { status: "paused", endAt: null, remainingMs: -1 }, { v: 0 },
  ];
  for (const patch of bad) {
    const be = fakeBackend({ [KEYS.timer]: JSON.stringify({ ...base, ...patch }) });
    assert.equal(createStorage(be).load().timer, null, JSON.stringify(patch));
  }
});

test("invalid today shapes are rejected", () => {
  const base = { v: 1, ...state.today };
  const bad = [
    { date: "17/11/2026" }, { date: 20261117 }, { count: -1 }, { count: 1.5 },
    { count: "2" }, { lastCountedEndAt: "x" }, { lastCountedEndAt: undefined },
  ];
  for (const patch of bad) {
    const be = fakeBackend({ [KEYS.today]: JSON.stringify({ ...base, ...patch }) });
    assert.equal(createStorage(be).load().today, null, JSON.stringify(patch));
  }
  const be = fakeBackend({ [KEYS.today]: JSON.stringify({ ...base, lastCountedEndAt: null }) });
  assert.equal(createStorage(be).load().today.lastCountedEndAt, null);
});

test("non-object JSON is rejected", () => {
  for (const raw of ["null", "[]", "5", '"x"']) {
    const be = fakeBackend({ [KEYS.today]: raw });
    assert.equal(createStorage(be).load().today, null, raw);
  }
});

test("throwing backend: no crash, memory fallback, isPersistent false (E6)", () => {
  const s = createStorage(throwingBackend());
  assert.deepEqual(s.load(), { settings: null, timer: null, today: null });
  assert.equal(s.isPersistent, false);
  s.save(state);
  assert.deepEqual(s.load(), state);
});

test("backend that throws only on setItem falls back and keeps the value in memory", () => {
  const be = fakeBackend();
  be.setItem = () => { throw new Error("QuotaExceededError"); };
  const s = createStorage(be);
  assert.equal(s.isPersistent, true);
  s.save(state);
  assert.equal(s.isPersistent, false);
  assert.deepEqual(s.load(), state);
});

test("default backend with no localStorage falls back to memory", () => {
  const s = createStorage();
  assert.equal(s.isPersistent, false);
  s.save(state);
  assert.deepEqual(s.load(), state);
});

test("default backend whose accessor throws falls back to memory", () => {
  const desc = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() { throw new Error("SecurityError"); },
  });
  try {
    const s = createStorage();
    assert.equal(s.isPersistent, false);
    assert.deepEqual(s.load(), { settings: null, timer: null, today: null });
  } finally {
    if (desc) Object.defineProperty(globalThis, "localStorage", desc);
    else delete globalThis.localStorage;
  }
});

test("R-13: paused remainingMs above 181 min is rejected on load", () => {
  const mk = (ms) => JSON.stringify({ v: 1, phase: "focus", status: "paused", endAt: null, remainingMs: ms });
  assert.equal(createStorage(fakeBackend({ [KEYS.timer]: mk(9e9) })).load().timer, null);
  assert.equal(createStorage(fakeBackend({ [KEYS.timer]: mk(181 * 60000) })).load().timer.remainingMs, 181 * 60000);
});
