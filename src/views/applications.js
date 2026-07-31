// Applications — the job pipeline, from week 19 (§5.6).
(function () {
  "use strict";
  window.Views = window.Views || {};
  var esc = function (s) { return UI.esc(s); };

  var STATUSES = ["Applied", "Referred", "OA sent", "OA done", "Round 1", "Round 2",
                  "Round 3", "HR", "Offer", "Rejected", "Ghosted"];

  function rowClass(status) {
    if (status === "Offer") return "app-offer";
    if (status === "Rejected" || status === "Ghosted") return "app-muted";
    return "";
  }

  Views.applications = {
    title: "Applications",

    render(el) {
      var today = Revision.todayLocal();
      var apps = Store.state.applications;
      var self = this;
      var rerender = function () { self.render(el); };

      var rows = apps.slice().sort(function (a, b) {
        return a.dateApplied < b.dateApplied ? 1 : -1;
      }).map(function (a) {
        var last = a.lastContact || a.dateApplied;
        var days = Revision.diffDays(last, today);
        var stale = days > 10 && a.status !== "Offer" && a.status !== "Rejected" && a.status !== "Ghosted";
        return '<tr class="' + rowClass(a.status) + '" data-id="' + esc(a.id) + '">' +
          '<td class="mono">' + esc(a.dateApplied) + "</td>" +
          "<td>" + esc(a.company) + "</td>" +
          "<td>" + esc(a.role) + "</td>" +
          "<td>" + esc(a.source) + "</td>" +
          "<td><select class="+'"app-status"'+">" + STATUSES.map(function (s) {
            return '<option' + (s === a.status ? " selected" : "") + ">" + s + "</option>";
          }).join("") + "</select></td>" +
          '<td class="mono">' + esc(last) + "</td>" +
          '<td class="mono' + (stale ? " amber" : "") + '">' + days +
          (stale ? " · follow up" : "") + "</td>" +
          "<td>" + esc(a.nextAction || "") + "</td>" +
          "<td>" + esc(a.notes || "") + "</td>" +
          '<td><button class="btn btn-ghost app-touch" title="Mark contact today">touch</button> ' +
          '<button class="btn btn-ghost app-del" aria-label="Delete application">✕</button></td></tr>';
      }).join("");

      el.innerHTML =
        '<header class="page-head">' +
        '<p class="eyebrow">From week 19 — ' + esc(UI.fmtShort(UI.weekStart(19))) +
        ' · follow up after 10 quiet days</p>' +
        '<h1 class="page-title">Applications</h1></header>' +

        '<form id="appForm" class="app-form" novalidate>' +
        '<input name="company" placeholder="Company *" required>' +
        '<input name="role" placeholder="Role">' +
        '<input name="source" placeholder="Source (referral, portal…)">' +
        '<input name="nextAction" placeholder="Next action">' +
        '<button class="btn btn-primary" type="submit">Add</button></form>' +

        (apps.length === 0
          ? '<p class="empty">No applications yet. They start in week 19 — ' +
            esc(UI.fmtShort(UI.weekStart(19))) + ". When they do, every one goes here.</p>"
          : '<div class="table-wrap"><table class="tbl"><thead><tr>' +
            "<th>Applied</th><th>Company</th><th>Role</th><th>Source</th><th>Status</th>" +
            "<th>Last contact</th><th>Days</th><th>Next action</th><th>Notes</th><th></th>" +
            "</tr></thead><tbody>" + rows + "</tbody></table></div>");

      el.querySelector("#appForm").addEventListener("submit", function (e) {
        e.preventDefault();
        var f = e.target;
        if (!f.elements.company.value.trim()) { f.elements.company.focus(); return; }
        Store.update(function (s) {
          s.applications.push({
            id: Store.uid(),
            dateApplied: today,
            company: f.elements.company.value.trim(),
            role: f.elements.role.value.trim(),
            source: f.elements.source.value.trim(),
            status: "Applied",
            lastContact: today,
            nextAction: f.elements.nextAction.value.trim(),
            notes: "",
          });
        });
        rerender();
      });

      el.querySelectorAll("tbody tr").forEach(function (tr) {
        var id = tr.getAttribute("data-id");
        function find(s) { return s.applications.find(function (a) { return a.id === id; }); }
        tr.querySelector(".app-status").addEventListener("change", function () {
          var v = this.value;
          Store.update(function (s) { var a = find(s); if (a) { a.status = v; a.lastContact = today; } });
          rerender();
        });
        tr.querySelector(".app-touch").addEventListener("click", function () {
          Store.update(function (s) { var a = find(s); if (a) a.lastContact = today; });
          rerender();
        });
        tr.querySelector(".app-del").addEventListener("click", function () {
          var a = Store.state.applications.find(function (x) { return x.id === id; });
          if (!confirm("Delete the application to " + (a ? a.company : "?") + "?")) return;
          Store.update(function (s) {
            s.applications = s.applications.filter(function (x) { return x.id !== id; });
          });
          rerender();
        });
      });
    },
  };
})();
