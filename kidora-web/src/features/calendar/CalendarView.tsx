"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { Card, CardBody, EmptyState, ErrorState, Skeleton, Pill, Tabs, cn } from "@/components/dashboard";
import { useCalendarRange, useCreateEvent, useDeleteEvent } from "@/hooks/useCalendar";
import type { CalendarItem } from "@/lib/api/calendar";

type ViewMode = "month" | "week" | "day" | "agenda";

/**
 * Dates are handled in the browser's local timezone throughout, and only
 * converted to ISO at the API boundary. Building keys from getFullYear/
 * getMonth/getDate rather than toISOString avoids the classic off-by-one where
 * an evening event lands on the previous day in a UTC-negative timezone.
 */
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => addDays(startOfDay(d), -d.getDay());
const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b);

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SOURCE_LABEL: Record<string, string> = { event: "Event", assignment: "Assignment", exam: "Exam", lesson: "Lesson" };

/** The window to fetch for a given view — a month view shows leading/trailing days. */
function windowFor(mode: ViewMode, cursor: Date) {
  if (mode === "day") return { from: startOfDay(cursor), to: addDays(startOfDay(cursor), 1) };
  if (mode === "week") { const s = startOfWeek(cursor); return { from: s, to: addDays(s, 7) }; }
  if (mode === "agenda") return { from: startOfDay(cursor), to: addDays(startOfDay(cursor), 30) };
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = addDays(first, -first.getDay());
  return { from: gridStart, to: addDays(gridStart, 42) };
}

