"use client";
import { useState } from "react";
import Link from "next/link";
import { GraduationCap, Users, BookOpen, LayoutGrid, BarChart3, UserPlus, UserRoundPlus, FilePlus2, FileCheck2, MessageSquare, FileBarChart2, AlertTriangle } from "lucide-react";
import { SchoolShell } from "./SchoolShell";
import { useSchoolDashboard } from "@/lib/hooks/queries";
import { TopHeader, StatCard, Card, CardHeader, CardBody, ProgressBar, ProgressLineChart, ActivityList, Pill, EmptyState, ErrorState, DashboardSkeleton, RangePicker, cn } from "@/components/dashboard";
import { fmtNumber, timeAgo } from "@/lib/format";
import type { SchoolDashboard as Data } from "@/types/lms";

export function SchoolDashboardPage() {
  const [range, setRange] = useState("week");
  const q = useSchoolDashboard(range);
  const d = q.data;
  return (
    <SchoolShell header={({ onMenu }) => (
      <TopHeader onMenu={onMenu} title={d ? `Welcome back, ${d.admin.name}! 👋` : "Welcome back!"} sub={d ? `Here's how ${d.school.name} is doing.` : undefined}
        right={<RangePicker value={range} onChange={setRange} />} notifications={d?.unreadNotifications} notificationsHref="/school/notifications"
        user={d ? { name: d.admin.name, avatarUrl: d.admin.avatarUrl, avatarColor: d.admin.avatarColor, href: "/school/settings" } : undefined} />
    )}>
      {q.isPending ? <DashboardSkeleton /> : q.isError ? <ErrorState error={q.error} retry={() => q.refetch()} /> : d && <Body d={d} />}
    </SchoolShell>
  );
}

