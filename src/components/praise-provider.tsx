"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Praise } from "@/lib/praise";

type Toast = { id: number; message: string; tone: "praise" | "error" };

const PraiseContext = createContext<{
  showPraise: (praise: Praise) => void;
  showError: (message: string) => void;
} | null>(null);

export function usePraise() {
  const ctx = useContext(PraiseContext);
  if (!ctx) throw new Error("usePraise must be used inside PraiseProvider");
  return ctx;
}

async function fireConfetti() {
  const confetti = (await import("canvas-confetti")).default;
  const opts = { particleCount: 80, spread: 70, startVelocity: 45, disableForReducedMotion: true };
  confetti({ ...opts, angle: 60, origin: { x: 0, y: 0.8 } });
  confetti({ ...opts, angle: 120, origin: { x: 1, y: 0.8 } });
}

export function PraiseProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((message: string, tone: Toast["tone"], durationMs: number) => {
    clearTimeout(timer.current);
    setToast({ id: Date.now(), message, tone });
    timer.current = setTimeout(() => setToast(null), durationMs);
  }, []);

  const showPraise = useCallback(
    (praise: Praise) => {
      show(praise.message, "praise", praise.celebrate ? 4000 : 2200);
      if (praise.celebrate) void fireConfetti();
    },
    [show],
  );
  const showError = useCallback((message: string) => show(message, "error", 4000), [show]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <PraiseContext.Provider value={{ showPraise, showError }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        {toast && (
          <div
            key={toast.id}
            className={`animate-toast-in max-w-sm rounded-2xl px-5 py-3 text-center font-bold shadow-lg ${
              toast.tone === "praise"
                ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900"
                : "bg-red-600 text-white"
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </PraiseContext.Provider>
  );
}
