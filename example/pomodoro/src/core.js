"use strict";
// Pure core: no DOM, storage or Date.now(). Time comes in as nowMs.
(function () {
  var PHASE_NAMES = { focus: "Focus", short: "Short break", long: "Long break" };

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function dateKey(ms) {
    var d = new Date(ms);
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function phaseName(phase) {
    return PHASE_NAMES[phase];
  }

  function initialState(nowMs) {
    return {
      settings: { focusMin: 25, shortMin: 5, longMin: 15, notify: false },
      timer: { phase: "focus", status: "idle", endAt: null, remainingMs: null },
      today: { date: dateKey(nowMs), count: 0, lastCountedEndAt: null },
      notice: null,
    };
  }

  function durationMs(settings, phase) {
    var min = phase === "focus" ? settings.focusMin : phase === "short" ? settings.shortMin : settings.longMin;
    return min * 60000;
  }

  function remainingMs(state, nowMs) {
    var t = state.timer;
    if (t.status === "running") return Math.max(0, t.endAt - nowMs);
    if (t.status === "paused") return t.remainingMs;
    return durationMs(state.settings, t.phase);
  }

  function formatClock(ms) {
    var total = Number.isFinite(ms) ? Math.ceil(Math.max(0, ms) / 1000) : 0;
    return pad2(Math.floor(total / 60)) + ":" + pad2(total % 60);
  }

  function withTimer(state, timer) {
    return Object.assign({}, state, { timer: timer });
  }

  var PERSIST = [{ type: "persist" }];

  function titleFor(state, nowMs) {
    return phaseName(state.timer.phase) + " - " + formatClock(remainingMs(state, nowMs));
  }

  var DURATION_ERROR = "Enter a whole number from 1 to 180";

  function validateDuration(text) {
    if (typeof text !== "string" || !/^\s*\d+\s*$/.test(text)) return { ok: false, error: DURATION_ERROR };
    var value = Number(text.trim());
    if (!(value >= 1 && value <= 180)) return { ok: false, error: DURATION_ERROR };
    return { ok: true, value: value };
  }

  function validDuration(n) {
    return Number.isInteger(n) && n >= 1 && n <= 180;
  }

  // Ends the phase that finished at endAt. One transition, never chains.
  function transition(s, endAt, live) {
    var t = s.timer;
    var finished = t.phase;
    var today = s.today;
    var next;
    if (finished === "focus") {
      var guarded = today.lastCountedEndAt === endAt;
      var sameDay = dateKey(endAt) === today.date;
      if (!guarded && sameDay) {
        today = Object.assign({}, today, { count: today.count + 1, lastCountedEndAt: endAt });
      } else if (!guarded) {
        today = Object.assign({}, today, { lastCountedEndAt: endAt });
      }
      // A session from a past day does not count today and never earns a long break.
      next = (guarded || sameDay) && today.count > 0 && today.count % 4 === 0 ? "long" : "short";
    } else {
      next = "focus";
    }
    return {
      state: Object.assign({}, s, {
        today: today,
        timer: { phase: next, status: "idle", endAt: null, remainingMs: null },
      }),
      effects: [{ type: "phaseEnded", finished: finished, next: next, live: live }, { type: "persist" }],
    };
  }

  function reduce(state, event, nowMs) {
    var s = state;
    var rolled = false;
    if (dateKey(nowMs) > s.today.date) {
      rolled = true;
      s = Object.assign({}, s, {
        today: Object.assign({}, s.today, { date: dateKey(nowMs), count: 0 }),
      });
    }
    var r = apply(s, event, nowMs);
    // A rollover that changed `today` must be saved even when the event itself did nothing.
    if (rolled && r.effects.every(function (e) { return e.type !== "persist"; })) {
      r.effects = r.effects.concat(PERSIST);
    }
    return r;
  }

  function apply(s, event, nowMs) {
    var t = s.timer;
    switch (event && event.type) {
      case "start":
        if (t.status !== "idle") break;
        // R-16: the catch-up banner goes away when the next phase starts.
        return {
          state: Object.assign(withTimer(s, { phase: t.phase, status: "running", endAt: nowMs + durationMs(s.settings, t.phase), remainingMs: null }), { notice: null }),
          effects: PERSIST.slice(),
        };
      case "pause":
        if (t.status !== "running") break;
        // R-15: the phase already ended; finish it instead of storing remainingMs 0.
        if (nowMs >= t.endAt) return transition(s, t.endAt, true);
        return {
          state: withTimer(s, { phase: t.phase, status: "paused", endAt: null, remainingMs: Math.max(0, t.endAt - nowMs) }),
          effects: PERSIST.slice(),
        };
      case "resume":
        if (t.status !== "paused") break;
        return {
          state: withTimer(s, { phase: t.phase, status: "running", endAt: nowMs + t.remainingMs, remainingMs: null }),
          effects: PERSIST.slice(),
        };
      case "reset":
        return {
          state: withTimer(s, { phase: t.phase, status: "idle", endAt: null, remainingMs: null }),
          effects: PERSIST.slice(),
        };
      case "skip":
        return {
          state: withTimer(s, { phase: t.phase === "focus" ? "short" : "focus", status: "idle", endAt: null, remainingMs: null }),
          effects: PERSIST.slice(),
        };
      case "tick":
        if (t.status !== "running" || !(nowMs >= t.endAt)) break;
        return transition(s, t.endAt, true);
      case "saveSettings": {
        var n = event.settings;
        if (!n || !validDuration(n.focusMin) || !validDuration(n.shortMin) || !validDuration(n.longMin)) break;
        return {
          state: Object.assign({}, s, {
            settings: { focusMin: n.focusMin, shortMin: n.shortMin, longMin: n.longMin, notify: n.notify === true },
          }),
          effects: PERSIST.slice(),
        };
      }
      case "dismissNotice":
        return { state: Object.assign({}, s, { notice: null }), effects: [] };
    }
    return { state: s, effects: [] };
  }

  // ---- restore / adopt -------------------------------------------------
  var MAX_AHEAD_MS = 181 * 60000; // 180 min phase + 1 min slack

  function isObj(x) {
    return x !== null && typeof x === "object";
  }

  function validSettings(x) {
    return isObj(x) && validDuration(x.focusMin) && validDuration(x.shortMin) && validDuration(x.longMin) && typeof x.notify === "boolean";
  }

  function validToday(x) {
    return (
      isObj(x) &&
      typeof x.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.date) &&
      Number.isInteger(x.count) && x.count >= 0 &&
      (x.lastCountedEndAt === null || Number.isFinite(x.lastCountedEndAt))
    );
  }

  // Returns a normalised timer or null. nowMs is optional: without it the "too far ahead" rule is skipped.
  function validTimer(x, nowMs) {
    if (!isObj(x) || typeof x.phase !== "string" || !Object.prototype.hasOwnProperty.call(PHASE_NAMES, x.phase)) return null;
    if (x.status === "idle") return { phase: x.phase, status: "idle", endAt: null, remainingMs: null };
    if (x.status === "paused") {
      if (!(typeof x.remainingMs === "number" && Number.isFinite(x.remainingMs) && x.remainingMs >= 0 && x.remainingMs <= MAX_AHEAD_MS)) return null;
      return { phase: x.phase, status: "paused", endAt: null, remainingMs: x.remainingMs };
    }
    if (x.status === "running") {
      if (!(typeof x.endAt === "number" && Number.isFinite(x.endAt))) return null;
      if (typeof nowMs === "number" && x.endAt > nowMs + MAX_AHEAD_MS) return null;
      return { phase: x.phase, status: "running", endAt: x.endAt, remainingMs: null };
    }
    return null;
  }

  // Reconciles data loaded at boot. Each part is validated alone; a bad part becomes its default.
  function restore(stored, nowMs) {
    var base = initialState(nowMs);
    var st = isObj(stored) ? stored : {};
    var s = {
      settings: validSettings(st.settings) ? Object.assign({}, st.settings) : base.settings,
      timer: validTimer(st.timer, nowMs) || base.timer,
      today: validToday(st.today) ? Object.assign({}, st.today) : base.today,
      notice: null,
    };
    // Same rollover as reduce: a session from a past day does not count today.
    if (s.today.date !== base.today.date) {
      s.today = Object.assign({}, s.today, { date: base.today.date, count: 0 });
    }
    var t = s.timer;
    if (t.status === "running" && t.endAt <= nowMs) {
      var r = transition(s, t.endAt, false);
      if (t.phase === "focus") r.state = Object.assign({}, r.state, { notice: { kind: "focusFinished", at: t.endAt } });
      return r;
    }
    return { state: s, effects: [] };
  }

  // Takes another tab's saved state (no catch-up effects). Invalid parts are ignored; notice is kept.
  // nowMs is optional and enables the "too far ahead" rule for the timer.
  function adopt(state, stored, nowMs) {
    var st = isObj(stored) ? stored : {};
    var timer = validTimer(st.timer, nowMs);
    return Object.assign({}, state, {
      settings: validSettings(st.settings) ? Object.assign({}, st.settings) : state.settings,
      timer: timer || state.timer,
      today: validToday(st.today) ? Object.assign({}, st.today) : state.today,
    });
  }

  var api = {
    initialState: initialState,
    reduce: reduce,
    restore: restore,
    adopt: adopt,
    remainingMs: remainingMs,
    formatClock: formatClock,
    phaseName: phaseName,
    dateKey: dateKey,
    titleFor: titleFor,
    validateDuration: validateDuration,
  };

  (globalThis.Pomodoro ||= {}).core = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})();
