export type ShiftCategory = "food" | "movement" | "environment";

export interface UserProfile {
  name: string;
  motivation: string[];
  preferredApproach: "tiny" | "moderate" | "ambitious";
}

export interface RoutineAnchor {
  id: string;
  label: string;
  time: string;
  kind: "meal" | "work" | "movement" | "personal";
}

export interface DailyRoutine {
  wakeTime: string;
  sleepTime: string;
  workStyle: "home" | "office" | "hybrid" | "field" | "variable";
  workStart: string;
  workEnd: string;
  commuteMinutes: number;
  predictability: "very" | "mostly" | "variable";
  anchors: RoutineAnchor[];
}

export interface MealHabit {
  breakfast: "daily" | "sometimes" | "rarely";
  breakfastTime: string;
  lunchTime: string;
  dinnerTime: string;
  afternoonTea: boolean;
  afternoonTeaTime: string;
  tvSnacking: boolean;
  orderingPerWeek: number;
  fruitFrequency: "daily" | "few" | "rarely";
  focus: string;
}

export interface FoodEnvironment {
  fruitVisible: boolean;
  healthyReady: boolean;
  junkVisible: boolean;
  barriers: HabitBarrier[];
}

export interface ExerciseProfile {
  activeDays: number;
  sedentaryWork: boolean;
  opportunities: string[];
  barrier: HabitBarrier;
}

export type HabitBarrier =
  | "no-time"
  | "tired"
  | "forget"
  | "inconvenient"
  | "motivation"
  | "stress"
  | "other";

export type CompletionStatus = "done" | "missed";

export interface HabitCompletion {
  /** Local calendar day, `YYYY-MM-DD`. */
  date: string;
  status: CompletionStatus;
  barrier?: HabitBarrier;
}

/** What was logged for each shift on a single day, keyed by shift id. */
export type DayLog = Record<string, HabitCompletion>;

/** The whole history, keyed by `YYYY-MM-DD`. Shifts are templates; this is the state. */
export type HabitLog = Record<string, DayLog>;

export interface TinyShift {
  id: string;
  category: ShiftCategory;
  title: string;
  /** Human-readable moment this shift follows, e.g. "After your 4:30 PM tea". */
  anchor: string;
  /** Id of the routine anchor this attaches to, so the routine map can point at it. */
  anchorId: string;
  trigger: string;
  minimumAction: string;
  normalAction: string;
  frictionReducer: string;
  reason: string;
  difficulty: 1 | 2 | 3;
  frequency: string;
}

export interface WeeklyReview {
  /** Date range covered, e.g. "AUG 6 — 12". */
  weekLabel: string;
  totals: Record<ShiftCategory, { done: number; opportunities: number }>;
  learnings: string[];
  /** Null when there isn't enough history to suggest a change yet. */
  adjustment: { from: string; to: string; reason: string } | null;
}

export interface WeekStats {
  done: number;
  opportunities: number;
  /** One entry per day, oldest first. */
  days: { date: string; letter: string; done: number; opportunities: number }[];
}

export interface OnboardingData {
  profile: UserProfile;
  routine: DailyRoutine;
  meals: MealHabit;
  foodEnvironment: FoodEnvironment;
  exercise: ExerciseProfile;
}
