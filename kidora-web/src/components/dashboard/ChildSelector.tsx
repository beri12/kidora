"use client";
import { ChevronDown } from "lucide-react";
import { Avatar } from "./Avatar";
import type { ChildSummary } from "@/types/lms";

/** Parent's child switcher. Every parent query is keyed by the selected child id. */
export function ChildSelector({ children, value, onChange }: { children: ChildSummary[]; value: string; onChange: (id: string) => void }) {
  const current = children.find((c) => c.id === value) ?? children[0];
  if (!current) return null;
  return (
    <label className="relative block rounded-2xl bg-brand-50/70 p-3 ring-1 ring-brand-100">
      <span className="sr-only">Select child</span>
      <span className="flex items-center gap-3">
        <Avatar name={current.name} src={current.avatarUrl} color={current.avatarColor} size={44} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-semibold text-ink">{current.name}</span>
          <span className="block text-xs text-muted">{current.grade ?? current.className ?? ""}</span>
        </span>
        <ChevronDown size={16} className="text-muted" aria-hidden />
      </span>
      <select value={current.id} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Select child">
        {children.map((c) => <option key={c.id} value={c.id}>{c.name}{c.grade ? ` · ${c.grade}` : ""}</option>)}
      </select>
    </label>
  );
}
