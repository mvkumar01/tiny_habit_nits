import type { OnboardingData, RoutineAnchor, TinyShift, WeeklyReview } from "./types";

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
    anchor: movementAnchor, trigger: data.meals.afternoonTea ? "When you finish your tea" : "When you put away your lunch",
    minimumAction: "Walk for 3 minutes", normalAction: "Walk for 8–12 minutes",
    frictionReducer: data.routine.workStyle === "home" ? "Leave your shoes beside your desk." : "Keep comfortable shoes near your desk or in your car.",
    reason: `You already pause around ${formatTime(data.meals.afternoonTea ? data.meals.afternoonTeaTime : data.meals.lunchTime)}, so this needs no new time slot.`,
    difficulty: 1, frequency: "Weekdays", completionHistory: [],
  };

  const food: TinyShift = data.meals.fruitFrequency === "rarely" || !data.foodEnvironment.fruitVisible ? {
    id: "food", category: "food", title: "Put fruit in the path of breakfast", anchor: "Beside your morning tea setup",
    trigger: "When you make morning tea", minimumAction: "Take one bite or pack one piece", normalAction: "Eat one fruit with tea or breakfast",
    frictionReducer: "Add fruit to your next order and keep three pieces at eye level.",
    reason: `Morning tea is already part of your day, while fruit is currently ${data.meals.fruitFrequency === "rarely" ? "rare" : "easy to overlook"}.`,
    difficulty: 1, frequency: "Daily", completionHistory: [],
  } : {
    id: "food", category: "food", title: "A simple dinner upgrade", anchor: "At dinner", trigger: "When you serve your dinner",
    minimumAction: "Add two bites of a protein or vegetable", normalAction: "Add one familiar protein or vegetable serving",
    frictionReducer: "Keep one ready-to-eat option on your weekly grocery list.",
    reason: "Dinner is reliable, which makes it a steady place for a small nutrition upgrade.", difficulty: 1, frequency: "Daily", completionHistory: [],
  };

  const environment: TinyShift = {
    id: "environment", category: "environment", title: "Make movement the easy next step",
    anchor: data.routine.workStyle === "home" ? "Before finishing work" : "Before you leave for work",
    trigger: data.routine.workStyle === "home" ? "When you close your laptop" : "When you pick up your keys",
    minimumAction: "Put your shoes where you can see them", normalAction: "Wear them as soon as you finish work on two days",
    frictionReducer: "Choose the two days now; no workout decision needed in the moment.",
    reason: `Your biggest barrier is ${barrierLabel(data.exercise.barrier)}, so the plan removes a decision instead of demanding more motivation.`,
    difficulty: 1, frequency: "Twice weekly", completionHistory: [],
  };
  return [movement, food, environment];
}

export function weeklyReview(completions: Record<string, "done" | "missed">): WeeklyReview {
  const done = Object.values(completions).filter((v) => v === "done").length;
  return {
    weekLabel: "This week",
    totals: {
      movement: { done: Math.max(4, completions.move === "done" ? 5 : 4), opportunities: 6 },
      food: { done: Math.max(5, completions.food === "done" ? 6 : 5), opportunities: 7 },
      environment: { done: Math.max(2, completions.environment === "done" ? 3 : 2), opportunities: 3 },
    },
    learnings: ["Habits attached to lunch and tea are the easiest to remember.", "After-work movement is more fragile on tiring days.", done >= 2 ? "Small setup actions are making the next healthy choice easier." : "The plan may need an even smaller starting point."],
    adjustment: { from: "After reaching home", to: "After lunch", reason: "Lunch has been the more reliable anchor." },
  };
}

export const formatTime = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(2026, 0, 1, h, m));
};

export const barrierLabel = (barrier: string) => ({ "no-time": "lack of time", tired: "low energy", forget: "forgetting", inconvenient: "convenience", motivation: "motivation", stress: "stress", other: "an unpredictable day" }[barrier] ?? barrier);
