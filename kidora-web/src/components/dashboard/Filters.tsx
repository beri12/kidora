"use client";
import { Search } from "lucide-react";
import { cn } from "./cn";

export function SearchBar({ value, onChange, placeholder = "Search", className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only">{placeholder}</span>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input pl-9" />
    </label>
  );
}

export function Tabs<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; className?: string }) {
  return (
    <div role="tablist" className={cn("flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1", className)}>
      {options.map((o) => (
        <button key={o.value} role="tab" type="button" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cn("focus-ring rounded-lg px-3 py-1.5 text-xs font-medium transition-colors", value === o.value ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink")}>
          {o.label}{o.count !== undefined && <span className="ml-1.5 text-[10px] text-muted">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Select({ value, onChange, options, label, className }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input pr-8" aria-label={label}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function RangePicker({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  return <Select className={className} label="Date range" value={value} onChange={onChange} options={[{ value: "today", label: "Today" }, { value: "week", label: "This Week" }, { value: "month", label: "This Month" }]} />;
}
