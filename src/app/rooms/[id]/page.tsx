import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { appToday } from "@/lib/dates";
import { currentUserId } from "@/lib/habits";
import { fetchRoom } from "@/lib/rooms";
import { createClient } from "@/lib/supabase/server";
import { RoomView } from "./room-view";

export default async function RoomPage({ params }: PageProps<"/rooms/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [data, myId] = await Promise.all([fetchRoom(supabase, id), currentUserId(supabase)]);
  if (!data || !myId) notFound();

  return (
    <>
      <PageHeader title={`${data.room.icon} ${data.room.name}`} backHref="/rooms" />
      <RoomView room={data.room} members={data.members} myId={myId} today={appToday()} />
    </>
  );
}
