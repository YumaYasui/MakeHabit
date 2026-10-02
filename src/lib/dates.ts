// 日付は "YYYY-MM-DD" 形式の文字列で扱う。
// 1日の区切りは日本時間の午前3時（午前0時〜2時59分は前日扱い）。

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_START_HOUR = 3;

/** 何日前まで後からスタンプを押せるか */
export const STAMP_WINDOW_DAYS = 7;

export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** アプリ上の「今日」 */
export function appToday(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + JST_OFFSET_MS - DAY_START_HOUR * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function toUtcDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function addDays(date: string, days: number): string {
  const d = toUtcDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = 日曜 〜 6 = 土曜 */
export function weekdayOf(date: string): number {
  return toUtcDate(date).getUTCDay();
}

export function diffDays(from: string, to: string): number {
  return Math.round((toUtcDate(to).getTime() - toUtcDate(from).getTime()) / 86_400_000);
}

/** スタンプを押したり取り消したりできる日か */
export function isStampable(date: string, today: string, startDate: string): boolean {
  return date <= today && date >= startDate && diffDays(date, today) <= STAMP_WINDOW_DAYS;
}

export function formatWeekdays(weekdays: number[]): string {
  if (weekdays.length === 7) return "毎日";
  const sorted = [...weekdays].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  if (sorted.join() === "1,2,3,4,5") return "平日";
  if (sorted.join() === "6,0") return "土日";
  return sorted.map((w) => WEEKDAY_LABELS[w]).join("");
}

/** 月カレンダー用：その月の日付を日曜始まりの週ごとに並べる（月外は null） */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = Array(first.getUTCDay()).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
