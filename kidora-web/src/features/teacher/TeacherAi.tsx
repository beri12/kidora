"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle, Bot, Check, Copy, Lightbulb, ListChecks, PieChart, Sparkles,
} from "lucide-react";
import { TeacherShell } from "./TeacherShell";
import { TopHeader, Card, CardBody, CardHeader, EmptyState, Pill, Skeleton, cn } from "@/components/dashboard";
import {
  useAnalyseClass, useGenerateLessonPlan, useGenerateQuizDraft, useTeacherClasses, useTeacherCourses,
} from "@/lib/hooks/queries";
import { SelectField, TextArea, TextField } from "@/features/course-builder/parts";

type Tool = "ideas" | "quiz" | "analyze";

const TOOLS: { key: Tool; label: string; icon: typeof Bot; blurb: string }[] = [
  { key: "ideas", label: "Lesson plan", icon: Lightbulb, blurb: "A plan you can adapt, with activities and check questions." },
  { key: "quiz", label: "Quiz questions", icon: ListChecks, blurb: "Draft questions to review before adding them to a course." },
  { key: "analyze", label: "Analyse a class", icon: PieChart, blurb: "Where your class is strong, where it needs help, what to try next." },
];

/**
 * Nothing on this page writes to a course. Every result is a draft the teacher
 * reads and copies into the course builder themselves, which is the only place
 * content is validated and saved.
 */
export function TeacherAiPage() {
  const params = useSearchParams();
  const initial = (params.get("tool") as Tool) ?? "ideas";
  const [tool, setTool] = useState<Tool>(["ideas", "quiz", "analyze"].includes(initial) ? initial : "ideas");

  return (
    <TeacherShell
      header={({ onMenu }) => (
        <TopHeader onMenu={onMenu} title="AI Teaching Assistant" sub="Drafts for you to review — nothing here is shown to students" />
      )}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {TOOLS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTool(t.key)}
              aria-pressed={tool === t.key}
              className={cn(
                "focus-ring rounded-2xl border p-4 text-left transition-colors",
                tool === t.key ? "border-brand-400 bg-brand-50/60" : "border-slate-200 bg-white hover:bg-slate-50",
              )}
            >
              <t.icon size={20} className="text-brand-600" aria-hidden />
              <p className="mt-2 font-semibold">{t.label}</p>
              <p className="text-xs text-muted">{t.blurb}</p>
            </button>
          ))}
        </div>

        <p className="flex items-start gap-2 rounded-2xl bg-warning-50 p-3 text-xs text-warning-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
          Read everything before you use it. AI drafts can be wrong or pitched at the wrong level,
          and nothing here is saved to a course until you add it yourself.
        </p>

        {tool === "ideas" && <LessonPlanTool />}
        {tool === "quiz" && <QuizTool />}
        {tool === "analyze" && <AnalyseTool />}
      </div>
    </TeacherShell>
  );
}

function Degraded() {
  return (
    <p className="rounded-2xl bg-slate-100 p-3 text-sm text-slate-700">
      No AI model is configured on this Kidora instance, so nothing was generated.
      Ask an administrator to set an LLM provider key.
    </p>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost text-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch { /* clipboard blocked; the text is on screen to select */ }
      }}
    >
      {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />} {copied ? "Copied" : label}
    </button>
  );
}

/* ------------------------------------------------------------- lesson plan */

