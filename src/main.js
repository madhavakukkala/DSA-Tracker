// Entry — boot order: auth gate (cloud mode) → load store → first-run
// onboarding → hash router. Back/forward and refresh work because the hash is
// the single source of truth.
(function () {
  "use strict";

  var ROUTES = [
    "today", "problems", "roadmap", "progress",
    "courses", "applications", "data", "help",
  ];

  var app = document.getElementById("app");
  var navLinks = document.querySelectorAll(".site-nav a");

  function routeFromHash() {
    var name = location.hash.replace(/^#\/?/, "");
    return ROUTES.indexOf(name) !== -1 ? name : null;
  }

  // ---- first-run onboarding: Day 1 + the two 3-hour windows ----
  function needsOnboarding() {
    if (Store.state.startDateChosen) return false;
    if (Store.state.problems.length > 0) {
      Store.setStartDate(Store.state.startDate); // legacy store: keep, stamp flag
      return false;
    }
    return true;
  }

  function renderOnboarding() {
    document.title = "Welcome — DSA Tracker";
    var today = Revision.todayLocal();
    var name = (window.Auth && Auth.active() && Auth.metaUsername()) || "";
    app.innerHTML =
      '<div class="onboard">' +
      '<p class="eyebrow">32 weeks · 3h DSA + 3h dev daily · Striver A2Z</p>' +
      '<h1 class="page-title">Set up your plan</h1>' +
      '<p class="onboard-lede">The plan is 32 weeks of 7-day blocks: <b>six study days, then ' +
      "Day 7 to consolidate</b> — no new topics that day; you re-solve what fought back and " +
      "cover core CS. The date you pick is Day 1 — every week and every revision date is " +
      "counted from it. Then choose your two daily 3-hour windows: one for DSA, one for " +
      "development.</p>" +
      '<form id="obForm" class="onboard-form" novalidate>' +
      '<label class="f-field"><span>Your name</span>' +
      '<input name="username" maxlength="30" value="' + UI.esc(name) + '" autocomplete="nickname"></label>' +
      '<div class="ob-row">' +
      '<label class="f-field"><span>Day 1 — I start on</span>' +
      '<input type="date" name="start" required value="' + today + '"></label>' +
      '<label class="f-field"><span>DSA window starts</span>' +
      '<input type="time" name="dsaStart" required value="06:30" step="300"></label>' +
      '<label class="f-field"><span>Dev window starts</span>' +
      '<input type="time" name="devStart" required value="21:00" step="300"></label>' +
      "</div>" +
      '<p class="onboard-note mono" id="obNote"></p>' +
      '<button type="submit" class="btn btn-primary">Lock it in</button>' +
      '<p class="small faint">All of this can be changed later on the Data screen.</p>' +
      "</form></div>";

    var form = document.getElementById("obForm");
    var note = document.getElementById("obNote");
    function preview() {
      var v = form.elements.start.value;
      var d = UI.parseHM(form.elements.dsaStart.value || "06:30");
      var n = UI.parseHM(form.elements.devStart.value || "21:00");
      var t = "DSA " + UI.fmtSpan(d, d + 180) + " · Dev " + UI.fmtSpan(n, n + 180);
      if (v) {
        t = "Day 1: " + UI.fmtShort(v) + " · Week 32 ends " +
          UI.fmtShort(Revision.addDays(v, 223)) + " · " + t;
      }
      note.textContent = t;
    }
    preview();
    ["start", "dsaStart", "devStart"].forEach(function (f) {
      form.elements[f].addEventListener("change", preview);
      form.elements[f].addEventListener("input", preview);
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = form.elements.start.value;
      if (!v) { form.elements.start.focus(); return; }
      Store.update(function (s) {
        s.settings.username = form.elements.username.value.trim();
        s.settings.dsaStart = form.elements.dsaStart.value || "06:30";
        s.settings.devStart = form.elements.devStart.value || "21:00";
      });
      Store.setStartDate(v); // the exact date IS Day 1 — no snapping
      render();
    });
    form.elements.username.focus();
  }

  function render() {
    var route = routeFromHash();
    if (!route) {
      location.replace("#/today"); // fires hashchange, which renders
      return;
    }

    UI.closeModal();

    // Keep the nav's 4px rule in sync with the learner's own hours.
    try {
      document.documentElement.style.setProperty("--day-strip", UI.dayStripCSS());
    } catch (e) { /* decorative */ }

    if (needsOnboarding()) { renderOnboarding(); return; }

    var view = window.Views && window.Views[route];
    document.title = (view ? view.title : "DSA Tracker") + " — DSA Tracker";

    // Fail open (§6): a throwing view must never leave a blank page.
    try {
      if (!view) throw new Error("view '" + route + "' did not load");
      view.render(app);
    } catch (e) {
      app.innerHTML =
        '<header class="page-head"><h1 class="page-title">Something broke</h1></header>' +
        '<p class="placeholder">This screen failed to render: <b>' +
        String(e.message).replace(/</g, "&lt;") + "</b>. " +
        'Your data is untouched — <a href="#/data">export a backup</a>, then check the console.</p>';
    }

    for (var i = 0; i < navLinks.length; i++) {
      var a = navLinks[i];
      if (a.getAttribute("href") === "#/" + route) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
    window.scrollTo(0, 0);
  }

  // ---- keyboard shortcuts: n, /, 1–7 (Esc lives in the modal/form handlers) ----
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" ||
              t.isContentEditable)) return;
    if (UI.modalOpen()) return;
    if (!Store.state || needsOnboarding()) return;

    if (e.key >= "1" && e.key <= "7") {
      location.hash = "#/" + ROUTES[+e.key - 1];
    } else if (e.key === "n") {
      e.preventDefault();
      if (routeFromHash() !== "today") { location.hash = "#/today"; }
      setTimeout(function () {
        if (Views.today.openQuickLog) Views.today.openQuickLog();
      }, 0);
    } else if (e.key === "/") {
      e.preventDefault();
      if (routeFromHash() !== "problems") { location.hash = "#/problems"; }
      setTimeout(function () {
        if (Views.problems.focusSearch) Views.problems.focusSearch();
      }, 0);
    }
  });

  // ---- boot ----
  (async function boot() {
    try { await Auth.init(); }
    catch (e) { /* offline or misconfigured — fall through to local mode */ }

    if (Auth.configured() && !Auth.active()) {
      Auth.renderGate(app);
      return;
    }

    await Store.init();

    if (Auth.active()) {
      var btn = document.createElement("button");
      btn.className = "signout mono";
      btn.textContent = "Sign out";
      btn.title = Auth.userEmail();
      btn.addEventListener("click", function () { Auth.signOut(); });
      document.querySelector(".site-nav").appendChild(btn);
    }

    window.addEventListener("hashchange", render);
    render();
  })();
})();
