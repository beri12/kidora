import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "./Card";
import { fmtKpi } from "@/lib/format";
import type { Kpi } from "@/types/lms";
import Link from "next/link";
import { cn } from "./cn";

const Sparkline = ({ values, color }: { values: number[]; color: string }) => {
  if (values.length < 2) return null;
  const max = Math.max(...values), min = Math.min(...values), r = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / r) * 24}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-3 h-8 w-full" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

export function StatCard({ label, kpi, icon: Icon, color = "#7C3AED", href, hrefLabel, caption, className }: {
  label: string; kpi: Kpi; icon: LucideIcon; color?: string; href?: string; hrefLabel?: string; caption?: string; className?: string;
}) {
  const t = kpi.trend;
  const up = t ? t.delta >= 0 : true;
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white" style={{ background: color }} aria-hidden><Icon size={22} /></div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted">{label}</p>
          <p className="mt-0.5 text-2xl font-bold leading-tight text-ink">{fmtKpi(kpi.value, kpi.unit)}</p>
          {t ? (
            <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium", up ? "text-success-600" : "text-danger-600")}>
              {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {t.delta > 0 ? "+" : ""}{kpi.unit === "percent" ? `${t.delta}%` : t.delta} {t.label}
            </p>
          ) : (caption ?? kpi.caption) ? (
            <p className="mt-1 text-xs text-muted">{caption ?? kpi.caption}</p>
          ) : href ? (
            <Link href={href} className="mt-1 inline-block text-xs font-medium text-brand-600 focus-ring rounded">{hrefLabel ?? "View all"}</Link>
          ) : null}
        </div>
      </div>
      {t?.series && <Sparkline values={t.series} color={color} />}
    </Card>
  );
}
