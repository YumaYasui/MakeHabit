import { addDays } from "./dates";
import { isScheduledDay, type Schedule } from "./habit-stats";

export type MemberHabit = {
  start_date: string;
  habit_schedules: Schedule[];
  stamps: { date: string }[];
};

export type TodayStatus = "done" | "todo" | "rest";

export function todayStatus(habit: MemberHabit, today: string): TodayStatus {
  if (habit.stamps.some((s) => s.date === today)) return "done";
  return isScheduledDay(today, habit.habit_schedules) ? "todo" : "rest";
}

/**
 * 全員達成の日：その日が実施日のメンバー全員がスタンプを押した日。
 * 実施日のメンバーが0人の日は対象外。
 */
export function allDoneDates(habits: MemberHabit[], from: string, to: string): Set<string> {
  const stampSets = habits.map((h) => new Set(h.stamps.map((s) => s.date)));
  const result = new Set<string>();
  for (let d = from; d <= to; d = addDays(d, 1)) {
    let scheduledCount = 0;
    let allStamped = true;
    habits.forEach((h, i) => {
      if (d < h.start_date || !isScheduledDay(d, h.habit_schedules)) return;
      scheduledCount++;
      if (!stampSets[i].has(d)) allStamped = false;
    });
    if (scheduledCount > 0 && allStamped) result.add(d);
  }
  return result;
}
