// Entry — hash router, nav state, keyboard shortcuts (§5, §6).
// Back/forward and refresh work because the hash is the single source of truth.
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

  // ---- first-run onboarding: lock in a start date (weeks run Mon–Sun) ----
  function needsOnboarding() {
    if (Store.state.startDateChosen) return false;
    if (Store.state.problems.length > 0) {
      // A pre-onboarding store: keep its date, just stamp the flag.
      Store.setStartDate(Store.state.startDate);
      return false;
    }
    return true;
  }

  function renderOnboarding() {
    document.title = "Welcome — DSA Tracker";
    var today = Revision.todayLocal();
    var suggested = UI.nextMonday(today);
    app.innerHTML =
      '<div class="onboard">' +
      '<p class="eyebrow">32 weeks · 6:30–9:30 am DSA · 9–12 pm dev · Striver A2Z</p>' +
      '<h1 class="page-title">Lock in your start date</h1>' +
      '<p class="onboard-lede">The plan is 32 weeks: mornings for algorithms, nights for ' +
      "development, Sundays for consolidation. Everything — every week, every revision date — " +
      "is anchored to the day you start. Weeks run <b>Monday to Sunday</b>, so your date snaps " +
      "to the Monday of the week you pick.</p>" +
      '<form id="obForm" class="onboard-form" novalidate>' +
      '<label class="f-field"><span>I start on</span>' +
      '<input type="date" name="start" required value="' + suggested + '"></label>' +
      '<p class="onboard-note mono" id="obNote"></p>' +
      '<button type="submit" class="btn btn-primary">Lock it in</button>' +
      '<p class="small faint">You can change this later on the Data screen. ' +
      "Everything stays on this device — nothing is uploaded anywhere.</p>" +
      "</form></div>";

    var form = document.getElementById("obForm");
    var note = document.getElementById("obNote");
    function preview() {
      var v = form.elements.start.value;
      if (!v) { note.textContent = ""; return; }
      var mon = UI.mondayOf(v);
      note.textContent = "Week 1: " + UI.fmtRange(mon, Revision.addDays(mon, 6)) +
        " · Week 32 ends " + UI.fmtShort(Revision.addDays(mon, 223));
    }
    preview();
    form.elements.start.addEventListener("change", preview);
    form.elements.start.addEventListener("input", preview);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = form.elements.start.value;
      if (!v) { form.elements.start.focus(); return; }
      Store.setStartDate(UI.mondayOf(v));
      render();
    });
    form.elements.start.focus();
  }

  function render() {
    var route = routeFromHash();
    if (!route) {
      location.replace("#/today"); // fires hashchange, which renders
      return;
    }

    UI.closeModal();

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

    if (e.key >= "1" && e.key <= "7") {
      location.hash = "#/" + ROUTES[+e.key - 1];
    } else if (e.key === "n") {
      e.preventDefault();
      if (routeFromHash() !== "today") { location.hash = "#/today"; }
      // render happens synchronously on hashchange; then open the form
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

  window.addEventListener("hashchange", render);
  render();
})();
