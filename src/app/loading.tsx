/** ページを読み込んでいる間に出す表示（タップしてすぐ反応が返るように） */
export default function Loading() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4" aria-label="読み込み中">
      <div className="size-14 animate-spin rounded-full border-[5px] border-orange-200 border-t-orange-500 dark:border-stone-800 dark:border-t-orange-500" />
      <p className="text-sm text-stone-500">読み込み中…</p>
    </div>
  );
}
