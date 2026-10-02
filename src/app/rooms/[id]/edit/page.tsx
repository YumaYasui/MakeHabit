import { notFound } from "next/navigation";
import { HabitForm } from "@/components/habit-form";
import { PageHeader } from "@/components/page-header";
import { currentUserId } from "@/lib/habits";
import { fetchRoom } from "@/lib/rooms";
import { createClient } from "@/lib/supabase/server";
import { DeleteRoomButton } from "./delete-room-button";

export default async function EditRoomPage({ params }: PageProps<"/rooms/[id]/edit">) {
  const { id } = await params;
  const supabase = await createClient();
  const [data, myId] = await Promise.all([fetchRoom(supabase, id), currentUserId(supabase)]);
  if (!data || data.room.owner_id !== myId) notFound();
  const { room } = data;

  return (
    <>
      <PageHeader title="ルームの設定" backHref={`/rooms/${id}`} />
      <p className="mb-5 text-sm text-stone-500">変更はメンバー全員の習慣に反映されます。</p>
      <HabitForm
        kind={{ type: "room-settings", roomId: room.id }}
        initial={{ name: room.name, icon: room.icon, color: room.color, weekdays: [] }}
      />
      <div className="mt-10 border-t border-stone-200 pt-4 dark:border-stone-800">
        <DeleteRoomButton roomId={room.id} roomName={room.name} />
      </div>
    </>
  );
}
