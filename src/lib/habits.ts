import type { SupabaseClient } from "@supabase/supabase-js";
import type { Schedule, Stamp } from "./habit-stats";

export const MAX_HABITS = 10;

/** 1日に押せるスタンプの回数の上限 */
export const MAX_STAMPS_PER_DAY = 10;

export type Habit = {
  id: string;
  user_id: string;
  room_id: string | null;
  name: string;
  icon: string;
  color: HabitColor;
  start_date: string;
  archived_at: string | null;
  habit_schedules: Schedule[];
  stamps: (Stamp & { id: string; reactions: { user_id: string }[] })[];
};

export const HABIT_COLUMNS =
  "id, user_id, room_id, name, icon, color, start_date, archived_at, habit_schedules(weekdays, valid_from), stamps(id, date, is_late, count, reactions(user_id))";

/** ログイン中のユーザーID（proxy で確認済みの JWT から取り出す） */
export async function currentUserId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
}

/** 自分の習慣（ルームの仲間の習慣も見られるため、user_id で絞る） */
export async function fetchHabits(supabase: SupabaseClient, userId: string, { archived }: { archived: boolean }) {
  const query = supabase.from("habits").select(HABIT_COLUMNS).eq("user_id", userId).order("created_at");
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
  if (message.includes("room_full")) return "このルームは満員です（最大10人）。";
  if (message.includes("removed_from_room")) return "このルームには参加できません。";
  if (message.includes("invite_not_found")) return "この招待URLは使えません。オーナーに新しいURLをもらってください。";
  if (message.includes("new_owner_required")) return "次のオーナーを選んでください。";
  if (message.includes("not_room_owner")) return "オーナーだけができる操作です。";
  if (message.includes("stamp_limit_reached")) return `1日${MAX_STAMPS_PER_DAY}回までです。`;
  if (message.includes("row-level security") || message.includes("stamp_not_found")) return "この日はスタンプを変更できません。";
  return "うまくいきませんでした。通信状況を確認して、もう一度お試しください。";
}
