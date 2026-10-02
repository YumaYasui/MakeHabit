import { redirect } from "next/navigation";
import { DisplayNameForm } from "@/components/display-name-form";
import { currentUserId } from "@/lib/habits";
import { safeNextPath } from "@/lib/next-path";
import { createClient } from "@/lib/supabase/server";

export default async function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  const next = safeNextPath((await searchParams).next);
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("display_name, onboarded").eq("id", userId).maybeSingle();
  if (!profile) redirect("/login");
  if (profile.onboarded) redirect(next);

  return (
    <div className="flex min-h-[70dvh] flex-col justify-center gap-8">
      <div className="text-center">
        <p className="text-5xl">👋</p>
        <h1 className="mt-4 text-2xl font-black">ようこそ！</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">まずは表示名を決めましょう。あとから変更できます。</p>
      </div>
      <DisplayNameForm initial={profile.display_name} submitLabel="はじめる" redirectTo={next} />
    </div>
  );
}
