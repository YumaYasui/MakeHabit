/** ログイン後などに戻る先。外部サイトへ飛ばされないよう、アプリ内のパスだけ許す */
export function safeNextPath(next: string | string[] | undefined | null): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}

/** ログイン後に戻るパスを入れる cookie */
export const NEXT_PATH_COOKIE = "mh_next";
