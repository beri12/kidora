"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { cn } from "@/components/dashboard";

/* ------------------------------------------------------------ save state */

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function SaveIndicator({ state, savedAt }: { state: SaveState; savedAt?: number | null }) {
  const [, tick] = useState(0);
  // Re-render on a timer so "Saved 2 minutes ago" keeps up without the parent
  // having to re-render for it.
  useEffect(() => {
    if (state !== "saved") return;
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [state]);

  const label =
    state === "saving" ? "Saving…"
    : state === "dirty" ? "Unsaved changes"
    : state === "error" ? "Could not save"
    : state === "saved" ? `Saved${savedAt ? ` ${relative(savedAt)}` : ""}`
    : "";

  if (!label) return null;
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        state === "error" ? "bg-danger-50 text-danger-700"
        : state === "dirty" ? "bg-warning-50 text-warning-700"
        : state === "saving" ? "bg-slate-100 text-slate-600"
        : "bg-success-50 text-success-700",
      )}
    >
      {state === "saved" && <Check size={12} aria-hidden />}
      {label}
    </span>
  );
}

function relative(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  return `${h} hour${h === 1 ? "" : "s"} ago`;
}

/**
 * Debounced autosave. Calls `save` a beat after the value stops changing, and
 * warns the browser before unload while a change is still unsaved so a
 * mistimed back button cannot lose work.
 */
export function useAutosave<T>(value: T, save: (v: T) => Promise<unknown>, opts: { delay?: number; enabled?: boolean } = {}) {
  const { delay = 1200, enabled = true } = opts;
  const [state, setState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const first = useRef(true);
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    if (!enabled) return;
    if (first.current) { first.current = false; return; }
    setState("dirty");
    const t = setTimeout(() => {
      setState("saving");
      save(latest.current)
        .then(() => { setState("saved"); setSavedAt(Date.now()); })
        .catch(() => setState("error"));
    }, delay);
    return () => clearTimeout(t);
    // `save` is recreated per render by react-query; depending on it would
    // restart the timer forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay, enabled]);

  useEffect(() => {
    if (state !== "dirty" && state !== "saving") return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state]);

  return { state, savedAt, flush: () => save(latest.current) };
}

/* ---------------------------------------------------------------- inputs */

export function Field({
  label, hint, error, required, children, id,
}: { label: string; hint?: string; error?: string; required?: boolean; children: ReactNode; id?: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-danger-600" aria-hidden>*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs text-danger-600" role="alert">{error}</p>}
    </div>
  );
}

export function TextField({
  label, value, onChange, error, hint, required, placeholder, type = "text", id,
}: {
  label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string;
  required?: boolean; placeholder?: string; type?: string; id?: string;
}) {
  const inputId = id ?? `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <Field label={label} hint={hint} error={error} required={required} id={inputId}>
      <input
        id={inputId}
        type={type}
        className={cn("input w-full", error && "border-danger-400")}
        value={value}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function TextArea({
  label, value, onChange, error, hint, required, rows = 4, placeholder, id,
}: {
  label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string;
  required?: boolean; rows?: number; placeholder?: string; id?: string;
}) {
  const inputId = id ?? `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <Field label={label} hint={hint} error={error} required={required} id={inputId}>
      <textarea
        id={inputId}
        rows={rows}
        className={cn("input w-full", error && "border-danger-400")}
        value={value}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function SelectField({
  label, value, onChange, options, error, hint, required, id,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; error?: string; hint?: string; required?: boolean; id?: string;
}) {
  const inputId = id ?? `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <Field label={label} hint={hint} error={error} required={required} id={inputId}>
      <select
        id={inputId}
        className={cn("input w-full", error && "border-danger-400")}
        value={value}
        aria-invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

export function Toggle({
  label, checked, onChange, hint,
}: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-1.5">
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-brand-600 focus-ring"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm">
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/** A repeating list of short strings — objectives, requirements, tags. */
export function StringList({
  label, values, onChange, placeholder, hint, max = 20,
}: {
  label: string; values: string[]; onChange: (v: string[]) => void;
  placeholder?: string; hint?: string; max?: number;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || values.length >= max || values.includes(v)) return;
    onChange([...values, v]);
    setDraft("");
  };
  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          aria-label={`Add to ${label}`}
        />
        <button type="button" className="btn-ghost shrink-0" onClick={add} disabled={!draft.trim() || values.length >= max}>
          <Plus size={16} aria-hidden /> Add
        </button>
      </div>
      {values.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {values.map((v, i) => (
            <li key={`${v}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1 text-xs">
              {v}
              <button
                type="button"
                className="focus-ring grid size-5 place-items-center rounded-full hover:bg-brand-100"
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                aria-label={`Remove ${v}`}
              >
                <X size={12} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}

/** Move-up / move-down buttons. Keyboard-reachable, unlike drag alone. */
export function ReorderButtons({
  index, total, onMove, label,
}: { index: number; total: number; onMove: (from: number, to: number) => void; label: string }) {
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        className="focus-ring rounded p-0.5 text-slate-400 hover:text-ink disabled:opacity-30"
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
        aria-label={`Move ${label} up`}
      >
        <ChevronUp size={14} aria-hidden />
      </button>
      <button
        type="button"
        className="focus-ring rounded p-0.5 text-slate-400 hover:text-ink disabled:opacity-30"
        disabled={index >= total - 1}
        onClick={() => onMove(index, index + 1)}
        aria-label={`Move ${label} down`}
      >
        <ChevronDown size={14} aria-hidden />
      </button>
    </span>
  );
}

/** Reorder helper shared by modules, lessons and question options. */
export function moved<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const out = [...list];
  const [item] = out.splice(from, 1);
  out.splice(to, 0, item);
  return out;
}
