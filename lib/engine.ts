import type {
  CompletionStatus,
  HabitBarrier,
  HabitLog,
  OnboardingData,
  RoutineAnchor,
  TinyShift,
  WeeklyReview,
  WeekStats,
} from "./types";

export const demoData: OnboardingData = {
  profile: { name: "Vipin", motivation: ["Energy", "Long-term health"], preferredApproach: "tiny" },
  routine: {
    wakeTime: "07:30", sleepTime: "23:45", workStyle: "office", workStart: "09:30", workEnd: "18:30",
    commuteMinutes: 45, predictability: "mostly",
    anchors: [
      { id: "wake", label: "Wake up", time: "07:30", kind: "personal" },
      { id: "tea-am", label: "Morning tea", time: "08:00", kind: "meal" },
      { id: "work", label: "Start work", time: "09:30", kind: "work" },
      { id: "lunch", label: "Lunch", time: "13:30", kind: "meal" },
      { id: "tea-pm", label: "Afternoon tea", time: "16:30", kind: "meal" },
      { id: "home", label: "Reach home", time: "19:30", kind: "personal" },
      { id: "dinner", label: "Dinner", time: "20:45", kind: "meal" },
      { id: "tv", label: "TV & unwind", time: "21:30", kind: "personal" },
      { id: "sleep", label: "Sleep", time: "23:45", kind: "personal" },
    ],
  },
  meals: {
    breakfast: "sometimes", breakfastTime: "08:30", lunchTime: "13:30", dinnerTime: "20:45",
    afternoonTea: true, afternoonTeaTime: "16:30", tvSnacking: true, orderingPerWeek: 3,
    fruitFrequency: "rarely", focus: "General healthier eating",
  },
  foodEnvironment: { fruitVisible: false, healthyReady: false, junkVisible: true, barriers: ["inconvenient"] },
  exercise: { activeDays: 0, sedentaryWork: true, opportunities: ["Lunch break", "Short work breaks"], barrier: "no-time" },
};

/**
 * A blank slate for someone starting onboarding, so nobody inherits the demo profile.
 * Deep-cloned so edits here can never reach back into `demoData`.
 */
export const emptyData: OnboardingData = {
  ...structuredClone(demoData),
  profile: { name: "", motivation: [], preferredApproach: "tiny" },
};

export function buildAnchors(data: OnboardingData): RoutineAnchor[] {
  const anchors: RoutineAnchor[] = [
    { id: "wake", label: "Wake up", time: data.routine.wakeTime, kind: "personal" },
    { id: "tea-am", label: "Morning tea", time: "08:00", kind: "meal" },
    { id: "work", label: "Start work", time: data.routine.workStart, kind: "work" },
    { id: "lunch", label: "Lunch", time: data.meals.lunchTime, kind: "meal" },
  ];
  if (data.meals.afternoonTea) anchors.push({ id: "tea-pm", label: "Afternoon tea", time: data.meals.afternoonTeaTime, kind: "meal" });
  anchors.push(
    { id: "home", label: data.routine.workStyle === "home" ? "Finish work" : "Reach home", time: data.routine.workEnd, kind: "personal" },
    { id: "dinner", label: "Dinner", time: data.meals.dinnerTime, kind: "meal" },
    { id: "sleep", label: "Sleep", time: data.routine.sleepTime, kind: "personal" },
  );
  const custom = data.routine.anchors.filter(a => !anchors.some(existing => existing.label === a.label) && !["Morning tea","Start work","Lunch","Afternoon tea","Reach home","Dinner","Bedtime","Wake up","Sleep"].includes(a.label));
  return [...anchors, ...custom].sort((a, b) => a.time.localeCompare(b.time));
}

