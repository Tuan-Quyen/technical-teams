"use strict";
// Alerts adapter (browser only): beep, tab title, desktop notification.
// Every call is safe to make when the browser lacks the API; nothing here throws.
(function () {
  if (typeof window === "undefined") return;

  var ctx = null;

  function getContext() {
    if (ctx) return ctx;
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  // Call from a click handler (Start / Resume) so autoplay rules allow sound later (E3).
  function unlockAudio() {
    try {
      var c = getContext();
      if (c && c.state === "suspended") {
        var p = c.resume();
        if (p && typeof p.catch === "function") p.catch(function () {});
      }
    } catch (e) {}
  }

  // One tone, about 0.6 s, no loop.
  function beep() {
    try {
      var c = getContext();
      if (!c) return;
      if (c.state === "suspended") {
        var p = c.resume();
        if (p && typeof p.catch === "function") p.catch(function () {});
      }
      var t0 = c.currentTime;
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + 0.62);
    } catch (e) {}
  }

  function setTitle(text) {
    if (document.title !== text) document.title = text;
  }

  function notificationSupport() {
    try {
      if (typeof window.Notification !== "function") return "unsupported";
      var p = window.Notification.permission;
      return p === "granted" || p === "denied" ? p : "default";
    } catch (e) {
      return "unsupported";
    }
  }

  // Resolves to the final support value. Call only from a user gesture.
  function requestNotificationPermission() {
    try {
      if (notificationSupport() === "unsupported") return Promise.resolve("unsupported");
      var r = window.Notification.requestPermission(function () {});
      if (r && typeof r.then === "function") {
        return r.then(notificationSupport, notificationSupport);
      }
      return Promise.resolve(notificationSupport());
    } catch (e) {
      return Promise.resolve(notificationSupport());
    }
  }

  // The caller checks settings.notify; this checks the permission.
  function notify(text) {
    try {
      if (notificationSupport() !== "granted") return;
      new window.Notification("Pomodoro", { body: text });
    } catch (e) {}
  }

  (window.Pomodoro ||= {}).alerts = {
    unlockAudio: unlockAudio,
    beep: beep,
    setTitle: setTitle,
    notificationSupport: notificationSupport,
    requestNotificationPermission: requestNotificationPermission,
    notify: notify,
  };
})();