function Body({ d }: { d: Data }) {
  const k = d.kpis; const h = d.studentHealth; const total = Math.max(1, h.total);
  const quick = [
    ["Add Student", UserPlus, "/school/students/new"], ["Add Teacher", UserRoundPlus, "/school/teachers/new"], ["Create Course", FilePlus2, "/dashboard/teacher/create-course"],
    ["Create Exam", FileCheck2, "/school/exams/new"], ["Send Message", MessageSquare, "/school/messages/new"], ["View Reports", FileBarChart2, "/school/analytics"],
  ] as const;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Students" kpi={k.students} icon={GraduationCap} color="#7C3AED" href="/school/students" />
        <StatCard label="Teachers" kpi={k.teachers} icon={Users} color="#22C55E" href="/school/teachers" />
        <StatCard label="Courses" kpi={k.courses} icon={BookOpen} color="#3B82F6" href="/school/courses" />
        <StatCard label="Classes" kpi={k.classes} icon={LayoutGrid} color="#F59E0B" href="/school/classes" />
        <StatCard label="Average Completion" kpi={k.averageCompletion} icon={BarChart3} color="#EC4899" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Learning Progress" sub="Course completion, assignments, quizzes and exams" action="Full report" href="/school/analytics" />
          <CardBody>{d.learningProgress.series.length ? <ProgressLineChart data={d.learningProgress} height={260} /> : <EmptyState title="No progress data" body="Data appears once students start learning." />}</CardBody>
        </Card>
        <Card>
          <CardHeader title="Students at a Glance" action="View all" href="/school/students" />
          <CardBody>
            {h.total ? (<>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${h.onTrack} on track, ${h.needsSupport} need support, ${h.atRisk} at risk`}>
                <span className="bg-success-500" style={{ width: `${(h.onTrack / total) * 100}%` }} /><span className="bg-warning-500" style={{ width: `${(h.needsSupport / total) * 100}%` }} /><span className="bg-danger-500" style={{ width: `${(h.atRisk / total) * 100}%` }} />
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {[["On Track", h.onTrack, "bg-success-500", "ON_TRACK"], ["Needs Support", h.needsSupport, "bg-warning-500", "NEEDS_SUPPORT"], ["At Risk", h.atRisk, "bg-danger-500", "AT_RISK"]].map(([l, v, c, s]) => (
                  <li key={l as string}><Link href={`/school/students?health=${s}`} className="focus-ring flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-slate-50"><span className={cn("h-2.5 w-2.5 rounded-full", c as string)} aria-hidden /><span className="flex-1">{l as string}</span><span className="font-semibold">{fmtNumber(v as number)}</span><span className="w-10 text-right text-xs text-muted">{Math.round(((v as number) / total) * 100)}%</span></Link></li>
                ))}
              </ul>
              <Link href="/school/settings#support-rules" className="mt-3 block text-xs text-brand-600">Configure support rules</Link>
            </>) : <EmptyState title="No students yet" action={{ label: "Add student", href: "/school/students/new" }} />}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Alerts" action="View all" href="/school/notifications" />
          <CardBody className="pt-2">
            {d.alerts.length ? <ul className="divide-y divide-slate-100">{d.alerts.slice(0, 5).map((a) => (
              <li key={a.id}><Link href={a.link ?? "/school/notifications"} className="focus-ring -mx-2 flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50">
                <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg", a.type === "RISK_ALERT" ? "bg-danger-50 text-danger-600" : a.type === "COURSE_APPROVAL" ? "bg-warning-50 text-warning-600" : "bg-info-50 text-info-600")} aria-hidden><AlertTriangle size={15} /></span>
                <span className="min-w-0 flex-1"><span className={cn("block truncate text-sm", !a.read && "font-semibold")}>{a.title}</span><span className="block truncate text-xs text-muted">{a.body}</span></span>
                <span className="shrink-0 text-[11px] text-muted">{timeAgo(a.createdAt)}</span>
              </Link></li>
            ))}</ul> : <EmptyState title="No alerts" body="You'll be notified about students falling behind, approvals and exams." />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Academic Overview" />
          <CardBody className="space-y-3 pt-3">
            {[["Course completion", d.academicOverview.courseCompletion], ["Assignments", d.academicOverview.assignmentCompletion], ["Quiz average", d.academicOverview.quizAverage], ["Exam pass rate", d.academicOverview.examPassRate]].map(([l, v]) => (
              <div key={l as string}><div className="mb-1 flex justify-between text-sm"><span>{l as string}</span><span className="font-semibold">{Math.round(v as number)}%</span></div><ProgressBar value={v as number} size="sm" /></div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Top Subject Performance" action="View all subjects" href="/school/analytics#subjects" />
          <CardBody className="pt-3">
            {d.topSubjects.length ? d.topSubjects.slice(0, 5).map((s) => (
              <div key={s.subject} className="flex items-center gap-3 py-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.accent }} aria-hidden />
                <span className="w-28 truncate text-sm">{s.subject}</span>
                <div className="flex-1"><ProgressBar value={s.mastery} size="sm" color={s.accent} /></div>
                <span className="w-16 text-right text-xs text-muted">Avg {Math.round(s.averageScore)}%</span>
              </div>
            )) : <EmptyState title="No subject data" />}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Class Performance" action="View all" href="/school/classes" />
          <CardBody className="pt-2">
            {d.topClasses.length ? d.topClasses.slice(0, 5).map((c) => (
              <Link key={c.id} href={`/school/classes/${c.id}`} className="focus-ring -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{c.name}{c.subject ? ` · ${c.subject}` : ""}</p><p className="text-xs text-muted">{c.studentCount} students · avg {Math.round(c.averageScore)}%</p></div>
                <div className="w-24"><div className="mb-1 text-right text-xs font-semibold">{c.completionPercent}%</div><ProgressBar value={c.completionPercent} size="sm" /></div>
              </Link>
            )) : <EmptyState title="No classes yet" action={{ label: "Create class", href: "/school/classes/new" }} />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Quick Actions" />
          <CardBody className="grid grid-cols-2 gap-2 pt-3">
            {quick.map(([l, I, h]) => <Link key={l} href={h} className="focus-ring flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm font-medium hover:bg-brand-50"><I size={16} className="text-brand-600" aria-hidden />{l}</Link>)}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Recent Activity" action="View all" href="/school/activity" />
          <CardBody className="pt-1"><ActivityList items={d.recentActivity.slice(0, 6)} emptyBody="Course publishes, registrations and grading will show here." /></CardBody>
        </Card>
      </div>
    </div>
  );
}
