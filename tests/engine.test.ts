import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAnchors,
  dayKey,
  demoData,
  generateShifts,
  recentDays,
  setStatus,
  statusFor,
  trimLog,
  weekStats,
  weeklyReview,
} from "../lib/engine.ts";
import type { HabitLog, OnboardingData } from "../lib/types.ts";

const clone = (data: OnboardingData): OnboardingData => structuredClone(data);

test("buildAnchors returns anchors in chronological order", () => {
  const anchors = buildAnchors(demoData);
  const times = anchors.map((a) => a.time);
  assert.deepEqual(times, [...times].sort());
  assert.equal(anchors[0].id, "wake");
});

test("buildAnchors drops the afternoon tea anchor when the user has no tea", () => {
  const data = clone(demoData);
  data.meals.afternoonTea = false;
  assert.ok(!buildAnchors(data).some((a) => a.id === "tea-pm"));
});

test("buildAnchors keeps custom anchors the user added", () => {
  const data = clone(demoData);
  data.routine.anchors.push({ id: "school-run", label: "School run", time: "08:15", kind: "personal" });
  assert.ok(buildAnchors(data).some((a) => a.label === "School run"));
});

test("generateShifts anchors movement to tea when there is one, lunch otherwise", () => {
  const withTea = generateShifts(demoData).find((s) => s.id === "move");
  assert.equal(withTea?.anchorId, "tea-pm");

  const data = clone(demoData);
  data.meals.afternoonTea = false;
  const withoutTea = generateShifts(data).find((s) => s.id === "move");
  assert.equal(withoutTea?.anchorId, "lunch");
  assert.equal(withoutTea?.anchor, "After lunch");
});

test("generateShifts switches the food shift once fruit is already visible and frequent", () => {
  const data = clone(demoData);
  data.meals.fruitFrequency = "daily";
  data.foodEnvironment.fruitVisible = true;
  const food = generateShifts(data).find((s) => s.id === "food");
  assert.equal(food?.anchorId, "dinner");
  assert.match(food?.title ?? "", /dinner upgrade/i);
});

test("generateShifts every shift points at an anchor that exists in the routine", () => {
  const anchorIds = new Set(buildAnchors(demoData).map((a) => a.id));
  for (const shift of generateShifts(demoData)) assert.ok(anchorIds.has(shift.anchorId), `${shift.id} -> ${shift.anchorId}`);
});

test("dayKey uses local calendar dates, not UTC", () => {
  // 00:30 local on the 2nd is still the 2nd, even where UTC has rolled back to the 1st.
  assert.equal(dayKey(new Date(2026, 7, 2, 0, 30)), "2026-08-02");
  assert.equal(dayKey(new Date(2026, 11, 31, 23, 59)), "2026-12-31");
});

test("recentDays returns an inclusive window, oldest first", () => {
  assert.deepEqual(recentDays("2026-08-12", 3), ["2026-08-10", "2026-08-11", "2026-08-12"]);
  assert.deepEqual(recentDays("2026-03-02", 3), ["2026-02-28", "2026-03-01", "2026-03-02"]);
});

test("setStatus records the barrier and clearing removes the entry", () => {
  let log: HabitLog = {};
  log = setStatus(log, "move", "missed", { date: "2026-08-12", barrier: "tired" });
  assert.equal(statusFor(log, "move", "2026-08-12"), "missed");
  assert.equal(log["2026-08-12"].move.barrier, "tired");

  log = setStatus(log, "move", undefined, { date: "2026-08-12" });
  assert.equal(statusFor(log, "move", "2026-08-12"), undefined);
  assert.equal(log["2026-08-12"], undefined, "empty days should not linger");
});

test("setStatus does not mutate the log it was given", () => {
  const original: HabitLog = { "2026-08-12": { move: { date: "2026-08-12", status: "done" } } };
  const next = setStatus(original, "food", "done", { date: "2026-08-12" });
  assert.equal(original["2026-08-12"].food, undefined);
  assert.equal(next["2026-08-12"].food.status, "done");
});

test("a day's completions are independent of the day before", () => {
  const log = setStatus({}, "move", "done", { date: "2026-08-11" });
  assert.equal(statusFor(log, "move", "2026-08-11"), "done");
  assert.equal(statusFor(log, "move", "2026-08-12"), undefined, "today must start fresh");
});

test("trimLog keeps recent days and drops old ones", () => {
  const log: HabitLog = {
    "2026-01-01": { move: { date: "2026-01-01", status: "done" } },
    "2026-08-10": { move: { date: "2026-08-10", status: "done" } },
  };
  const trimmed = trimLog(log, 60, "2026-08-12");
  assert.deepEqual(Object.keys(trimmed), ["2026-08-10"]);
});

test("weekStats counts only days since the user started", () => {
  const shifts = generateShifts(demoData);
  let log: HabitLog = {};
  log = setStatus(log, "move", "done", { date: "2026-08-11" });
  log = setStatus(log, "food", "done", { date: "2026-08-12" });

  const stats = weekStats(log, shifts, "2026-08-12");
  assert.equal(stats.done, 2);
  assert.equal(stats.opportunities, 6, "two active days x three shifts");
  assert.equal(stats.days.length, 7);
  assert.equal(stats.days.at(-1)?.date, "2026-08-12");
  assert.equal(stats.days[0].opportunities, 0, "days before the user started are not owed anything");
});

test("weeklyReview reports zero without inventing progress", () => {
  const review = weeklyReview({}, generateShifts(demoData), "2026-08-12");
  for (const total of Object.values(review.totals)) assert.equal(total.done, 0);
  assert.match(review.learnings[0], /nothing is logged yet/i);
  assert.equal(review.adjustment, null);
});

test("weeklyReview totals follow the log", () => {
  const shifts = generateShifts(demoData);
  let log: HabitLog = {};
  for (const date of recentDays("2026-08-12", 7)) log = setStatus(log, "move", "done", { date });
  const review = weeklyReview(log, shifts, "2026-08-12");
  assert.equal(review.totals.movement.done, 7);
  assert.equal(review.totals.movement.opportunities, 7);
  assert.equal(review.totals.food.done, 0);
});

test("weeklyReview suggests moving the weakest anchor to the strongest", () => {
  const shifts = generateShifts(demoData);
  const move = shifts.find((s) => s.id === "move")!;
  const environment = shifts.find((s) => s.id === "environment")!;
  let log: HabitLog = {};
  for (const date of recentDays("2026-08-12", 7)) {
    log = setStatus(log, "move", "done", { date });
    log = setStatus(log, "environment", "missed", { date, barrier: "tired" });
  }
  const review = weeklyReview(log, shifts, "2026-08-12");
  assert.equal(review.adjustment?.from, environment.anchor);
  assert.equal(review.adjustment?.to, move.anchor);
  assert.ok(review.learnings.some((l) => /low energy/i.test(l)), "the most cited barrier should surface");
});

test("weeklyReview stays quiet when every shift is holding up", () => {
  const shifts = generateShifts(demoData);
  let log: HabitLog = {};
  for (const date of recentDays("2026-08-12", 7)) for (const shift of shifts) log = setStatus(log, shift.id, "done", { date });
  assert.equal(weeklyReview(log, shifts, "2026-08-12").adjustment, null);
});

test("weekLabel covers the seven day window", () => {
  assert.equal(weeklyReview({}, generateShifts(demoData), "2026-08-12").weekLabel, "AUG 6 — 12");
  assert.equal(weeklyReview({}, generateShifts(demoData), "2026-03-02").weekLabel, "FEB 24 — MAR 2");
});
