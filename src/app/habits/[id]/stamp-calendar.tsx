"use client";

import { useState } from "react";
import { StampMark } from "@/components/stamp-mark";
import { isStampable, monthGrid, WEEKDAY_LABELS } from "@/lib/dates";
import { isScheduledDay } from "@/lib/habit-stats";
import { COLOR_CLASSES, type Habit } from "@/lib/habits";

type Props = {
  habit: Habit;
  today: string;
  /** 日付 → その日のスタンプ（後押しか、回数） */
  stamps: ReadonlyMap<string, { late: boolean; count: number }>;
  pending: ReadonlySet<string>;
  /** スタンプを1回増やす・減らす。渡さなければ閲覧のみ */
  onAdd?: (date: string) => void;
  onRemove?: (date: string) => void;
  /** 日付ごとの👏の数 */
  claps?: ReadonlyMap<string, number>;
  /** ルームの仲間のカレンダー：スタンプをタップして👏を送る */
  onClap?: (date: string) => void;
  /** 自分が👏を送った日 */
  myClaps?: ReadonlySet<string>;
};

function shiftMonth(ym: { y: number; m: number }, delta: number) {
  const index = ym.y * 12 + (ym.m - 1) + delta;
  return { y: Math.floor(index / 12), m: (index % 12) + 1 };
}

export function StampCalendar({ habit, today, stamps, pending, onAdd, onRemove, claps, onClap, myClaps }: Props) {
  const toYm = (date: string) => ({ y: Number(date.slice(0, 4)), m: Number(date.slice(5, 7)) });
  const [ym, setYm] = useState(() => toYm(today));
  const first = toYm(habit.start_date);
  const last = toYm(today);
  const canPrev = ym.y * 12 + ym.m > first.y * 12 + first.m;
  const canNext = ym.y * 12 + ym.m < last.y * 12 + last.m;
  const colors = COLOR_CLASSES[habit.color];
  const canEdit = !!onAdd && !!onRemove;
  // 回数を変える日（最初は今日）
  const [selected, setSelected] = useState(() => (canEdit && isStampable(today, today, habit.start_date) ? today : null));
  const selectedCount = selected ? (stamps.get(selected)?.count ?? 0) : 0;

  function onTapEditable(date: string) {
    setSelected(date);
    // まだ押していない日は、1タップで押せるようにする
    if (!stamps.has(date)) onAdd!(date);
  }

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
          const editable = canEdit && isStampable(date, today, habit.start_date);
          const clappable = !!onClap && stamped;
          const clapCount = claps?.get(date) ?? 0;
          const day = Number(date.slice(8));

          const cell = (
            <>
              <span
                className={`absolute inset-0.5 rounded-full ${scheduled ? colors.soft : ""} ${
                  date === today ? `ring-2 ${colors.ring}` : ""
                }`}
              />
              {stamped ? (
                <StampMark
                  icon={habit.icon}
                  color={habit.color}
                  late={stamps.get(date)!.late}
                  count={stamps.get(date)!.count}
                  className="relative w-[86%] text-lg"
                />
              ) : (
                <span className={`relative text-sm ${inRange ? "" : "text-stone-300 dark:text-stone-700"}`}>
                  {day}
                  {missed && <span className="absolute -bottom-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-stone-400" />}
                </span>
              )}
              {clapCount > 0 && (
                <span
                  className={`absolute -top-1 -right-1 rounded-full px-1 text-[10px] leading-4 font-bold shadow-sm ${
                    myClaps?.has(date) ? "bg-amber-300 text-stone-900" : "bg-white text-stone-700 dark:bg-stone-700 dark:text-stone-100"
                  }`}
                >
                  👏{clapCount}
                </span>
              )}
            </>
          );

          if (editable || clappable) {
            const label = editable
              ? `${ym.m}月${day}日${stamped ? "の回数を変える" : "にスタンプを押す"}`
              : `${ym.m}月${day}日のスタンプに${myClaps?.has(date) ? "送った👏を取り消す" : "👏を送る"}`;
            return (
              <button
                key={date}
                onClick={() => (editable ? onTapEditable(date) : onClap!(date))}
                disabled={pending.has(date)}
                aria-label={label}
                aria-pressed={editable ? selected === date : undefined}
                className={`relative flex aspect-square items-center justify-center rounded-xl active:scale-90 ${
                  editable && selected === date ? "bg-stone-100 dark:bg-stone-800" : ""
                }`}
              >
                {cell}
              </button>
            );
          }
          return (
            <div key={date} className="relative flex aspect-square items-center justify-center">
              {cell}
            </div>
          );
        })}
      </div>

      {canEdit && selected && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-stone-100 px-4 py-2.5 dark:bg-stone-800">
          <span className="text-sm font-bold">
            {Number(selected.slice(5, 7))}月{Number(selected.slice(8))}日{selected === today && "（今日）"}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRemove!(selected)}
              disabled={selectedCount === 0 || pending.has(selected)}
              aria-label="選んだ日のスタンプを1回減らす"
              className="flex size-9 items-center justify-center rounded-full bg-white text-xl font-bold shadow-sm active:scale-90 disabled:opacity-30 dark:bg-stone-900"
            >
              −
            </button>
            <span className="min-w-12 text-center font-black tabular-nums" aria-live="polite">
              {selectedCount}回
            </span>
            <button
              onClick={() => onAdd!(selected)}
              disabled={pending.has(selected)}
              aria-label="選んだ日のスタンプを1回増やす"
              className={`flex size-9 items-center justify-center rounded-full text-xl font-bold text-white shadow-sm active:scale-90 disabled:opacity-30 ${colors.stamp}`}
            >
              ＋
            </button>
          </div>
        </div>
      )}

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
          <span className="rounded-full bg-stone-900 px-1 text-[10px] leading-4 font-black text-white dark:bg-white dark:text-stone-900">×2</span>
          1日の回数
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-stone-400" />
          押し忘れ
        </li>
      </ul>
      {canEdit && (
        <p className="mt-2 text-xs text-stone-500">
          今日と過去7日以内の日は、タップしてスタンプを押せます。押した日をタップすると、下で回数を変えられます。
        </p>
      )}
      {onClap && <p className="mt-2 text-xs text-stone-500">スタンプをタップすると👏を送れます。</p>}
    </section>
  );
}
