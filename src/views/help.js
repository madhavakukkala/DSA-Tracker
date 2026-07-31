// Help — the workbook's Read Me as a static page (§5.8).
(function () {
  "use strict";
  window.Views = window.Views || {};

  var HTML =
    '<header class="page-head">' +
    '<p class="eyebrow" id="helpRange"></p>' +
    '<h1 class="page-title">How this works</h1></header>' +

    '<section class="help-sec"><h2 class="section-title">Your daily shape</h2>' +
    '<div class="help-rows" id="helpShape"></div></section>' +

    '<section class="help-sec"><h2 class="section-title">The revision rule</h2>' +
    '<p>Every problem you solve gets revisited three times: <b>2 days later, 5 days later, and 10 days later</b>. ' +
    'The tracker calculates all three dates the moment you log a solve, and the Today screen gathers whatever is due into one queue.</p>' +
    '<p>A revision is <b>not</b> re-solving. Read the problem title, then state the approach and the time complexity out loud in under 90 seconds. ' +
    'If you can, tick it. If you can\'t, leave it unticked and re-solve the problem properly on Sunday. ' +
    'That is why the approach stays hidden behind <i>Reveal</i> — recall has to be attempted before the answer is visible, or the exercise is worthless.</p>' +
    '<p>At steady state this is about 9 problems a day and takes roughly 20 minutes. That is why the morning starts at 6:30 and not 6:50.</p></section>' +

    '<section class="help-sec"><h2 class="section-title">What each screen is for</h2>' +
    '<div class="help-rows">' +
    '<div class="help-row"><span class="mono">Today</span><p>The engine. The day\'s plan, the revision queue, and the quick log. Open it at 6:30 and 21:00.</p></div>' +
    '<div class="help-row"><span class="mono">Problems</span><p>Every problem, every revision date. Search, filter, fix, delete.</p></div>' +
    '<div class="help-row"><span class="mono">Roadmap</span><p>The timetable. All 32 weeks, day by day, with your status on each.</p></div>' +
    '<div class="help-row"><span class="mono">Progress</span><p>Live counts: due, overdue, redo flags, solved-alone rate, topic breakdown.</p></div>' +
    '<div class="help-row"><span class="mono">Courses</span><p>Every Namaste episode and Striver sub-step, mapped to the week it belongs in.</p></div>' +
    '<div class="help-row"><span class="mono">Applications</span><p>From week 19. Every application, every follow-up.</p></div>' +
    '<div class="help-row"><span class="mono">Data</span><p>Export, import, reset. Back up weekly — browser storage is one careless click from gone.</p></div>' +
    '</div></section>' +

    '<section class="help-sec"><h2 class="section-title">Two honest warnings</h2>' +
    '<p><b>1.</b> If your revision backlog climbs past about <b>25 problems</b>, stop taking on new topics for two days and clear it. ' +
    'A backlog you never clear is the same as never having solved those problems.</p>' +
    '<p><b>2.</b> If <b>solved alone</b> sits below <b>40%</b> for a whole topic, you are reading editorials rather than solving. ' +
    'Slow down and take fewer problems. Four problems you fought for beat twelve you skimmed.</p></section>' +

    '<section class="help-sec"><h2 class="section-title">Keyboard</h2>' +
    '<div class="help-rows">' +
    '<div class="help-row"><span class="mono">n</span><p>Log a new problem</p></div>' +
    '<div class="help-row"><span class="mono">/</span><p>Search problems</p></div>' +
    '<div class="help-row"><span class="mono">1 – 7</span><p>Switch screens</p></div>' +
    '<div class="help-row"><span class="mono">Esc</span><p>Close any modal or form</p></div>' +
    '</div></section>';

  Views.help = {
    title: "Help",
    render(el) {
      el.innerHTML = HTML;
      el.querySelector("#helpRange").textContent =
        UI.planRange() + " · 32 weeks · 1,344 hours · Striver A2Z in Python";
      var sch = UI.schedule();
      var row = function (pair, body) {
        return '<div class="help-row"><span class="mono">' +
          UI.fmtSpan(pair[0], pair[1]) + "</span><p>" + body + "</p></div>";
      };
      el.querySelector("#helpShape").innerHTML =
        row(sch.dsa.revision, "<b>Revision queue.</b> Open Today and clear it (day 2 / day 5 / day 10).") +
        row(sch.dsa.learn, "<b>Learn.</b> Striver's video or article for today's topic. Notes in your own words, not copied.") +
        row(sch.dsa.practise, "<b>Practise.</b> 2–3 new problems. Attempt for 25 min before any hint.") +
        row(sch.dsa.log, "<b>Log.</b> Every problem goes in the log. This is what builds your revision queue.") +
        row(sch.dev.build, "<b>Development.</b> Weeks 1–8 your own HTML/CSS/JS sources. Weeks 9–14 Namaste React. Weeks 15–20 Namaste Node. Week 21+ interview prep.") +
        row(sch.dev.commit, "<b>Commit your code.</b> Write tomorrow's first task on paper.") +
        '<div class="help-row"><span class="mono">Day 7</span><p><b>No new topics.</b> ' +
        "DSA window = consolidation. Dev window = core CS or a weekly retro.</p></div>";
    },
  };
})();
