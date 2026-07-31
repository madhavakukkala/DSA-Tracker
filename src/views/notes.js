// Notes — every day's note, grouped by week (newest first). Days show whether
// a note exists; opening a day shows the note in an editable, autosaving box.
(function () {
  "use strict";
  window.Views = window.Views || {};
  var esc = function (s) { return UI.esc(s); };
  var openDate = null; // survives re-renders within the session

  function preview(text) {
    var line = text.split("\n")[0];
    return line.length > 90 ? line.slice(0, 90) + "…" : line;
  }

  function dayRow(date, label, note, isToday, isFuture) {
    var flag = note ? '<span class="nd-flag has" aria-label="Has a note">●</span>'
                    : '<span class="nd-flag">—</span>';
    var prev = note ? esc(preview(note))
             : isFuture ? "" : '<span class="faint">no note</span>';
    var open = openDate === date;
    return '<div class="nd">' +
      '<button class="nd-row' + (open ? " open" : "") + (isFuture ? " future" : "") +
      '" data-date="' + date + '"' + (isFuture ? " disabled" : "") + ">" +
      '<span class="nd-day mono">' + esc(label) + (isToday ? " · TODAY" : "") + "</span>" +
      '<span class="nd-date mono">' + esc(UI.fmtShort(date)) + "</span>" +
      '<span class="nd-prev">' + prev + "</span>" + flag + "</button>" +
      (open
        ? '<div class="nd-open"><textarea data-note="' + date + '" rows="5" ' +
          'placeholder="Write it while it\'s fresh.">' + esc(note || "") + "</textarea>" +
          '<span class="mono faint">saved automatically</span></div>'
        : "") +
      "</div>";
  }

  Views.notes = {
    title: "Notes",

    render(el) {
      var info = UI.currentWeekInfo();
      var today = info.today;
      var start = Store.state.startDate;
      var notes = Store.state.notes;
      var count = Object.keys(notes).length;
      var self = this;

      var shown = {};
      var html = "";
      var lastWeek = info.beforeStart ? 0 : UI.clampWeek(info.raw);
      for (var w = lastWeek; w >= 1; w--) {
        var weekNotes = 0, rows = "";
        for (var d = 0; d < 7; d++) {
          var date = Revision.addDays(start, (w - 1) * 7 + d);
          shown[date] = true;
          var note = notes[date];
          if (note) weekNotes++;
          rows += dayRow(date, UI.dayLabel(d), note, date === today, date > today);
        }
        html += '<section class="nw-week"><div class="phase-head">' +
          '<span class="phase-num mono">WEEK ' + String(w).padStart(2, "0") + "</span>" +
          '<span class="phase-title">' + esc(SEED.curriculum.weeks[w - 1].dsa) + "</span>" +
          '<span class="phase-when mono">' + esc(UI.weekRange(w)) + " · " + weekNotes +
          (weekNotes === 1 ? " note" : " notes") + "</span></div>" + rows + "</section>";
      }

      // Notes on dates outside the shown weeks (e.g. written before Day 1)
      var stray = Object.keys(notes).filter(function (d) { return !shown[d]; }).sort().reverse();
      if (stray.length) {
        html += '<section class="nw-week"><div class="phase-head">' +
          '<span class="phase-title">Outside the plan</span></div>' +
          stray.map(function (d) {
            return dayRow(d, "—", notes[d], d === today, false);
          }).join("") + "</section>";
      }

      if (!html) {
        html = '<p class="empty">Nothing here yet. Write your first note at the bottom of the ' +
          '<a href="#/today">Today</a> screen — future you will thank you.</p>';
      }

      el.innerHTML =
        '<header class="page-head">' +
        '<p class="eyebrow">' + count + (count === 1 ? " note" : " notes") + " so far</p>" +
        '<h1 class="page-title">Notes</h1></header>' + html;

      el.querySelectorAll(".nd-row").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var date = btn.getAttribute("data-date");
          openDate = openDate === date ? null : date;
          self.render(el);
          var ta = el.querySelector("textarea[data-note]");
          if (ta) ta.focus();
        });
      });
      el.querySelectorAll("textarea[data-note]").forEach(function (ta) {
        ta.addEventListener("input", function () {
          var date = ta.getAttribute("data-note");
          var v = ta.value;
          Store.update(function (s) {
            if (v.trim()) s.notes[date] = v;
            else delete s.notes[date];
          });
        });
        ta.addEventListener("keydown", function (e) {
          if (e.key === "Escape") { e.stopPropagation(); openDate = null; self.render(el); }
        });
      });
    },
  };
})();
