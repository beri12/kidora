"use client";
import Link from "next/link";
import { Eye } from "lucide-react";
import { Card, CardBody } from "@/components/dashboard";
import type { CourseTree } from "@/lib/api/authoring";
import { CoursePreviewBody } from "./CoursePreview";

/**
 * Step 6 — the course as a student meets it, before anyone can.
 *
 * The same component the standalone preview page renders, so what a teacher
 * checks here is what the student page will actually show. Nothing on this
 * step writes anything: it exists to be read.
 */
export function PreviewStep({ course }: { course: CourseTree }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700" aria-hidden>
              <Eye size={18} />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold">Preview as a student</h2>
              <p className="text-xs text-muted">
                Draft items are hidden here exactly as they are hidden from students. Nothing is live yet.
              </p>
            </div>
          </div>
          <Link href={`/teacher/courses/${course.id}/preview`} className="btn-ghost" target="_blank">
            Open in a new tab
          </Link>
        </CardBody>
      </Card>

      <CoursePreviewBody courseId={course.id} />
    </div>
  );
}
