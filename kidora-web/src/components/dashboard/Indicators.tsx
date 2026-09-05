import { Star, Coins, Flame } from "lucide-react";
import { fmtNumber } from "@/lib/format";
import { cn } from "./cn";

function Chip({ icon, value, label, tint, className }: { icon: React.ReactNode; value: string; label: string; tint: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2 shadow-card ring-1 ring-black/[0.04]", className)}>
      <span className={cn("grid h-8 w-8 place-items-center rounded-full", tint)} aria-hidden>{icon}</span>
      <span className="leading-tight"><span className="block text-base font-bold text-ink">{value}</span><span className="block text-[11px] text-muted">{label}</span></span>
    </div>
  );
}

export const XPIndicator = ({ xp, className }: { xp: number; className?: string }) => <Chip icon={<Star size={16} className="text-warning-600" />} value={fmtNumber(xp)} label="XP" tint="bg-warning-50" className={className} />;
export const CoinIndicator = ({ coins, className }: { coins: number; className?: string }) => <Chip icon={<Coins size={16} className="text-warning-600" />} value={fmtNumber(coins)} label="Coins" tint="bg-warning-50" className={className} />;
export const StreakIndicator = ({ days, className }: { days: number; className?: string }) => <Chip icon={<Flame size={16} className="text-danger-600" />} value={String(days)} label="Day Streak" tint="bg-danger-50" className={className} />;
