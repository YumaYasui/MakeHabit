"use client";

import { useMemo, useState } from "react";
import { monthGrid, WEEKDAY_LABELS } from "@/lib/dates";
import { COLOR_CLASSES, type HabitColor } from "@/lib/habits";
import { allDoneDates, type MemberHabit } from "@/lib/room-stats";

function shiftMonth(ym: { y: number; m: number }, delta: number) {
  const index = ym.y * 12 + (ym.m - 1) + delta;
  return { y: Math.floor(index / 12), m: (index % 12) + 1 };
}

/** 全員達成した日に🎉スタンプを付けるルームのカレンダー */
export function RoomCalendar({ habits, today, color }: { habits: MemberHabit[]; today: string; color: HabitColor }) {
  const start = habits.reduce((min, h) => (h.start_date < min ? h.start_date : min), today);
  const allDone = useMemo(() => allDoneDates(habits, start, today), [habits, start, today]);
  const toYm = (date: string) => ({ y: Number(date.slice(0, 4)), m: Number(date.slice(5, 7)) });
  const [ym, setYm] = useState(() => toYm(today));
  const first = toYm(start);
  const last = toYm(today);
  const canPrev = ym.y * 12 + ym.m > first.y * 12 + first.m;
  const canNext = ym.y * 12 + ym.m < last.y * 12 + last.m;

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm dark:bg-stone-900">
      <div className="mb-1 flex items-center justify-between">
        <button onClick={() => setYm(shiftMonth(ym, -1))} disabled={!canPrev} aria-label="前の月" className="size-11 rounded-full text-xl disabled:opacity-20">
          ‹
        </button>
        <h2 className="font-bold">
          {ym.y}年{ym.m}月の全員達成
        </h2>
        <button onClick={() => setYm(shiftMonth(ym, 1))} disabled={!canNext} aria-label="次の月" className="size-11 rounded-full text-xl disabled:opacity-20">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-stone-500">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {monthGrid(ym.y, ym.m).flat().map((date, i) => {
          if (!date) return <div key={i} />;
          const inRange = date >= start && date <= today;
          return (
            <div key={date} className="relative flex aspect-square items-center justify-center">
              {allDone.has(date) ? (
                <span
                  aria-label={`${Number(date.slice(8))}日 全員達成`}
                  className={`flex w-[86%] aspect-square -rotate-12 items-center justify-center rounded-full border-2 border-amber-400 text-lg ${COLOR_CLASSES[color].soft}`}
                >
                  🎉
                </span>
              ) : (
                <span className={`text-sm ${inRange ? "" : "text-stone-300 dark:text-stone-700"} ${date === today ? "font-black" : ""}`}>
                  {Number(date.slice(8))}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-stone-500">🎉 は、その日がやる日のメンバー全員がスタンプを押した日です。</p>
    </section>
  );
}
