"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={logout} className="w-full rounded-2xl bg-white py-3.5 font-bold shadow-sm dark:bg-stone-900">
      ログアウト
    </button>
  );
}
