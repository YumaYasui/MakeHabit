import { LoginButton } from "./login-button";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-[80dvh] flex-col justify-center gap-10">
      <div className="text-center">
        <div className="mx-auto mb-5 flex size-24 -rotate-12 items-center justify-center rounded-full border-[6px] border-orange-500 text-5xl">
          ✓
        </div>
        <h1 className="text-3xl font-black">MakeHabit</h1>
        <p className="mt-3 text-stone-600 dark:text-stone-400">
          やったらスタンプ。
          <br />
          続けた日が目に見える習慣化アプリ
        </p>
      </div>
      {error && <p className="text-center text-sm text-red-600">ログインできませんでした。もう一度お試しください。</p>}
      <LoginButton />
    </div>
  );
}