export function generateShifts(data: OnboardingData): TinyShift[] {
  const movementAnchor = data.meals.afternoonTea ? `After your ${formatTime(data.meals.afternoonTeaTime)} tea` : "After lunch";
  const movement: TinyShift = {
    id: "move", category: "movement", title: data.exercise.barrier === "no-time" ? "A walk that fits the gap" : "A gentle movement break",
    anchor: movementAnchor, anchorId: data.meals.afternoonTea ? "tea-pm" : "lunch",
    trigger: data.meals.afternoonTea ? "When you finish your tea" : "When you put away your lunch",
    minimumAction: "Walk for 3 minutes", normalAction: "Walk for 8–12 minutes",
    frictionReducer: data.routine.workStyle === "home" ? "Leave your shoes beside your desk." : "Keep comfortable shoes near your desk or in your car.",
    reason: `You already pause around ${formatTime(data.meals.afternoonTea ? data.meals.afternoonTeaTime : data.meals.lunchTime)}, so this needs no new time slot.`,
    difficulty: 1, frequency: "Weekdays",
  };

  const food: TinyShift = data.meals.fruitFrequency === "rarely" || !data.foodEnvironment.fruitVisible ? {
    id: "food", category: "food", title: "Put fruit in the path of breakfast", anchor: "Beside your morning tea setup", anchorId: "tea-am",
    trigger: "When you make morning tea", minimumAction: "Take one bite or pack one piece", normalAction: "Eat one fruit with tea or breakfast",
    frictionReducer: "Add fruit to your next order and keep three pieces at eye level.",
    reason: `Morning tea is already part of your day, while fruit is currently ${data.meals.fruitFrequency === "rarely" ? "rare" : "easy to overlook"}.`,
    difficulty: 1, frequency: "Daily",
  } : {
    id: "food", category: "food", title: "A simple dinner upgrade", anchor: "At dinner", anchorId: "dinner", trigger: "When you serve your dinner",
    minimumAction: "Add two bites of a protein or vegetable", normalAction: "Add one familiar protein or vegetable serving",
    frictionReducer: "Keep one ready-to-eat option on your weekly grocery list.",
    reason: "Dinner is reliable, which makes it a steady place for a small nutrition upgrade.", difficulty: 1, frequency: "Daily",
  };

  const environment: TinyShift = {
    id: "environment", category: "environment", title: "Make movement the easy next step",
    anchor: data.routine.workStyle === "home" ? "Before finishing work" : "Before you leave for work", anchorId: "home",
    trigger: data.routine.workStyle === "home" ? "When you close your laptop" : "When you pick up your keys",
    minimumAction: "Put your shoes where you can see them", normalAction: "Wear them as soon as you finish work on two days",
    frictionReducer: "Choose the two days now; no workout decision needed in the moment.",
    reason: `Your biggest barrier is ${barrierLabel(data.exercise.barrier)}, so the plan removes a decision instead of demanding more motivation.`,
    difficulty: 1, frequency: "Twice weekly",
  };
  return [movement, food, environment];
}

/* ---------- habit log ---------- */

/** Local calendar day as `YYYY-MM-DD`. Uses local time so "today" matches the user's day. */
export function dayKey(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** The `count` day keys ending at `end`, oldest first. */
export function recentDays(end: string = dayKey(), count = 7): string[] {
  const endDate = parseDayKey(end);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(endDate);
    d.setDate(d.getDate() - (count - 1 - i));
    return dayKey(d);
  });
}

export function statusFor(log: HabitLog, shiftId: string, date: string = dayKey()): CompletionStatus | undefined {
  return log[date]?.[shiftId]?.status;
}

export function barrierFor(log: HabitLog, shiftId: string, date: string = dayKey()): HabitBarrier | undefined {
  return log[date]?.[shiftId]?.barrier;
}

/** Returns a new log with one entry set, or removed when `status` is undefined. */
export function setStatus(
  log: HabitLog,
  shiftId: string,
  status: CompletionStatus | undefined,
  options: { date?: string; barrier?: HabitBarrier } = {},
): HabitLog {
  const date = options.date ?? dayKey();
  const day = { ...(log[date] ?? {}) };
  if (status) day[shiftId] = { date, status, ...(options.barrier ? { barrier: options.barrier } : {}) };
  else delete day[shiftId];
  const next = { ...log };
  if (Object.keys(day).length) next[date] = day;
  else delete next[date];
  return next;
}

/** Keeps storage bounded; history older than this stops being useful for weekly coaching. */
export function trimLog(log: HabitLog, keepDays = 60, end: string = dayKey()): HabitLog {
  const cutoff = parseDayKey(end);
  cutoff.setDate(cutoff.getDate() - keepDays);
  const cutoffKey = dayKey(cutoff);
  return Object.fromEntries(Object.entries(log).filter(([date]) => date >= cutoffKey));
}

/**
 * Days the plan has actually been open for, capped to the window. A brand-new user
 * shouldn't be shown "0 of 21" for days they were never here.
 */
function activeDays(log: HabitLog, window: string[]): string[] {
  const first = Object.keys(log).sort()[0];
  return first ? window.filter((d) => d >= first) : window.slice(-1);
}

export function weekStats(log: HabitLog, shifts: TinyShift[], end: string = dayKey()): WeekStats {
  const window = recentDays(end);
  const active = new Set(activeDays(log, window));
  const days = window.map((date) => {
    const opportunities = active.has(date) ? shifts.length : 0;
    const done = shifts.filter((s) => log[date]?.[s.id]?.status === "done").length;
    return { date, letter: "SMTWTFS"[parseDayKey(date).getDay()], done, opportunities };
  });
  return {
    done: days.reduce((sum, d) => sum + d.done, 0),
    opportunities: days.reduce((sum, d) => sum + d.opportunities, 0),
    days,
  };
}

