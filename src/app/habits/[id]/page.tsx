import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { appToday } from "@/lib/dates";
import { currentUserId, fetchHabit } from "@/lib/habits";
import { createClient } from "@/lib/supabase/server";
import { HabitDetail } from "./habit-detail";

export default async function HabitPage({ params }: PageProps<"/habits/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [habit, userId] = await Promise.all([fetchHabit(supabase, id), currentUserId(supabase)]);
  if (!habit || habit.user_id !== userId) notFound();

  return (
    <>
      <PageHeader title={`${habit.icon} ${habit.name}`} backHref={habit.archived_at ? "/settings" : "/"} />
      <HabitDetail habit={habit} today={appToday()} />
    </>
  );
}
