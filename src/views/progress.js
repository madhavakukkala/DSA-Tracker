// Progress — the numbers, honestly (§5.4). Mirrors the workbook's Revision
// Dashboard: counts, solved-how split, difficulty split, the fixed topic
// table (zeros shown), and the revision-health line.
(function () {
  "use strict";
  window.Views = window.Views || {};
  var esc = function (s) { return UI.esc(s); };

  // The dashboard's fixed topic list — untouched topics still show, at 0.
  var TOPICS = [
    "Python basics", "Sorting", "Arrays", "Binary Search", "Strings",
    "Linked List", "Recursion", "Bit Manipulation", "Stacks & Queues",
    "Sliding Window", "Heaps", "Greedy", "Binary Trees", "BST", "Graphs",
    "DP", "Tries", "Segment Tree",
  ];

  // Striver step → topic, so each topic knows its total problem count and the
  // bars can read "solved / total" like the workbook.
  var STEP_TOPIC = {
    1: "Python basics", 2: "Sorting", 3: "Arrays", 4: "Binary Search",
    5: "Strings", 6: "Linked List", 7: "Recursion", 8: "Bit Manipulation",
    9: "Stacks & Queues", 10: "Sliding Window", 11: "Heaps", 12: "Greedy",
    13: "Binary Trees", 14: "BST", 15: "Graphs", 16: "DP", 17: "Tries",
    18: "Strings",
  };
  var ADDED_TOPIC = {
    "x-intervals-sweep-line": "Arrays",
    "x-number-theory-modular-a": "Bit Manipulation",
    "x-segment-tree-fenwick-tr": "Segment Tree",
  };

  function topicTotals() {
    var totals = {};
    window.SEED.striver.forEach(function (r) {
      var t = r.added
        ? Object.keys(ADDED_TOPIC).reduce(function (acc, k) {
            return r.id.indexOf(k.slice(0, 12)) === 0 ? ADDED_TOPIC[k] : acc;
          }, null)
        : STEP_TOPIC[r.step];
      if (t) totals[t] = (totals[t] || 0) + r.problemCount;
    });
    return totals;
  }

  function sparklineSVG(points) {
    // Inline SVG, 30 points, no chart library (§11).
    var w = 300, h = 48, max = Math.max.apply(null, points.concat([1]));
    var step = w / (points.length - 1 || 1);
    var d = points.map(function (v, i) {
      return (i === 0 ? "M" : "L") + (i * step).toFixed(1) + "," +
        (h - 4 - (v / max) * (h - 10)).toFixed(1);
    }).join(" ");
    var over = points[points.length - 1] > Revision.BACKLOG_LIMIT;
    return '<svg viewBox="0 0 ' + w + " " + h + '" class="spark" role="img" ' +
      'aria-label="Due count over the last 30 days, currently ' + points[points.length - 1] + '">' +
      '<path d="' + d + '" fill="none" stroke="' + (over ? "var(--alert)" : "var(--ink)") +
      '" stroke-width="1.5"/></svg>';
  }

  function hbar(label, count, total, cls) {
    return '<div class="hbar-row"><span class="hbar-label">' + esc(label) + "</span>" +
      '<span class="hbar-track"><span class="hbar-fill' + (cls ? " " + cls : "") +
      '" style="width:' + (total ? count / total * 100 : 0) + '%"></span></span>' +
      '<span class="hbar-n mono">' + count + "</span></div>";
  }

  Views.progress = {
    title: "Progress",

    render(el) {
      var R = Revision;
      var today = R.todayLocal();
      var ps = Store.state.problems;
      var n = ps.length;

      var due = 0, scheduled = 0, done = 0, redo = 0;
      var how = { alone: 0, hint: 0, editorial: 0 };
      var confSum = 0, minSum = 0;
      ps.forEach(function (p) {
        var s = R.status(p, today);
        if (s === "due") due++; else if (s === "done") done++; else scheduled++;
        if (R.needsRedo(p)) redo++;
        if (how[p.solvedHow] !== undefined) how[p.solvedHow]++;
        confSum += p.confidence || 0;
        minSum += p.minutes || 0;
      });
      var aloneRate = n ? Math.round(how.alone / n * 100) : null;
      var weeksDone = Object.keys(Store.state.weeks).filter(function (k) {
        return Store.state.weeks[k] === "done";
      }).length;

      // By topic — the fixed 18 first (solved / the topic's Striver total),
      // any extra topics people typed appended after
      var byTopic = {};
      TOPICS.forEach(function (t) { byTopic[t] = 0; });
      ps.forEach(function (p) {
        var t = (p.topic || "").trim() || "(no topic)";
        byTopic[t] = (byTopic[t] || 0) + 1;
      });
      var totals = topicTotals();
      var topicNames = TOPICS.concat(Object.keys(byTopic).filter(function (t) {
        return TOPICS.indexOf(t) === -1;
      }).sort());
      var maxTopic = Math.max.apply(null, topicNames.map(function (t) { return byTopic[t]; }).concat([1]));
      var topicBars = topicNames.map(function (t) {
        var solved = byTopic[t], total = totals[t];
        if (total) {
          return '<div class="hbar-row"><span class="hbar-label">' + esc(t) + "</span>" +
            '<span class="hbar-track"><span class="hbar-fill" style="width:' +
            Math.min(100, solved / total * 100) + '%"></span></span>' +
            '<span class="hbar-n mono">' + solved + " / " + total + "</span></div>";
        }
        return hbar(t, solved, maxTopic, "");
      }).join("");

      var diff = { Easy: 0, Medium: 0, Hard: 0 };
      ps.forEach(function (p) { if (diff[p.difficulty] !== undefined) diff[p.difficulty]++; });

      var cards =
        UI.statCard(n, "problems logged") +
        UI.statCard(due, "due now", due > R.BACKLOG_LIMIT ? "s-alert" : "") +
        UI.statCard(scheduled, "scheduled") +
        UI.statCard(done, "fully revised", done ? "s-sage" : "") +
        UI.statCard(redo, "flagged for redo") +
        UI.statCard(aloneRate === null ? "—" : aloneRate + "%", "solved alone",
          aloneRate !== null && aloneRate < 40 ? "s-amber" : "") +
        UI.statCard(n ? (confSum / n).toFixed(1) : "—", "avg confidence") +
        UI.statCard(n ? Math.round(minSum / n) : "—", "avg minutes") +
        UI.statCard((minSum / 60).toFixed(1), "hours on problems") +
        UI.statCard(R.streak(ps, today), "day streak") +
        UI.statCard(topicNames.filter(function (t) { return byTopic[t] > 0; }).length,
          "topics touched") +
        UI.statCard(weeksDone + " / 32", "weeks completed");

      var warn = "";
      if (aloneRate !== null && aloneRate < 40) {
        warn = '<div class="banner banner-amber"><b>Solved-alone rate is ' + aloneRate +
          "%.</b> You're reading editorials, not solving. Take fewer problems and fight harder for each.</div>";
      }

      // Revision health — due count evaluated at each of the last 30 days
      var points = [];
      for (var i = 29; i >= 0; i--) {
        var d = R.addDays(today, -i);
        points.push(ps.filter(function (p) {
          return p.dateSolved <= d && R.status(p, d) === "due";
        }).length);
      }

      el.innerHTML =
        '<header class="page-head">' +
        '<p class="eyebrow">' + esc(UI.fmtHuman(today)) + "</p>" +
        '<h1 class="page-title">Progress</h1></header>' +
        warn +
        '<div class="stats">' + cards + "</div>" +
        '<div class="prog-cols">' +

        '<section><h2 class="section-title">By topic</h2>' +
        '<div class="hbars">' + topicBars + "</div></section>" +

        "<section>" +
        '<h2 class="section-title">By difficulty</h2><div class="hbars">' +
        hbar("Easy", diff.Easy, n, "hb-easy") +
        hbar("Medium", diff.Medium, n, "hb-medium") +
        hbar("Hard", diff.Hard, n, "hb-hard") + "</div>" +

        '<h2 class="section-title" style="margin-top:34px">How they were solved</h2>' +
        '<div class="hbars">' +
        hbar("Alone", how.alone, n, "hb-easy") +
        hbar("With a hint", how.hint, n, "hb-medium") +
        hbar("Editorial", how.editorial, n, "hb-hard") + "</div>" +

        '<h2 class="section-title" style="margin-top:34px">Revision health</h2>' +
        '<p class="small faint">Due count, last 30 days — a rising line is a backlog forming.</p>' +
        sparklineSVG(points) +
        '<p class="health-note' + (due > R.BACKLOG_LIMIT ? " over" : "") + '">' +
        "If <b>due now</b> goes above 25, pause new topics for two days and clear it. " +
        "That number is the health check for the whole system.</p>" +
        "</section></div>";
    },
  };
})();
