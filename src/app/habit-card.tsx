"use client";

import Link from "next/link";
import { StampMark } from "@/components/stamp-mark";
import { useStamps } from "@/components/use-stamps";
import { formatWeekdays } from "@/lib/dates";
import { isScheduledDay } from "@/lib/habit-stats";
import { COLOR_CLASSES, currentWeekdays, type Habit } from "@/lib/habits";

export function HabitCard({ habit, today, onSaved }: { habit: Habit; today: string; onSaved?: () => void }) {
  const { stamps, stats, add, remove, pending } = useStamps(habit, today, onSaved);
  const todayCount = stamps.get(today)?.count ?? 0;
  const stamped = todayCount > 0;
  const isRestDay = !isScheduledDay(today, habit.habit_schedules);

  return (
    <li className="flex items-center gap-3 rounded-3xl bg-white p-3 pl-4 shadow-sm dark:bg-stone-900">
      <Link href={`/habits/${habit.id}`} className="min-w-0 flex-1 py-1">
        <p className="truncate font-bold">
          <span className="mr-1.5">{habit.icon}</span>
          {habit.name}
        </p>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          {habit.room_id && <span className="mr-2 rounded-full bg-stone-100 px-2 py-0.5 dark:bg-stone-800">👥 ルーム</span>}
          {formatWeekdays(currentWeekdays(habit, today))}
          {isRestDay && <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 dark:bg-stone-800">今日はお休み</span>}
        </p>
        <p className="mt-2 flex gap-3 text-sm">
          <span className={`font-bold ${COLOR_CLASSES[habit.color].text}`}>🔥 {stats.currentStreak}回連続</span>
          <span className="text-stone-500 dark:text-stone-400">
            累計 {stats.total}日・{stats.totalTimes}回
          </span>
        </p>
      </Link>
      <div className="flex shrink-0 flex-col items-center gap-1">
        <button
          onClick={() => add(today)}
          disabled={pending.has(today)}
          aria-label={stamped ? `${habit.name}のスタンプをもう1回押す` : `${habit.name}のスタンプを押す`}
          className={`flex size-18 items-center justify-center rounded-full border-2 border-dashed active:scale-95 ${
            stamped ? "border-transparent" : "border-stone-300 dark:border-stone-700"
          }`}
        >
          {stamped ? (
            <StampMark key={todayCount} icon={habit.icon} color={habit.color} count={todayCount} className="animate-stamp size-full text-3xl" />
          ) : (
            <span className="text-xs font-bold text-stone-400">
              タップで
              <br />
              スタンプ
            </span>
          )}
        </button>
        {stamped && (
          <button
            onClick={() => remove(today)}
            disabled={pending.has(today)}
            aria-label={`${habit.name}のスタンプを1回減らす`}
            className="flex h-7 items-center gap-1 rounded-full bg-stone-100 px-2.5 text-xs font-bold text-stone-600 active:scale-95 dark:bg-stone-800 dark:text-stone-300"
          >
            <span className="text-base leading-none">−</span>
            今日{todayCount}回
          </button>
        )}
      </div>
    </li>
  );
}
