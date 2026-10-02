"use client";

import { useState } from "react";
import { StampMark } from "@/components/stamp-mark";
import { isStampable, monthGrid, WEEKDAY_LABELS } from "@/lib/dates";
import { isScheduledDay } from "@/lib/habit-stats";
import { COLOR_CLASSES, type Habit } from "@/lib/habits";

type Props = {
  habit: Habit;
  today: string;
  stamps: ReadonlyMap<string, boolean>;
  pending: ReadonlySet<string>;
  /** 渡さなければ閲覧のみ */
  onToggle?: (date: string) => void;
};

function shiftMonth(ym: { y: number; m: number }, delta: number) {
  const index = ym.y * 12 + (ym.m - 1) + delta;
  return { y: Math.floor(index / 12), m: (index % 12) + 1 };
}

export function StampCalendar({ habit, today, stamps, pending, onToggle }: Props) {
  const toYm = (date: string) => ({ y: Number(date.slice(0, 4)), m: Number(date.slice(5, 7)) });
  const [ym, setYm] = useState(() => toYm(today));
  const first = toYm(habit.start_date);
  const last = toYm(today);
  const canPrev = ym.y * 12 + ym.m > first.y * 12 + first.m;
  const canNext = ym.y * 12 + ym.m < last.y * 12 + last.m;
  const colors = COLOR_CLASSES[habit.color];

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm dark:bg-stone-900">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setYm(shiftMonth(ym, -1))} disabled={!canPrev} aria-label="前の月" className="size-11 rounded-full text-xl disabled:opacity-20">
          ‹
        </button>
        <h2 className="font-bold">
          {ym.y}年{ym.m}月
        </h2>
        <button onClick={() => setYm(shiftMonth(ym, 1))} disabled={!canNext} aria-label="次の月" className="size-11 rounded-full text-xl disabled:opacity-20">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-stone-500">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={label} className={i === 0 ? "text-rose-500" : i === 6 ? "text-sky-500" : ""}>
            {label}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {monthGrid(ym.y, ym.m).flat().map((date, i) => {
          if (!date) return <div key={i} />;
          const inRange = date >= habit.start_date && date <= today;
          const scheduled = inRange && isScheduledDay(date, habit.habit_schedules);
          const stamped = stamps.has(date);
          const missed = scheduled && !stamped && date < today;
          const editable = !!onToggle && isStampable(date, today, habit.start_date);
          const day = Number(date.slice(8));

          const cell = (
            <>
              <span
                className={`absolute inset-0.5 rounded-full ${scheduled ? colors.soft : ""} ${
                  date === today ? `ring-2 ${colors.ring}` : ""
                }`}
              />
              {stamped ? (
                <StampMark icon={habit.icon} color={habit.color} late={stamps.get(date)} className="relative w-[86%] text-lg" />
              ) : (
                <span className={`relative text-sm ${inRange ? "" : "text-stone-300 dark:text-stone-700"}`}>
                  {day}
                  {missed && <span className="absolute -bottom-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-stone-400" />}
                </span>
              )}
            </>
          );

          return editable ? (
            <button
              key={date}
              onClick={() => onToggle(date)}
              disabled={pending.has(date)}
              aria-label={`${ym.m}月${day}日${stamped ? "のスタンプを取り消す" : "にスタンプを押す"}`}
              className="relative flex aspect-square items-center justify-center active:scale-90"
            >
              {cell}
            </button>
          ) : (
            <div key={date} className="relative flex aspect-square items-center justify-center">
              {cell}
            </div>
          );
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-stone-500 dark:text-stone-400">
        <li className="flex items-center gap-1.5">
          <span className={`size-3.5 rounded-full ${colors.soft}`} />
          実施日
        </li>
        <li className="flex items-center gap-1.5">
          <StampMark icon="" color={habit.color} className="size-3.5" />
          スタンプ
        </li>
        <li className="flex items-center gap-1.5">
          <StampMark icon="" color={habit.color} late className="size-3.5" />
          後押し
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-stone-400" />
          押し忘れ
        </li>
      </ul>
      {onToggle && <p className="mt-2 text-xs text-stone-500">今日と過去7日以内の日は、タップしてスタンプを押せます。</p>}
    </section>
  );
}
