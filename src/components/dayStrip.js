// The day strip (§6) — the one visual motif. hero = 60px with labels and hour
// ticks; rule = the 4px line. Pure string builders; the decorative parts are
// inside try/catch so a failure can never blank the page (fail open).
(function () {
  "use strict";
  window.UI = window.UI || {};

  UI.dayStripHero = function () {
    var inner = "";
    try {
      for (var h = 1; h < 24; h++) {
        inner += '<span class="tick" style="left:' + (h / 24 * 100) + '%"></span>';
      }
      inner += '<span class="lbl" style="left:33.3%">6:30 — 9:30 · DSA</span>' +
               '<span class="lbl" style="left:93.75%">21:00 — 00:00 · DEV</span>';
    } catch (e) { inner = ""; }
    return '<div class="strip" aria-hidden="true">' + inner + "</div>" +
      '<div class="hours mono" aria-hidden="true">' +
      "<span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>";
  };

  UI.statCard = function (value, label, cls) {
    return '<div class="stat' + (cls ? " " + cls : "") + '"><b>' + value +
      "</b><span>" + label + "</span></div>";
  };
})();
