"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { Bell, Menu, ChevronDown } from "lucide-react";
import { Avatar } from "./Avatar";
import { cn } from "./cn";

export function TopHeader({ onMenu, title, sub, right, user, notifications, notificationsHref, className }: {
  onMenu: () => void; title: ReactNode; sub?: ReactNode; right?: ReactNode;
  user?: { name: string; avatarUrl?: string | null; avatarColor?: string; href?: string };
  notifications?: number; notificationsHref?: string; className?: string;
}) {
  return (
    <header className={cn("mb-5 flex items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 items-start gap-3">
        <button type="button" onClick={onMenu} className="btn-icon mt-0.5 lg:hidden" aria-label="Open menu"><Menu size={20} /></button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
          {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {right}
        {notifications !== undefined && (
          <Link href={notificationsHref ?? "#"} className="btn-icon relative bg-white shadow-card ring-1 ring-black/[0.04]" aria-label={`${notifications} unread notifications`}>
            <Bell size={18} />
            {notifications > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">{notifications}</span>}
          </Link>
        )}
        {user && (
          <Link href={user.href ?? "#"} className="focus-ring flex items-center gap-2 rounded-2xl bg-white py-1.5 pl-1.5 pr-3 shadow-card ring-1 ring-black/[0.04]">
            <Avatar name={user.name} src={user.avatarUrl} color={user.avatarColor} size={32} />
            <span className="hidden text-sm font-medium text-ink sm:block">{user.name}</span>
            <ChevronDown size={14} className="hidden text-muted sm:block" aria-hidden />
          </Link>
        )}
      </div>
    </header>
  );
}
