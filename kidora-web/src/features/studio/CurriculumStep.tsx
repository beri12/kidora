"use client";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen, ChevronDown, ChevronRight, ClipboardList, Copy, FileCheck2, FileText, Film,
  Image as ImageIcon, Layers, Lightbulb, ListChecks, Music, Plus, Quote, Trash2, Type, Users, X,
} from "lucide-react";
import { Card, CardBody, EmptyState, Pill, cn } from "@/components/dashboard";
import {
  useCreateLesson, useCreateSection, useDeleteLesson, useDeleteSection, useDuplicateLesson,
  useDuplicateSection, useReorderLessons, useReorderSections, useUpdateLesson, useUpdateSection,
} from "@/lib/hooks/queries";
import type { AuthoredLesson, AuthoredSection, ContentType, CourseTree } from "@/lib/api/authoring";
import { ReorderButtons, moved } from "@/features/course-builder/parts";
import { LessonCanvas } from "./LessonCanvas";
import { ModuleSettings, LessonSettings } from "./SettingsPanel";

/** The kinds of material a lesson can hold, as the add-content modal shows them. */
export const ITEM_KINDS: {
  type: ContentType; label: string; icon: typeof Type; blurb: string; group: "media" | "text" | "assessment";
}[] = [
  { type: "VIDEO", label: "Video", icon: Film, blurb: "Upload a clip, add captions and questions.", group: "media" },
  { type: "DOCUMENT", label: "Reading", icon: FileText, blurb: "Write a reading and attach files.", group: "media" },
  { type: "IMAGE", label: "Image", icon: ImageIcon, blurb: "A diagram or photograph.", group: "media" },
  { type: "AUDIO", label: "Audio", icon: Music, blurb: "A recording or a song.", group: "media" },
  { type: "HEADING", label: "Heading", icon: Type, blurb: "Break the lesson into parts.", group: "text" },
  { type: "PARAGRAPH", label: "Text", icon: FileText, blurb: "Explain something in words.", group: "text" },
  { type: "CALLOUT", label: "Callout", icon: Lightbulb, blurb: "Something to remember.", group: "text" },
  { type: "EXAMPLE", label: "Example", icon: Quote, blurb: "A worked example.", group: "text" },
  { type: "QUIZ", label: "Quiz", icon: ListChecks, blurb: "Check they understood.", group: "assessment" },
  { type: "ASSIGNMENT", label: "Assignment", icon: ClipboardList, blurb: "Work they hand in.", group: "assessment" },
  { type: "PEER_REVIEW", label: "Peer review", icon: Users, blurb: "Classmates score each other.", group: "assessment" },
];

export const ITEM_ICON = (type: string) =>
  ITEM_KINDS.find((k) => k.type === type)?.icon ?? FileText;

type Selection =
  | { kind: "course" }
  | { kind: "module"; sectionId: string }
  | { kind: "lesson"; sectionId: string; lessonId: string };

/**
 * Three columns: the curriculum tree, the thing you selected, and its
 * settings. This is where a teacher spends most of their time, so the tree
 * stays visible while they edit — you never lose your place in the course.
 *
 * `mode` only changes what opens first. Structure starts on the module you
 * are building; content starts inside the first lesson. Both edit the same
 * tree, because splitting them into separate screens would mean adding a
 * lesson in one place and filling it in another.
 */
