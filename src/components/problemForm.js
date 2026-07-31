// Problem form — shared by the Today quick log and the Problems edit modal.
// UI.problemFormHTML(values) renders the fields; UI.readProblemForm(formEl)
// returns { ok, values | error }.
(function () {
  "use strict";
  window.UI = window.UI || {};
  var esc = UI.esc;

  function opt(value, label, selected) {
    return '<option value="' + esc(value) + '"' + (selected ? " selected" : "") + ">" +
      esc(label) + "</option>";
  }

  UI.problemFormHTML = function (v) {
    v = v || {};
    var conf = v.confidence || 3;
    return '' +
      '<div class="f-grid">' +
      '<label class="f-field f-wide"><span>Problem name *</span>' +
      '<input name="name" required value="' + esc(v.name) + '" autocomplete="off"></label>' +

      '<label class="f-field"><span>Date solved</span>' +
      '<input name="dateSolved" type="date" value="' + esc(v.dateSolved) + '"></label>' +

      '<label class="f-field"><span>Week</span>' +
      '<input name="week" type="number" min="1" max="32" value="' + esc(v.week) + '"></label>' +

      '<label class="f-field"><span>Topic</span>' +
      '<input name="topic" value="' + esc(v.topic) + '" autocomplete="off"></label>' +

      '<label class="f-field"><span>Striver step</span>' +
      '<input name="striverStep" value="' + esc(v.striverStep) + '" autocomplete="off"></label>' +

      '<label class="f-field"><span>Difficulty</span><select name="difficulty">' +
      opt("Easy", "Easy", v.difficulty === "Easy") +
      opt("Medium", "Medium", !v.difficulty || v.difficulty === "Medium") +
      opt("Hard", "Hard", v.difficulty === "Hard") + "</select></label>" +

      '<label class="f-field"><span>Solved how</span><select name="solvedHow">' +
      opt("alone", "Alone", !v.solvedHow || v.solvedHow === "alone") +
      opt("hint", "With a hint", v.solvedHow === "hint") +
      opt("editorial", "Editorial", v.solvedHow === "editorial") + "</select></label>" +

      '<label class="f-field"><span>Minutes</span>' +
      '<input name="minutes" type="number" min="0" value="' + esc(v.minutes) + '"></label>' +

      '<label class="f-field"><span>Complexity</span>' +
      '<input name="complexity" placeholder="O(n) / O(1)" value="' + esc(v.complexity) + '"></label>' +

      '<label class="f-field"><span>Confidence 1–5</span><select name="confidence">' +
      [1, 2, 3, 4, 5].map(function (n) { return opt(n, n, conf === n); }).join("") +
      "</select></label>" +

      '<label class="f-field f-wide"><span>Link</span>' +
      '<input name="link" placeholder="https://…" value="' + esc(v.link) + '"></label>' +

      '<label class="f-field f-wide"><span>Approach in one line</span>' +
      '<input name="approach" value="' + esc(v.approach) + '" autocomplete="off"></label>' +

      '<label class="f-field f-wide"><span>Notes</span>' +
      '<textarea name="notes" rows="2">' + esc(v.notes) + "</textarea></label>" +
      "</div>";
  };

  UI.readProblemForm = function (form) {
    var get = function (n) { return (form.elements[n].value || "").trim(); };
    if (!get("name")) return { ok: false, error: "A problem needs a name." };
    var date = get("dateSolved") || window.Revision.todayLocal();
    return { ok: true, values: {
      name: get("name"),
      dateSolved: date,
      week: Math.max(1, Math.min(32, parseInt(get("week"), 10) || 1)),
      topic: get("topic"),
      striverStep: get("striverStep"),
      difficulty: get("difficulty"),
      solvedHow: get("solvedHow"),
      minutes: parseInt(get("minutes"), 10) || 0,
      complexity: get("complexity"),
      confidence: parseInt(get("confidence"), 10) || 3,
      link: get("link"),
      approach: get("approach"),
      notes: get("notes"),
    } };
  };
})();
