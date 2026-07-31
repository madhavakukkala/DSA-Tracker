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

  // Raw week number relative to startDate: week 1 begins on Day 1 — the exact
  // date the learner locked in, whatever weekday that is. Weeks are 7-day
  // blocks: days 1–6 study, day 7 consolidation/rest.
  // 0 or negative = before the plan starts; 33+ = after it ends.
  function rawWeek(dateStr, startDate) {
    return Math.floor(R.diffDays(startDate, dateStr) / 7) + 1;
  }

  function clampWeek(w) { return Math.max(1, Math.min(32, w)); }

  // 0–5 = study days (curriculum d[0..5]), 6 = rest/consolidation (sun).
  function dayOffset(dateStr, startDate) {
    return ((R.diffDays(startDate, dateStr) % 7) + 7) % 7;
  }

  function dayLabel(i) { return i === 6 ? "Rest day" : "Day " + (i + 1); }

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
      dayIndex: dayOffset(today, start),
      weekData: weekData, phase: phase,
      daysToStart: raw < 1 ? R.diffDays(today, start) : 0,
    };
  }

  // ---- the learner's daily schedule (two 3-hour windows) ----
  function parseHM(hm) {
    var p = (hm || "").split(":");
    var v = (+p[0]) * 60 + (+p[1] || 0);
    return isNaN(v) ? 0 : v;
  }
  function fmtHM(mins) {
    var m = ((mins % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60), mm = m % 60;
    return (h < 10 ? "0" + h : h) + ":" + (mm < 10 ? "0" + mm : mm);
  }
  function fmtSpan(a, b) { return fmtHM(a) + " – " + fmtHM(b); }

  // Sub-blocks mirror the classic 6:30 shape: 20' revision, 60' learn,
  // 90' practise, 10' log; nights are 165' build + 15' commit.
  function schedule() {
    var st = window.Store.state.settings || {};
    var d = parseHM(st.dsaStart || "06:30");
    var v = parseHM(st.devStart || "21:00");
    return {
      dsa: { start: d, end: d + 180,
        revision: [d, d + 20], learn: [d + 20, d + 80],
        practise: [d + 80, d + 170], log: [d + 170, d + 180] },
      dev: { start: v, end: v + 180,
        build: [v, v + 165], commit: [v + 165, v + 180] },
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
  UI.rawWeek = rawWeek;
  UI.clampWeek = clampWeek;
  UI.dayOffset = dayOffset;
  UI.dayLabel = dayLabel;
  UI.currentWeekInfo = currentWeekInfo;
  UI.fmtShort = fmtShort;
  UI.fmtRange = fmtRange;
  UI.weekStart = weekStart;
  UI.weekRange = weekRange;
  UI.phaseRange = phaseRange;
  UI.planRange = planRange;
  UI.parseHM = parseHM;
  UI.fmtHM = fmtHM;
  UI.fmtSpan = fmtSpan;
  UI.schedule = schedule;
  UI.download = download;
})();
