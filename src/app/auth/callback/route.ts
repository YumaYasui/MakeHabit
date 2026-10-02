import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { NEXT_PATH_COOKIE, safeNextPath } from "@/lib/next-path";
import { createClient } from "@/lib/supabase/server";

// Googleログイン後に Supabase から戻ってくる先
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const cookieStore = await cookies();
  const raw = cookieStore.get(NEXT_PATH_COOKIE)?.value;
  const next = safeNextPath(raw ? decodeURIComponent(raw) : null);
  cookieStore.delete(NEXT_PATH_COOKIE);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=1`);
}