export function CurriculumStep({ course, mode }: { course: CourseTree; mode: "structure" | "content" }) {
  const [selection, setSelection] = useState<Selection>({ kind: "course" });
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Open something sensible on arrival, and recover if what was selected is
  // deleted from under us.
  useEffect(() => {
    const firstSection = course.sections[0];
    const firstLesson = course.sections.flatMap((s) => s.lessons.map((l) => ({ s, l })))[0];
    setSelection((current) => {
      if (current.kind === "module" && course.sections.some((s) => s.id === current.sectionId)) return current;
      if (current.kind === "lesson" && course.sections.some((s) => s.lessons.some((l) => l.id === current.lessonId))) return current;
      if (mode === "content" && firstLesson) return { kind: "lesson", sectionId: firstLesson.s.id, lessonId: firstLesson.l.id };
      if (firstSection) return { kind: "module", sectionId: firstSection.id };
      return { kind: "course" };
    });
  }, [course.sections, mode]);

  const selected = useMemo(() => {
    if (selection.kind === "module") {
      return { section: course.sections.find((s) => s.id === selection.sectionId) ?? null, lesson: null };
    }
    if (selection.kind === "lesson") {
      const section = course.sections.find((s) => s.id === selection.sectionId) ?? null;
      return { section, lesson: section?.lessons.find((l) => l.id === selection.lessonId) ?? null };
    }
    return { section: null, lesson: null };
  }, [selection, course.sections]);

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
      <CurriculumTree
        course={course}
        selection={selection}
        onSelect={setSelection}
        collapsed={collapsed}
        onToggle={(id) => setCollapsed((c) => { const n = new Set(c); n.has(id) ? n.delete(id) : n.add(id); return n; })}
      />

      <div className="min-w-0">
        {selected.lesson && selected.section ? (
          <LessonCanvas course={course} section={selected.section} lesson={selected.lesson} />
        ) : selected.section ? (
          <ModuleCanvas
            course={course}
            section={selected.section}
            onOpenLesson={(lessonId) => setSelection({ kind: "lesson", sectionId: selected.section!.id, lessonId })}
          />
        ) : (
          <Card>
            <CardBody>
              <EmptyState
                icon={<Layers size={22} />}
                title="Start with a module"
                body="A module is a week of study. Add one on the left, then fill it with lessons."
              />
            </CardBody>
          </Card>
        )}
      </div>

      <div className="min-w-0">
        {selected.lesson && selected.section ? (
          <LessonSettings course={course} section={selected.section} lesson={selected.lesson} />
        ) : selected.section ? (
          <ModuleSettings course={course} section={selected.section} />
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- tree */

function CurriculumTree({
  course, selection, onSelect, collapsed, onToggle,
}: {
  course: CourseTree;
  selection: Selection;
  onSelect: (s: Selection) => void;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
}) {
  const createSection = useCreateSection(course.id);
  const reorderSections = useReorderSections(course.id);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  const submit = () => {
    const t = title.trim();
    if (t.length < 2) return;
    createSection.mutate({ title: t }, { onSuccess: () => { setTitle(""); setAdding(false); } });
  };

  return (
    <nav aria-label="Course curriculum" className="xl:sticky xl:top-4 xl:self-start">
      <Card>
        <CardBody className="max-h-[calc(100dvh-10rem)] space-y-1 overflow-y-auto p-2">
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Curriculum</p>

          {course.sections.length === 0 && !adding && (
            <p className="px-2 py-3 text-xs text-muted">No modules yet.</p>
          )}

          <ol className="space-y-0.5">
            {course.sections.map((section, i) => {
              const open = !collapsed.has(section.id);
              const activeModule = selection.kind === "module" && selection.sectionId === section.id;
              return (
                <li key={section.id}>
                  <div
                    className={cn(
                      "flex items-center gap-1 rounded-xl px-1.5 py-1.5",
                      activeModule ? "bg-brand-50 text-brand-800" : "hover:bg-slate-50",
                    )}
                  >
                    <button
                      type="button"
                      className="focus-ring rounded p-0.5 text-slate-400"
                      onClick={() => onToggle(section.id)}
                      aria-expanded={open}
                      aria-label={open ? `Collapse ${section.title}` : `Expand ${section.title}`}
                    >
                      {open ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
                    </button>
                    <button
                      type="button"
                      className="focus-ring min-w-0 flex-1 truncate rounded text-left text-sm font-semibold"
                      onClick={() => onSelect({ kind: "module", sectionId: section.id })}
                      aria-current={activeModule ? "true" : undefined}
                    >
                      {section.weekNumber ? <span className="text-muted">W{section.weekNumber} · </span> : null}
                      {section.title}
                    </button>
                    <ReorderButtons
                      index={i} total={course.sections.length} label={section.title}
                      onMove={(from, to) => reorderSections.mutate(moved(course.sections, from, to).map((s) => s.id))}
                    />
                  </div>

                  {open && (
                    <LessonBranch
                      course={course}
                      section={section}
                      selection={selection}
                      onSelect={onSelect}
                    />
                  )}
                </li>
              );
            })}
          </ol>

          {adding ? (
            <div className="flex gap-1 px-1 pt-1">
              <input
                className="input min-w-0 flex-1 text-sm" value={title} autoFocus
                placeholder="Week 1: Fundamentals"
                aria-label="New module title"
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") setAdding(false); }}
              />
              <button type="button" className="btn-ghost shrink-0 text-xs" onClick={submit}>Add</button>
            </div>
          ) : (
            <button type="button" className="btn-ghost mt-1 w-full justify-start text-xs" onClick={() => setAdding(true)}>
              <Plus size={14} aria-hidden /> Add module
            </button>
          )}
        </CardBody>
      </Card>
    </nav>
  );
}

function LessonBranch({
  course, section, selection, onSelect,
}: { course: CourseTree; section: AuthoredSection; selection: Selection; onSelect: (s: Selection) => void }) {
  const createLesson = useCreateLesson(course.id);
  const reorderLessons = useReorderLessons(course.id);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  const submit = () => {
    const t = title.trim();
    if (t.length < 2) return;
    createLesson.mutate(
      { sectionId: section.id, title: t },
      { onSuccess: (lesson) => { setTitle(""); setAdding(false); onSelect({ kind: "lesson", sectionId: section.id, lessonId: lesson.id }); } },
    );
  };

  return (
    <ol className="ml-5 space-y-0.5 border-l border-slate-100 pl-2">
      {section.lessons.map((lesson, j) => {
        const active = selection.kind === "lesson" && selection.lessonId === lesson.id;
        return (
          <li key={lesson.id} className={cn("flex items-center gap-1 rounded-lg px-1.5 py-1", active ? "bg-brand-50 text-brand-800" : "hover:bg-slate-50")}>
            <button
              type="button"
              className="focus-ring min-w-0 flex-1 truncate rounded text-left text-[13px]"
              onClick={() => onSelect({ kind: "lesson", sectionId: section.id, lessonId: lesson.id })}
              aria-current={active ? "true" : undefined}
            >
              {lesson.title}
            </button>
            {lesson.status === "DRAFT" && <span className="size-1.5 shrink-0 rounded-full bg-amber-400" title="Draft" aria-label="Draft" />}
            <ReorderButtons
              index={j} total={section.lessons.length} label={lesson.title}
              onMove={(from, to) => reorderLessons.mutate({ sectionId: section.id, ids: moved(section.lessons, from, to).map((l) => l.id) })}
            />
          </li>
        );
      })}

      {adding ? (
        <li className="flex gap-1 py-1">
          <input
            className="input min-w-0 flex-1 text-xs" value={title} autoFocus
            placeholder="Lesson title"
            aria-label={`New lesson in ${section.title}`}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") setAdding(false); }}
          />
        </li>
      ) : (
        <li>
          <button type="button" className="btn-ghost w-full justify-start text-[11px]" onClick={() => setAdding(true)}>
            <Plus size={12} aria-hidden /> Add lesson
          </button>
        </li>
      )}
    </ol>
  );
}

/* --------------------------------------------------------- module canvas */

function ModuleCanvas({
  course, section, onOpenLesson,
}: { course: CourseTree; section: AuthoredSection; onOpenLesson: (lessonId: string) => void }) {
  const updateSection = useUpdateSection(course.id);
  const deleteSection = useDeleteSection(course.id);
  const duplicateSection = useDuplicateSection(course.id);
  const createLesson = useCreateLesson(course.id);
  const duplicateLesson = useDuplicateLesson(course.id);
  const deleteLesson = useDeleteLesson(course.id);
  const [title, setTitle] = useState(section.title);
  const [editing, setEditing] = useState(false);

  useEffect(() => setTitle(section.title), [section.id, section.title]);

  const totalMin = section.lessons.reduce((a, l) => a + l.estimatedMin, 0);

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1">
            {editing ? (
              <input
                className="input w-full text-lg font-bold" value={title} autoFocus
                aria-label="Module title"
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => { updateSection.mutate({ id: section.id, title: title.trim() }); setEditing(false); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { updateSection.mutate({ id: section.id, title: title.trim() }); setEditing(false); }
                  if (e.key === "Escape") { setTitle(section.title); setEditing(false); }
                }}
              />
            ) : (
              <button type="button" className="focus-ring rounded text-left text-lg font-bold hover:underline" onClick={() => setEditing(true)}>
                {section.weekNumber ? <span className="text-muted">Week {section.weekNumber} · </span> : null}
                {section.title}
              </button>
            )}
            <p className="text-xs text-muted">
              {section.lessons.length} lesson{section.lessons.length === 1 ? "" : "s"}
              {totalMin ? ` · ${totalMin} min` : ""}
            </p>
          </div>
          <button type="button" className="btn-ghost" onClick={() => duplicateSection.mutate(section.id)}>
            <Copy size={14} aria-hidden /> Duplicate
          </button>
          <button
            type="button" className="btn-ghost text-danger-600"
            onClick={() => {
              if (confirm(`Delete "${section.title}" and its ${section.lessons.length} lesson(s)? This cannot be undone.`)) {
                deleteSection.mutate(section.id);
              }
            }}
          >
            <Trash2 size={14} aria-hidden /> Delete
          </button>
        </div>

        {section.lessons.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={22} />}
            title="No lessons in this module"
            body="A lesson is one idea, made of a few items — a video, a reading, a quiz."
            action={{ label: "Add the first lesson", onClick: () => createLesson.mutate({ sectionId: section.id, title: "New lesson" }) }}
          />
        ) : (
          <ol className="space-y-2">
            {section.lessons.map((lesson, i) => (
              <li key={lesson.id} className="rounded-2xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-5 text-xs text-muted">{i + 1}.</span>
                  <button
                    type="button"
                    className="focus-ring min-w-0 flex-1 truncate rounded text-left font-medium hover:underline"
                    onClick={() => onOpenLesson(lesson.id)}
                  >
                    {lesson.title}
                  </button>
                  <Pill tone={lesson.status === "PUBLISHED" ? "success" : "neutral"}>
                    {lesson.status === "PUBLISHED" ? "Published" : "Draft"}
                  </Pill>
                  <span className="text-xs text-muted">{lesson.estimatedMin} min</span>
                  <button type="button" className="btn-ghost" onClick={() => duplicateLesson.mutate(lesson.id)} aria-label={`Duplicate ${lesson.title}`}>
                    <Copy size={13} aria-hidden />
                  </button>
                  <button
                    type="button" className="btn-ghost text-danger-600"
                    onClick={() => { if (confirm(`Delete "${lesson.title}"?`)) deleteLesson.mutate(lesson.id); }}
                    aria-label={`Delete ${lesson.title}`}
                  >
                    <Trash2 size={13} aria-hidden />
                  </button>
                </div>
                <p className="mt-1 pl-7 text-xs text-muted">
                  {(lesson.contents?.length ?? 0) === 0
                    ? "No items yet"
                    : `${lesson.contents!.length} item${lesson.contents!.length === 1 ? "" : "s"}`}
                </p>
              </li>
            ))}
          </ol>
        )}

        <button
          type="button" className="btn-ghost w-full"
          onClick={() => createLesson.mutate({ sectionId: section.id, title: "New lesson" })}
        >
          <Plus size={15} aria-hidden /> Add lesson
        </button>
      </CardBody>
    </Card>
  );
}
