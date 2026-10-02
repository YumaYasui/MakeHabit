"use client";

import { useState } from "react";
import { errorMessage, type Habit } from "@/lib/habits";
import { createClient } from "@/lib/supabase/client";
import { usePraise } from "./praise-provider";

type Clap = { stampId: string; userIds: ReadonlySet<string> };

/** ルームの仲間のスタンプに送る👏。送る・取り消すを画面に即反映してから保存する */
export function useClaps(habit: Habit, myId: string) {
  const { showError } = usePraise();
  const [claps, setClaps] = useState(
    () => new Map<string, Clap>(habit.stamps.map((s) => [s.date, { stampId: s.id, userIds: new Set(s.reactions.map((r) => r.user_id)) }])),
  );
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());

  const counts = new Map([...claps].filter(([, c]) => c.userIds.size > 0).map(([date, c]) => [date, c.userIds.size]));
  const mine = new Set([...claps].filter(([, c]) => c.userIds.has(myId)).map(([date]) => date));

  function update(date: string, add: boolean) {
    setClaps((cur) => {
      const clap = cur.get(date);
      if (!clap) return cur;
      const userIds = new Set(clap.userIds);
      if (add) userIds.add(myId);
      else userIds.delete(myId);
      return new Map(cur).set(date, { ...clap, userIds });
    });
  }

  async function toggle(date: string) {
    const clap = claps.get(date);
    if (!clap || pending.has(date) || habit.user_id === myId) return;
    const adding = !clap.userIds.has(myId);
    update(date, adding);
    setPending((p) => new Set(p).add(date));

    const supabase = createClient();
    const { error } = adding
      ? await supabase.from("reactions").insert({ stamp_id: clap.stampId })
      : await supabase.from("reactions").delete().eq("stamp_id", clap.stampId).eq("user_id", myId);

    setPending((p) => {
      const rest = new Set(p);
      rest.delete(date);
      return rest;
    });
    if (error) {
      update(date, !adding);
      showError(errorMessage(error));
    }
  }

  return { counts, mine, toggle, pending };
}
