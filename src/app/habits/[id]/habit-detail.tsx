"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePraise } from "@/components/praise-provider";
import { useStamps } from "@/components/use-stamps";
import { formatWeekdays } from "@/lib/dates";
import { COLOR_CLASSES, currentWeekdays, errorMessage, type Habit } from "@/lib/habits";
import { createClient } from "@/lib/supabase/client";
import { StampCalendar } from "./stamp-calendar";

export function HabitDetail({ habit, today }: { habit: Habit; today: string }) {
  const router = useRouter();
  const { showError } = usePraise();
  const { stamps, stats, toggle, pending } = useStamps(habit, today);
  const [busy, setBusy] = useState(false);
  const archived = habit.archived_at !== null;

  async function setArchived(value: boolean) {
    setBusy(true);
    const { error } = await createClient()
      .from("habits")
      .update({ archived_at: value ? new Date().toISOString() : null })
      .eq("id", habit.id);
    setBusy(false);
    if (error) return showError(errorMessage(error));
    router.push(value ? "/" : `/habits/${habit.id}`);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(`「${habit.name}」をスタンプの記録ごと削除します。元に戻せません。よろしいですか？`)) return;
    setBusy(true);
    const { error } = await createClient().from("habits").delete().eq("id", habit.id);
    setBusy(false);
    if (error) return showError(errorMessage(error));
    router.push("/");
    router.refresh();
  }

  const tiles = [
    { label: "現在の連続", value: stats.currentStreak, unit: "回" },
    { label: "最長連続", value: stats.longestStreak, unit: "回" },
    { label: "累計", value: stats.total, unit: "日" },
  ];

  return (
    <div className="space-y-4">
      {archived && (
        <p className="rounded-2xl bg-stone-200 px-4 py-3 text-sm dark:bg-stone-800">
          アーカイブ中の習慣です。記録を見ることだけできます。
        </p>
      )}

      <p className="text-sm text-stone-500 dark:text-stone-400">実施日：{formatWeekdays(currentWeekdays(habit, today))}</p>

      <dl className="grid grid-cols-3 gap-2">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl bg-white p-3 text-center shadow-sm dark:bg-stone-900">
            <dt className="text-xs text-stone-500 dark:text-stone-400">{tile.label}</dt>
            <dd className={`mt-1 text-3xl font-black tabular-nums ${COLOR_CLASSES[habit.color].text}`}>
              {tile.value}
              <span className="ml-0.5 text-sm font-bold">{tile.unit}</span>
            </dd>
          </div>
        ))}
      </dl>

      <StampCalendar habit={habit} today={today} stamps={stamps} pending={pending} onToggle={archived ? undefined : toggle} />

      <div className="grid gap-2 pt-2">
        {!archived && (
          <Link href={`/habits/${habit.id}/edit`} className="rounded-2xl bg-white py-3.5 text-center font-bold shadow-sm dark:bg-stone-900">
            編集する
          </Link>
        )}
        <button onClick={() => setArchived(!archived)} disabled={busy} className="rounded-2xl bg-white py-3.5 font-bold shadow-sm disabled:opacity-50 dark:bg-stone-900">
          {archived ? "アーカイブから戻す" : "アーカイブする"}
        </button>
        <button onClick={remove} disabled={busy} className="py-3 text-sm font-bold text-red-600 disabled:opacity-50">
          削除する
        </button>
      </div>
    </div>
  );
}
