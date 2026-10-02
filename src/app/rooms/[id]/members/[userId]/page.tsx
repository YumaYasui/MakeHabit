import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { appToday } from "@/lib/dates";
import { currentUserId } from "@/lib/habits";
import { fetchRoom } from "@/lib/rooms";
import { createClient } from "@/lib/supabase/server";
import { MemberDetail } from "./member-detail";

export default async function MemberPage({ params }: PageProps<"/rooms/[id]/members/[userId]">) {
  const { id, userId } = await params;
  const supabase = await createClient();
  const [data, myId] = await Promise.all([fetchRoom(supabase, id), currentUserId(supabase)]);
  const member = data?.members.find((m) => m.user_id === userId);
  if (!data || !myId || !member) notFound();
  if (userId === myId) redirect(`/habits/${member.habit.id}`);

  return (
    <>
      <PageHeader title={`${member.display_name}さん`} backHref={`/rooms/${id}`} />
      <MemberDetail member={member} roomId={id} myId={myId} isOwner={data.room.owner_id === myId} today={appToday()} />
    </>
  );
}
