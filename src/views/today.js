// Today — the home screen (§5.1). Opened twice a day; zero clicks to be useful.
(function () {
  "use strict";
  window.Views = window.Views || {};
  var esc = function (s) { return UI.esc(s); };

  // Today's blocks carry a tick-box so the day's work can be checked off.
  function subBlock(cls, time, label, text, key, ticks) {
    var done = !!(ticks && ticks[key]);
    return '<div class="blk ' + cls + (done ? " done" : "") + '">' +
      '<label class="blk-check"><input type="checkbox" data-task="' + key + '"' +
      (done ? " checked" : "") + ' aria-label="Mark ' + label + ' as done"></label>' +
      '<div class="blk-t"><b>' + label + "</b><em>" + time + "</em></div>" +
      '<div class="blk-c">' + text + "</div></div>";
  }

  function warningBanners(dueCount) {
    var html = "";
    if (Store.storageBroken) {
      html += '<div class="banner banner-alert" role="alert"><b>Storage is not working.</b> ' +
        esc(Store.storageError || "This browser is blocking localStorage.") +
        ' Your data lives only in memory — <a href="#/data">export it now</a>.</div>';
    }
    if (Revision.isBacklog(dueCount)) {
      html += '<div class="banner banner-alert" role="alert"><b>Revision backlog: ' +
        dueCount + " problems.</b> Stop taking new topics for two days and clear this.</div>";
    }
    if (Store.backupStale()) {
      var d = Store.daysSinceBackup();
      html += '<div class="banner banner-soft">' +
        (d === null ? "You have <b>never exported a backup</b>."
                    : "Last backup was <b>" + d + " days ago</b>.") +
        ' One careless "clear browsing data" erases everything — <a href="#/data">export now</a>.</div>';
    } else if (Store.backupOfferDue()) {
      html += '<div class="banner banner-soft"><b>25+ problems logged since your last backup.</b> ' +
        'Worth <a href="#/data">exporting again</a>.</div>';
    }
    return html;
  }

  function queueItemHTML(p, today) {
    var over = Revision.overdueDays(p, today);
    var name = p.link
      ? '<a href="' + esc(p.link) + '" target="_blank" rel="noopener">' + esc(p.name) + "</a>"
      : esc(p.name);
    return '<li class="q-item" data-id="' + esc(p.id) + '">' +
      '<div class="q-main"><div class="q-name">' + name + "</div>" +
      '<div class="q-meta mono">' + esc(p.topic || "—") + " · " + esc(p.difficulty) +
      ' · <span class="' + (over > 0 ? "q-over" : "") + '">' +
      (over > 0 ? over + (over === 1 ? " day" : " days") + " overdue" : "due today") +
      "</span> · " + Revision.nextSlot(p).toUpperCase() + "</div>" +
      '<div class="q-approach" hidden><span class="mono">' + esc(p.complexity || "") +
      "</span> " + esc(p.approach || "No approach was logged.") + "</div></div>" +
      '<div class="q-actions">' +
      '<button class="btn btn-ghost q-reveal" aria-expanded="false">Reveal</button>' +
      '<button class="btn q-tick">✓ Recalled</button>' +
      "</div></li>";
  }

  Views.today = {
    title: "Today",

    render(el) {
      var info = UI.currentWeekInfo();
      var today = info.today;
      var w = info.weekData;
      var problems = Store.state.problems;
      var queue = Revision.queue(problems, today);
      var sch = UI.schedule();
      var span = function (pair) { return UI.fmtSpan(pair[0], pair[1]); };
      var isRest = info.dayIndex === 6;
      var day = isRest ? null : w.d[info.dayIndex];
      var loggedToday = problems.filter(function (p) { return p.dateSolved === today; }).length;

      var contextNote = "";
      if (info.beforeStart) {
        contextNote = '<p class="context-note mono">Day 1 is ' +
          esc(UI.fmtShort(Store.state.startDate)) + " — " +
          info.daysToStart + " days away. Previewing Week 1, Day 1.</p>";
      } else if (info.afterEnd) {
        contextNote = '<p class="context-note mono">The 32 weeks are complete. Showing Week 32. Keep the tracker running.</p>';
      }
      if (info.beforeStart) { isRest = false; day = w.d[0]; }

      var ticks = Store.state.dayTicks[today] || {};
      var morning, night;
      if (isRest) {
        morning = subBlock("learn", span([sch.dsa.start, sch.dsa.end]), "Consolidation", esc(w.sun[0]), "rest-am", ticks);
        night = subBlock("eve", span([sch.dev.start, sch.dev.end]), "Night", esc(w.sun[1]), "rest-pm", ticks);
      } else {
        morning =
          subBlock("learn", span(sch.dsa.revision), "Revision",
            queue.length === 0 ? "Nothing due this session. Straight to learning."
              : "Clear the queue below — <b>" + queue.length + " due</b>. Title → approach → complexity, out loud, under 90 seconds each.",
            "revision", ticks) +
          subBlock("learn", span(sch.dsa.learn), "Learn", esc(day[0]), "learn", ticks) +
          subBlock("prac", span(sch.dsa.practise), "Practise", esc(day[1]), "practise", ticks) +
          subBlock("prac", span(sch.dsa.log), "Log",
            "Log every problem below — it builds tomorrow's revision queue.", "log", ticks);
        night =
          subBlock("eve", span(sch.dev.build), "Build", esc(day[2]), "build", ticks) +
          subBlock("eve", span(sch.dev.commit), "Commit",
            "Push your code. Write tomorrow's first task on a sticky note.", "commit", ticks);
      }

      el.innerHTML =
        warningBanners(queue.length) +
        '<header class="page-head">' +
        '<p class="eyebrow">' + esc(UI.fmtHuman(today)) +
        (Store.state.settings.username ? " · " + esc(Store.state.settings.username) : "") +
        " · Phase " + w.ph + " — " +
        esc(info.phase.title) + " · " + esc(UI.phaseRange(w.ph)) + "</p>" +
        '<h1 class="page-title">Week ' + info.week + ' <em class="faint">of 32</em>' +
        ' <em class="faint">· ' +
        esc(info.beforeStart ? "Day 1" : UI.dayLabel(info.dayIndex)) + "</em></h1>" +
        '<p class="week-line small">' + esc(w.dsa) + ' <span class="mono faint">' + esc(w.step) +
        "</span> — evenings: " + esc(w.dev) + "</p>" +
        contextNote +
        "</header>" +
        '<div class="daystrip">' + UI.dayStripHero() + "</div>" +

        '<div class="panels">' +
        '<section class="panel panel-dawn" aria-label="DSA window">' +
        '<div class="panel-head mono">' +
        (isRest ? "DAY 7 · CONSOLIDATION — NO NEW TOPICS"
                : "DSA · " + span([sch.dsa.start, sch.dsa.end])) + "</div>" +
        morning + "</section>" +
        '<section class="panel panel-dusk" aria-label="Dev window">' +
        '<div class="panel-head mono">DEV · ' + span([sch.dev.start, sch.dev.end]) + "</div>" +
        night + "</section></div>" +

        '<section class="queue-sec" aria-label="Revision queue">' +
        '<div class="sec-head"><h2 class="section-title">Revision queue</h2>' +
        '<span class="mono q-count">' + queue.length + " due</span></div>" +
        (queue.length === 0
          ? '<p class="empty">Nothing due. Either you\'re ahead, or you haven\'t logged anything yet.</p>'
          : '<ul class="q-list">' + queue.map(function (p) { return queueItemHTML(p, today); }).join("") + "</ul>") +
        "</section>" +

        '<section class="notes-sec" aria-label="Notes">' +
        '<div class="sec-head"><h2 class="section-title">Notes</h2>' +
        '<span class="mono faint">saved automatically · read them all under Notes</span></div>' +
        '<textarea id="dayNote" rows="4" placeholder="Anything worth keeping about today — ' +
        'what clicked, what fought back, what to fix tomorrow.">' +
        esc(Store.state.notes[today] || "") + "</textarea></section>" +

        '<section class="log-sec" aria-label="Quick log">' +
        '<button class="btn btn-primary" id="qlToggle" aria-expanded="false">+ Log a problem</button>' +
        '<span class="mono faint" id="qlCount">' +
        (loggedToday ? loggedToday + " logged today" : "") + "</span>" +
        '<form id="qlForm" class="ql-form" hidden novalidate></form>' +
        "</section>";

      // ---- task tick-boxes ----
      el.querySelectorAll("input[data-task]").forEach(function (cb) {
        cb.addEventListener("change", function () {
          var k = cb.getAttribute("data-task");
          Store.update(function (s) {
            var d = s.dayTicks[today] = s.dayTicks[today] || {};
            if (cb.checked) d[k] = true; else delete d[k];
            if (Object.keys(d).length === 0) delete s.dayTicks[today];
          });
          cb.closest(".blk").classList.toggle("done", cb.checked);
        });
      });

      // ---- the day's note, autosaved ----
      el.querySelector("#dayNote").addEventListener("input", function () {
        var v = this.value;
        Store.update(function (s) {
          if (v.trim()) s.notes[today] = v;
          else delete s.notes[today];
        });
      });

      // ---- revision queue: reveal then tick ----
      el.querySelectorAll(".q-item").forEach(function (li) {
        var reveal = li.querySelector(".q-reveal");
        var approach = li.querySelector(".q-approach");
        reveal.addEventListener("click", function () {
          var show = approach.hidden;
          approach.hidden = !show;
          reveal.setAttribute("aria-expanded", String(show));
          reveal.textContent = show ? "Hide" : "Reveal";
        });
        li.querySelector(".q-tick").addEventListener("click", function () {
          var id = li.getAttribute("data-id");
          Store.update(function (s) {
            var p = s.problems.find(function (x) { return x.id === id; });
            if (!p) return;
            var slot = Revision.nextSlot(p);
            if (slot) p[slot] = true;
          });
          // Update in place — never lose an open quick-log form to a re-render.
          var p = Store.state.problems.find(function (x) { return x.id === id; });
          if (p && Revision.status(p, today) === "due") {
            li.outerHTML = queueItemHTML(p, today);
            Views.today.render(el); // slot label changed; simplest correct refresh
            return;
          }
          li.remove();
          var left = el.querySelectorAll(".q-item").length;
          el.querySelector(".q-count").textContent = left + " due";
          if (left === 0) Views.today.render(el);
        });
      });

      // ---- quick log ----
      var toggle = el.querySelector("#qlToggle");
      var form = el.querySelector("#qlForm");

      function openForm() {
        form.innerHTML = UI.problemFormHTML({
          dateSolved: today,
          week: info.week,
          topic: w.dsa,
          striverStep: w.step,
        }) +
        '<div class="f-actions"><button type="submit" class="btn btn-primary">Save problem</button>' +
        '<span class="mono faint">Enter saves · Esc closes</span></div>';
        form.hidden = false;
        toggle.setAttribute("aria-expanded", "true");
        form.elements.name.focus();
      }
      function closeForm() {
        form.hidden = true;
        form.innerHTML = "";
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
      toggle.addEventListener("click", function () {
        form.hidden ? openForm() : closeForm();
      });
      form.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { e.stopPropagation(); closeForm(); }
      });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var r = UI.readProblemForm(form);
        if (!r.ok) { form.elements.name.focus(); return; }
        Store.update(function (s) {
          s.problems.push(Object.assign({ id: Store.uid(), r1: false, r2: false, r3: false }, r.values));
        });
        loggedToday = Store.state.problems.filter(function (p) { return p.dateSolved === today; }).length;
        el.querySelector("#qlCount").textContent = loggedToday + " logged today";
        // Keep the form open and clear it, so several problems go in a row.
        var keep = { dateSolved: form.elements.dateSolved.value, week: form.elements.week.value,
                     topic: form.elements.topic.value, striverStep: form.elements.striverStep.value };
        form.querySelector(".f-grid").outerHTML = UI.problemFormHTML(keep);
        form.elements.name.focus();
      });

      this.openQuickLog = function () { if (form.hidden) openForm(); else form.elements.name.focus(); };
    },
  };
})();
