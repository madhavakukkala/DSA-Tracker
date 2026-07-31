// Store (§3, §8) — one state object, read once into memory, written on every
// mutation debounced 300ms. Two persistence drivers behind the same API:
//   cloud — Supabase row per user (when signed in via auth.js)
//   local — this browser's localStorage (no accounts configured)
// Every persistence failure sets storageBroken + storageError instead of
// throwing; the views surface it and offer an export.
(function () {
  "use strict";

  var KEY = "dsa-tracker-v1"; // localStorage key, kept stable for old data
  var SCHEMA_VERSION = 2;
  var R = window.Revision;

  function defaultSettings() {
    return { username: "", dsaStart: "06:30", devStart: "21:00" };
  }

  function defaultState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      startDate: "2026-08-03", // replaced by the learner's Day 1 at onboarding
      startDateChosen: false,
      settings: defaultSettings(),
      problems: [],
      dailyLogs: [],
      applications: [],
      weeks: {},      // week number → 'not-started' | 'in-progress' | 'done'
      courses: {},    // course item id → { watched, built }
      striver: {},    // striver row id → { started, cleared }
      dayTicks: {},   // "YYYY-MM-DD" → { revision:true, learn:true, … }
      notes: {},      // "YYYY-MM-DD" → the day's note text
      lastBackup: null,
      backupAtCount: 0, // problems.length at the last export — drives the every-25 offer (§8.3)
    };
  }

  var state = null;
  var driver = null;
  var storageBroken = false;
  var storageError = "";
  var saveTimer = null;
  var listeners = [];

  function safeGet(key) {
    try { return localStorage.getItem(key); }
    catch (e) { storageBroken = true; storageError = String(e); return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); return true; }
    catch (e) { storageBroken = true; storageError = String(e); return false; }
  }

  // Never destroy data on a schema change (§8.4): migrate in memory, one step
  // at a time. v1 stores gain settings (times default to the classic 6:30/21:00).
  function migrate(data) {
    if (data.schemaVersion === SCHEMA_VERSION) return data;
    safeSet(KEY + "-backup-" + Date.now(), JSON.stringify(data));
    if (data.schemaVersion <= 1) {
      data.settings = defaultSettings();
      data.schemaVersion = 2;
    }
    return data;
  }

  // Fill missing root fields so old exports and v1 rows normalise cleanly.
  function normalize(data) {
    var fresh = defaultState();
    for (var k in fresh) if (!(k in data)) data[k] = fresh[k];
    var fs = defaultSettings();
    for (var s in fs) if (!(s in data.settings)) data.settings[s] = fs[s];
    return migrate(data);
  }

  // ---- drivers ----
  var localDriver = {
    name: "local",
    load: function () {
      var raw = safeGet(KEY);
      if (raw === null) return Promise.resolve(null);
      try {
        var data = JSON.parse(raw);
        if (!data || typeof data !== "object" || !Array.isArray(data.problems)) {
          throw new Error("unrecognised shape");
        }
        return Promise.resolve(data);
      } catch (e) {
        safeSet(KEY + "-backup-" + Date.now(), raw); // preserve, never destroy
        storageBroken = true;
        storageError = "Stored data could not be read (" + e.message + "). " +
          "The raw copy was preserved under a backup key.";
        return Promise.resolve(null);
      }
    },
    save: function (s) {
      if (!safeSet(KEY, JSON.stringify(s))) throw new Error(storageError);
      return Promise.resolve();
    },
  };

  var cloudDriver = {
    name: "cloud",
    load: async function () {
      var res = await Auth.client.from("trackers")
        .select("data").eq("user_id", Auth.userId()).maybeSingle();
      if (res.error) throw new Error(res.error.message);
      return res.data ? res.data.data : null;
    },
    save: async function (s) {
      var res = await Auth.client.from("trackers").upsert({
        user_id: Auth.userId(),
        data: s,
        updated_at: new Date().toISOString(),
      });
      if (res.error) throw new Error(res.error.message);
    },
  };

  // ---- lifecycle ----
  async function init() {
    driver = (window.Auth && Auth.active()) ? cloudDriver : localDriver;
    try {
      var data = await driver.load();
      state = data ? normalize(data) : defaultState();
      storageBroken = false;
      storageError = "";
    } catch (e) {
      state = defaultState();
      storageBroken = true;
      storageError = "Could not load your data (" + e.message + "). " +
        "Working from a blank slate in memory — do not log new work until this is resolved.";
    }
  }

  function doSave() {
    saveTimer = null;
    // Call the driver synchronously: the local driver writes to localStorage
    // before returning, so a beforeunload flush can never lose the write.
    // The cloud driver returns a promise; failures land in the catch below.
    var result;
    try { result = driver.save(state); }
    catch (e) {
      storageBroken = true;
      storageError = "Saving failed (" + e.message + "). Export a backup now.";
      return;
    }
    Promise.resolve(result)
      .then(function () { storageBroken = false; storageError = ""; })
      .catch(function (e) {
        storageBroken = true;
        storageError = "Saving failed (" + e.message + "). Export a backup now.";
      });
  }
  function saveNow() {
    if (saveTimer) { clearTimeout(saveTimer); }
    doSave();
  }
  function save() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 300);
  }
  window.addEventListener("beforeunload", function () { if (saveTimer) saveNow(); });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden" && saveTimer) saveNow();
  });

  function update(fn) {
    fn(state);
    save();
    for (var i = 0; i < listeners.length; i++) listeners[i]();
  }

  function uid() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  // ---- export / import (§5.7, §8) ----
  function exportJSON() { return JSON.stringify(state, null, 1); }

  function markBackup() {
    update(function (s) {
      s.lastBackup = R.todayLocal();
      s.backupAtCount = s.problems.length;
    });
    saveNow();
  }
  function daysSinceBackup() {
    if (!state.lastBackup) return null;
    return R.diffDays(state.lastBackup, R.todayLocal());
  }
  function backupStale() {
    var d = daysSinceBackup();
    return d === null || d > 7;
  }
  function backupOfferDue() {
    return state.problems.length - (state.backupAtCount || 0) >= 25;
  }

  function validateImport(obj) {
    if (!obj || typeof obj !== "object") return { ok: false, error: "Not a JSON object." };
    if (typeof obj.schemaVersion !== "number") return { ok: false, error: "Missing schemaVersion — not a tracker backup." };
    if (obj.schemaVersion > SCHEMA_VERSION) return { ok: false, error: "This backup is from a newer version (schema " + obj.schemaVersion + ")." };
    if (!Array.isArray(obj.problems)) return { ok: false, error: "Missing problems array." };
    return { ok: true, data: normalize(obj) };
  }

  function replaceState(newState) {
    state = newState;
    saveNow();
    for (var i = 0; i < listeners.length; i++) listeners[i]();
  }

  function reset() { replaceState(defaultState()); }

  function setStartDate(dateStr) {
    update(function (s) {
      s.startDate = dateStr;
      s.startDateChosen = true;
    });
    saveNow();
  }

  window.Store = {
    KEY: KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    init: init,
    get state() { return state; },
    get mode() { return driver ? driver.name : "unset"; },
    get storageBroken() { return storageBroken; },
    get storageError() { return storageError; },
    update: update,
    saveNow: saveNow,
    uid: uid,
    exportJSON: exportJSON,
    markBackup: markBackup,
    daysSinceBackup: daysSinceBackup,
    backupStale: backupStale,
    backupOfferDue: backupOfferDue,
    validateImport: validateImport,
    replaceState: replaceState,
    reset: reset,
    setStartDate: setStartDate,
    onChange: function (fn) { listeners.push(fn); },
  };
})();
