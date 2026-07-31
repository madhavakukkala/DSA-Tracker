// Roadmap — the 32-week timeline (§5.3), ported from dsa-dev-roadmap.html:
// centre spine, numbered nodes, dawn track left, dusk track right.
(function () {
  "use strict";
  window.Views = window.Views || {};
  var esc = function (s) { return UI.esc(s); };
  var STATUSES = ["not-started", "in-progress", "done"];
  var STATUS_GLYPH = { "not-started": "", "in-progress": "◐", "done": "✓" };

  function weekStatus(n) { return Store.state.weeks[n] || "not-started"; }

  function block(cls, time, label, text) {
    return '<div class="blk ' + cls + '"><div class="blk-t"><b>' + label + "</b><em>" +
      time + "</em></div>" + '<div class="blk-c">' + esc(text) + "</div></div>";
  }

  function openWeek(w) {
    var sch = UI.schedule();
    var span = function (pair) { return UI.fmtSpan(pair[0], pair[1]); };
    var html = "";
    w.d.forEach(function (x, i) {
      html += '<div class="day"><div class="d-name">Day ' + (i + 1) + "<span></span></div>" +
        block("learn", span(sch.dsa.learn), "Learn", x[0]) +
        block("prac", span(sch.dsa.practise), "Practise", x[1]) +
        block("eve", span(sch.dev.build), "Night", x[2]) + "</div>";
    });
    html += '<div class="day rest"><div class="d-name">Day 7 · consolidation — no new topics<span></span></div>' +
      block("learn", span([sch.dsa.start, sch.dsa.end]), "DSA", w.sun[0]) +
      block("eve", span([sch.dev.start, sch.dev.end]), "Night", w.sun[1]) + "</div>";
    html += '<div class="day"><div class="d-name">Every day<span></span></div>' +
      block("learn", span(sch.dsa.revision), "Revision",
        "Clear your revision queue on the Today screen — everything due at day 2, day 5 and day 10. " +
        "Read the title, state the approach and the complexity out loud in under 90 seconds. " +
        "If you can't, mark it failed and re-solve it fully on Day 7.") +
      block("prac", span(sch.dsa.log), "Log",
        "Log every problem in the tracker: date, difficulty, whether you solved it alone, your " +
        "approach in one line, and a confidence score out of 5. The revision queue builds itself from this.") +
      block("eve", span(sch.dev.commit), "Commit",
        "Push your code. Write tomorrow's first task on a sticky note so you don't lose the first " +
        "ten minutes deciding.") + "</div>";

    UI.openModal({
      head: '<div class="m-wk">Week ' + w.n + " · " + esc(UI.weekRange(w.n)) + " · " + esc(w.step) + "</div>" +
        '<div class="m-title">' + esc(w.dsa) + "</div>" +
        '<div class="m-goal">' + esc(w.goal) + "</div>" +
        '<div class="m-tracks"><span class="chip a">AM · ' + esc(w.dsa) + "</span>" +
        '<span class="chip b">PM · ' + esc(w.dev) + "</span></div>",
      body: html,
    });
  }

  Views.roadmap = {
    title: "Roadmap",

    render(el) {
      var cur = window.SEED.curriculum;
      var info = UI.currentWeekInfo();
      var problems = Store.state.problems;
      var doneCount = cur.weeks.filter(function (w) { return weekStatus(w.n) === "done"; }).length;
      var pct = Math.round(doneCount / 32 * 100);
      var self = this;

      var counts = {};
      problems.forEach(function (p) { counts[p.week] = (counts[p.week] || 0) + 1; });
      var sch = UI.schedule();
      var dsaTag = UI.fmtSpan(sch.dsa.start, sch.dsa.end).replace("–", "—");
      var devTag = UI.fmtSpan(sch.dev.start, sch.dev.end).replace("–", "—");

      var html =
        '<header class="page-head">' +
        '<p class="eyebrow">' + esc(UI.planRange()) + " · Striver A2Z · 462 problems</p>" +
        '<h1 class="page-title">Roadmap</h1></header>' +
        '<div class="progress"><div class="progress-top">' +
        "<span>Weeks completed</span><span><b>" + pct + "%</b> · " + doneCount + " / 32</span></div>" +
        '<div class="bar"><div class="bar-fill" style="width:' + pct + '%"></div></div></div>';

      cur.phases.forEach(function (ph) {
        html += '<section class="phase"><div class="phase-head">' +
          '<span class="phase-num mono">PHASE ' + String(ph.p).padStart(2, "0") + "</span>" +
          '<span class="phase-title">' + esc(ph.title) + "</span>" +
          '<span class="phase-when mono">' + esc(UI.phaseRange(ph.p)) + "</span></div>" +
          '<div class="weeks">';
        cur.weeks.filter(function (w) { return w.ph === ph.p; }).forEach(function (w) {
          var st = weekStatus(w.n);
          var isCurrent = !info.beforeStart && !info.afterEnd && info.week === w.n;
          var logged = counts[w.n] || 0;
          var wRange = UI.weekRange(w.n);
          html += '<div class="week st-' + st + (isCurrent ? " current" : "") +
            '" data-n="' + w.n + '" tabindex="0" role="button" aria-label="Week ' + w.n + ", " +
            esc(wRange) + ". Morning: " + esc(w.dsa) + ". Night: " + esc(w.dev) + '. Open the daily plan.">' +
            '<div class="cell dsa"><span class="tag">' + dsaTag + "</span>" +
            '<div class="topic">' + esc(w.dsa) + "</div>" +
            '<div class="sub mono">' + esc(w.step) + "</div>" +
            '<div class="wk-count mono' + (logged >= w.target ? " ok" : "") + '">' +
            logged + " / " + w.target + " problems</div></div>" +
            '<div class="node"><div class="num mono"><small>WEEK</small><strong>' + w.n + "</strong></div>" +
            '<button class="tick-btn mono" data-n="' + w.n + '" aria-label="Week ' + w.n +
            ' status: ' + st + '. Click to change.">' + STATUS_GLYPH[st] + "</button></div>" +
            '<div class="cell dev"><span class="tag">' + devTag + "</span>" +
            '<div class="topic">' + esc(w.dev) + "</div>" +
            '<div class="sub mono">' + esc(wRange) +
            (isCurrent ? " · THIS WEEK" : "") + "</div></div></div>";
        });
        html += "</div></section>";
      });

      el.innerHTML = html;

      el.querySelectorAll(".week").forEach(function (row) {
        var n = +row.getAttribute("data-n");
        var w = cur.weeks[n - 1];
        row.addEventListener("click", function () { openWeek(w); });
        row.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openWeek(w); }
        });
      });
      el.querySelectorAll(".tick-btn").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          var n = +btn.getAttribute("data-n");
          var next = STATUSES[(STATUSES.indexOf(weekStatus(n)) + 1) % 3];
          Store.update(function (s) { s.weeks[n] = next; });
          self.render(el);
        });
      });
    },
  };
})();
