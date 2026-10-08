import type { HabitStats } from "./habit-stats";

export type Praise = {
  message: string;
  /** 節目など、紙吹雪で派手に祝うか */
  celebrate: boolean;
};

const DAILY_MESSAGES = [
  "ナイス！",
  "今日もえらい！",
  "その調子！",
  "やったね！",
  "コツコツが一番強い！",
  "積み重ねてるね！",
  "いいぞいいぞ！",
  "今日の自分に拍手👏",
  "続けてるのすごい！",
  "最高！",
];

// 同じ日に2回目以降を押したとき
const REPEAT_MESSAGES = ["今日はたくさんやったね！", "やる気満々！", "すごい集中力！", "おかわりえらい！", "その勢い最高！"];

const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100];
const TOTAL_MILESTONES = [10, 30, 50, 100, 200, 365];
const TIMES_MILESTONES = [10, 50, 100, 200, 500];

function isStreakMilestone(n: number): boolean {
  return STREAK_MILESTONES.includes(n) || (n > 100 && n % 100 === 0);
}

function isTotalMilestone(n: number): boolean {
  return TOTAL_MILESTONES.includes(n) || (n > 365 && n % 100 === 0);
}

function isTimesMilestone(n: number): boolean {
  return TIMES_MILESTONES.includes(n) || (n > 500 && n % 500 === 0);
}

/** before → after の間に越えた節目のうち最大のもの */
function crossedMilestone(before: number, after: number, test: (n: number) => boolean) {
  for (let n = after; n > before; n--) if (test(n)) return n;
  return null;
}

function streakMessage(n: number): string {
  switch (n) {
    case 3:
      return "3回連続達成！三日坊主を突破したね🎉";
    case 7:
      return "7回連続達成！すっかり習慣になってきた🎉";
    case 14:
      return "14回連続達成！もう立派な習慣だね🎉";
    case 30:
      return "30回連続達成！本当にすごい🏆";
    case 50:
      return "50回連続達成！ここまで続ける人はなかなかいないよ🏆";
    case 100:
      return "100回連続達成！伝説の始まり👑";
    default:
      return `${n}回連続達成！あなたは習慣の達人👑`;
  }
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

export function praiseFor(
  before: HabitStats,
  after: HabitStats,
  opts: { isLate: boolean; isComeback: boolean; /** その日の何回目か */ timesThatDay?: number },
  random: () => number = Math.random,
): Praise {
  const streak = crossedMilestone(before.currentStreak, after.currentStreak, isStreakMilestone);
  if (streak !== null) return { message: streakMessage(streak), celebrate: true };

  const total = crossedMilestone(before.total, after.total, isTotalMilestone);
  if (total !== null) return { message: `累計${total}日達成！積み重ねが力になってる🎉`, celebrate: true };

  const times = crossedMilestone(before.totalTimes, after.totalTimes, isTimesMilestone);
  if (times !== null) return { message: `累計${times}回達成！数えきれないくらい積み重ねたね🎉`, celebrate: true };

  if (opts.isLate && after.currentStreak > before.currentStreak + 1) {
    return { message: `連続復活！${after.currentStreak}回連続になったよ🔥`, celebrate: true };
  }
  if ((opts.timesThatDay ?? 1) >= 2) {
    return { message: `${opts.timesThatDay}回目！${pick(REPEAT_MESSAGES, random)}`, celebrate: false };
  }
  if (opts.isComeback) return { message: "おかえり！また始められたのがえらい😊", celebrate: false };

  return { message: pick(DAILY_MESSAGES, random), celebrate: false };
}
