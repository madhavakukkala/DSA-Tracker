// Acceptance tests for revision.js (§10). Run:  node tests/revision.test.js
"use strict";
require("../src/revision.js");
const R = globalThis.Revision;

let passed = 0, failed = 0;
function assert(cond, label) {
  if (cond) { passed++; console.log("  ok  " + label); }
  else { failed++; console.error("FAIL  " + label); }
}
function problem(overrides) {
  return Object.assign({
    id: "p1", dateSolved: "2026-08-03", week: 1, topic: "Arrays",
    striverStep: "Step 3.1", name: "Two Sum", difficulty: "Medium",
    link: "", solvedHow: "alone", minutes: 20, approach: "hashmap",
    complexity: "O(n) / O(n)", r1: false, r2: false, r3: false,
    confidence: 4, notes: "",
  }, overrides);
}

// -- Test 1: solved 5 days ago, nothing ticked --------------------------------
const t1today = R.addDays("2026-08-03", 5);            // 2026-08-08
let p = problem({});
assert(R.status(p, t1today) === "due", "1: status is due");
assert(R.r1Due(p) <= t1today, "1: R1 overdue");
assert(R.r2Due(p) <= t1today, "1: R2 overdue");
assert(R.r3Due(p) > t1today, "1: R3 not yet due");
assert(R.nextSlot(p) === "r1", "1: nextSlot is r1");

// -- Test 2: tick once — still due, R2 overdue --------------------------------
p[R.nextSlot(p)] = true;
assert(p.r1 === true, "2: tick set r1, not a later slot");
assert(R.status(p, t1today) === "due", "2: still due (R2 overdue)");
assert(R.nextSlot(p) === "r2", "2: nextSlot is r2");

// -- Test 3: tick twice — scheduled, R3 in the future -------------------------
p[R.nextSlot(p)] = true;
assert(R.status(p, t1today) === "scheduled", "3: scheduled after second tick");

// -- Test 4: tick three times — done ------------------------------------------
p[R.nextSlot(p)] = true;
assert(R.status(p, t1today) === "done", "4: done after third tick");
assert(R.nextSlot(p) === null, "4: no next slot");
assert(R.queue([p], t1today).length === 0, "4: leaves the queue");

// -- Test 5: solved today — scheduled, not in the queue -----------------------
const t5 = problem({ dateSolved: "2026-08-08" });
assert(R.status(t5, "2026-08-08") === "scheduled", "5: solved today is scheduled");
assert(R.queue([t5], "2026-08-08").length === 0, "5: not in today's queue");

// -- Test 6: confidence 2 — needsRedo -----------------------------------------
assert(R.needsRedo(problem({ confidence: 2 })) === true, "6: confidence 2 needs redo");
assert(R.needsRedo(problem({ confidence: 3 })) === false, "6: confidence 3 does not");

// -- Test 7: editorial with confidence 5 — needsRedo --------------------------
assert(R.needsRedo(problem({ solvedHow: "editorial", confidence: 5 })) === true,
  "7: editorial needs redo regardless of confidence");

// -- Test 8: 26 due problems — backlog ----------------------------------------
assert(R.isBacklog(26) === true, "8: 26 due is a backlog");
assert(R.isBacklog(25) === false, "8: 25 due is not");

// -- Test 12: local date, not UTC — correct at 00:30 --------------------------
assert(R.todayLocal(new Date(2026, 7, 3, 0, 30)) === "2026-08-03",
  "12: 00:30 local is still the local date");
assert(R.todayLocal(new Date(2026, 7, 3, 23, 59)) === "2026-08-03",
  "12: 23:59 local is still the local date");

// -- Queue ordering: most overdue first, ties on dateSolved -------------------
const qa = problem({ id: "a", dateSolved: "2026-08-01" });   // r1 due 08-03
const qb = problem({ id: "b", dateSolved: "2026-08-05" });   // r1 due 08-07
const qc = problem({ id: "c", dateSolved: "2026-08-01", r1: true }); // r2 due 08-06
const ordered = R.queue([qb, qc, qa], "2026-08-10").map(x => x.id);
assert(ordered.join(",") === "a,c,b", "queue: most overdue first (got " + ordered + ")");

// -- Date helpers: month/year boundaries --------------------------------------
assert(R.addDays("2026-08-30", 5) === "2026-09-04", "addDays crosses a month");
assert(R.addDays("2026-12-30", 5) === "2027-01-04", "addDays crosses a year");
assert(R.addDays("2028-02-27", 2) === "2028-02-29", "addDays handles a leap year");
assert(R.diffDays("2026-08-03", "2026-08-08") === 5, "diffDays forward");

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
