"use client";
import { useState, type ReactNode } from "react";
import type { NavConfig } from "@/lib/nav";
import { Sidebar, BottomNav } from "./Sidebar";

/**
 * Shared shell for all four role dashboards.
 * Desktop: fixed sidebar + fluid grid. Tablet/mobile: drawer + bottom nav.
 * `header` receives an `onMenu` callback so each page can render TopHeader.
 */
export function DashboardLayout({ nav, badges, promo, children, header }: {
  nav: NavConfig; badges?: Partial<Record<"notifications" | "messages", number>>; promo?: ReactNode;
  children: ReactNode; header?: (ctx: { onMenu: () => void }) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-surface text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <Sidebar nav={nav} badges={badges} promo={promo} open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-24 pt-5 sm:px-6 lg:px-7 lg:pb-8">
          {header?.({ onMenu: () => setOpen(true) })}
          {children}
        </main>
      </div>
      <BottomNav nav={nav} onMore={() => setOpen(true)} />
    </div>
  );
}
