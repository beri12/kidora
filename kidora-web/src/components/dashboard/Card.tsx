import { cn } from "./cn";
import Link from "next/link";
import type { ReactNode } from "react";

export function Card({ className, children, as: Tag = "section", id }: { className?: string; children: ReactNode; as?: "section" | "div" | "article" | "li"; id?: string }) {
  return <Tag id={id} className={cn("rounded-2xl bg-white shadow-card ring-1 ring-black/[0.04]", className)}>{children}</Tag>;
}

export function CardHeader({ title, action, href, sub, className }: { title: ReactNode; action?: string; href?: string; sub?: ReactNode; className?: string }) {
  return (
    <header className={cn("flex items-start justify-between gap-3 px-5 pt-5", className)}>
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      </div>
      {action && (href ? (
        <Link href={href} className="text-xs font-medium text-brand-600 hover:text-brand-700 focus-ring rounded">{action}</Link>
      ) : <span className="text-xs font-medium text-brand-600">{action}</span>)}
    </header>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-5 pb-5 pt-4", className)}>{children}</div>;
}
