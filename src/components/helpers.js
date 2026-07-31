// Shared helpers — HTML escaping, date formatting, week arithmetic, download.
(function () {
  "use strict";
  var R = window.Revision;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  var DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];

  // "2026-07-31" → "Friday, 31 July 2026"
  function fmtHuman(dateStr) {
    var p = dateStr.split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return DAY_NAMES[d.getDay()] + ", " + d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  }

  // Mon=0 … Sat=5, Sunday=6 (curriculum d[] is Mon–Sat, sun separate)
  function dayIndex(dateStr) {
    var p = dateStr.split("-");
    var js = new Date(+p[0], +p[1] - 1, +p[2]).getDay(); // Sun=0
    return js === 0 ? 6 : js - 1;
  }

  // Raw week number relative to startDate: week 1 starts on startDate (a Monday).
  // 0 or negative = before the plan starts; 33+ = after it ends.
  function rawWeek(dateStr, startDate) {
    return Math.floor(R.diffDays(startDate, dateStr) / 7) + 1;
  }

  function clampWeek(w) { return Math.max(1, Math.min(32, w)); }

  // Everything Today and Roadmap need to know about "now".
  function currentWeekInfo() {
    var today = R.todayLocal();
    var start = window.Store.state.startDate;
    var raw = rawWeek(today, start);
    var week = clampWeek(raw);
    var cur = window.SEED.curriculum;
    var weekData = cur.weeks[week - 1];
    var phase = cur.phases[weekData.ph - 1];
    return {
      today: today, raw: raw, week: week,
      beforeStart: raw < 1, afterEnd: raw > 32,
      dayIndex: dayIndex(today),
      weekData: weekData, phase: phase,
      daysToStart: raw < 1 ? R.diffDays(today, start) : 0,
    };
  }

  var MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function parts(dateStr) {
    var p = dateStr.split("-");
    return { y: +p[0], m: +p[1], d: +p[2] };
  }

  // "2026-08-03" → "3 Aug 2026"
  function fmtShort(dateStr) {
    var p = parts(dateStr);
    return p.d + " " + MONTHS_SHORT[p.m - 1] + " " + p.y;
  }

  // Range in the roadmap's style: "3 – 9 Aug 2026", "31 Aug – 6 Sep 2026",
  // "28 Dec 2026 – 3 Jan 2027".
  function fmtRange(a, b) {
    var pa = parts(a), pb = parts(b);
    if (pa.y !== pb.y) return fmtShort(a) + " – " + fmtShort(b);
    if (pa.m !== pb.m) {
      return pa.d + " " + MONTHS_SHORT[pa.m - 1] + " – " +
             pb.d + " " + MONTHS_SHORT[pb.m - 1] + " " + pb.y;
    }
    return pa.d + " – " + pb.d + " " + MONTHS_SHORT[pb.m - 1] + " " + pb.y;
  }

  // Everything below is anchored to the learner's chosen start date, so the
  // curriculum's baked "3 Aug 2026" strings are never shown — always these.
  function weekStart(n) { return R.addDays(Store.state.startDate, (n - 1) * 7); }
  function weekRange(n) { return fmtRange(weekStart(n), R.addDays(weekStart(n), 6)); }
  function phaseRange(p) { return fmtRange(weekStart(p * 4 - 3), R.addDays(weekStart(p * 4), 6)); }
  function planEnd() { return R.addDays(Store.state.startDate, 223); }
  function planRange() { return fmtShort(Store.state.startDate) + " → " + fmtShort(planEnd()); }

  // Monday on-or-before the given date (weeks are Mon–Sat + Sunday consolidation).
  function mondayOf(dateStr) {
    var i = dayIndex(dateStr); // Mon=0 … Sun=6
    return R.addDays(dateStr, -i);
  }
  function nextMonday(dateStr) {
    var i = dayIndex(dateStr);
    return i === 0 ? dateStr : R.addDays(dateStr, 7 - i);
  }

  function download(filename, text) {
    var blob = new Blob([text], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }

  window.UI = window.UI || {};
  UI.esc = esc;
  UI.fmtHuman = fmtHuman;
  UI.dayIndex = dayIndex;
  UI.rawWeek = rawWeek;
  UI.clampWeek = clampWeek;
  UI.currentWeekInfo = currentWeekInfo;
  UI.fmtShort = fmtShort;
  UI.fmtRange = fmtRange;
  UI.weekStart = weekStart;
  UI.weekRange = weekRange;
  UI.phaseRange = phaseRange;
  UI.planRange = planRange;
  UI.mondayOf = mondayOf;
  UI.nextMonday = nextMonday;
  UI.download = download;
})();
