"use client";

import { useMemo, useState } from "react";
import { computeStats, isComeback } from "@/lib/habit-stats";
import { errorMessage, type Habit } from "@/lib/habits";
import { praiseFor } from "@/lib/praise";
import { createClient } from "@/lib/supabase/client";
import { usePraise } from "./praise-provider";

/** スタンプの状態を持ち、押す・取り消すを画面に即反映してから保存する */
export function useStamps(habit: Habit, today: string, onSaved?: () => void) {
  const { showPraise, showError } = usePraise();
  const [stamps, setStamps] = useState(() => new Map(habit.stamps.map((s) => [s.date, s.is_late])));
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());

  const stampDates = useMemo(() => new Set(stamps.keys()), [stamps]);
  const stats = useMemo(
    () => computeStats(habit.start_date, habit.habit_schedules, stampDates, today),
    [habit.start_date, habit.habit_schedules, stampDates, today],
  );

  async function toggle(date: string) {
    if (pending.has(date)) return;
    const supabase = createClient();
    const wasStamped = stamps.has(date);
    const wasLate = stamps.get(date);

    const next = new Map(stamps);
    if (wasStamped) next.delete(date);
    else next.set(date, date !== today);
    setStamps(next);
    setPending((p) => new Set(p).add(date));

    if (!wasStamped) {
      const after = computeStats(habit.start_date, habit.habit_schedules, new Set(next.keys()), today);
      showPraise(
        praiseFor(stats, after, {
          isLate: date !== today,
          isComeback: isComeback(date, habit.start_date, habit.habit_schedules, stampDates),
        }),
      );
    }

    let failed: { message?: string } | null;
    if (wasStamped) {
      // RLS で消せなかった場合はエラーにならず 0 件になる
      const { data, error } = await supabase.from("stamps").delete().eq("habit_id", habit.id).eq("date", date).select("id");
      failed = error ?? (data?.length ? null : { message: "row-level security" });
    } else {
      ({ error: failed } = await supabase.from("stamps").insert({ habit_id: habit.id, date }));
    }

    setPending((p) => {
      const rest = new Set(p);
      rest.delete(date);
      return rest;
    });
    if (!failed) onSaved?.();
    if (failed) {
      setStamps((cur) => {
        const reverted = new Map(cur);
        if (wasStamped) reverted.set(date, wasLate!);
        else reverted.delete(date);
        return reverted;
      });
      showError(errorMessage(failed));
    }
  }

  return { stamps, stats, toggle, pending };
}
