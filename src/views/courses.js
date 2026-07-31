// Courses — Namaste React + Node episode checklist (§5.5). Only "Built it"
// counts toward progress. The Striver checklist has its own screen.
(function () {
  "use strict";
  window.Views = window.Views || {};
  var esc = function (s) { return UI.esc(s); };

  function courseState(id) { return Store.state.courses[id] || {}; }

  function toggleBtn(cls, on, label, data) {
    return '<button class="tog ' + cls + (on ? " on" : "") + '" ' + data +
      ' aria-pressed="' + !!on + '">' + label + "</button>";
  }

  Views.courses = {
    title: "Courses",

    render(el) {
      var info = UI.currentWeekInfo();
      var self = this;
      var items = window.SEED.courses.items;
      var note = window.SEED.courses.note;
      var built = items.filter(function (i) { return courseState(i.id).built; }).length;
      var pct = Math.round(built / items.length * 100);

      var html =
        '<header class="page-head">' +
        '<p class="eyebrow">Namaste React · Namaste Node · you are in week ' + info.week + "</p>" +
        '<h1 class="page-title">Courses</h1></header>' +
        '<div class="progress"><div class="progress-top">' +
        '<span>Built — watching without building is not progress</span>' +
        "<span><b>" + pct + "%</b> · " + built + " / " + items.length + "</span></div>" +
        '<div class="bar"><div class="bar-fill" style="width:' + pct + '%"></div></div></div>';

      ["React", "Node", "Both"].forEach(function (course) {
        var group = items.filter(function (i) { return i.course === course; });
        if (!group.length) return;
        html += '<h2 class="section-title course-h">' +
          (course === "Both" ? "Bonus — shared" : "Namaste " + course) + "</h2>";
        var section = null;
        group.forEach(function (i) {
          if (i.section !== section) {
            section = i.section;
            html += '<p class="d-label mono course-sec">' + esc(section) + "</p>";
          }
          var st = courseState(i.id);
          var cur = i.plannedWeek === info.week && !info.beforeStart && !info.afterEnd;
          html += '<div class="c-row' + (cur ? " cur-week" : "") + '">' +
            '<span class="c-ep">' + esc(i.episode) + "</span>" +
            '<span class="c-wk mono' + (cur ? " now" : "") + '">wk ' + i.plannedWeek +
            (cur ? " · NOW" : "") + "</span>" +
            toggleBtn("t-watch", st.watched, "Watched", 'data-c="' + i.id + '" data-k="watched"') +
            toggleBtn("t-built", st.built, "Built it", 'data-c="' + i.id + '" data-k="built"') +
            "</div>";
        });
      });
      if (note) html += '<p class="small faint course-note">Note: ' + esc(note) + "</p>";

      el.innerHTML = html;

      el.querySelectorAll(".tog").forEach(function (b) {
        b.addEventListener("click", function () {
          var k = b.getAttribute("data-k");
          var cid = b.getAttribute("data-c");
          Store.update(function (s) {
            s.courses[cid] = s.courses[cid] || {};
            s.courses[cid][k] = !s.courses[cid][k];
          });
          self.render(el);
        });
      });
    },
  };
})();
