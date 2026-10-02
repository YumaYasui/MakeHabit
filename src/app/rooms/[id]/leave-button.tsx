"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePraise } from "@/components/praise-provider";
import { errorMessage } from "@/lib/habits";
import type { RoomMember } from "@/lib/rooms";
import { createClient } from "@/lib/supabase/client";

/** 退出。オーナーは次のオーナーを選ぶ（初期値は参加日が一番古いメンバー） */
export function LeaveButton({ roomId, isOwner, otherMembers }: { roomId: string; isOwner: boolean; otherMembers: RoomMember[] }) {
  const router = useRouter();
  const { showError } = usePraise();
  const [open, setOpen] = useState(false);
  const [newOwner, setNewOwner] = useState(otherMembers[0]?.user_id ?? "");
  const [busy, setBusy] = useState(false);
  const deletesRoom = isOwner && otherMembers.length === 0;

  async function leave() {
    setBusy(true);
    const { error } = await createClient().rpc("leave_room", { p_room_id: roomId, p_new_owner: isOwner && !deletesRoom ? newOwner : null });
    setBusy(false);
    if (error) return showError(errorMessage(error));
    router.push("/rooms");
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full py-3 text-sm font-bold text-red-600">
        ルームから抜ける
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-3xl border-2 border-red-200 bg-white p-4 dark:border-red-900 dark:bg-stone-900">
      <p className="text-sm">
        {deletesRoom
          ? "ほかにメンバーがいないため、抜けるとルームは削除されます。"
          : "抜けると、このルームの習慣はアーカイブになります（記録は残ります）。招待URLから再参加できます。"}
      </p>
      {isOwner && !deletesRoom && (
        <label className="block">
          <span className="mb-1 block text-sm font-bold">次のオーナー</span>
          <select
            value={newOwner}
            onChange={(e) => setNewOwner(e.target.value)}
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-base dark:border-stone-700 dark:bg-stone-900"
          >
            {otherMembers.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.display_name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setOpen(false)} className="rounded-2xl bg-stone-100 py-3 font-bold dark:bg-stone-800">
          やめる
        </button>
        <button onClick={leave} disabled={busy} className="rounded-2xl bg-red-600 py-3 font-bold text-white disabled:opacity-50">
          {deletesRoom ? "削除して抜ける" : "抜ける"}
        </button>
      </div>
    </div>
  );
}
