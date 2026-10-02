import type { SupabaseClient } from "@supabase/supabase-js";
import { HABIT_COLUMNS, type Habit, type HabitColor } from "./habits";

export const MAX_ROOM_MEMBERS = 10;

export type Room = {
  id: string;
  name: string;
  icon: string;
  color: HabitColor;
  owner_id: string;
  invite_token: string;
};

export type RoomMember = {
  user_id: string;
  joined_at: string;
  display_name: string;
  habit: Habit;
};

/** ルームと、参加中のメンバー（参加日順）とその習慣。参加していなければ null */
export async function fetchRoom(supabase: SupabaseClient, roomId: string) {
  const { data: room, error } = await supabase
    .from("rooms")
    .select("id, name, icon, color, owner_id, invite_token")
    .eq("id", roomId)
    .maybeSingle<Room>();
  if (error?.code === "22P02") return null;
  if (error) throw error;
  if (!room) return null;

  const { data: memberRows, error: membersError } = await supabase
    .from("room_members")
    .select("user_id, joined_at, habit_id")
    .eq("room_id", roomId)
    .order("joined_at");
  if (membersError) throw membersError;

  const [profiles, habits] = await Promise.all([
    supabase.from("profiles").select("id, display_name").in("id", memberRows.map((m) => m.user_id)),
    supabase.from("habits").select(HABIT_COLUMNS).in("id", memberRows.map((m) => m.habit_id)),
  ]);
  if (profiles.error) throw profiles.error;
  if (habits.error) throw habits.error;

  const names = new Map(profiles.data.map((p) => [p.id as string, p.display_name as string]));
  const habitById = new Map((habits.data as Habit[]).map((h) => [h.id, h]));
  const members: RoomMember[] = memberRows.flatMap((m) => {
    const habit = habitById.get(m.habit_id);
    return habit ? [{ user_id: m.user_id, joined_at: m.joined_at, display_name: names.get(m.user_id) ?? "？", habit }] : [];
  });

  return { room, members };
}

export async function fetchMyRooms(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("rooms")
    .select("id, name, icon, color, owner_id, room_members(count)")
    .order("created_at");
  if (error) throw error;
  return data.map((r) => ({
    ...(r as unknown as Omit<Room, "invite_token">),
    memberCount: (r.room_members as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}
