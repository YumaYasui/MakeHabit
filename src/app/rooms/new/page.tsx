import { HabitForm } from "@/components/habit-form";
import { PageHeader } from "@/components/page-header";

export default function NewRoomPage() {
  return (
    <>
      <PageHeader title="ルームを作る" backHref="/rooms" />
      <HabitForm kind={{ type: "room" }} />
    </>
  );
}