function EventChip({ item, onOpen }: { item: CalendarItem; onOpen: (i: CalendarItem) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="flex w-full items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-semibold text-white hover:opacity-90"
      style={{ background: item.color ?? "#8B5CF6" }}
      title={item.title}
    >
      {!item.allDay && <span className="tabular-nums opacity-90">{new Date(item.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>}
      <span className="truncate">{item.title}</span>
    </button>
  );
}

/**
 * Calendar for every role. The API decides what is visible; this only renders
 * it. `canCreate` controls whether the compose form is offered — deadlines are
 * always read-only because they belong to an assignment or exam.
 */
export function CalendarView({ childId, canCreate = true }: { childId?: string; canCreate?: boolean }) {
  const [mode, setMode] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [kinds, setKinds] = useState<string>("all");
  const [selected, setSelected] = useState<CalendarItem | null>(null);
  const [composing, setComposing] = useState(false);

  const win = useMemo(() => windowFor(mode, cursor), [mode, cursor]);
  const q = useCalendarRange(win.from.toISOString(), win.to.toISOString(), {
    childId,
    kinds: kinds === "all" ? undefined : kinds,
  });
  const del = useDeleteEvent();

  // Group once per fetch rather than scanning the list for every cell.
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const it of q.data ?? []) {
      const k = dayKey(new Date(it.startsAt));
      (map.get(k) ?? map.set(k, []).get(k)!).push(it);
    }
    return map;
  }, [q.data]);

  const step = (dir: 1 | -1) => {
    if (mode === "month") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
    else if (mode === "week") setCursor(addDays(cursor, 7 * dir));
    else setCursor(addDays(cursor, dir));
  };

  const heading = mode === "month"
    ? cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : mode === "week"
      ? `${startOfWeek(cursor).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${addDays(startOfWeek(cursor), 6).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
      : cursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="grid gap-4">
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => step(-1)} aria-label="Previous" className="btn-secondary px-2"><ChevronLeft size={16} /></button>
          <button type="button" onClick={() => setCursor(new Date())} className="btn-secondary">Today</button>
          <button type="button" onClick={() => step(1)} aria-label="Next" className="btn-secondary px-2"><ChevronRight size={16} /></button>
          <p className="ml-1 text-sm font-semibold text-ink sm:text-base">{heading}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={kinds}
            onChange={setKinds}
            options={[{ value: "all", label: "All" }, { value: "event", label: "Events" }, { value: "assignment", label: "Assignments" }, { value: "exam", label: "Exams" }]}
          />
          <Tabs
            value={mode}
            onChange={(v) => setMode(v as ViewMode)}
            options={[{ value: "month", label: "Month" }, { value: "week", label: "Week" }, { value: "day", label: "Day" }, { value: "agenda", label: "Agenda" }]}
          />
          {canCreate && (
            <button type="button" className="btn-primary" onClick={() => setComposing(true)}>
              <Plus size={16} /> New event
            </button>
          )}
        </div>
      </div>

      {q.isPending ? <Skeleton className="h-[520px]" />
        : q.isError ? <ErrorState error={q.error} retry={() => q.refetch()} />
        : (
          <Card>
            <CardBody className="p-0 sm:p-0">
              {mode === "month" && <MonthGrid cursor={cursor} byDay={byDay} onOpen={setSelected} onPickDay={(d) => { setCursor(d); setMode("day"); }} />}
              {mode === "week" && <DayColumns days={Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i))} byDay={byDay} onOpen={setSelected} />}
              {mode === "day" && <DayColumns days={[startOfDay(cursor)]} byDay={byDay} onOpen={setSelected} />}
              {mode === "agenda" && <Agenda items={q.data ?? []} onOpen={setSelected} />}
            </CardBody>
          </Card>
        )}

      {selected && (
        <EventDetail
          item={selected}
          onClose={() => setSelected(null)}
          onDelete={selected.editable ? () => del.mutate(selected.id, { onSuccess: () => setSelected(null) }) : undefined}
          deleting={del.isPending}
        />
      )}
      {composing && <ComposeEvent defaultDate={cursor} onClose={() => setComposing(false)} />}
    </div>
  );
}

function MonthGrid({ cursor, byDay, onOpen, onPickDay }: {
  cursor: Date; byDay: Map<string, CalendarItem[]>;
  onOpen: (i: CalendarItem) => void; onPickDay: (d: Date) => void;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = addDays(first, -first.getDay());
  const today = new Date();
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-7 border-b border-line">
          {WEEKDAYS.map((d) => <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-muted">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: 42 }, (_, i) => {
            const d = addDays(gridStart, i);
            const items = byDay.get(dayKey(d)) ?? [];
            const outside = d.getMonth() !== cursor.getMonth();
            return (
              <div key={i} className={cn("min-h-[96px] border-b border-r border-line p-1.5", outside && "bg-brand-50/40")}>
                <button
                  type="button"
                  onClick={() => onPickDay(d)}
                  className={cn(
                    "mb-1 grid h-6 w-6 place-items-center rounded-full text-xs font-semibold",
                    sameDay(d, today) ? "bg-brand-600 text-white" : outside ? "text-muted" : "text-ink hover:bg-brand-100",
                  )}
                >
                  {d.getDate()}
                </button>
                <div className="grid gap-1">
                  {items.slice(0, 3).map((it) => <EventChip key={`${it.source}-${it.id}`} item={it} onOpen={onOpen} />)}
                  {items.length > 3 && (
                    <button type="button" onClick={() => onPickDay(d)} className="px-1 text-left text-[11px] font-semibold text-brand-700">
                      +{items.length - 3} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DayColumns({ days, byDay, onOpen }: { days: Date[]; byDay: Map<string, CalendarItem[]>; onOpen: (i: CalendarItem) => void }) {
  const today = new Date();
  return (
    <div className="overflow-x-auto">
      <div className={cn("grid", days.length > 1 ? "min-w-[700px] grid-cols-7" : "grid-cols-1")}>
        {days.map((d) => {
          const items = byDay.get(dayKey(d)) ?? [];
          return (
            <div key={dayKey(d)} className="min-h-[420px] border-r border-line p-2 last:border-r-0">
              <p className={cn("mb-2 text-sm font-semibold", sameDay(d, today) ? "text-brand-700" : "text-ink")}>
                {d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
              </p>
              {items.length ? (
                <div className="grid gap-1.5">
                  {items.map((it) => (
                    <button
                      key={`${it.source}-${it.id}`}
                      type="button"
                      onClick={() => onOpen(it)}
                      className="rounded-xl border-l-4 bg-brand-50 p-2 text-left hover:bg-brand-100"
                      style={{ borderColor: it.color ?? "#8B5CF6" }}
                    >
                      <p className="text-xs font-semibold text-ink">{it.title}</p>
                      <p className="text-[11px] text-muted">
                        {it.allDay ? "All day" : new Date(it.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        {it.courseTitle ? ` · ${it.courseTitle}` : ""}
                      </p>
                    </button>
                  ))}
                </div>
              ) : <p className="text-xs text-muted">Nothing scheduled</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Agenda({ items, onOpen }: { items: CalendarItem[]; onOpen: (i: CalendarItem) => void }) {
  if (!items.length) return <div className="p-6"><EmptyState title="Nothing coming up" body="The next 30 days are clear." /></div>;
  const groups = new Map<string, CalendarItem[]>();
  for (const it of items) {
    const k = dayKey(new Date(it.startsAt));
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(it);
  }
  return (
    <ul className="divide-y divide-line">
      {[...groups.entries()].map(([k, list]) => (
        <li key={k} className="p-4">
          <p className="mb-2 text-sm font-semibold text-ink">
            {new Date(list[0].startsAt).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <div className="grid gap-2">
            {list.map((it) => (
              <button
                key={`${it.source}-${it.id}`}
                type="button"
                onClick={() => onOpen(it)}
                className="flex items-center gap-3 rounded-xl border border-line p-3 text-left hover:bg-brand-50"
              >
                <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: it.color ?? "#8B5CF6" }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{it.title}</span>
                  <span className="block text-xs text-muted">
                    {it.allDay ? "All day" : new Date(it.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    {it.courseTitle ? ` · ${it.courseTitle}` : ""}
                  </span>
                </span>
                <Pill tone="neutral">{SOURCE_LABEL[it.source] ?? it.source}</Pill>
              </button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-brand-50"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EventDetail({ item, onClose, onDelete, deleting }: {
  item: CalendarItem; onClose: () => void; onDelete?: () => void; deleting: boolean;
}) {
  return (
    <Modal title={item.title} onClose={onClose}>
      <div className="grid gap-2 text-sm">
        <p className="text-muted">
          {new Date(item.startsAt).toLocaleString(undefined, { dateStyle: "full", ...(item.allDay ? {} : { timeStyle: "short" }) })}
          {item.endsAt && !item.allDay ? ` – ${new Date(item.endsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Pill tone="neutral">{SOURCE_LABEL[item.source] ?? item.source}</Pill>
          {item.courseTitle && <Pill tone="brand">{item.courseTitle}</Pill>}
          {item.studentName && <Pill tone="info">{item.studentName}</Pill>}
        </div>
        {item.description && <p className="whitespace-pre-wrap text-ink">{item.description}</p>}
        {item.location && <p className="text-muted">📍 {item.location}</p>}
        <div className="mt-3 flex gap-2">
          {item.href && <Link href={item.href} className="btn-primary flex-1 text-center">Open</Link>}
          {onDelete && (
            <button type="button" onClick={onDelete} disabled={deleting} className="btn-secondary text-danger-600">
              <Trash2 size={16} /> {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
        {!item.editable && item.source !== "event" && (
          <p className="text-xs text-muted">Deadlines are managed on the assignment or exam itself.</p>
        )}
      </div>
    </Modal>
  );
}

function ComposeEvent({ defaultDate, onClose }: { defaultDate: Date; onClose: () => void }) {
  const create = useCreateEvent();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(dayKey(defaultDate));
  const [time, setTime] = useState("09:00");
  const [allDay, setAllDay] = useState(false);
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 2) { setError("Give the event a title."); return; }
    setError("");
    // Built from local date/time parts, so what the user picked is what is
    // stored once converted to ISO.
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = allDay ? [0, 0] : time.split(":").map(Number);
    const startsAt = new Date(y, m - 1, d, hh, mm).toISOString();
    create.mutate({ title: title.trim(), description: description.trim() || undefined, startsAt, allDay },
      { onSuccess: onClose, onError: (err) => setError(err instanceof Error ? err.message : "Could not save the event.") });
  };

  return (
    <Modal title="New event" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160}
            className="rounded-xl border border-line px-3 py-2" placeholder="Reading time" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Notes</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000}
            className="rounded-xl border border-line px-3 py-2" placeholder="Optional" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-line px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Time</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={allDay}
              className="rounded-xl border border-line px-3 py-2 disabled:opacity-50" />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> All day
        </label>
        {error && <p className="text-sm font-semibold text-danger-600">{error}</p>}
        <button type="submit" className="btn-primary" disabled={create.isPending}>
          {create.isPending ? "Saving…" : "Add to calendar"}
        </button>
      </form>
    </Modal>
  );
}
