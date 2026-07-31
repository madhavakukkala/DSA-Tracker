// Progress — the numbers, honestly (§5.4).
(function () {
  "use strict";
  window.Views = window.Views || {};
  var esc = function (s) { return UI.esc(s); };

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

  Views.progress = {
    title: "Progress",

    render(el) {
      var R = Revision;
      var today = R.todayLocal();
      var ps = Store.state.problems;
      var n = ps.length;

      var due = 0, scheduled = 0, done = 0, redo = 0, alone = 0, confSum = 0, minSum = 0;
      ps.forEach(function (p) {
        var s = R.status(p, today);
        if (s === "due") due++; else if (s === "done") done++; else scheduled++;
        if (R.needsRedo(p)) redo++;
        if (p.solvedHow === "alone") alone++;
        confSum += p.confidence || 0;
        minSum += p.minutes || 0;
      });
      var aloneRate = n ? Math.round(alone / n * 100) : null;
      var weeksDone = Object.keys(Store.state.weeks).filter(function (k) {
        return Store.state.weeks[k] === "done";
      }).length;

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
        UI.statCard(R.streak(ps, today), "day streak") +
        UI.statCard(weeksDone + " / 32", "weeks completed");

      var warn = "";
      if (aloneRate !== null && aloneRate < 40) {
        warn = '<div class="banner banner-amber"><b>Solved-alone rate is ' + aloneRate +
          "%.</b> You're reading editorials, not solving. Take fewer problems and fight harder for each.</div>";
      }

      // By topic — horizontal bars
      var byTopic = {};
      ps.forEach(function (p) {
        var t = p.topic || "(no topic)";
        byTopic[t] = (byTopic[t] || 0) + 1;
      });
      var topics = Object.keys(byTopic).sort(function (a, b) { return byTopic[b] - byTopic[a]; });
      var maxTopic = topics.length ? byTopic[topics[0]] : 1;
      var topicBars = topics.map(function (t) {
        return '<div class="hbar-row"><span class="hbar-label">' + esc(t) + "</span>" +
          '<span class="hbar-track"><span class="hbar-fill" style="width:' +
          (byTopic[t] / maxTopic * 100) + '%"></span></span>' +
          '<span class="hbar-n mono">' + byTopic[t] + "</span></div>";
      }).join("");

      // By difficulty
      var diff = { Easy: 0, Medium: 0, Hard: 0 };
      ps.forEach(function (p) { if (diff[p.difficulty] !== undefined) diff[p.difficulty]++; });
      var diffBars = ["Easy", "Medium", "Hard"].map(function (k) {
        return '<div class="hbar-row"><span class="hbar-label">' + k + "</span>" +
          '<span class="hbar-track"><span class="hbar-fill hb-' + k.toLowerCase() +
          '" style="width:' + (n ? diff[k] / n * 100 : 0) + '%"></span></span>' +
          '<span class="hbar-n mono">' + diff[k] + "</span></div>";
      }).join("");

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
        (n === 0
          ? '<p class="empty">Nothing to chart yet. The numbers appear as soon as the first problem is logged.</p>'
          : '<div class="prog-cols">' +
            '<section><h2 class="section-title">By topic</h2><div class="hbars">' + topicBars + "</div></section>" +
            '<section><h2 class="section-title">By difficulty</h2><div class="hbars">' + diffBars + "</div>" +
            '<h2 class="section-title" style="margin-top:34px">Revision health</h2>' +
            '<p class="small faint">Due count, last 30 days — a rising line is a backlog forming.</p>' +
            sparklineSVG(points) + "</section></div>");
    },
  };
})();
