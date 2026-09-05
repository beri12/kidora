export const fmtNumber = (n: number) => new Intl.NumberFormat().format(n);
export const fmtPercent = (n: number) => `${Math.round(n)}%`;

export function fmtKpi(value: number, unit?: string) {
  switch (unit) {
    case "percent": return fmtPercent(value);
    case "days": return `${value} ${value === 1 ? "Day" : "Days"}`;
    default: return fmtNumber(value);
  }
}

export function fmtDate(iso?: string | null, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, opts);
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  return fmtDate(iso);
}

/** "Due Tomorrow", "Due May 22", "Overdue" */
export function dueLabel(iso?: string | null) {
  if (!iso) return { text: "No due date", tone: "neutral" as const };
  const due = new Date(iso); const now = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(due) - startOf(now)) / 86_400_000);
  if (diffDays < 0) return { text: "Overdue", tone: "danger" as const };
  if (diffDays === 0) return { text: "Due Today", tone: "danger" as const };
  if (diffDays === 1) return { text: "Due Tomorrow", tone: "warning" as const };
  return { text: `Due ${fmtDate(iso)}`, tone: "info" as const };
}

export function fmtMinutes(min: number) {
  const h = Math.floor(min / 60); const m = min % 60;
  return h ? `${h}h ${m}m` : `${m} min`;
}

export function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  const u = ["KB", "MB", "GB", "TB"]; let i = -1; let v = b;
  do { v /= 1024; i++; } while (v >= 1024 && i < u.length - 1);
  return `${v.toFixed(1)} ${u[i]}`;
}

export const initials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
