import { notFound } from "next/navigation";
import { HabitForm } from "@/components/habit-form";
import { PageHeader } from "@/components/page-header";
import { appToday } from "@/lib/dates";
import { currentUserId, currentWeekdays, fetchHabit } from "@/lib/habits";
import { createClient } from "@/lib/supabase/server";

export default async function EditHabitPage({ params }: PageProps<"/habits/[id]/edit">) {
  const { id } = await params;
  const supabase = await createClient();
  const [habit, userId] = await Promise.all([fetchHabit(supabase, id), currentUserId(supabase)]);
  if (!habit || habit.user_id !== userId || habit.archived_at) notFound();

  const isRoom = habit.room_id !== null;
  return (
    <>
      <PageHeader title={isRoom ? "自分の曜日を変更" : "習慣を編集"} backHref={`/habits/${id}`} />
      {isRoom && (
        <p className="mb-5 text-sm text-stone-500">
          {habit.icon} {habit.name}（ルームの習慣）の、自分がやる曜日を変更します。
        </p>
      )}
      <HabitForm
        kind={isRoom ? { type: "room-habit", habitId: habit.id } : { type: "habit", habitId: habit.id }}
        initial={{ name: habit.name, icon: habit.icon, color: habit.color, weekdays: currentWeekdays(habit, appToday()) }}
      />
    </>
  );
}