/** How often each barrier was cited across the window, most common first. */
function barrierTally(log: HabitLog, window: string[]): [HabitBarrier, number][] {
  const counts = new Map<HabitBarrier, number>();
  for (const date of window)
    for (const entry of Object.values(log[date] ?? {}))
      if (entry.status === "missed" && entry.barrier) counts.set(entry.barrier, (counts.get(entry.barrier) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function weeklyReview(log: HabitLog, shifts: TinyShift[], end: string = dayKey()): WeeklyReview {
  const window = recentDays(end);
  const active = new Set(activeDays(log, window));
  const rate = (shift: TinyShift) => {
    const opportunities = active.size;
    const done = window.filter((d) => log[d]?.[shift.id]?.status === "done").length;
    const missed = window.filter((d) => log[d]?.[shift.id]?.status === "missed").length;
    return { shift, done, missed, opportunities, ratio: opportunities ? done / opportunities : 0 };
  };
  const rates = shifts.map(rate);

  const totals = { food: { done: 0, opportunities: 0 }, movement: { done: 0, opportunities: 0 }, environment: { done: 0, opportunities: 0 } } as WeeklyReview["totals"];
  for (const r of rates) {
    totals[r.shift.category].done += r.done;
    totals[r.shift.category].opportunities += r.opportunities;
  }

  const best = [...rates].sort((a, b) => b.ratio - a.ratio || b.done - a.done)[0];
  // On a tie, the shift the user actively said "not today" to is the better-evidenced
  // one to move; a shift nobody has touched has told us nothing yet.
  const worst = [...rates].sort((a, b) => a.ratio - b.ratio || b.missed - a.missed)[0];
  const barriers = barrierTally(log, window);
  const totalDone = rates.reduce((sum, r) => sum + r.done, 0);

  const learnings: string[] = [];
  if (!totalDone) learnings.push("Nothing is logged yet, so there's nothing to judge—only a week waiting to start.");
  else if (best && best.ratio > 0) learnings.push(`“${best.shift.title}” stuck best—${best.shift.anchor.toLowerCase()} is proving to be a reliable moment.`);
  if (barriers.length) learnings.push(`${sentenceCase(barrierLabel(barriers[0][0]))} came up most often when a shift slipped.`);
  if (worst && best && worst.shift.id !== best.shift.id && worst.ratio < best.ratio)
    learnings.push(`“${worst.shift.title}” asked more of you than the others. Its minimum version may be the better target.`);
  if (totalDone) learnings.push(totalDone >= active.size ? "You're averaging at least one shift a day. That's how a pattern forms." : "Some days landed, some didn't—that's the ordinary shape of a real week.");

  const shouldAdjust = Boolean(best && worst && worst.shift.id !== best.shift.id && worst.ratio < 0.5 && best.ratio > worst.ratio);
  return {
    weekLabel: formatRange(window[0], window[window.length - 1]),
    totals,
    learnings,
    adjustment: shouldAdjust
      ? {
          from: worst.shift.anchor,
          to: best.shift.anchor,
          reason: `${worst.shift.anchor} worked ${worst.done} of ${pluralDays(worst.opportunities)}, while ${best.shift.anchor.toLowerCase()} worked ${best.done}. The steadier anchor is the better bet.`,
        }
      : null,
  };
}

/* ---------- formatting ---------- */

const sentenceCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const pluralDays = (count: number) => `${count} ${count === 1 ? "day" : "days"}`;

export const formatTime = (time: string) => {
  const [h, m] = (time ?? "").split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time ?? "";
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(2026, 0, 1, h, m));
};

export const formatRange = (start: string, end: string) => {
  const fmt = (key: string, withMonth: boolean) =>
    new Intl.DateTimeFormat("en", withMonth ? { month: "short", day: "numeric" } : { day: "numeric" }).format(parseDayKey(key)).toUpperCase();
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  return `${fmt(start, true)} — ${fmt(end, !sameMonth)}`;
};

export const formatDayLabel = (key: string) =>
  new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(parseDayKey(key)).toUpperCase().replace(",", " ·");

export const greeting = (hour: number) => (hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");

export const barrierLabel = (barrier: string) => ({ "no-time": "lack of time", tired: "low energy", forget: "forgetting", inconvenient: "convenience", motivation: "motivation", stress: "stress", other: "an unpredictable day" }[barrier] ?? barrier);
