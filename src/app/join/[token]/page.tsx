import Link from "next/link";
import { redirect } from "next/navigation";
import { COLOR_CLASSES, currentUserId, MAX_HABITS, type HabitColor } from "@/lib/habits";
import { MAX_ROOM_MEMBERS } from "@/lib/rooms";
import { createClient } from "@/lib/supabase/server";
import { JoinForm } from "./join-form";

type Invite = {
  room_id: string | null;
  name: string | null;
  icon: string | null;
  color: HabitColor | null;
  owner_name: string | null;
  member_count: number;
  status: "ok" | "member" | "full" | "removed" | "not_found";
};

function Message({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-5xl">{emoji}</p>
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-sm text-stone-600 dark:text-stone-400">{body}</p>
      <Link href="/" className="mt-4 rounded-2xl bg-white px-6 py-3 font-bold shadow-sm dark:bg-stone-900">
        ホームへ
      </Link>
    </div>
  );
}

export default async function JoinPage({ params }: PageProps<"/join/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) redirect(`/login?next=/join/${token}`);

  const { data: profile } = await supabase.from("profiles").select("onboarded").eq("id", userId).maybeSingle();
  if (!profile?.onboarded) redirect(`/welcome?next=/join/${token}`);

  const { data } = await supabase.rpc("get_invite", { p_token: token }).single<Invite>();
  const invite = data ?? ({ status: "not_found" } as Invite);

  if (invite.status === "member") redirect(`/rooms/${invite.room_id}`);
  if (invite.status === "not_found")
    return <Message emoji="🔗" title="この招待URLは使えません" body="URLが古くなっているかもしれません。オーナーに新しいURLをもらってください。" />;
  if (invite.status === "removed") return <Message emoji="🚪" title="このルームには参加できません" body="オーナーに外されたルームには参加できません。" />;
  if (invite.status === "full")
    return <Message emoji="🈵" title="このルームは満員です" body={`1つのルームに参加できるのは${MAX_ROOM_MEMBERS}人までです。`} />;

  const { count } = await supabase
    .from("habits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("archived_at", null);
  const color = invite.color!;

  return (
    <div className="space-y-8 pt-6">
      <div className="text-center">
        <p className="text-sm font-bold text-stone-500">{invite.owner_name}さんからの招待</p>
        <div className={`mx-auto mt-4 flex size-24 items-center justify-center rounded-full text-5xl ${COLOR_CLASSES[color].soft}`}>{invite.icon}</div>
        <h1 className="mt-4 text-2xl font-black">{invite.name}</h1>
        <p className="mt-1 text-sm text-stone-500">いま{invite.member_count}人が参加中</p>
      </div>
      {(count ?? 0) >= MAX_HABITS ? (
        <p className="rounded-2xl bg-stone-200 p-4 text-sm dark:bg-stone-800">
          習慣が{MAX_HABITS}個あるため参加できません。どれかをアーカイブしてから、もう一度このURLを開いてください。
        </p>
      ) : (
        <JoinForm token={token} color={color} />
      )}
    </div>
  );
}
