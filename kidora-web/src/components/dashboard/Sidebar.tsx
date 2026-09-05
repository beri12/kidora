"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import type { NavConfig } from "@/lib/nav";
import { cn } from "./cn";

export function Brand({ tagline }: { tagline: string }) {
  return (
    <div className="px-6 pb-4 pt-6 text-center">
      <span className="text-[26px] font-extrabold tracking-tight">
        {"KIDORA".split("").map((ch, i) => <span key={i} style={{ color: ["#7C3AED", "#3B82F6", "#F59E0B", "#22C55E", "#EC4899", "#7C3AED"][i] }}>{ch}</span>)}
      </span>
      <p className="mt-0.5 text-[11px] text-muted">{tagline}</p>
    </div>
  );
}

export function NavLinks({ nav, badges, onNavigate }: { nav: NavConfig; badges?: Partial<Record<"notifications" | "messages", number>>; onNavigate?: () => void }) {
  const path = usePathname();
  const Item = ({ label, href, icon: Icon, badgeKey }: NavConfig["items"][number]) => {
    const active = path === href || path.startsWith(href + "/");
    const count = badgeKey ? badges?.[badgeKey] : undefined;
    return (
      <li>
        <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined}
          className={cn("focus-ring group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors",
            active ? "bg-brand-600 font-semibold text-white shadow-sm" : "text-slate-600 hover:bg-brand-50 hover:text-brand-700")}>
          <Icon size={18} className={cn("shrink-0", active ? "text-white" : "text-slate-400 group-hover:text-brand-600")} aria-hidden />
          <span className="flex-1 truncate">{label}</span>
          {count ? <span className="rounded-full bg-danger-500 px-1.5 text-[10px] font-bold leading-4 text-white">{count > 99 ? "99+" : count}</span> : null}
        </Link>
      </li>
    );
  };
  return (
    <nav aria-label="Main" className="flex flex-1 flex-col px-3">
      <ul className="space-y-0.5">{nav.items.map((i) => <Item key={i.href} {...i} />)}</ul>
      <ul className="mt-auto space-y-0.5 pt-4">{nav.footer.map((i) => <Item key={i.href} {...i} />)}</ul>
    </nav>
  );
}

export function Sidebar({ nav, badges, promo, open, onClose }: { nav: NavConfig; badges?: Partial<Record<"notifications" | "messages", number>>; promo?: ReactNode; open: boolean; onClose: () => void }) {
  const body = (
    <>
      <Brand tagline={nav.tagline} />
      <NavLinks nav={nav} badges={badges} onNavigate={onClose} />
      {promo && <div className="px-4 pb-4 pt-4">{promo}</div>}
    </>
  );
  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col overflow-y-auto border-r border-slate-100 bg-white lg:flex">{body}</aside>
      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-40 lg:hidden", open ? "" : "pointer-events-none")} aria-hidden={!open}>
        <div className={cn("absolute inset-0 bg-ink/30 transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
        <aside role="dialog" aria-modal="true" aria-label="Menu"
          className={cn("absolute inset-y-0 left-0 flex w-[260px] flex-col overflow-y-auto bg-white shadow-xl transition-transform duration-200 motion-reduce:transition-none", open ? "translate-x-0" : "-translate-x-full")}>
          <button type="button" onClick={onClose} className="btn-icon absolute right-3 top-3" aria-label="Close menu"><X size={18} /></button>
          {body}
        </aside>
      </div>
    </>
  );
}

/** Mobile bottom navigation: first 4 items + "More" opens the drawer. */
export function BottomNav({ nav, onMore }: { nav: NavConfig; onMore: () => void }) {
  const path = usePathname();
  const items = nav.items.slice(0, 4);
  return (
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {items.map(({ label, href, icon: Icon }) => {
        const active = path.startsWith(href);
        return (
          <Link key={href} href={href} className={cn("flex flex-col items-center gap-0.5 py-2 text-[10px]", active ? "text-brand-600" : "text-slate-500")} aria-current={active ? "page" : undefined}>
            <Icon size={20} aria-hidden /><span>{label.split(" ")[0]}</span>
          </Link>
        );
      })}
      <button type="button" onClick={onMore} className="flex flex-col items-center gap-0.5 py-2 text-[10px] text-slate-500">
        <span className="grid h-5 w-5 place-items-center text-base leading-none" aria-hidden>⋯</span><span>More</span>
      </button>
    </nav>
  );
}
