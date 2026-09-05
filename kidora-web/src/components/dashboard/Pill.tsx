import { cn } from "./cn";
import type { ReactNode } from "react";

export type Tone = "brand" | "success" | "warning" | "danger" | "info" | "neutral";
const tones: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700",
  success: "bg-success-50 text-success-700",
  warning: "bg-warning-50 text-warning-700",
  danger: "bg-danger-50 text-danger-700",
  info: "bg-info-50 text-info-700",
  neutral: "bg-slate-100 text-slate-600",
};

export function Pill({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

export const healthTone = (h: "ON_TRACK" | "NEEDS_SUPPORT" | "AT_RISK"): Tone => h === "ON_TRACK" ? "success" : h === "NEEDS_SUPPORT" ? "warning" : "danger";
export const healthLabel = (h: "ON_TRACK" | "NEEDS_SUPPORT" | "AT_RISK") => h === "ON_TRACK" ? "On track" : h === "NEEDS_SUPPORT" ? "Needs support" : "At risk";
