"use client";

import { useState, useSyncExternalStore } from "react";
import { usePraise } from "@/components/praise-provider";
import { errorMessage } from "@/lib/habits";
import { createClient } from "@/lib/supabase/client";

const noopSubscribe = () => () => {};

export function InviteCard({ roomId, roomName, token: initialToken }: { roomId: string; roomName: string; token: string }) {
  const { showError, showPraise } = usePraise();
  const [token, setToken] = useState(initialToken);
  const [busy, setBusy] = useState(false);
  // サーバーではドメインが分からないので、ブラウザで表示されてから付ける
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
  const url = `${origin}/join/${token}`;

  async function share() {
    const text = `習慣化アプリ MakeHabit で「${roomName}」に一緒に取り組もう！`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "MakeHabit", text, url });
      } catch {
        // 共有をキャンセルした
      }
      return;
    }
    await copy();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      showPraise({ message: "招待URLをコピーしました", celebrate: false });
    } catch {
      showError("コピーできませんでした。URLを長押ししてコピーしてください。");
    }
  }

  async function regenerate() {
    if (!window.confirm("招待URLを作り直します。今までのURLは使えなくなります。よろしいですか？")) return;
    setBusy(true);
    const { data, error } = await createClient().rpc("regenerate_invite", { p_room_id: roomId });
    setBusy(false);
    if (error) return showError(errorMessage(error));
    setToken(data as string);
    showPraise({ message: "新しい招待URLを作りました", celebrate: false });
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm dark:bg-stone-900">
      <h2 className="font-bold">友達を招待する</h2>
      <p className="mt-1 text-xs text-stone-500">このURLを開いてログインすると、ルームに参加できます。</p>
      <p className="mt-3 rounded-xl bg-stone-100 px-3 py-2.5 text-xs break-all select-all dark:bg-stone-800">
        {url}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={share} className="rounded-2xl bg-orange-500 py-3 font-bold text-white">
          URLを送る
        </button>
        <button onClick={copy} className="rounded-2xl bg-stone-100 py-3 font-bold dark:bg-stone-800">
          コピー
        </button>
      </div>
      <button onClick={regenerate} disabled={busy} className="mt-2 w-full py-2 text-xs text-stone-500 underline disabled:opacity-50">
        URLを作り直す（今のURLを使えなくする）
      </button>
    </section>
  );
}
