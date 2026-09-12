"use client";
import { BookOpen, Check, Clock, GraduationCap, Leaf, Sparkles, Tag } from "lucide-react";
import { Card, CardBody } from "@/components/dashboard";

const LEVEL_LABEL: Record<string, string> = {
  EASY: "Beginner Level",
  MEDIUM: "Intermediate Level",
  HARD: "Advanced Level",
};

/**
 * The course as its card will read, updating as the teacher types.
 *
 * Every line comes from what is actually on the course — an empty field shows
 * a muted placeholder rather than an invented value, so this can never flatter
 * a course into looking more finished than it is.
 */
export function CourseOverviewPanel({
  title, difficulty, estimatedMinutes, category, thumbnailUrl, outcomes, prerequisites,
}: {
  title: string;
  difficulty: string;
  estimatedMinutes?: number;
  category?: string;
  thumbnailUrl?: string;
  outcomes: string[];
  prerequisites: string[];
}) {
  const hours = estimatedMinutes ? Math.round((estimatedMinutes / 60) * 10) / 10 : null;
  const Row = ({ icon: Icon, children, muted }: { icon: typeof BookOpen; children: React.ReactNode; muted?: boolean }) => (
    <li className="flex items-start gap-2.5 text-sm">
      <Icon size={16} className="mt-0.5 shrink-0 text-brand-600" aria-hidden />
      <span className={muted ? "text-slate-400" : ""}>{children}</span>
    </li>
  );

  return (
    <Card className="overflow-hidden">
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnailUrl} alt="" className="aspect-[16/9] w-full object-cover" />
      ) : (
        <div className="grid aspect-[16/9] w-full place-items-center bg-brand-50 text-brand-300">
          <GraduationCap size={40} aria-hidden />
        </div>
      )}

      <CardBody className="space-y-4">
        <div>
          <h2 className="text-[15px] font-semibold">Course Overview</h2>
          <ul className="mt-2 space-y-2">
            <Row icon={BookOpen} muted={!title.trim()}>{title.trim() || "Course title"}</Row>
            <Row icon={Leaf}>{LEVEL_LABEL[difficulty] ?? "Beginner Level"}</Row>
            <Row icon={Clock} muted={hours === null}>{hours === null ? "Duration not set" : `${hours} hours`}</Row>
            <Row icon={Tag} muted={!category}>{category || "No category yet"}</Row>
          </ul>
        </div>

        <div>
          <h3 className="text-[15px] font-semibold">What You&apos;ll Learn</h3>
          {outcomes.length === 0 ? (
            <p className="mt-1.5 text-sm text-slate-400">
              Added on the Learning Outcomes step.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {outcomes.map((o, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <Check size={16} className="mt-0.5 shrink-0 text-success-600" aria-hidden />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <GraduationCap size={16} className="text-brand-600" aria-hidden /> Prerequisites
          </h3>
          {prerequisites.length === 0 ? (
            <p className="mt-1.5 text-sm text-slate-400">No prior experience required.</p>
          ) : (
            <ul className="mt-1.5 space-y-1 text-sm text-muted">
              {prerequisites.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          )}
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl bg-brand-50/70 p-3">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-brand-600" aria-hidden />
          <p className="text-sm font-medium text-brand-800">
            Create amazing learning experiences for young minds!
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
