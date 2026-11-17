"use strict";
// App shell: boot, render, Start / Pause / Resume / Reset / Skip, phase cycle.
// Storage is loaded before the first render. Alerts, settings dialog, two-tab sync.
(function () {
  var core = globalThis.Pomodoro && globalThis.Pomodoro.core;
  if (!core) return;

  var RENDER_MS = 250;
  var WARNING_TEXT = "Notifications are off in your browser. You'll still get a sound and the tab title.";
  var KEY_PREFIX = "pomodoro:v1:";
  var noop = function () {};
  var alerts = (globalThis.Pomodoro && globalThis.Pomodoro.alerts) || {
    unlockAudio: noop, beep: noop, setTitle: noop, notify: noop,
    notificationSupport: function () { return "unsupported"; },
    requestNotificationPermission: function () { return Promise.resolve("unsupported"); },
  };
  var storage = globalThis.Pomodoro.storage ? globalThis.Pomodoro.storage.createStorage() : null;
  var state = core.initialState(Date.now());
  var restoreEffects = [];
  var restoreMessage = "";
  if (storage) {
    var restored = core.restore(storage.load(), Date.now());
    state = restored.state;
    restoreEffects = restored.effects;
  }

  var els = {
    app: document.getElementById("app"),
    phase: document.getElementById("phase-label"),
    timer: document.getElementById("timer"),
    paused: document.getElementById("paused-note"),
    primary: document.getElementById("primary-btn"),
    reset: document.getElementById("reset-btn"),
    skip: document.getElementById("skip-btn"),
    count: document.getElementById("count"),
    live: document.getElementById("live"),
    settings: document.getElementById("settings-btn"),
    banner: document.getElementById("banner"),
    bannerText: document.getElementById("banner-text"),
    bannerDismiss: document.getElementById("banner-dismiss"),
    dialog: document.getElementById("settings-dialog"),
    form: document.getElementById("settings-form"),
    cancel: document.getElementById("settings-cancel"),
    notifyCheck: document.getElementById("notify-check"),
    fields: {
      focusMin: document.getElementById("focus-min"),
      shortMin: document.getElementById("short-min"),
      longMin: document.getElementById("long-min"),
    },
  };

  var endTimer = null;
  var armedKey = null; // "status:endAt" the current timeout was armed for
  var warning = false; // notifications blocked (E2); shown in the banner until dismissed or next Start

  function dispatch(event) {
    var result = core.reduce(state, event, Date.now());
    state = result.state;
    if (event.type === "start") warning = false;
    applyEffects(result.effects);
    armEndTimer();
    render();
  }

  function minutesOf(phase) {
    var m = phase === "focus" ? state.settings.focusMin : phase === "short" ? state.settings.shortMin : state.settings.longMin;
    return m + (m === 1 ? " minute" : " minutes");
  }

  function applyEffects(effects) {
    effects.forEach(function (effect) {
      if (effect.type === "persist") {
        if (storage) storage.save(state);
      } else if (effect.type === "phaseEnded" && effect.live) {
        alerts.beep();
        if (state.settings.notify) {
          alerts.notify(effect.finished === "focus"
            ? "Nice work. Time for a " + core.phaseName(effect.next).toLowerCase() + "."
            : "Break's over. Ready to focus?");
        }
        announce(
          (effect.finished === "focus" ? "Focus done. " : "Break's over. ") +
          "Next up: " + core.phaseName(effect.next).toLowerCase() + ", " + minutesOf(effect.next) +
          ". Press Start when you're ready."
        );
      }
    });
  }

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function spoken(ms) {
    var total = Math.max(0, Math.ceil(ms / 1000));
    var m = Math.floor(total / 60);
    var s = total % 60;
    var parts = [];
    if (m) parts.push(m + (m === 1 ? " minute" : " minutes"));
    if (s || !m) parts.push(s + (s === 1 ? " second" : " seconds"));
    return parts.join(" ");
  }

  function describeRestore() {
    var t = state.timer;
    var now = Date.now();
    if (t.status === "idle") {
      return state.notice ? bannerText() + ". " + core.phaseName(t.phase) + " is ready when you are." : "";
    }
    return "Welcome back. " + core.phaseName(t.phase) + " is " + t.status + ", " + spoken(core.remainingMs(state, now)) + " left.";
  }

  function bannerText() {
    var d = new Date(state.notice.at);
    return "Focus finished at " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  // Announce once per phase change: clear first so identical text is re-read.
  function announce(text) {
    els.live.textContent = "";
    els.live.textContent = text;
  }

  // One-shot timer at endAt; always replaced, so pause / reset / skip clear it.
  // R-14: re-armed only when status or endAt changed, not on every 250 ms tick.
  function armEndTimer() {
    var t = state.timer;
    var key = t.status === "running" ? "running:" + t.endAt : "off";
    if (key === armedKey) return;
    armedKey = key;
    if (endTimer !== null) clearTimeout(endTimer);
    endTimer = null;
    if (t.status !== "running") return;
    var delay = Math.min(Math.max(0, t.endAt - Date.now()), 2147483647);
    endTimer = setTimeout(function () {
      endTimer = null;
      armedKey = null; // fired: let the next arm replace it even if endAt is unchanged
      tickOwn();
    }, delay);
  }

  // R-10: storage is the shared truth. load() refreshes the written cache, adopt() takes
  // the other tab's state. No effects, so no sound and no write.
  function syncFromStorage() {
    if (!storage) return;
    state = core.adopt(state, storage.load(), Date.now());
    armEndTimer();
  }

  // Own phase end: adopt first, so a tab whose phase the other tab already ended stays silent.
  function tickOwn() {
    var t = state.timer;
    if (t.status === "running" && Date.now() >= t.endAt) syncFromStorage();
    dispatch({ type: "tick" });
  }

  function render() {
    var now = Date.now();
    var t = state.timer;
    var name = core.phaseName(t.phase);
    var clock = core.formatClock(core.remainingMs(state, now));

    els.app.dataset.phase = t.phase;
    setText(els.phase, name);
    setText(els.timer, clock);
    // Not a live region: updating the label does not announce every second.
    setAttr(els.timer, "aria-label", name + ", " + clock + " left");
    els.paused.hidden = t.status !== "paused";
    setText(els.count, "Today: " + state.today.count + (state.today.count === 1 ? " session" : " sessions"));
    setText(els.primary, t.status === "running" ? "Pause" : t.status === "paused" ? "Resume" : "Start");

    var hasNotice = !!state.notice && state.notice.kind === "focusFinished";
    var showBanner = warning || hasNotice;
    if (els.banner.hidden === showBanner) els.banner.hidden = !showBanner;
    if (showBanner) {
      setAttr(els.banner, "data-kind", warning ? "warning" : "info");
      setText(els.bannerText, warning ? WARNING_TEXT : bannerText());
    }

    alerts.setTitle(core.titleFor(state, now));
  }

  function setText(el, text) {
    if (el.textContent !== text) el.textContent = text;
  }

  function setAttr(el, name, value) {
    if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  }

  els.primary.addEventListener("click", function () {
    var status = state.timer.status;
    if (status !== "running") alerts.unlockAudio();
    dispatch({ type: status === "running" ? "pause" : status === "paused" ? "resume" : "start" });
    // Q-01: replace the stale restore message so Pause / Resume is confirmed to screen readers.
    // R-01: skip when the phase ended instead (R-15); the phase-end announce stands.
    var after = state.timer.status;
    if (status !== "idle" && after === (status === "running" ? "paused" : "running")) {
      announce((status === "running" ? "Paused, " : "Resumed, ") + spoken(core.remainingMs(state, Date.now())) + " left.");
    }
  });

  els.reset.addEventListener("click", function () {
    dispatch({ type: "reset" });
  });

  els.bannerDismiss.addEventListener("click", function () {
    if (warning) {
      warning = false;
      render();
    } else {
      dispatch({ type: "dismissNotice" });
    }
  });

  els.skip.addEventListener("click", function () {
    dispatch({ type: "skip" });
  });

  // ---- Settings dialog ----------------------------------------------
  var FIELD_NAMES = ["focusMin", "shortMin", "longMin"];

  function fieldError(name) {
    return document.getElementById(els.fields[name].id + "-error");
  }

  // Returns the parsed minutes, or null after showing the inline error.
  function checkField(name) {
    var input = els.fields[name];
    var err = fieldError(name);
    var r = core.validateDuration(input.value);
    if (r.ok) {
      err.hidden = true;
      err.textContent = "";
      input.removeAttribute("aria-invalid");
      return r.value;
    }
    err.textContent = r.error;
    err.hidden = false;
    input.setAttribute("aria-invalid", "true");
    return null;
  }

  function openSettings() {
    FIELD_NAMES.forEach(function (name) {
      els.fields[name].value = String(state.settings[name]);
      checkField(name);
      fieldError(name).hidden = true;
      els.fields[name].removeAttribute("aria-invalid");
    });
    // R-18: permission may have been revoked since it was saved; never show the box checked then.
    els.notifyCheck.checked = state.settings.notify && alerts.notificationSupport() === "granted";
    els.dialog.showModal();
    els.fields.focusMin.focus();
  }

  els.settings.addEventListener("click", openSettings);
  els.cancel.addEventListener("click", function () {
    els.dialog.close();
  });
  els.dialog.addEventListener("close", function () {
    els.settings.focus();
  });

  FIELD_NAMES.forEach(function (name) {
    els.fields[name].addEventListener("blur", function () {
      if (els.dialog.open && els.fields[name].value !== "") checkField(name);
    });
  });

  // E2: permission is requested only here, inside the click. Not granted -> back to off + warning.
  els.notifyCheck.addEventListener("change", function () {
    if (!els.notifyCheck.checked) return;
    var support = alerts.notificationSupport();
    if (support === "granted") return;
    if (support === "default") {
      alerts.requestNotificationPermission().then(function (result) {
        if (result === "granted") return;
        els.notifyCheck.checked = false;
        warning = true;
        render();
      });
      return;
    }
    els.notifyCheck.checked = false;
    warning = true;
    render();
  });

  els.form.addEventListener("submit", function (e) {
    e.preventDefault();
    var values = {};
    var firstInvalid = null;
    FIELD_NAMES.forEach(function (name) {
      var v = checkField(name);
      if (v === null) {
        if (!firstInvalid) firstInvalid = els.fields[name];
      } else {
        values[name] = v;
      }
    });
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }
    values.notify = els.notifyCheck.checked;
    dispatch({ type: "saveSettings", settings: values });
    els.dialog.close();
    announce("Settings saved");
  });

  // Back in view: take the other tab's state before any tick (R-10).
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) return;
    syncFromStorage();
    dispatch({ type: "tick" });
  });

  window.addEventListener("storage", function (e) {
    if (e.key !== null && String(e.key).indexOf(KEY_PREFIX) !== 0) return;
    syncFromStorage();
    render();
  });

  // Boot: save what restore asked for, re-arm the end timer, announce once.
  applyEffects(restoreEffects);
  armEndTimer();
  render();
  restoreMessage = describeRestore();
  if (restoreMessage) announce(restoreMessage);

  // Tick on every loop so a missed timeout or midnight rollover shows without reload.
  dispatch({ type: "tick" });
  setInterval(tickOwn, RENDER_MS);
})();
