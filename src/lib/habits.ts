import type { SupabaseClient } from "@supabase/supabase-js";
import type { Schedule, Stamp } from "./habit-stats";

export const MAX_HABITS = 10;

export type Habit = {
  id: string;
  name: string;
  icon: string;
  color: HabitColor;
  start_date: string;
  archived_at: string | null;
  habit_schedules: Schedule[];
  stamps: Stamp[];
};

const HABIT_COLUMNS =
  "id, name, icon, color, start_date, archived_at, habit_schedules(weekdays, valid_from), stamps(date, is_late)";

export async function fetchHabits(supabase: SupabaseClient, { archived }: { archived: boolean }) {
  const query = supabase.from("habits").select(HABIT_COLUMNS).order("created_at");
  const { data, error } = await (archived ? query.not("archived_at", "is", null) : query.is("archived_at", null));
  if (error) throw error;
  return data as Habit[];
}

export async function fetchHabit(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.from("habits").select(HABIT_COLUMNS).eq("id", id).maybeSingle();
  if (error?.code === "22P02") return null; // id が UUID の形式ではない
  if (error) throw error;
  return data as Habit | null;
}

/** 今日時点で有効な曜日設定 */
export function currentWeekdays(habit: Habit, today: string): number[] {
  const active = habit.habit_schedules
    .filter((s) => s.valid_from <= today)
    .sort((a, b) => b.valid_from.localeCompare(a.valid_from))[0];
  return active?.weekdays ?? [];
}

export const HABIT_COLORS = ["orange", "rose", "violet", "sky", "emerald", "amber"] as const;
export type HabitColor = (typeof HABIT_COLORS)[number];

// Tailwind がクラス名を検出できるよう、すべて文字列リテラルで書く
export const COLOR_CLASSES: Record<HabitColor, { stamp: string; soft: string; text: string; ring: string }> = {
  orange: { stamp: "bg-orange-500", soft: "bg-orange-100 dark:bg-orange-950", text: "text-orange-600 dark:text-orange-400", ring: "ring-orange-500" },
  rose: { stamp: "bg-rose-500", soft: "bg-rose-100 dark:bg-rose-950", text: "text-rose-600 dark:text-rose-400", ring: "ring-rose-500" },
  violet: { stamp: "bg-violet-500", soft: "bg-violet-100 dark:bg-violet-950", text: "text-violet-600 dark:text-violet-400", ring: "ring-violet-500" },
  sky: { stamp: "bg-sky-500", soft: "bg-sky-100 dark:bg-sky-950", text: "text-sky-600 dark:text-sky-400", ring: "ring-sky-500" },
  emerald: { stamp: "bg-emerald-500", soft: "bg-emerald-100 dark:bg-emerald-950", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500" },
  amber: { stamp: "bg-amber-500", soft: "bg-amber-100 dark:bg-amber-950", text: "text-amber-600 dark:text-amber-400", ring: "ring-amber-500" },
};

export const HABIT_ICONS = ["✅", "🏃", "💪", "🧘", "📚", "✍️", "💧", "🥗", "😴", "🧹", "💰", "🎸", "💻", "🌱", "🦷", "🚭"];

/** DB のエラーを画面に出す文言に変える */
export function errorMessage(error: { message?: string } | null | undefined): string {
  const message = error?.message ?? "";
  if (message.includes("habit_limit_reached")) return `習慣は${MAX_HABITS}個までです。どれかをアーカイブしてください。`;
  if (message.includes("row-level security")) return "この日はスタンプを押せません。";
  return "うまくいきませんでした。通信状況を確認して、もう一度お試しください。";
}
