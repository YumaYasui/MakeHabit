import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { appToday } from "@/lib/dates";
import { fetchHabits, MAX_HABITS } from "@/lib/habits";
import { createClient } from "@/lib/supabase/server";
import { HabitCard } from "./habit-card";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("display_name, onboarded").maybeSingle();
  if (!profile) redirect("/login");
  if (!profile.onboarded) redirect("/welcome");

  const habits = await fetchHabits(supabase, { archived: false });
  const today = appToday();
  const canAdd = habits.length < MAX_HABITS;

  return (
    <>
      <PageHeader
        title={`${profile.display_name}さんの習慣`}
        right={
          <Link href="/settings" aria-label="設定" className="flex size-11 items-center justify-center rounded-full text-xl hover:bg-stone-200 dark:hover:bg-stone-800">
            ⚙️
          </Link>
        }
      />

      {habits.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-stone-300 p-8 text-center dark:border-stone-700">
          <p className="text-4xl">🌱</p>
          <p className="mt-3 font-bold">まずは習慣をひとつ決めよう</p>
          <p className="mt-1 text-sm text-stone-500">小さなことからで大丈夫！</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {habits.map((habit) => (
            <HabitCard key={habit.id} habit={habit} today={today} />
          ))}
        </ul>
      )}

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-stone-50 via-stone-50 to-transparent px-4 pt-6 pb-[max(env(safe-area-inset-bottom),1rem)] dark:from-stone-950 dark:via-stone-950">
        <div className="mx-auto max-w-md">
          {canAdd ? (
            <Link href="/habits/new" className="block rounded-2xl bg-orange-500 py-4 text-center font-bold text-white shadow-lg active:scale-[0.98]">
              ＋ 習慣を追加
            </Link>
          ) : (
            <p className="rounded-2xl bg-stone-200 py-4 text-center text-sm text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              習慣は{MAX_HABITS}個までです
            </p>
          )}
        </div>
      </div>
    </>
  );
}
