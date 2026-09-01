'use client';
import { useState } from 'react';
import type { LmsSection } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

/**
 * Section header row in the builder: rename, describe, reorder and delete.
 * Reordering is buttons rather than drag-only so it works on a keyboard and a
 * touchscreen, and needs no extra dependency.
 */
export function SectionEditor({
  section,
  index,
  total,
  onSave,
  onDelete,
  onMove,
  children,
}: {
  section: LmsSection;
  index: number;
  total: number;
  onSave: (patch: { title?: string; description?: string }) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  children?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [description, setDescription] = useState(section.description ?? '');

  return (
    <section className="rounded-3xl border-2 border-brand-100 bg-white shadow-card">
      <header className="flex flex-wrap items-start gap-3 border-b border-brand-100 p-5">
        <span
          aria-hidden
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-100 font-display font-extrabold text-brand-700"
        >
          {index + 1}
        </span>

        {editing ? (
          <div className="min-w-[240px] flex-1 space-y-2">
            <label className="sr-only" htmlFor={`section-title-${section.id}`}>Section title</label>
            <Input
              id={`section-title-${section.id}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Section title"
            />
            <label className="sr-only" htmlFor={`section-desc-${section.id}`}>Section description</label>
            <Textarea
              id={`section-desc-${section.id}`}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this section covers"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  onSave({ title, description });
                  setEditing(false);
                }}
              >
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-extrabold text-brand-900">{section.title}</h3>
            {section.description && (
              <p className="font-body text-sm font-bold text-brand-500">{section.description}</p>
            )}
            <p className="font-body-x text-[12px] text-brand-400">
              {section.lessons.length} {section.lessons.length === 1 ? 'lesson' : 'lessons'}
            </p>
          </div>
        )}

        <div className="flex gap-1">
          <button
            type="button" onClick={() => onMove(-1)} disabled={index === 0}
            aria-label={`Move section ${section.title} up`}
            className="rounded-xl bg-brand-50 px-3 py-2 font-display font-extrabold text-brand-700 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >↑</button>
          <button
            type="button" onClick={() => onMove(1)} disabled={index === total - 1}
            aria-label={`Move section ${section.title} down`}
            className="rounded-xl bg-brand-50 px-3 py-2 font-display font-extrabold text-brand-700 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >↓</button>
          <button
            type="button" onClick={() => setEditing((e) => !e)}
            aria-label={`Edit section ${section.title}`}
            className="rounded-xl bg-brand-50 px-3 py-2 font-display font-extrabold text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >✏️</button>
          <button
            type="button" onClick={onDelete}
            aria-label={`Delete section ${section.title}`}
            className="rounded-xl bg-rose-50 px-3 py-2 font-display font-extrabold text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >🗑</button>
        </div>
      </header>

      <div className="p-5">{children}</div>
    </section>
  );
}
