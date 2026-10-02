import { HabitForm } from "@/components/habit-form";
import { PageHeader } from "@/components/page-header";

export default function NewHabitPage() {
  return (
    <>
      <PageHeader title="習慣を追加" backHref="/" />
      <HabitForm />
    </>
  );
}
