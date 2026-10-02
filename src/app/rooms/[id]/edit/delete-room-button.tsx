"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePraise } from "@/components/praise-provider";
import { errorMessage } from "@/lib/habits";
import { createClient } from "@/lib/supabase/client";

export function DeleteRoomButton({ roomId, roomName }: { roomId: string; roomName: string }) {
  const router = useRouter();
  const { showError } = usePraise();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm(`「${roomName}」を削除します。メンバー全員のこのルームの習慣はアーカイブになります（記録は残ります）。よろしいですか？`)) return;
    setBusy(true);
    const { error } = await createClient().rpc("delete_room", { p_room_id: roomId });
    setBusy(false);
    if (error) return showError(errorMessage(error));
    router.push("/rooms");
    router.refresh();
  }

  return (
    <button onClick={remove} disabled={busy} className="w-full py-3 text-sm font-bold text-red-600 disabled:opacity-50">
      ルームを削除する
    </button>
  );
}
