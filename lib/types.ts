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

export interface HabitCompletion {
  date: string;
  status: "done" | "missed";
  barrier?: HabitBarrier;
}

export interface TinyShift {
  id: string;
  category: ShiftCategory;
  title: string;
  anchor: string;
  trigger: string;
  minimumAction: string;
  normalAction: string;
  frictionReducer: string;
  reason: string;
  difficulty: 1 | 2 | 3;
  frequency: string;
  completionHistory: HabitCompletion[];
}

export interface WeeklyReview {
  weekLabel: string;
  totals: Record<ShiftCategory, { done: number; opportunities: number }>;
  learnings: string[];
  adjustment: { from: string; to: string; reason: string };
}

export interface OnboardingData {
  profile: UserProfile;
  routine: DailyRoutine;
  meals: MealHabit;
  foodEnvironment: FoodEnvironment;
  exercise: ExerciseProfile;
}
