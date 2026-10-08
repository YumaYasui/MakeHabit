import { addDays, weekdayOf } from "./dates";

export type Schedule = {
  weekdays: number[];
  valid_from: string;
};

export type Stamp = {
  date: string;
  is_late: boolean;
  /** その日に何回やったか（1〜10） */
  count: number;
};

export type HabitStats = {
  /** やった日の数 */
  total: number;
  /** やった回数の合計 */
  totalTimes: number;
  currentStreak: number;
  longestStreak: number;
};

/** その日に有効だった曜日設定で、実施日かどうかを判定する */
export function isScheduledDay(date: string, schedules: Schedule[]): boolean {
  let active: Schedule | undefined;
  for (const s of schedules) {
    if (s.valid_from <= date && (!active || s.valid_from > active.valid_from)) active = s;
  }
  return active ? active.weekdays.includes(weekdayOf(date)) : false;
}

/**
 * 累計：スタンプが押された日の数と、回数の合計（実施日かどうかは問わない）
 * 連続：実施日だけを数える。今日が実施日で未スタンプなら「途中」として途切れ扱いにしない
 * stampCounts は「日付 → その日の回数」。1回以上の日が「やった日」
 */
export function computeStats(
  startDate: string,
  schedules: Schedule[],
  stampCounts: ReadonlyMap<string, number>,
  today: string,
): HabitStats {
  let total = 0;
  let totalTimes = 0;
  for (const [d, count] of stampCounts) {
    if (d >= startDate && d <= today) {
      total++;
      totalTimes += count;
    }
  }

  let longestStreak = 0;
  let run = 0;
  for (let d = startDate; d <= today; d = addDays(d, 1)) {
    if (!isScheduledDay(d, schedules)) continue;
    if (stampCounts.has(d)) {
      run++;
      longestStreak = Math.max(longestStreak, run);
    } else if (d !== today) {
      run = 0;
    }
  }

  let currentStreak = 0;
  for (let d = today; d >= startDate; d = addDays(d, -1)) {
    if (!isScheduledDay(d, schedules)) continue;
    if (stampCounts.has(d)) currentStreak++;
    else if (d !== today) break;
  }

  return { total, totalTimes, currentStreak, longestStreak };
}

/** 長い間空いた後の再開か：それ以前にスタンプがあり、直前の実施日7回がすべて未スタンプ */
export function isComeback(
  date: string,
  startDate: string,
  schedules: Schedule[],
  stampDates: { has(date: string): boolean },
): boolean {
  const COMEBACK_GAP = 7;
  let missed = 0;
  for (let d = addDays(date, -1); d >= startDate; d = addDays(d, -1)) {
    if (stampDates.has(d)) return missed >= COMEBACK_GAP;
    if (isScheduledDay(d, schedules)) missed++;
  }
  return false;
}

/** スタンプの一覧を「日付 → 回数」にする */
export function countsByDate(stamps: readonly { date: string; count: number }[]): Map<string, number> {
  return new Map(stamps.map((s) => [s.date, s.count]));
}
