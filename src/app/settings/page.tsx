import Link from "next/link";
import { redirect } from "next/navigation";
import { DisplayNameForm } from "@/components/display-name-form";
import { PageHeader } from "@/components/page-header";
import { currentUserId, fetchHabits } from "@/lib/habits";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export default async function SettingsPage() {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();
  if (!profile) redirect("/login");
  const archived = await fetchHabits(supabase, userId, { archived: true });

  return (
    <>
      <PageHeader title="設定" backHref="/" />
      <div className="space-y-8">
        <section className="rounded-3xl bg-white p-4 shadow-sm dark:bg-stone-900">
          <DisplayNameForm initial={profile.display_name} submitLabel="保存する" />
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-stone-600 dark:text-stone-300">アーカイブした習慣</h2>
          {archived.length === 0 ? (
            <p className="text-sm text-stone-500">ありません</p>
          ) : (
            <ul className="divide-y divide-stone-200 overflow-hidden rounded-3xl bg-white shadow-sm dark:divide-stone-800 dark:bg-stone-900">
              {archived.map((habit) => (
                <li key={habit.id}>
                  <Link href={`/habits/${habit.id}`} className="flex items-center gap-2 px-4 py-3.5">
                    <span>{habit.icon}</span>
                    <span className="flex-1 truncate">{habit.name}</span>
                    {habit.room_id && <span className="text-xs text-stone-500">ルーム</span>}
                    <span className="text-stone-400">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <LogoutButton />
      </div>
    </>
  );
}
