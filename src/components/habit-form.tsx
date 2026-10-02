"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { WEEKDAY_LABELS } from "@/lib/dates";
import { COLOR_CLASSES, errorMessage, HABIT_COLORS, HABIT_ICONS, type HabitColor } from "@/lib/habits";
import { createClient } from "@/lib/supabase/client";

type Values = { name: string; icon: string; color: HabitColor; weekdays: number[] };

// 月曜始まりで並べる
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function HabitForm({ habitId, initial }: { habitId?: string; initial?: Values }) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(
    initial ?? { name: "", icon: HABIT_ICONS[0], color: "orange", weekdays: [0, 1, 2, 3, 4, 5, 6] },
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((v) => ({ ...v, [key]: value }));
  const toggleWeekday = (w: number) =>
    set("weekdays", values.weekdays.includes(w) ? values.weekdays.filter((d) => d !== w) : [...values.weekdays, w]);

  const weekdaysChanged =
    !!initial && [...initial.weekdays].sort().join() !== [...values.weekdays].sort().join();
  const valid = values.name.trim().length > 0 && values.weekdays.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError("");
    const supabase = createClient();
    const args = { p_name: values.name.trim(), p_icon: values.icon, p_color: values.color, p_weekdays: values.weekdays };
    const { data, error } = habitId
      ? await supabase.rpc("update_habit", { p_habit_id: habitId, ...args })
      : await supabase.rpc("create_habit", args);
    if (error) {
      setSaving(false);
      return setError(errorMessage(error));
    }
    router.push(`/habits/${habitId ?? data}`);
    router.refresh();
  }

  const label = "mb-2 block text-sm font-bold text-stone-600 dark:text-stone-300";

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <label htmlFor="name" className={label}>
          習慣の名前
        </label>
        <input
          id="name"
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          maxLength={30}
          placeholder="例：朝にストレッチする"
          className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-base dark:border-stone-700 dark:bg-stone-900"
        />
      </div>

      <fieldset>
        <legend className={label}>やる曜日</legend>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAY_ORDER.map((w) => {
            const on = values.weekdays.includes(w);
            return (
              <button
                key={w}
                type="button"
                aria-pressed={on}
                onClick={() => toggleWeekday(w)}
                className={`aspect-square rounded-full font-bold ${
                  on ? `${COLOR_CLASSES[values.color].stamp} text-white` : "bg-stone-200 text-stone-500 dark:bg-stone-800"
                }`}
              >
                {WEEKDAY_LABELS[w]}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-2 text-xs">
          {[
            { label: "毎日", days: [0, 1, 2, 3, 4, 5, 6] },
            { label: "平日", days: [1, 2, 3, 4, 5] },
            { label: "土日", days: [0, 6] },
          ].map((preset) => (
            <button key={preset.label} type="button" onClick={() => set("weekdays", preset.days)} className="rounded-full bg-stone-200 px-3 py-1.5 dark:bg-stone-800">
              {preset.label}
            </button>
          ))}
        </div>
        {values.weekdays.length === 0 && <p className="mt-2 text-sm text-red-600">曜日を1つ以上選んでください</p>}
        {weekdaysChanged && (
          <p className="mt-2 text-xs text-stone-500">変更した曜日は今日から適用されます。それより前の日は、前の設定のまま記録が残ります。</p>
        )}
      </fieldset>

      <fieldset>
        <legend className={label}>アイコン</legend>
        <div className="grid grid-cols-8 gap-1.5">
          {HABIT_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              aria-pressed={values.icon === icon}
              onClick={() => set("icon", icon)}
              className={`aspect-square rounded-xl text-xl ${values.icon === icon ? "bg-stone-200 ring-2 ring-stone-500 dark:bg-stone-800" : ""}`}
            >
              {icon}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={label}>色</legend>
        <div className="flex gap-3">
          {HABIT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              aria-pressed={values.color === color}
              onClick={() => set("color", color)}
              className={`size-10 rounded-full ${COLOR_CLASSES[color].stamp} ${
                values.color === color ? "ring-4 ring-stone-400 ring-offset-2 ring-offset-stone-50 dark:ring-offset-stone-950" : ""
              }`}
            />
          ))}
        </div>
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={!valid || saving} className="w-full rounded-2xl bg-orange-500 py-4 font-bold text-white disabled:opacity-40">
        {saving ? "保存中…" : habitId ? "保存する" : "この習慣をはじめる"}
      </button>
    </form>
  );
}
