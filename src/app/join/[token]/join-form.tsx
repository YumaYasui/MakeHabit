"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { WEEKDAY_ORDER } from "@/components/habit-form";
import { WEEKDAY_LABELS } from "@/lib/dates";
import { COLOR_CLASSES, errorMessage, type HabitColor } from "@/lib/habits";
import { createClient } from "@/lib/supabase/client";

export function JoinForm({ token, color }: { token: string; color: HabitColor }) {
  const router = useRouter();
  const [weekdays, setWeekdays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  async function join() {
    setJoining(true);
    setError("");
    const { data, error } = await createClient().rpc("join_room", { p_token: token, p_weekdays: weekdays });
    if (error) {
      setJoining(false);
      return setError(errorMessage(error));
    }
    router.push(`/rooms/${data}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 block text-sm font-bold text-stone-600 dark:text-stone-300">自分がやる曜日</legend>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAY_ORDER.map((w) => {
            const on = weekdays.includes(w);
            return (
              <button
                key={w}
                type="button"
                aria-pressed={on}
                onClick={() => setWeekdays(on ? weekdays.filter((d) => d !== w) : [...weekdays, w])}
                className={`aspect-square rounded-full font-bold ${on ? `${COLOR_CLASSES[color].stamp} text-white` : "bg-stone-200 text-stone-500 dark:bg-stone-800"}`}
              >
                {WEEKDAY_LABELS[w]}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-stone-500">あとから変更できます。</p>
      </fieldset>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={join} disabled={joining || weekdays.length === 0} className="w-full rounded-2xl bg-orange-500 py-4 font-bold text-white disabled:opacity-40">
        {joining ? "参加しています…" : "このルームに参加する"}
      </button>
    </div>
  );
}
