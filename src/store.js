// Store (§3, §8) — localStorage under "dsa-tracker-v1", read once into memory,
// written on every mutation debounced 300ms. Every localStorage call is wrapped
// in try/catch: on quota/private-mode failure the app keeps running in memory
// and the views surface Store.storageBroken with an offer to export.
(function () {
  "use strict";

  var KEY = "dsa-tracker-v1";
  var SCHEMA_VERSION = 1;
  var R = window.Revision;

  function defaultState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      startDate: "2026-08-03",
      startDateChosen: false, // first run asks the learner to lock in their own start
      problems: [],
      dailyLogs: [],
      applications: [],
      weeks: {},      // week number → 'not-started' | 'in-progress' | 'done'
      courses: {},    // course item id → { watched, built }
      striver: {},    // striver row id → { started, cleared }
      lastBackup: null,
      backupAtCount: 0, // problems.length at the last export — drives the every-25 offer (§8.3)
    };
  }

  var storageBroken = false;
  var storageError = "";

  function safeGet(key) {
    try { return localStorage.getItem(key); }
    catch (e) { storageBroken = true; storageError = String(e); return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); storageBroken = false; return true; }
    catch (e) { storageBroken = true; storageError = String(e); return false; }
  }

  // Never destroy data on a schema change (§8.4): keep the old copy under a
  // timestamped backup key, then migrate in memory.
  function migrate(data) {
    if (data.schemaVersion === SCHEMA_VERSION) return data;
    safeSet(KEY + "-backup-" + Date.now(), JSON.stringify(data));
    // v0 → v1 style migrations would go here, one step at a time.
    data.schemaVersion = SCHEMA_VERSION;
    return data;
  }

  function load() {
    var raw = safeGet(KEY);
    if (raw === null) return defaultState();
    try {
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object" || !Array.isArray(data.problems)) {
        throw new Error("unrecognised shape");
      }
      // Fill any missing root fields so old exports import cleanly.
      var fresh = defaultState();
      for (var k in fresh) if (!(k in data)) data[k] = fresh[k];
      return migrate(data);
    } catch (e) {
      // Corrupt store: preserve the raw text under a backup key, start fresh.
      safeSet(KEY + "-backup-" + Date.now(), raw);
      storageBroken = true;
      storageError = "Stored data could not be read (" + e.message + "). " +
        "The raw copy was preserved under a backup key.";
      return defaultState();
    }
  }

  var state = load();
  var saveTimer = null;
  var listeners = [];

  function saveNow() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    safeSet(KEY, JSON.stringify(state));
  }
  function save() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 300);
  }
  window.addEventListener("beforeunload", saveNow);

  // Mutate through here so every change is persisted and announced.
  function update(fn) {
    fn(state);
    save();
    for (var i = 0; i < listeners.length; i++) listeners[i]();
  }

  function uid() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  // ---- export / import (§5.7, §8) ----
  function exportJSON() {
    return JSON.stringify(state, null, 1);
  }
  function markBackup() {
    update(function (s) {
      s.lastBackup = R.todayLocal();
      s.backupAtCount = s.problems.length;
    });
    saveNow();
  }
  function daysSinceBackup() {
    if (!state.lastBackup) return null; // never
    return R.diffDays(state.lastBackup, R.todayLocal());
  }
  function backupStale() {
    var d = daysSinceBackup();
    return d === null || d > 7;
  }
  function backupOfferDue() {
    return state.problems.length - (state.backupAtCount || 0) >= 25;
  }

  // Validate an imported object; returns { ok, error, data }
  function validateImport(obj) {
    if (!obj || typeof obj !== "object") return { ok: false, error: "Not a JSON object." };
    if (typeof obj.schemaVersion !== "number") return { ok: false, error: "Missing schemaVersion — not a tracker backup." };
    if (obj.schemaVersion > SCHEMA_VERSION) return { ok: false, error: "This backup is from a newer version (schema " + obj.schemaVersion + ")." };
    if (!Array.isArray(obj.problems)) return { ok: false, error: "Missing problems array." };
    var fresh = defaultState();
    for (var k in fresh) if (!(k in obj)) obj[k] = fresh[k];
    return { ok: true, data: migrate(obj) };
  }

  function replaceState(newState) {
    state = newState;
    saveNow();
    for (var i = 0; i < listeners.length; i++) listeners[i]();
  }

  function reset() {
    replaceState(defaultState());
  }

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
    get state() { return state; },
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
