import Link from "next/link";

export function PageHeader({ title, backHref, right }: { title: string; backHref?: string; right?: React.ReactNode }) {
  return (
    <header className="mb-5 flex min-h-11 items-center gap-2">
      {backHref && (
        <Link href={backHref} aria-label="戻る" className="-ml-2 flex size-11 items-center justify-center rounded-full text-2xl hover:bg-stone-200 dark:hover:bg-stone-800">
          ‹
        </Link>
      )}
      <h1 className="flex-1 truncate text-xl font-bold">{title}</h1>
      {right}
    </header>
  );
}
