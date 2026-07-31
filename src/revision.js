// Spaced repetition — the core logic (§4). Pure functions, no DOM access.
// Every date is a local-time "YYYY-MM-DD" string; string comparison IS date
// comparison. Never toISOString() — it is UTC and wrong before 5:30am IST.
// Loads in the browser (window.Revision) and in Node (globalThis.Revision)
// so the acceptance tests in tests/revision.test.js can run headlessly.
(function (global) {
  "use strict";

  var BACKLOG_LIMIT = 25;
  var OFFSETS = { r1: 2, r2: 5, r3: 10 };

  function pad2(n) { return n < 10 ? "0" + n : "" + n; }

  // "Today" as a LOCAL date string. Optional Date arg for tests.
  function todayLocal(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function parseDate(s) {
    var p = s.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]); // local midnight, no TZ shift
  }

  function addDays(dateStr, n) {
    var d = parseDate(dateStr);
    d.setDate(d.getDate() + n);
    return todayLocal(d);
  }

  // Whole days from a to b (positive when b is later). DST-safe via rounding.
  function diffDays(a, b) {
    return Math.round((parseDate(b) - parseDate(a)) / 86400000);
  }

  function r1Due(p) { return addDays(p.dateSolved, OFFSETS.r1); }
  function r2Due(p) { return addDays(p.dateSolved, OFFSETS.r2); }
  function r3Due(p) { return addDays(p.dateSolved, OFFSETS.r3); }

  function status(p, today) {
    if (p.r1 && p.r2 && p.r3) return "done";
    if ((!p.r1 && r1Due(p) <= today) ||
        (!p.r2 && r2Due(p) <= today) ||
        (!p.r3 && r3Due(p) <= today)) return "due";
    return "scheduled";
  }

  // First unticked slot, in order. Ticking never skips ahead (§4).
  function nextSlot(p) {
    if (!p.r1) return "r1";
    if (!p.r2) return "r2";
    if (!p.r3) return "r3";
    return null;
  }

  function needsRedo(p) {
    return p.confidence <= 2 || p.solvedHow === "editorial";
  }

  // Earliest unticked due date — the queue sort key.
  function earliestUntickedDue(p) {
    if (!p.r1) return r1Due(p);
    if (!p.r2) return r2Due(p);
    if (!p.r3) return r3Due(p);
    return null;
  }

  function overdueDays(p, today) {
    var due = earliestUntickedDue(p);
    return due === null ? 0 : Math.max(0, diffDays(due, today));
  }

  // Due problems, most overdue first; ties broken on dateSolved ascending.
  function queue(problems, today) {
    return problems
      .filter(function (p) { return status(p, today) === "due"; })
      .sort(function (a, b) {
        var da = earliestUntickedDue(a), db = earliestUntickedDue(b);
        if (da !== db) return da < db ? -1 : 1;
        if (a.dateSolved !== b.dateSolved) return a.dateSolved < b.dateSolved ? -1 : 1;
        return 0;
      });
  }

  function isBacklog(dueCount) { return dueCount > BACKLOG_LIMIT; }

  // Consecutive days ending today with at least one problem logged (§5.4).
  function streak(problems, today) {
    var days = {};
    for (var i = 0; i < problems.length; i++) days[problems[i].dateSolved] = true;
    var n = 0, d = today;
    while (days[d]) { n++; d = addDays(d, -1); }
    return n;
  }

  global.Revision = {
    BACKLOG_LIMIT: BACKLOG_LIMIT,
    todayLocal: todayLocal,
    addDays: addDays,
    diffDays: diffDays,
    r1Due: r1Due, r2Due: r2Due, r3Due: r3Due,
    status: status,
    nextSlot: nextSlot,
    needsRedo: needsRedo,
    earliestUntickedDue: earliestUntickedDue,
    overdueDays: overdueDays,
    queue: queue,
    isBacklog: isBacklog,
    streak: streak,
  };
})(typeof window !== "undefined" ? window : globalThis);