function LessonPlanTool() {
  const gen = useGenerateLessonPlan();
  const [form, setForm] = useState({ subject: "", grade: "", topic: "", durationMin: 30, difficulty: "MEDIUM" as const, notes: "" });
  const valid = form.subject.trim() && form.grade.trim() && form.topic.trim();
  const plan = gen.data;

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <Card>
        <CardHeader title="Lesson plan" />
        <CardBody className="space-y-3">
          <TextField label="Subject" required value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} placeholder="Mathematics" />
          <TextField label="Grade" required value={form.grade} onChange={(v) => setForm({ ...form, grade: v })} placeholder="Grade 5" />
          <TextField label="Topic" required value={form.topic} onChange={(v) => setForm({ ...form, topic: v })} placeholder="Adding fractions" />
          <SelectField
            label="Difficulty" value={form.difficulty}
            onChange={(v) => setForm({ ...form, difficulty: v as typeof form.difficulty })}
            options={[{ value: "EASY", label: "Easy" }, { value: "MEDIUM", label: "Medium" }, { value: "HARD", label: "Hard" }]}
          />
          <TextField
            label="Minutes" type="number" value={String(form.durationMin)}
            onChange={(v) => setForm({ ...form, durationMin: Math.max(5, Number(v) || 30) })}
          />
          <TextArea label="Anything else?" rows={3} value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="My class struggles with equivalent fractions." />
          {gen.isError && <p className="text-sm text-danger-600" role="alert">{(gen.error as Error).message}</p>}
          <button
            type="button" className="btn-primary w-full" disabled={!valid || gen.isPending}
            onClick={() => gen.mutate({ ...form, notes: form.notes.trim() || undefined })}
          >
            <Sparkles size={16} aria-hidden /> {gen.isPending ? "Writing…" : "Write a plan"}
          </button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Draft"
          sub={plan ? "Review and edit before you use it" : undefined}
        />
        <CardBody>
          {gen.isPending ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : !plan ? (
            <EmptyState icon={<Lightbulb size={22} />} title="Nothing yet" body="Fill in the subject, grade and topic, then generate a plan." />
          ) : plan.degraded ? (
            <Degraded />
          ) : (
            <article className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold">{plan.title}</h2>
                  <p className="text-xs text-muted">About {plan.estimated_min} minutes</p>
                </div>
                <CopyButton label="Copy plan" text={planAsText(plan)} />
              </div>
              {plan.summary && <p className="text-sm">{plan.summary}</p>}

              {plan.objectives.length > 0 && (
                <section>
                  <h3 className="mb-1 text-sm font-semibold">Objectives</h3>
                  <ul className="list-disc pl-5 text-sm">{plan.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul>
                </section>
              )}
              {plan.sections.map((s, i) => (
                <section key={i}>
                  <h3 className="mb-1 text-sm font-semibold">{s.heading}</h3>
                  <p className="whitespace-pre-wrap text-sm text-muted">{s.body}</p>
                </section>
              ))}
              {plan.activities.length > 0 && (
                <section>
                  <h3 className="mb-1 text-sm font-semibold">Activities</h3>
                  <ul className="list-disc pl-5 text-sm">{plan.activities.map((a, i) => <li key={i}>{a}</li>)}</ul>
                </section>
              )}
              {plan.check_questions.length > 0 && (
                <section>
                  <h3 className="mb-1 text-sm font-semibold">Check they understood</h3>
                  <ul className="list-disc pl-5 text-sm">{plan.check_questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
                </section>
              )}
              {plan.materials.length > 0 && (
                <section>
                  <h3 className="mb-1 text-sm font-semibold">You will need</h3>
                  <p className="text-sm text-muted">{plan.materials.join(", ")}</p>
                </section>
              )}
              <p className="rounded-xl bg-slate-50 p-3 text-xs text-muted">
                To use this, copy what you want into a lesson in the{" "}
                <Link href="/teacher/courses" className="underline">course builder</Link>. It is not saved anywhere yet.
              </p>
            </article>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function planAsText(p: { title: string; summary: string; objectives: string[]; sections: { heading: string; body: string }[]; activities: string[]; check_questions: string[]; materials: string[] }) {
  const out = [p.title, "", p.summary, ""];
  if (p.objectives.length) out.push("Objectives:", ...p.objectives.map((o) => `- ${o}`), "");
  for (const s of p.sections) out.push(s.heading, s.body, "");
  if (p.activities.length) out.push("Activities:", ...p.activities.map((a) => `- ${a}`), "");
  if (p.check_questions.length) out.push("Check questions:", ...p.check_questions.map((q) => `- ${q}`), "");
  if (p.materials.length) out.push(`Materials: ${p.materials.join(", ")}`);
  return out.join("\n");
}

/* --------------------------------------------------------------- quiz tool */

function QuizTool() {
  const gen = useGenerateQuizDraft();
  const [form, setForm] = useState({ subject: "", grade: "", topic: "", questionCount: 5, difficulty: "MEDIUM" as const });
  const valid = form.subject.trim() && form.grade.trim() && form.topic.trim();
  const draft = gen.data;

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <Card>
        <CardHeader title="Quiz questions" />
        <CardBody className="space-y-3">
          <TextField label="Subject" required value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} placeholder="Mathematics" />
          <TextField label="Grade" required value={form.grade} onChange={(v) => setForm({ ...form, grade: v })} placeholder="Grade 5" />
          <TextField label="Topic" required value={form.topic} onChange={(v) => setForm({ ...form, topic: v })} placeholder="Equivalent fractions" />
          <TextField
            label="How many questions" type="number" value={String(form.questionCount)}
            onChange={(v) => setForm({ ...form, questionCount: Math.max(1, Math.min(20, Number(v) || 5)) })}
          />
          <SelectField
            label="Difficulty" value={form.difficulty}
            onChange={(v) => setForm({ ...form, difficulty: v as typeof form.difficulty })}
            options={[{ value: "EASY", label: "Easy" }, { value: "MEDIUM", label: "Medium" }, { value: "HARD", label: "Hard" }]}
          />
          {gen.isError && <p className="text-sm text-danger-600" role="alert">{(gen.error as Error).message}</p>}
          <button type="button" className="btn-primary w-full" disabled={!valid || gen.isPending} onClick={() => gen.mutate(form)}>
            <Sparkles size={16} aria-hidden /> {gen.isPending ? "Writing…" : "Draft questions"}
          </button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Draft questions" sub={draft && !draft.degraded ? "Check every answer before you use these" : undefined} />
        <CardBody>
          {gen.isPending ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : !draft ? (
            <EmptyState icon={<ListChecks size={22} />} title="Nothing yet" body="Say what the quiz is about and generate some questions." />
          ) : draft.degraded ? (
            <Degraded />
          ) : draft.questions.length === 0 ? (
            <EmptyState
              title="Nothing usable came back"
              body="Every generated question was missing a correct answer, so none were kept. Try a more specific topic."
            />
          ) : (
            <div className="space-y-3">
              <div className="flex justify-end"><CopyButton label="Copy all" text={quizAsText(draft)} /></div>
              <ol className="space-y-3">
                {draft.questions.map((q, i) => (
                  <li key={i} className="rounded-2xl border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{i + 1}. {q.prompt}</p>
                      <Pill tone="neutral">{q.type.replace(/_/g, " ").toLowerCase()}</Pill>
                    </div>
                    {q.options.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm">
                        {q.options.map((o, j) => {
                          const right = q.type === "MULTIPLE_SELECT" ? q.correct_options.includes(j) : q.correct === j;
                          return (
                            <li key={j} className={cn("flex items-center gap-2", right && "font-semibold text-success-700")}>
                              <span className="w-4 text-xs text-muted">{String.fromCharCode(97 + j)}.</span>
                              {o}
                              {right && <Check size={13} aria-hidden />}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {q.answer_text && <p className="mt-2 text-sm"><span className="text-muted">Answer:</span> <strong>{q.answer_text}</strong></p>}
                    {q.explanation && <p className="mt-2 rounded-xl bg-slate-50 p-2 text-xs text-muted">{q.explanation}</p>}
                  </li>
                ))}
              </ol>
              <p className="rounded-xl bg-slate-50 p-3 text-xs text-muted">
                Add the ones you want in the course builder&rsquo;s Quizzes step. They are not saved yet.
              </p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function quizAsText(d: { title: string; questions: { prompt: string; options: string[]; correct?: number | null; correct_options: number[]; answer_text?: string | null; explanation?: string | null }[] }) {
  const out = [d.title, ""];
  d.questions.forEach((q, i) => {
    out.push(`${i + 1}. ${q.prompt}`);
    q.options.forEach((o, j) => {
      const right = q.correct_options.length ? q.correct_options.includes(j) : q.correct === j;
      out.push(`   ${String.fromCharCode(97 + j)}. ${o}${right ? "  <- correct" : ""}`);
    });
    if (q.answer_text) out.push(`   Answer: ${q.answer_text}`);
    if (q.explanation) out.push(`   Why: ${q.explanation}`);
    out.push("");
  });
  return out.join("\n");
}

/* ------------------------------------------------------------ analyse tool */

function AnalyseTool() {
  const classes = useTeacherClasses();
  const courses = useTeacherCourses();
  const run = useAnalyseClass();
  const [target, setTarget] = useState("");
  const [question, setQuestion] = useState("");
  const result = run.data;

  const [kind, id] = target.split(":");
  const valid = Boolean(id);

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <Card>
        <CardHeader title="Analyse a class" />
        <CardBody className="space-y-3">
          <SelectField
            label="What to analyse" value={target} onChange={setTarget}
            options={[
              { value: "", label: "Choose a class or course" },
              ...(classes.data ?? []).map((c) => ({ value: `class:${c.id}`, label: `Class · ${c.name}` })),
              ...(courses.data ?? []).map((c) => ({ value: `course:${c.id}`, label: `Course · ${c.title}` })),
            ]}
            hint="Only classes and courses you teach are listed."
          />
          <TextArea
            label="A specific question?" rows={3} value={question} onChange={setQuestion}
            placeholder="Why are so many struggling with word problems?"
          />
          {run.isError && <p className="text-sm text-danger-600" role="alert">{(run.error as Error).message}</p>}
          <button
            type="button" className="btn-primary w-full" disabled={!valid || run.isPending}
            onClick={() => run.mutate({
              ...(kind === "class" ? { classId: id } : { courseId: id }),
              question: question.trim() || undefined,
            })}
          >
            <Sparkles size={16} aria-hidden /> {run.isPending ? "Reading the data…" : "Analyse"}
          </button>
          <p className="text-xs text-muted">
            The figures come from your students&rsquo; real progress and scores, read on the server.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Analysis" />
        <CardBody>
          {run.isPending ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : !result ? (
            <EmptyState icon={<PieChart size={22} />} title="Nothing yet" body="Pick a class or course and run the analysis." />
          ) : (
            <article className="space-y-4">
              {result.degraded && <Degraded />}
              {result.summary && <p className="text-sm">{result.summary}</p>}

              {result.strengths.length > 0 && (
                <section>
                  <h3 className="mb-1 text-sm font-semibold text-success-700">Going well</h3>
                  <ul className="list-disc pl-5 text-sm">{result.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </section>
              )}
              {result.weaknesses.length > 0 && (
                <section>
                  <h3 className="mb-1 text-sm font-semibold text-warning-700">Needs attention</h3>
                  <ul className="list-disc pl-5 text-sm">{result.weaknesses.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </section>
              )}
              {result.interventions.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold">What to try next</h3>
                  <ul className="space-y-2">
                    {result.interventions.map((iv, i) => (
                      <li key={i} className="rounded-2xl bg-brand-50/50 p-3">
                        <p className="text-sm font-semibold">{iv.focus}</p>
                        <p className="text-xs text-muted">{iv.why}</p>
                        <p className="mt-1 text-sm">{iv.suggestion}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {result.differentiation.length > 0 && (
                <section>
                  <h3 className="mb-1 text-sm font-semibold">Differentiation</h3>
                  <ul className="list-disc pl-5 text-sm">{result.differentiation.map((d, i) => <li key={i}>{d}</li>)}</ul>
                </section>
              )}
            </article>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
