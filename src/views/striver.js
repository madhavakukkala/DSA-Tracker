// Striver A2Z — the full checklist from the workbook (§5.5), as its own screen:
// 18 steps with sub-steps, problem counts, started/cleared toggles, plus the
// added-topic rows Striver's sheet leaves out.
(function () {
  "use strict";
  window.Views = window.Views || {};
  var esc = function (s) { return UI.esc(s); };

  function striverState(id) { return Store.state.striver[id] || {}; }

  function toggleBtn(cls, on, label, data) {
    return '<button class="tog ' + cls + (on ? " on" : "") + '" ' + data +
      ' aria-pressed="' + !!on + '">' + label + "</button>";
  }

  Views.striver = {
    title: "Striver A2Z",

    render(el) {
      var info = UI.currentWeekInfo();
      var rows = window.SEED.striver;
      var self = this;
      var cleared = rows.filter(function (r) { return striverState(r.id).cleared; }).length;
      var problems = rows.reduce(function (a, r) { return a + r.problemCount; }, 0);
      var pct = Math.round(cleared / rows.length * 100);

      var html =
        '<header class="page-head">' +
        '<p class="eyebrow">18 steps · ' + problems + " problems · you are in week " + info.week + "</p>" +
        '<h1 class="page-title">Striver A2Z</h1></header>' +
        '<div class="progress"><div class="progress-top">' +
        "<span>Sub-steps cleared</span><span><b>" + pct + "%</b> · " + cleared + " / " +
        rows.length + "</span></div>" +
        '<div class="bar"><div class="bar-fill" style="width:' + pct + '%"></div></div></div>';

      var section = null;
      rows.forEach(function (r) {
        var head = r.added ? null : "Step " + r.step + " — " + r.section;
        if (!r.added && head !== section) {
          section = head;
          html += '<p class="d-label mono course-sec">' + esc(head) + "</p>";
        }
        var st = striverState(r.id);
        var cur = r.plannedWeek === info.week && !info.beforeStart && !info.afterEnd;
        html += '<div class="c-row' + (r.added ? " added" : "") + (cur ? " cur-week" : "") + '"' +
          (r.added ? ' title="Not in Striver\'s sheet — added because product companies ask it."' : "") + ">" +
          '<span class="c-ep">' + (r.added ? '<span class="add-badge mono">+</span> ' : "") +
          esc(r.subStep) + "</span>" +
          '<span class="c-count mono">' + (r.problemCount || "—") + " prob</span>" +
          '<span class="c-wk mono' + (cur ? " now" : "") + '">wk ' + r.plannedWeek +
          (cur ? " · NOW" : "") + "</span>" +
          toggleBtn("t-watch", st.started, "Started", 'data-s="' + r.id + '" data-k="started"') +
          toggleBtn("t-built", st.cleared, "Cleared", 'data-s="' + r.id + '" data-k="cleared"') +
          "</div>";
      });

      el.innerHTML = html;

      el.querySelectorAll(".tog").forEach(function (b) {
        b.addEventListener("click", function () {
          var k = b.getAttribute("data-k");
          var sid = b.getAttribute("data-s");
          Store.update(function (s) {
            s.striver[sid] = s.striver[sid] || {};
            s.striver[sid][k] = !s.striver[sid][k];
          });
          self.render(el);
        });
      });
    },
  };
})();
