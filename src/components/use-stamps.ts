"use client";

import { useMemo, useState } from "react";
import { computeStats, isComeback } from "@/lib/habit-stats";
import { errorMessage, MAX_STAMPS_PER_DAY, type Habit } from "@/lib/habits";
import { praiseFor } from "@/lib/praise";
import { createClient } from "@/lib/supabase/client";
import { usePraise } from "./praise-provider";

type DayStamp = { late: boolean; count: number };

/** スタンプの状態を持ち、回数の増減を画面に即反映してから保存する */
export function useStamps(habit: Habit, today: string, onSaved?: () => void) {
  const { showPraise, showError } = usePraise();
  const [stamps, setStamps] = useState(
    () => new Map<string, DayStamp>(habit.stamps.map((s) => [s.date, { late: s.is_late, count: s.count }])),
  );
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());

  const counts = useMemo(() => new Map([...stamps].map(([date, s]) => [date, s.count])), [stamps]);
  const stats = useMemo(
    () => computeStats(habit.start_date, habit.habit_schedules, counts, today),
    [habit.start_date, habit.habit_schedules, counts, today],
  );

  function setCount(date: string, count: number, late: boolean) {
    setStamps((cur) => {
      const next = new Map(cur);
      if (count <= 0) next.delete(date);
      else next.set(date, { late: cur.get(date)?.late ?? late, count });
      return next;
    });
  }

  async function change(date: string, delta: 1 | -1) {
    if (pending.has(date)) return;
    const before = stamps.get(date);
    const prevCount = before?.count ?? 0;
    const nextCount = prevCount + delta;
    if (nextCount < 0) return;
    if (nextCount > MAX_STAMPS_PER_DAY) return showError(`1日${MAX_STAMPS_PER_DAY}回までです`);

    setCount(date, nextCount, date !== today);
    setPending((p) => new Set(p).add(date));

    if (delta === 1) {
      const nextCounts = new Map(counts).set(date, nextCount);
      const after = computeStats(habit.start_date, habit.habit_schedules, nextCounts, today);
      showPraise(
        praiseFor(stats, after, {
          isLate: date !== today,
          isComeback: prevCount === 0 && isComeback(date, habit.start_date, habit.habit_schedules, counts),
          timesThatDay: nextCount,
        }),
      );
    }

    const { error } = await createClient().rpc(delta === 1 ? "add_stamp" : "remove_stamp", {
      p_habit_id: habit.id,
      p_date: date,
    });

    setPending((p) => {
      const rest = new Set(p);
      rest.delete(date);
      return rest;
    });
    if (error) {
      // 失敗したら、その日だけ元の回数に戻す
      setCount(date, prevCount, before?.late ?? date !== today);
      showError(errorMessage(error));
    } else {
      onSaved?.();
    }
  }

  return {
    stamps,
    stats,
    pending,
    /** 1回増やす */
    add: (date: string) => change(date, 1),
    /** 1回減らす（1回なら取り消し） */
    remove: (date: string) => change(date, -1),
  };
}
