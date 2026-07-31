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

        '<section class="data-sec"><h2 class="section-title">Plan start date</h2>' +
        '<p class="small faint">Every week and revision window is anchored to this date. ' +
        "Weeks run Monday–Sunday, so it snaps to a Monday. Changing it re-maps the roadmap; " +
        "logged problems keep their dates.</p>" +
        '<div class="reset-row"><input type="date" id="dStart" value="' + esc(Store.state.startDate) + '">' +
        '<button class="btn" id="dStartSave">Save</button>' +
        '<span class="mono faint" id="dStartNote"></span></div></section>' +

        '<section class="data-sec"><h2 class="section-title">Import</h2>' +
        '<p class="small faint">Restores a backup file. You will see a summary and confirm before anything is replaced.</p>' +
        '<input type="file" id="dImport" accept=".json,application/json"></section>' +

        '<section class="data-sec danger-zone"><h2 class="section-title">Reset</h2>' +
        '<p class="small faint">Erases everything. Type <b class="mono">DELETE</b> to arm the button.</p>' +
        '<div class="reset-row"><input id="dResetWord" class="mono" autocomplete="off" placeholder="DELETE">' +
        '<button class="btn btn-danger" id="dReset" disabled>Reset all data</button></div></section>';

      el.querySelector("#dExport").addEventListener("click", function () {
        UI.download("dsa-tracker-backup-" + today + ".json", Store.exportJSON());
        Store.markBackup();
        self.render(el);
      });

      el.querySelector("#dStartSave").addEventListener("click", function () {
        var v = el.querySelector("#dStart").value;
        if (!v) return;
        Store.setStartDate(UI.mondayOf(v));
        el.querySelector("#dStartNote").textContent = "Saved — week 1 starts " +
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
      word.addEventListener("input", function () {
        resetBtn.disabled = word.value !== "DELETE";
      });
      resetBtn.addEventListener("click", function () {
        Store.reset();
        self.render(el);
      });
    },
  };
})();
