import { cn } from "./cn";
import { initials } from "@/lib/format";

export function Avatar({ name, src, color = "#8B5CF6", size = 36, className }: { name: string; src?: string | null; color?: string; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: Math.max(10, size / 2.6) };
  if (src) return <img src={src} alt="" width={size} height={size} className={cn("shrink-0 rounded-full object-cover", className)} style={style} />;
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", className)} style={{ ...style, background: color }}>
      {initials(name)}
    </span>
  );
}
