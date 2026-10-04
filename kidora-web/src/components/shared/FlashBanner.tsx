"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { takeFlash } from "@/lib/flash";

/** Shows a message left by setFlash() on the page navigated to, then clears it. */
export function FlashBanner() {
  const pathname = usePathname();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const next = takeFlash();
    if (!next) return;
    setMessage(next);
    const t = setTimeout(() => setMessage(null), 7000);
    return () => clearTimeout(t);
  }, [pathname]);

  if (!message) return null;
  return (
    <div role="status" className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-32px)] max-w-[480px] flex items-start gap-3 rounded-2xl border-2 border-grass-500 bg-white px-4 py-3 shadow-card">
      <span aria-hidden className="text-xl leading-6">🎉</span>
      <p className="flex-1 font-display font-extrabold text-brand-900">{message}</p>
      <button type="button" onClick={() => setMessage(null)} aria-label="Dismiss" className="font-display font-extrabold text-brand-400 hover:text-brand-700">✕</button>
    </div>
  );
}
