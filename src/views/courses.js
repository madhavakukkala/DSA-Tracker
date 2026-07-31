// Courses — Namaste (React + Node) and Striver A2Z checklists (§5.5).
(function () {
  "use strict";
  window.Views = window.Views || {};
  var esc = function (s) { return UI.esc(s); };
  var tab = "namaste"; // survives view switches

  function courseState(id) { return Store.state.courses[id] || {}; }
  function striverState(id) { return Store.state.striver[id] || {}; }

  function toggleBtn(cls, on, label, data) {
    return '<button class="tog ' + cls + (on ? " on" : "") + '" ' + data +
      ' aria-pressed="' + !!on + '">' + label + "</button>";
  }

  function renderNamaste(info) {
    var items = window.SEED.courses.items;
    var note = window.SEED.courses.note;
    var built = items.filter(function (i) { return courseState(i.id).built; }).length;
    var pct = Math.round(built / items.length * 100);

    var html = '<div class="progress"><div class="progress-top">' +
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
    return html;
  }

  function renderStriver(info) {
    var rows = window.SEED.striver;
    var cleared = rows.filter(function (r) { return striverState(r.id).cleared; }).length;
    var pct = Math.round(cleared / rows.length * 100);

    var html = '<div class="progress"><div class="progress-top">' +
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
    return html;
  }

  Views.courses = {
    title: "Courses",

    render(el) {
      var info = UI.currentWeekInfo();
      var self = this;
      el.innerHTML =
        '<header class="page-head">' +
        '<p class="eyebrow">You are in week ' + info.week + (info.beforeStart ? " (plan not started)" : "") + "</p>" +
        '<h1 class="page-title">Courses</h1></header>' +
        '<div class="tabs" role="tablist">' +
        '<button class="tab-btn' + (tab === "namaste" ? " on" : "") + '" data-t="namaste" role="tab" aria-selected="' + (tab === "namaste") + '">Namaste</button>' +
        '<button class="tab-btn' + (tab === "striver" ? " on" : "") + '" data-t="striver" role="tab" aria-selected="' + (tab === "striver") + '">Striver A2Z</button>' +
        "</div>" +
        (tab === "namaste" ? renderNamaste(info) : renderStriver(info));

      el.querySelectorAll(".tab-btn").forEach(function (b) {
        b.addEventListener("click", function () { tab = b.getAttribute("data-t"); self.render(el); });
      });
      el.querySelectorAll(".tog").forEach(function (b) {
        b.addEventListener("click", function () {
          var k = b.getAttribute("data-k");
          var cid = b.getAttribute("data-c"), sid = b.getAttribute("data-s");
          Store.update(function (s) {
            if (cid) {
              s.courses[cid] = s.courses[cid] || {};
              s.courses[cid][k] = !s.courses[cid][k];
            } else {
              s.striver[sid] = s.striver[sid] || {};
              s.striver[sid][k] = !s.striver[sid][k];
            }
          });
          self.render(el);
        });
      });
    },
  };
})();
