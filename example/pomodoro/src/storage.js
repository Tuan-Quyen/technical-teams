"use strict";
// Storage adapter: three versioned localStorage keys, per-key validation,
// in-memory fallback when localStorage is unavailable (E6). No DOM access.
(function () {
  var PREFIX = "pomodoro:v1:";
  var KEYS = { settings: PREFIX + "settings", timer: PREFIX + "timer", today: PREFIX + "today" };
  var PHASES = ["focus", "short", "long"];
  var MAX_REMAINING_MS = 181 * 60000; // keep in step with core MAX_AHEAD_MS
  var STATUSES = ["idle", "running", "paused"];

  function isObj(x) {
    return x !== null && typeof x === "object" && !Array.isArray(x);
  }
  function isMin(n) {
    return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 180;
  }
  function isTime(n) {
    return typeof n === "number" && isFinite(n);
  }

  // Each returns the clean value (without "v") or null when invalid.
  var validators = {
    settings: function (o) {
      if (!isMin(o.focusMin) || !isMin(o.shortMin) || !isMin(o.longMin) || typeof o.notify !== "boolean") return null;
      return { focusMin: o.focusMin, shortMin: o.shortMin, longMin: o.longMin, notify: o.notify };
    },
    timer: function (o) {
      if (PHASES.indexOf(o.phase) < 0 || STATUSES.indexOf(o.status) < 0) return null;
      if (o.status === "running") {
        if (!isTime(o.endAt)) return null;
        return { phase: o.phase, status: "running", endAt: o.endAt, remainingMs: null };
      }
      if (o.status === "paused") {
        if (!isTime(o.remainingMs) || o.remainingMs < 0 || o.remainingMs > MAX_REMAINING_MS) return null;
        return { phase: o.phase, status: "paused", endAt: null, remainingMs: o.remainingMs };
      }
      return { phase: o.phase, status: "idle", endAt: null, remainingMs: null };
    },
    today: function (o) {
      if (typeof o.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(o.date)) return null;
      if (typeof o.count !== "number" || !Number.isInteger(o.count) || o.count < 0) return null;
      if (o.lastCountedEndAt !== null && !isTime(o.lastCountedEndAt)) return null;
      return { date: o.date, count: o.count, lastCountedEndAt: o.lastCountedEndAt };
    },
  };

  function parse(name, raw) {
    if (typeof raw !== "string") return null;
    var o;
    try {
      o = JSON.parse(raw);
    } catch (e) {
      return null;
    }
    if (!isObj(o) || o.v !== 1) return null;
    return validators[name](o);
  }

  function serialize(value) {
    return JSON.stringify(Object.assign({ v: 1 }, value));
  }

  function memoryBackend() {
    var m = new Map();
    return {
      getItem: function (k) { return m.has(k) ? m.get(k) : null; },
      setItem: function (k, v) { m.set(k, String(v)); },
      removeItem: function (k) { m.delete(k); },
    };
  }

  function createStorage(backend) {
    var persistent = true;
    var mem = null;
    var written = {}; // last JSON known to be in the backend, per name

    var b = backend;
    if (b === undefined) {
      try {
        b = globalThis.localStorage;
      } catch (e) {
        b = null;
      }
    }
    if (!b || typeof b.getItem !== "function" || typeof b.setItem !== "function") {
      persistent = false;
      mem = b = memoryBackend();
    }

    function fallback() {
      if (persistent) {
        persistent = false;
        mem = memoryBackend();
        written = {};
      }
      return mem;
    }

    function read(key) {
      if (persistent) {
        try {
          return b.getItem(key);
        } catch (e) {
          fallback();
        }
      }
      return mem.getItem(key);
    }

    function write(key, json) {
      if (persistent) {
        try {
          b.setItem(key, json);
          return;
        } catch (e) {
          fallback();
        }
      }
      mem.setItem(key, json);
    }

    var store = {
      load: function () {
        var out = {};
        Object.keys(KEYS).forEach(function (name) {
          var raw = read(KEYS[name]);
          out[name] = parse(name, raw);
          if (typeof raw === "string") written[name] = raw;
          else delete written[name];
        });
        return out;
      },
      save: function (state) {
        if (!state) return;
        Object.keys(KEYS).forEach(function (name) {
          var value = state[name];
          if (!isObj(value)) return;
          var json = serialize(value);
          if (written[name] === json) return;
          write(KEYS[name], json);
          written[name] = json;
        });
      },
    };
    Object.defineProperty(store, "isPersistent", {
      enumerable: true,
      get: function () { return persistent; },
    });
    return store;
  }

  var api = { createStorage: createStorage, KEYS: KEYS };

  (globalThis.Pomodoro ||= {}).storage = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})();
