import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { COLOR_CLASSES } from "@/lib/habits";
import { fetchMyRooms } from "@/lib/rooms";
import { createClient } from "@/lib/supabase/server";

export default async function RoomsPage() {
  const rooms = await fetchMyRooms(await createClient());

  return (
    <>
      <PageHeader title="ルーム" backHref="/" />
      <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">友達と同じ習慣に取り組めます。曜日はそれぞれ自分で決められます。</p>

      {rooms.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-stone-300 p-8 text-center dark:border-stone-700">
          <p className="text-4xl">👥</p>
          <p className="mt-3 font-bold">まだルームに参加していません</p>
          <p className="mt-1 text-sm text-stone-500">ルームを作って、友達に招待URLを送ろう</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rooms.map((room) => (
            <li key={room.id}>
              <Link href={`/rooms/${room.id}`} className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm dark:bg-stone-900">
                <span className={`flex size-12 shrink-0 items-center justify-center rounded-full text-2xl ${COLOR_CLASSES[room.color].soft}`}>
                  {room.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{room.name}</span>
                  <span className="text-sm text-stone-500">{room.memberCount}人</span>
                </span>
                <span className="text-stone-400">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href="/rooms/new" className="mt-6 block rounded-2xl bg-orange-500 py-4 text-center font-bold text-white shadow-lg active:scale-[0.98]">
        ＋ ルームを作る
      </Link>
      <p className="mt-3 text-center text-xs text-stone-500">ルームの習慣も、ひとり10個までの習慣に数えます。</p>
    </>
  );
}
