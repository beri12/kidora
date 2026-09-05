import { cn } from "./cn";

export function ProgressBar({ value, color, className, size = "md", label }: { value: number; color?: string; className?: string; size?: "sm" | "md" | "lg"; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const h = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";
  const bg = color ?? (v >= 80 ? "#22C55E" : v >= 60 ? "#7C3AED" : v >= 40 ? "#F59E0B" : "#EF4444");
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-slate-100", h, className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${v}%`, background: bg }} />
    </div>
  );
}
