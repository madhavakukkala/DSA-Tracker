// Today — the home screen (§5.1). Opened twice a day; zero clicks to be useful.
(function () {
  "use strict";
  window.Views = window.Views || {};
  var esc = function (s) { return UI.esc(s); };

  function subBlock(cls, time, label, text) {
    return '<div class="blk ' + cls + '">' +
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
      var isSunday = info.dayIndex === 6;
      var day = isSunday ? null : w.d[info.dayIndex];
      var loggedToday = problems.filter(function (p) { return p.dateSolved === today; }).length;

      var contextNote = "";
      if (info.beforeStart) {
        contextNote = '<p class="context-note mono">The plan starts Monday ' +
          esc(UI.fmtShort(Store.state.startDate)) + " — " +
          info.daysToStart + " days away. Previewing Week 1, Monday.</p>";
      } else if (info.afterEnd) {
        contextNote = '<p class="context-note mono">The 32 weeks are complete. Showing Week 32. Keep the tracker running.</p>';
      }
      if (info.beforeStart) { isSunday = false; day = w.d[0]; }

      var morning, night;
      if (isSunday) {
        morning = subBlock("learn", "06:30 – 09:30", "Consolidation", esc(w.sun[0]));
        night = subBlock("eve", "21:00 – 23:00", "Night", esc(w.sun[1]));
      } else {
        morning =
          subBlock("learn", "06:30 – 06:50", "Revision",
            queue.length === 0 ? "Nothing due this morning. Straight to learning."
              : "Clear the queue below — <b>" + queue.length + " due</b>. Title → approach → complexity, out loud, under 90 seconds each.") +
          subBlock("learn", "06:50 – 07:50", "Learn", esc(day[0])) +
          subBlock("prac", "07:50 – 09:20", "Practise", esc(day[1])) +
          subBlock("prac", "09:20 – 09:30", "Log",
            "Log every problem below — it builds tomorrow's revision queue.");
        night =
          subBlock("eve", "21:00 – 23:45", "Build", esc(day[2])) +
          subBlock("eve", "23:45 – 00:00", "Commit",
            "Push your code. Write tomorrow's first task on a sticky note.");
      }

      el.innerHTML =
        warningBanners(queue.length) +
        '<header class="page-head">' +
        '<p class="eyebrow">' + esc(UI.fmtHuman(today)) + " · Phase " + w.ph + " — " +
        esc(info.phase.title) + " · " + esc(UI.phaseRange(w.ph)) + "</p>" +
        '<h1 class="page-title">Week ' + info.week + ' <em class="faint">of 32</em></h1>' +
        '<p class="week-line small">' + esc(w.dsa) + ' <span class="mono faint">' + esc(w.step) +
        "</span> — evenings: " + esc(w.dev) + "</p>" +
        contextNote +
        "</header>" +
        '<div class="daystrip">' + UI.dayStripHero() + "</div>" +

        '<div class="panels">' +
        '<section class="panel panel-dawn" aria-label="Morning">' +
        '<div class="panel-head mono">' + (isSunday ? "SUNDAY · CONSOLIDATION" : "MORNING · 06:30 — 09:30") + "</div>" +
        morning + "</section>" +
        '<section class="panel panel-dusk" aria-label="Night">' +
        '<div class="panel-head mono">NIGHT · 21:00 — 00:00</div>' +
        night + "</section></div>" +

        '<section class="queue-sec" aria-label="Revision queue">' +
        '<div class="sec-head"><h2 class="section-title">Revision queue</h2>' +
        '<span class="mono q-count">' + queue.length + " due</span></div>" +
        (queue.length === 0
          ? '<p class="empty">Nothing due. Either you\'re ahead, or you haven\'t logged anything yet.</p>'
          : '<ul class="q-list">' + queue.map(function (p) { return queueItemHTML(p, today); }).join("") + "</ul>") +
        "</section>" +

        '<section class="log-sec" aria-label="Quick log">' +
        '<button class="btn btn-primary" id="qlToggle" aria-expanded="false">+ Log a problem</button>' +
        '<span class="mono faint" id="qlCount">' +
        (loggedToday ? loggedToday + " logged today" : "") + "</span>" +
        '<form id="qlForm" class="ql-form" hidden novalidate></form>' +
        "</section>";

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
