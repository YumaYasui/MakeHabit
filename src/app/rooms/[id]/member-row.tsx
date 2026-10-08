"use client";

import Link from "next/link";
import { useClaps } from "@/components/use-claps";
import { formatWeekdays } from "@/lib/dates";
import { computeStats, countsByDate } from "@/lib/habit-stats";
import { currentWeekdays } from "@/lib/habits";
import { todayStatus } from "@/lib/room-stats";
import type { RoomMember } from "@/lib/rooms";

export function MemberRow({ member, roomId, myId, ownerId, today }: { member: RoomMember; roomId: string; myId: string; ownerId: string; today: string }) {
  const { habit } = member;
  const { counts, mine, toggle, pending } = useClaps(habit, myId);
  const stats = computeStats(habit.start_date, habit.habit_schedules, countsByDate(habit.stamps), today);
  const todayCount = habit.stamps.find((s) => s.date === today)?.count ?? 0;
  const status = todayStatus(habit, today);
  const isMe = member.user_id === myId;
  const clapCount = counts.get(today) ?? 0;

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Link href={isMe ? `/habits/${habit.id}` : `/rooms/${roomId}/members/${member.user_id}`} className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-bold">
          <span className="truncate">{member.display_name}</span>
          {isMe && <span className="shrink-0 text-xs font-normal text-stone-500">（あなた）</span>}
          {member.user_id === ownerId && <span className="shrink-0 rounded-full bg-amber-100 px-1.5 text-[10px] text-amber-800 dark:bg-amber-900 dark:text-amber-100">オーナー</span>}
        </p>
        <p className="mt-0.5 text-xs text-stone-500">
          {formatWeekdays(currentWeekdays(habit, today))} ・ 🔥{stats.currentStreak}回連続 ・ 累計{stats.total}日（{stats.totalTimes}回）
        </p>
      </Link>
      {status === "done" && !isMe ? (
        <button
          onClick={() => toggle(today)}
          disabled={pending.has(today)}
          aria-pressed={mine.has(today)}
          aria-label={`${member.display_name}さんに👏を${mine.has(today) ? "送るのをやめる" : "送る"}`}
          className={`flex items-center gap-1 rounded-full px-3 py-2 text-sm font-bold active:scale-95 ${
            mine.has(today) ? "bg-amber-300 text-stone-900" : "bg-stone-100 dark:bg-stone-800"
          }`}
        >
          ✅{todayCount >= 2 && `×${todayCount}`} 👏{clapCount > 0 && clapCount}
        </button>
      ) : (
        <span
          className={`rounded-full px-3 py-2 text-sm font-bold ${
            status === "done" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-stone-100 text-stone-500 dark:bg-stone-800"
          }`}
        >
          {status === "done" ? `✅${todayCount >= 2 ? `×${todayCount}` : ""}${clapCount > 0 ? ` 👏${clapCount}` : ""}` : status === "todo" ? "⬜ まだ" : "お休み"}
        </span>
      )}
    </li>
  );
}
