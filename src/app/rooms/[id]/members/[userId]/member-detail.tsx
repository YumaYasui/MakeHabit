"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePraise } from "@/components/praise-provider";
import { useClaps } from "@/components/use-claps";
import { formatWeekdays } from "@/lib/dates";
import { computeStats, countsByDate } from "@/lib/habit-stats";
import { COLOR_CLASSES, currentWeekdays, errorMessage } from "@/lib/habits";
import type { RoomMember } from "@/lib/rooms";
import { createClient } from "@/lib/supabase/client";
import { StampCalendar } from "../../../../habits/[id]/stamp-calendar";

export function MemberDetail({ member, roomId, myId, isOwner, today }: { member: RoomMember; roomId: string; myId: string; isOwner: boolean; today: string }) {
  const router = useRouter();
  const { showError } = usePraise();
  const { habit } = member;
  const { counts, mine, toggle, pending } = useClaps(habit, myId);
  const [busy, setBusy] = useState(false);
  const stamps = new Map(habit.stamps.map((s) => [s.date, { late: s.is_late, count: s.count }]));
  const stats = computeStats(habit.start_date, habit.habit_schedules, countsByDate(habit.stamps), today);

  async function removeMember() {
    if (!window.confirm(`${member.display_name}さんをルームから外します。外した人は再参加できません。よろしいですか？`)) return;
    setBusy(true);
    const { error } = await createClient().rpc("remove_member", { p_room_id: roomId, p_user_id: member.user_id });
    setBusy(false);
    if (error) return showError(errorMessage(error));
    router.push(`/rooms/${roomId}`);
    router.refresh();
  }

  const tiles = [
    { label: "現在の連続", value: stats.currentStreak, unit: "回" },
    { label: "最長連続", value: stats.longestStreak, unit: "回" },
    { label: "累計", value: stats.total, unit: "日", sub: `合計 ${stats.totalTimes}回` },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500 dark:text-stone-400">
        {habit.icon} {habit.name} ・ 実施日：{formatWeekdays(currentWeekdays(habit, today))}
      </p>
      <dl className="grid grid-cols-3 gap-2">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl bg-white p-3 text-center shadow-sm dark:bg-stone-900">
            <dt className="text-xs text-stone-500 dark:text-stone-400">{tile.label}</dt>
            <dd className={`mt-1 text-3xl font-black tabular-nums ${COLOR_CLASSES[habit.color].text}`}>
              {tile.value}
              <span className="ml-0.5 text-sm font-bold">{tile.unit}</span>
            </dd>
            {tile.sub && <dd className="mt-0.5 text-xs font-bold text-stone-500 dark:text-stone-400">{tile.sub}</dd>}
          </div>
        ))}
      </dl>
      <StampCalendar habit={habit} today={today} stamps={stamps} pending={pending} claps={counts} myClaps={mine} onClap={toggle} />
      {isOwner && (
        <button onClick={removeMember} disabled={busy} className="w-full py-3 text-sm font-bold text-red-600 disabled:opacity-50">
          このメンバーをルームから外す
        </button>
      )}
    </div>
  );
}
