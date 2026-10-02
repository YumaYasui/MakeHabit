import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { appToday } from "@/lib/dates";
import { fetchHabit } from "@/lib/habits";
import { createClient } from "@/lib/supabase/server";
import { HabitDetail } from "./habit-detail";

export default async function HabitPage({ params }: PageProps<"/habits/[id]">) {
  const { id } = await params;
  const habit = await fetchHabit(await createClient(), id);
  if (!habit) notFound();

  return (
    <>
      <PageHeader title={`${habit.icon} ${habit.name}`} backHref={habit.archived_at ? "/settings" : "/"} />
      <HabitDetail habit={habit} today={appToday()} />
    </>
  );
}
