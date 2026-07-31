// Data — export / import / reset (§5.7, §8). Backup is a feature.
(function () {
  "use strict";
  window.Views = window.Views || {};
  var esc = function (s) { return UI.esc(s); };

  Views.data = {
    title: "Data",

    render(el) {
      var today = Revision.todayLocal();
      var d = Store.daysSinceBackup();
      var self = this;
      var backupLine = d === null
        ? '<span class="amber"><b>Never backed up.</b></span>'
        : "Last backup: <b>" + esc(Store.state.lastBackup) + "</b> (" + d + " days ago)" +
          (d > 7 ? ' <span class="amber">— more than 7 days old</span>' : "");

      el.innerHTML =
        '<header class="page-head">' +
        '<p class="eyebrow">Everything lives in this browser\'s localStorage</p>' +
        '<h1 class="page-title">Data</h1></header>' +

        (Store.storageBroken
          ? '<div class="banner banner-alert" role="alert"><b>Storage is not working.</b> ' +
            esc(Store.storageError) + " Export below — your data survives only in memory right now.</div>"
          : "") +

        '<section class="data-sec"><h2 class="section-title">Export</h2>' +
        '<p class="small">' + backupLine + "</p>" +
        '<p class="small faint">' + Store.state.problems.length + " problems · " +
        Store.state.applications.length + " applications · " +
        Store.state.dailyLogs.length + " daily logs</p>" +
        '<button class="btn btn-primary" id="dExport">Download backup JSON</button></section>' +

        '<section class="data-sec"><h2 class="section-title">Your plan</h2>' +
        (Auth.active()
          ? '<p class="small faint">Signed in as <b>' + esc(Auth.userEmail()) +
            "</b> — data is stored in your account and follows you across devices.</p>"
          : '<p class="small faint">Local mode — data lives in this browser only.</p>') +
        '<p class="small faint">The date below is <b>Day 1</b>. Every week and revision ' +
        "window counts from it. <b>Changing Day 1 resets the tracker</b> — the 32 weeks " +
        "restart from the new date. Name and window times can be changed freely.</p>" +
        '<div class="f-grid plan-grid">' +
        '<label class="f-field"><span>Name</span>' +
        '<input id="dName" maxlength="30" value="' + esc(Store.state.settings.username) + '"></label>' +
        '<label class="f-field"><span>Day 1</span>' +
        '<input type="date" id="dStart" value="' + esc(Store.state.startDate) + '"></label>' +
        '<label class="f-field"><span>DSA window starts</span>' +
        '<input type="time" id="dDsa" step="300" value="' + esc(Store.state.settings.dsaStart) + '"></label>' +
        '<label class="f-field"><span>Dev window starts</span>' +
        '<input type="time" id="dDev" step="300" value="' + esc(Store.state.settings.devStart) + '"></label>' +
        "</div>" +
        '<div class="f-actions"><button class="btn" id="dStartSave">Save plan settings</button>' +
        '<span class="mono faint" id="dStartNote"></span></div></section>' +

        '<section class="data-sec"><h2 class="section-title">Import</h2>' +
        '<p class="small faint">Restores a backup file. You will see a summary and confirm before anything is replaced.</p>' +
        '<input type="file" id="dImport" accept=".json,application/json"></section>' +

        '<section class="data-sec danger-zone"><h2 class="section-title">Danger zone</h2>' +
        '<p class="small faint">Type <b class="mono">DELETE</b> to arm the buttons. ' +
        "<b>Reset</b> erases all tracker data" +
        (Auth.active()
          ? "; <b>Delete account</b> erases the data <i>and</i> the account itself — permanently."
          : ".") + "</p>" +
        '<div class="reset-row"><input id="dResetWord" class="mono" autocomplete="off" placeholder="DELETE">' +
        '<button class="btn btn-danger" id="dReset" disabled>Reset all data</button>' +
        (Auth.active()
          ? '<button class="btn btn-danger" id="dKill" disabled>Delete account</button>'
          : "") +
        "</div></section>";

      el.querySelector("#dExport").addEventListener("click", function () {
        UI.download("dsa-tracker-backup-" + today + ".json", Store.exportJSON());
        Store.markBackup();
        self.render(el);
      });

      el.querySelector("#dStartSave").addEventListener("click", function () {
        var v = el.querySelector("#dStart").value;
        if (!v) return;
        var dateChanged = Store.state.startDateChosen && v !== Store.state.startDate;
        if (dateChanged) {
          var ok = confirm(
            "Changing Day 1 RESETS your tracker.\n\n" +
            "All logged problems, revisions, week statuses, checklists and daily logs " +
            "are erased, and the 32 weeks restart from " + UI.fmtShort(v) + ".\n\n" +
            "Export a backup first if you want to keep the history.\n\nReset and restart?");
          if (!ok) { el.querySelector("#dStart").value = Store.state.startDate; return; }
        }
        var name = el.querySelector("#dName").value.trim();
        var dsa = el.querySelector("#dDsa").value || "06:30";
        var dev = el.querySelector("#dDev").value || "21:00";
        Store.update(function (s) {
          if (dateChanged) {
            s.problems = []; s.dailyLogs = []; s.applications = [];
            s.weeks = {}; s.courses = {}; s.striver = {};
            s.dayTicks = {}; s.notes = {};
            s.lastBackup = null; s.backupAtCount = 0;
          }
          s.settings.username = name;
          s.settings.dsaStart = dsa;
          s.settings.devStart = dev;
        });
        Store.setStartDate(v); // exact Day 1, no snapping
        if (dateChanged) { self.render(el); return; }
        el.querySelector("#dStartNote").textContent = "Saved — Day 1 is " +
          UI.fmtShort(Store.state.startDate);
      });

      el.querySelector("#dImport").addEventListener("change", function () {
        var file = this.files[0];
        var input = this;
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          var parsed;
          try { parsed = JSON.parse(reader.result); }
          catch (e) { alert("That file is not valid JSON."); input.value = ""; return; }
          var v = Store.validateImport(parsed);
          if (!v.ok) { alert("Import refused: " + v.error); input.value = ""; return; }
          var msg = "This file has " + v.data.problems.length + " problems, " +
            v.data.applications.length + " applications.\nYou currently have " +
            Store.state.problems.length + " problems, " +
            Store.state.applications.length + " applications.\n\nReplace your current data?";
          if (confirm(msg)) { Store.replaceState(v.data); self.render(el); alert("Imported."); }
          input.value = "";
        };
        reader.readAsText(file);
      });

      var word = el.querySelector("#dResetWord");
      var resetBtn = el.querySelector("#dReset");
      var killBtn = el.querySelector("#dKill");
      word.addEventListener("input", function () {
        var armed = word.value === "DELETE";
        resetBtn.disabled = !armed;
        if (killBtn) killBtn.disabled = !armed;
      });
      resetBtn.addEventListener("click", function () {
        Store.reset();
        self.render(el);
      });
      if (killBtn) killBtn.addEventListener("click", async function () {
        if (!confirm("Delete your account and all its data, permanently?\n\n" +
          "There is no undo. Export a backup first if you might come back.")) return;
        killBtn.disabled = true;
        killBtn.textContent = "Deleting…";
        var err = await Auth.deleteAccount();
        if (err) {
          alert("Could not delete the account: " + err);
          killBtn.textContent = "Delete account";
          killBtn.disabled = false;
        }
        // On success, the sign-out reloads into the sign-in page.
      });
    },
  };
})();
