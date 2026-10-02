import { notFound } from "next/navigation";
import { HabitForm } from "@/components/habit-form";
import { PageHeader } from "@/components/page-header";
import { appToday } from "@/lib/dates";
import { currentWeekdays, fetchHabit } from "@/lib/habits";
import { createClient } from "@/lib/supabase/server";

export default async function EditHabitPage({ params }: PageProps<"/habits/[id]/edit">) {
  const { id } = await params;
  const habit = await fetchHabit(await createClient(), id);
  if (!habit || habit.archived_at) notFound();

  return (
    <>
      <PageHeader title="習慣を編集" backHref={`/habits/${id}`} />
      <HabitForm
        habitId={habit.id}
        initial={{ name: habit.name, icon: habit.icon, color: habit.color, weekdays: currentWeekdays(habit, appToday()) }}
      />
    </>
  );
}
