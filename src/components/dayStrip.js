// The day strip (§6) — the one visual motif: the whole day dark, with the
// learner's own two 3-hour windows lit in dawn and dusk. Built from the
// schedule in settings, so custom hours (even windows crossing midnight)
// render correctly. Decorative parts fail open — a throw can never blank
// the page.
(function () {
  "use strict";
  window.UI = window.UI || {};

  // [{s,e,color}] within 0–1440, windows split if they wrap past midnight
  function segments(sch) {
    var out = [];
    function add(startMin, endMin, color) {
      var s = ((startMin % 1440) + 1440) % 1440;
      var len = endMin - startMin;
      if (s + len <= 1440) out.push({ s: s, e: s + len, c: color });
      else {
        out.push({ s: s, e: 1440, c: color });
        out.push({ s: 0, e: s + len - 1440, c: color });
      }
    }
    add(sch.dsa.start, sch.dsa.end, "var(--dawn)");
    add(sch.dev.start, sch.dev.end, "var(--dusk)");
    return out.sort(function (a, b) { return a.s - b.s; });
  }

  function gradient(segs) {
    var stops = [], pos = 0;
    segs.forEach(function (g) {
      if (g.s > pos) stops.push("var(--void) " + (pos / 14.4) + "% " + (g.s / 14.4) + "%");
      stops.push(g.c + " " + (g.s / 14.4) + "% " + (g.e / 14.4) + "%");
      pos = Math.max(pos, g.e);
    });
    if (pos < 1440) stops.push("var(--void) " + (pos / 14.4) + "% 100%");
    return "linear-gradient(90deg," + stops.join(",") + ")";
  }

  UI.dayStripCSS = function () {
    try { return gradient(segments(UI.schedule())); }
    catch (e) { return "var(--void)"; }
  };

  UI.dayStripHero = function () {
    var inner = "", bg = "var(--void)";
    try {
      var sch = UI.schedule();
      bg = gradient(segments(sch));
      for (var h = 1; h < 24; h++) {
        inner += '<span class="tick" style="left:' + (h / 24 * 100) + '%"></span>';
      }
      // Label each window at the midpoint of its (primary) lit segment.
      function label(win, text) {
        var mid = ((win.start + win.end) / 2) % 1440;
        var left = mid / 14.4;
        if (left < 7) left = 7; if (left > 93) left = 93;
        inner += '<span class="lbl" style="left:' + left + '%">' + text + "</span>";
      }
      label(sch.dsa, UI.fmtSpan(sch.dsa.start, sch.dsa.end) + " · DSA");
      label(sch.dev, UI.fmtSpan(sch.dev.start, sch.dev.end) + " · DEV");
    } catch (e) { inner = ""; }
    return '<div class="strip" aria-hidden="true" style="background:' + bg + '">' + inner + "</div>" +
      '<div class="hours mono" aria-hidden="true">' +
      "<span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>";
  };

  UI.statCard = function (value, label, cls) {
    return '<div class="stat' + (cls ? " " + cls : "") + '"><b>' + value +
      "</b><span>" + label + "</span></div>";
  };
})();
