"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/habits";

export function DisplayNameForm({ initial, submitLabel, redirectTo }: { initial: string; submitLabel: string; redirectTo?: string }) {
  const router = useRouter();
  const [name, setName] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError("");
    const supabase = createClient();
    const { data } = await supabase.auth.getClaims();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim(), onboarded: true })
      .eq("id", data?.claims.sub ?? "");
    if (error) {
      setStatus("idle");
      return setError(errorMessage(error));
    }
    setStatus("saved");
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="display-name" className="block text-sm font-bold text-stone-600 dark:text-stone-300">
        表示名（友達に表示される名前）
      </label>
      <input
        id="display-name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setStatus("idle");
        }}
        maxLength={30}
        className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-base dark:border-stone-700 dark:bg-stone-900"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!name.trim() || status === "saving"}
        className="w-full rounded-2xl bg-orange-500 py-3.5 font-bold text-white disabled:opacity-40"
      >
        {status === "saving" ? "保存中…" : status === "saved" && !redirectTo ? "保存しました" : submitLabel}
      </button>
    </form>
  );
}
