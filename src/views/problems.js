// Problems — full log table (§5.2): search, filters, sort, detail modal.
(function () {
  "use strict";
  window.Views = window.Views || {};
  var esc = function (s) { return UI.esc(s); };

  // Filter/sort state survives view switches within a session.
  var ui = { q: "", topic: "", difficulty: "", status: "", solvedHow: "",
             redoOnly: false, sortKey: "dateSolved", sortDir: -1 };

  var COLS = [
    { key: "dateSolved", label: "Date", mono: true },
    { key: "week", label: "Wk", mono: true },
    { key: "topic", label: "Topic" },
    { key: "name", label: "Problem" },
    { key: "difficulty", label: "Diff" },
    { key: "solvedHow", label: "How" },
    { key: "minutes", label: "Min", mono: true },
    { key: "complexity", label: "Complexity", mono: true },
    { key: "confidence", label: "Conf", mono: true },
    { key: "status", label: "Revision" },
    { key: "redo", label: "Redo" },
  ];

  function derived(p, today) {
    return { status: Revision.status(p, today), redo: Revision.needsRedo(p) };
  }

  function applyFilters(problems, today) {
    var q = ui.q.toLowerCase();
    return problems.filter(function (p) {
      var d = derived(p, today);
      if (q && (p.name + " " + p.topic + " " + p.approach).toLowerCase().indexOf(q) === -1) return false;
      if (ui.topic && p.topic !== ui.topic) return false;
      if (ui.difficulty && p.difficulty !== ui.difficulty) return false;
      if (ui.status && d.status !== ui.status) return false;
      if (ui.solvedHow && p.solvedHow !== ui.solvedHow) return false;
      if (ui.redoOnly && !d.redo) return false;
      return true;
    });
  }

  function sortRows(rows, today) {
    var k = ui.sortKey, dir = ui.sortDir;
    return rows.slice().sort(function (a, b) {
      var va, vb;
      if (k === "status") { va = Revision.status(a, today); vb = Revision.status(b, today); }
      else if (k === "redo") { va = Revision.needsRedo(a) ? 1 : 0; vb = Revision.needsRedo(b) ? 1 : 0; }
      else { va = a[k]; vb = b[k]; }
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }

  function statusChip(s) {
    return '<span class="chip-status st-' + s + '">' +
      (s === "due" ? "DUE" : s === "done" ? "DONE" : "SCHEDULED") + "</span>";
  }

  function rowHTML(p, today) {
    var d = derived(p, today);
    return '<tr data-id="' + esc(p.id) + '" tabindex="0">' +
      '<td class="mono">' + esc(p.dateSolved) + "</td>" +
      '<td class="mono">' + esc(p.week) + "</td>" +
      "<td>" + esc(p.topic || "—") + "</td>" +
      '<td class="t-name">' + esc(p.name) + "</td>" +
      "<td>" + esc(p.difficulty) + "</td>" +
      "<td>" + esc(p.solvedHow) + "</td>" +
      '<td class="mono">' + esc(p.minutes || "") + "</td>" +
      '<td class="mono">' + esc(p.complexity || "") + "</td>" +
      '<td class="mono">' + esc(p.confidence) + "</td>" +
      "<td>" + statusChip(d.status) + "</td>" +
      "<td>" + (d.redo ? '<span class="redo-flag mono">REDO</span>' : "") + "</td></tr>";
  }

  function detailModal(id, rerender) {
    var today = Revision.todayLocal();
    var p = Store.state.problems.find(function (x) { return x.id === id; });
    if (!p) return;
    var d = derived(p, today);

    function revRow(slot, label) {
      var due = Revision[slot + "Due"](p);
      return '<label class="rev-row"><input type="checkbox" data-slot="' + slot + '"' +
        (p[slot] ? " checked" : "") + "> <span>" + label +
        ' <span class="mono faint">due ' + esc(due) + "</span></span></label>";
    }

    var m = UI.openModal({
      head: '<div class="m-wk">' + esc(p.dateSolved) + " · week " + esc(p.week) + " · " +
        esc(p.topic || "—") + "</div>" +
        '<div class="m-title">' + esc(p.name) + "</div>" +
        '<div class="m-tracks"><span class="chip a">' + esc(p.difficulty) + "</span>" +
        '<span class="chip b">' + esc(p.solvedHow) + "</span>" + statusChip(d.status) +
        (d.redo ? ' <span class="redo-flag mono">REDO</span>' : "") + "</div>",
      body:
        '<div class="detail">' +
        '<p class="d-label mono">APPROACH</p><p>' + esc(p.approach || "—") + "</p>" +
        '<p class="d-label mono">COMPLEXITY</p><p class="mono">' + esc(p.complexity || "—") + "</p>" +
        '<p class="d-label mono">LINK</p><p>' +
        (p.link ? '<a href="' + esc(p.link) + '" target="_blank" rel="noopener">' + esc(p.link) + "</a>" : "—") + "</p>" +
        '<p class="d-label mono">NOTES</p><p>' + esc(p.notes || "—") + "</p>" +
        '<p class="d-label mono">MINUTES · CONFIDENCE</p><p class="mono">' +
        esc(p.minutes || 0) + " min · " + esc(p.confidence) + "/5</p>" +
        '<p class="d-label mono">REVISIONS</p>' +
        revRow("r1", "R1 — day 2") + revRow("r2", "R2 — day 5") + revRow("r3", "R3 — day 10") +
        '<div class="f-actions"><button class="btn" id="dEdit">Edit</button>' +
        '<button class="btn btn-danger" id="dDelete">Delete</button></div>' +
        '<form id="dForm" hidden novalidate></form>' +
        "</div>",
    });

    m.bodyEl.querySelectorAll("input[data-slot]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        Store.update(function (s) {
          var x = s.problems.find(function (y) { return y.id === id; });
          if (x) x[cb.getAttribute("data-slot")] = cb.checked;
        });
        rerender();
      });
    });

    m.bodyEl.querySelector("#dDelete").addEventListener("click", function () {
      if (!confirm('Delete "' + p.name + '"? This cannot be undone.')) return;
      Store.update(function (s) {
        s.problems = s.problems.filter(function (x) { return x.id !== id; });
      });
      m.close();
      rerender();
    });

    m.bodyEl.querySelector("#dEdit").addEventListener("click", function () {
      var form = m.bodyEl.querySelector("#dForm");
      form.innerHTML = UI.problemFormHTML(p) +
        '<div class="f-actions"><button type="submit" class="btn btn-primary">Save changes</button></div>';
      form.hidden = false;
      this.hidden = true;
      form.elements.name.focus();
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var r = UI.readProblemForm(form);
        if (!r.ok) return;
        Store.update(function (s) {
          var x = s.problems.find(function (y) { return y.id === id; });
          if (x) Object.assign(x, r.values);
        });
        m.close();
        rerender();
      });
    });
  }

  Views.problems = {
    title: "Problems",

    render(el) {
      var today = Revision.todayLocal();
      var all = Store.state.problems;
      var topics = Array.from(new Set(all.map(function (p) { return p.topic; }).filter(Boolean))).sort();
      var rows = sortRows(applyFilters(all, today), today);
      var self = this;
      var rerender = function () { self.render(el); };

      function sel(name, current, options, blank) {
        return '<select data-f="' + name + '"><option value="">' + blank + "</option>" +
          options.map(function (o) {
            return '<option value="' + esc(o) + '"' + (current === o ? " selected" : "") + ">" + esc(o) + "</option>";
          }).join("") + "</select>";
      }

      el.innerHTML =
        '<header class="page-head">' +
        '<p class="eyebrow">Every problem ever logged</p>' +
        '<h1 class="page-title">Problems</h1></header>' +

        '<div class="filter-bar">' +
        '<input type="search" id="pSearch" placeholder="Search name, topic, approach…  ( / )" value="' + esc(ui.q) + '">' +
        sel("topic", ui.topic, topics, "All topics") +
        sel("difficulty", ui.difficulty, ["Easy", "Medium", "Hard"], "All difficulties") +
        sel("status", ui.status, ["due", "scheduled", "done"], "All statuses") +
        sel("solvedHow", ui.solvedHow, ["alone", "hint", "editorial"], "Solved how — all") +
        '<label class="f-check"><input type="checkbox" id="pRedo"' + (ui.redoOnly ? " checked" : "") + "> Redo only</label>" +
        "</div>" +

        (all.length === 0
          ? '<p class="empty">No problems yet. Log your first from the <a href="#/today">Today</a> screen — it takes twenty seconds.</p>'
          : '<div class="table-wrap"><table class="tbl"><thead><tr>' +
            COLS.map(function (c) {
              var arrow = ui.sortKey === c.key ? (ui.sortDir === 1 ? " ↑" : " ↓") : "";
              return '<th data-k="' + c.key + '" tabindex="0" role="button" aria-label="Sort by ' +
                c.label + '">' + c.label + arrow + "</th>";
            }).join("") +
            "</tr></thead><tbody>" +
            rows.map(function (p) { return rowHTML(p, today); }).join("") +
            "</tbody></table></div>" +
            '<p class="tbl-foot mono">' + rows.length + " shown · " + all.length + " total</p>");

      var search = el.querySelector("#pSearch");
      if (search) {
        search.addEventListener("input", function () {
          ui.q = this.value;
          rerender();
          var s = el.querySelector("#pSearch");
          s.focus();
          s.setSelectionRange(s.value.length, s.value.length);
        });
      }
      el.querySelectorAll("select[data-f]").forEach(function (s) {
        s.addEventListener("change", function () { ui[s.getAttribute("data-f")] = s.value; rerender(); });
      });
      var redo = el.querySelector("#pRedo");
      if (redo) redo.addEventListener("change", function () { ui.redoOnly = this.checked; rerender(); });

      el.querySelectorAll("th[data-k]").forEach(function (th) {
        function sort() {
          var k = th.getAttribute("data-k");
          if (ui.sortKey === k) ui.sortDir = -ui.sortDir;
          else { ui.sortKey = k; ui.sortDir = 1; }
          rerender();
        }
        th.addEventListener("click", sort);
        th.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sort(); }
        });
      });

      el.querySelectorAll("tbody tr").forEach(function (tr) {
        function open() { detailModal(tr.getAttribute("data-id"), rerender); }
        tr.addEventListener("click", open);
        tr.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); open(); }
        });
      });

      this.focusSearch = function () { if (search) search.focus(); };
    },
  };
})();
