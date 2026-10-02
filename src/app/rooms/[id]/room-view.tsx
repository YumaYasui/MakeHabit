"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Room, RoomMember } from "@/lib/rooms";
import { HabitCard } from "../../habit-card";
import { InviteCard } from "./invite-card";
import { LeaveButton } from "./leave-button";
import { MemberRow } from "./member-row";
import { RoomCalendar } from "./room-calendar";

export function RoomView({ room, members, myId, today }: { room: Room; members: RoomMember[]; myId: string; today: string }) {
  const router = useRouter();
  const me = members.find((m) => m.user_id === myId);
  const isOwner = room.owner_id === myId;

  return (
    <div className="space-y-5">
      {me && (
        <ul>
          <HabitCard habit={me.habit} today={today} onSaved={() => router.refresh()} />
        </ul>
      )}

      <section>
        <h2 className="mb-2 text-sm font-bold text-stone-600 dark:text-stone-300">今日のみんな（{members.length}人）</h2>
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-3xl bg-white shadow-sm dark:divide-stone-800 dark:bg-stone-900">
          {members.map((m) => (
            <MemberRow key={m.user_id} member={m} roomId={room.id} myId={myId} ownerId={room.owner_id} today={today} />
          ))}
        </ul>
      </section>

      <RoomCalendar habits={members.map((m) => m.habit)} today={today} color={room.color} />

      {isOwner && <InviteCard roomId={room.id} roomName={room.name} token={room.invite_token} />}

      <div className="space-y-2 pt-2">
        {isOwner && (
          <Link href={`/rooms/${room.id}/edit`} className="block rounded-2xl bg-white py-3.5 text-center font-bold shadow-sm dark:bg-stone-900">
            ルームの設定
          </Link>
        )}
        <LeaveButton roomId={room.id} isOwner={isOwner} otherMembers={members.filter((m) => m.user_id !== myId)} />
      </div>
    </div>
  );
}
