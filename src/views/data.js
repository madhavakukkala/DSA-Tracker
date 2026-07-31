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
        "window counts from it. Changing it re-maps the roadmap; logged problems keep their dates.</p>" +
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
        Store.update(function (s) {
          s.settings.username = el.querySelector("#dName").value.trim();
          s.settings.dsaStart = el.querySelector("#dDsa").value || "06:30";
          s.settings.devStart = el.querySelector("#dDev").value || "21:00";
        });
        Store.setStartDate(v); // exact Day 1, no snapping
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
