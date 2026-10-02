import { addDays, weekdayOf } from "./dates";

export type Schedule = {
  weekdays: number[];
  valid_from: string;
};

export type Stamp = {
  date: string;
  is_late: boolean;
};

export type HabitStats = {
  total: number;
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
 * 累計：スタンプが押された日の数（実施日かどうかは問わない）
 * 連続：実施日だけを数える。今日が実施日で未スタンプなら「途中」として途切れ扱いにしない
 */
export function computeStats(
  startDate: string,
  schedules: Schedule[],
  stampDates: ReadonlySet<string>,
  today: string,
): HabitStats {
  let total = 0;
  for (const d of stampDates) if (d >= startDate && d <= today) total++;

  let longestStreak = 0;
  let run = 0;
  for (let d = startDate; d <= today; d = addDays(d, 1)) {
    if (!isScheduledDay(d, schedules)) continue;
    if (stampDates.has(d)) {
      run++;
      longestStreak = Math.max(longestStreak, run);
    } else if (d !== today) {
      run = 0;
    }
  }

  let currentStreak = 0;
  for (let d = today; d >= startDate; d = addDays(d, -1)) {
    if (!isScheduledDay(d, schedules)) continue;
    if (stampDates.has(d)) currentStreak++;
    else if (d !== today) break;
  }

  return { total, currentStreak, longestStreak };
}

/** 長い間空いた後の再開か：それ以前にスタンプがあり、直前の実施日7回がすべて未スタンプ */
export function isComeback(
  date: string,
  startDate: string,
  schedules: Schedule[],
  stampDates: ReadonlySet<string>,
): boolean {
  const COMEBACK_GAP = 7;
  let missed = 0;
  for (let d = addDays(date, -1); d >= startDate; d = addDays(d, -1)) {
    if (stampDates.has(d)) return missed >= COMEBACK_GAP;
    if (isScheduledDay(d, schedules)) missed++;
  }
  return false;
}
