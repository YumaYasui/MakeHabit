import type { Metadata, Viewport } from "next";
import { PraiseProvider } from "@/components/praise-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "MakeHabit",
  description: "やったらスタンプ。続けた日が見える習慣化アプリ",
  appleWebApp: { capable: true, title: "MakeHabit", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        <PraiseProvider>
          <main className="mx-auto w-full max-w-md px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-28">
            {children}
          </main>
        </PraiseProvider>
      </body>
    </html>
  );
}
