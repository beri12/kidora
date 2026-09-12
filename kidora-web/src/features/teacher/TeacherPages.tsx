"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { TeacherShell } from "./TeacherShell";
import { useTeacherClasses, useTeacherClass, useTeacherStudents, useTeacherCourses, useTeacherTasks, useTeacherActivity, useGradebook, useTeacherAnalytics, useTeacherAssignments } from "@/lib/hooks/queries";
import { TopHeader, Card, CardHeader, CardBody, Pill, ProgressBar, Avatar, EmptyState, ErrorState, Skeleton, Tabs, SearchBar, Select, DataTable, ActivityList, ProgressLineChart, healthTone, healthLabel, cn } from "@/components/dashboard";
import { dueLabel, fmtDate, timeAgo } from "@/lib/format";

function Page<T>({ title, sub, q, children, actions }: { title: string; sub?: string; q: { isPending: boolean; isError: boolean; error: unknown; data?: T; refetch: () => unknown }; children: (d: T) => ReactNode; actions?: ReactNode }) {
  return (
    <TeacherShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title={title} sub={sub} right={actions} />}>
      {q.isPending ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        : q.isError ? <ErrorState error={q.error} retry={() => q.refetch()} /> : q.data !== undefined ? children(q.data) : null}
    </TeacherShell>
  );
}

// ---------------------------------------------------------------- Classes
export function TeacherClassesPage() {
  const q = useTeacherClasses();
  return (
    <Page title="My Classes" q={q}>
      {(list) => list.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <Link key={c.id} href={`/teacher/classes/${c.id}`} className="focus-ring rounded-2xl">
              <Card as="article" className="h-full p-4 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{c.name}</p><p className="text-xs text-muted">{c.grade}{c.subject ? ` · ${c.subject}` : ""}</p></div>{c.atRiskCount > 0 && <Pill tone="danger">{c.atRiskCount} at risk</Pill>}</div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-slate-50 py-2"><dt className="text-muted">Students</dt><dd className="text-base font-bold">{c.studentCount}</dd></div>
                  <div className="rounded-xl bg-slate-50 py-2"><dt className="text-muted">Avg score</dt><dd className="text-base font-bold">{Math.round(c.averageScore)}%</dd></div>
                  <div className="rounded-xl bg-slate-50 py-2"><dt className="text-muted">Complete</dt><dd className="text-base font-bold">{c.completionPercent}%</dd></div>
                </dl>
                <ProgressBar value={c.completionPercent} size="sm" className="mt-3" />
                {c.lastActivityAt && <p className="mt-2 text-[11px] text-muted">Last activity {timeAgo(c.lastActivityAt)}</p>}
              </Card>
            </Link>
          ))}
        </div>
      ) : <EmptyState icon={<Users size={22} />} title="No classes assigned" body="Your school admin assigns classes to teachers." />}
    </Page>
  );
}

export function TeacherClassDetailPage({ id }: { id: string }) {
  const q = useTeacherClass(id);
  return (
    <Page title={q.data?.name ?? "Class"} sub={q.data ? `${q.data.grade}${q.data.subject ? ` · ${q.data.subject}` : ""} · ${q.data.studentCount} students` : undefined} q={q}>
      {(c) => (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Card><CardHeader title="Students" /><CardBody className="pt-2">
            {c.students.length ? <ul className="divide-y divide-slate-100">{c.students.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <Avatar name={s.name} src={s.avatarUrl} size={34} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{s.name}</p><p className="text-xs text-muted">Avg {Math.round(s.averageScore)}%</p></div>
                <div className="hidden w-28 sm:block"><ProgressBar value={s.progressPercent} size="sm" /></div>
                <Pill tone={healthTone(s.health)}>{healthLabel(s.health)}</Pill>
              </li>
            ))}</ul> : <EmptyState title="No students enrolled" />}
          </CardBody></Card>
          <Card><CardHeader title="Progress" /><CardBody>{c.progress.series.length ? <ProgressLineChart data={c.progress} height={220} /> : <EmptyState title="No data yet" />}</CardBody></Card>
        </div>
      )}
    </Page>
  );
}

// ---------------------------------------------------------------- Students
export function TeacherStudentsPage() {
  const [search, setSearch] = useState(""); const [page, setPage] = useState(1);
  const q = useTeacherStudents({ search, page, pageSize: 20 });
  return (
    <TeacherShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title="Students" right={<SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search students" className="w-64" />} />}>
      {q.isError ? <ErrorState error={q.error} retry={() => q.refetch()} /> : (
        <Card><CardBody>
          <DataTable rows={q.data?.items ?? []} loading={q.isPending} page={page} pageSize={20} total={q.data?.total ?? 0} onPage={setPage}
            empty={{ title: "No students found", body: search ? "Try a different name." : "Students appear once enrolled in your classes." }}
            columns={[
              { key: "name", header: "Student", render: (s) => <span className="flex items-center gap-2"><Avatar name={s.name} src={s.avatarUrl} size={30} /><span className="font-medium">{s.name}</span></span> },
              { key: "class", header: "Class", render: (s) => <span className="text-muted">{s.className} · {s.grade}</span>, hideOnMobile: true },
              { key: "progress", header: "Progress", render: (s) => <span className="flex items-center gap-2"><ProgressBar value={s.progressPercent} size="sm" className="w-24" />{s.progressPercent}%</span> },
              { key: "score", header: "Avg score", render: (s) => `${Math.round(s.averageScore)}%` },
              { key: "health", header: "Status", render: (s) => <Pill tone={healthTone(s.health)}>{healthLabel(s.health)}</Pill> },
            ]}
            mobileCard={(s) => <Card className="flex items-center gap-3 p-3"><Avatar name={s.name} src={s.avatarUrl} size={34} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{s.name}</p><p className="text-xs text-muted">{s.className} · {s.progressPercent}% · {Math.round(s.averageScore)}%</p></div><Pill tone={healthTone(s.health)}>{healthLabel(s.health)}</Pill></Card>} />
        </CardBody></Card>
      )}
    </TeacherShell>
  );
}

// ---------------------------------------------------------------- Courses
export function TeacherCoursesPage() {
  const [tab, setTab] = useState<"all" | "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED">("all");
  const q = useTeacherCourses(tab === "all" ? undefined : tab);
  const tone = (s: string) => s === "PUBLISHED" ? "success" : s === "REVIEW" ? "warning" : s === "ARCHIVED" ? "neutral" : "info";
  return (
    <Page title="Courses" q={q} actions={<><Tabs value={tab} onChange={setTab} options={["all", "DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"].map((v) => ({ value: v as typeof tab, label: v === "all" ? "All" : v[0] + v.slice(1).toLowerCase() }))} /><Link href="/dashboard/teacher/create-course" className="btn-primary"><Plus size={16} /> New course</Link></>}>
      {(list) => list.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <Card key={c.id} as="article" className="overflow-hidden">
              <div className="grid aspect-[16/7] place-items-center text-3xl font-black text-white/90" style={{ background: c.subjectAccent }}>{c.thumbnailUrl ? <img src={c.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : c.subject.slice(0, 1)}</div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2"><p className="truncate font-semibold">{c.title}</p><Pill tone={tone(c.status)}>{c.status[0] + c.status.slice(1).toLowerCase()}</Pill></div>
                <p className="mt-0.5 text-xs text-muted">{c.subject}{c.grade ? ` · ${c.grade}` : ""} · {c.totalLessons} lessons{c.studentCount !== undefined ? ` · ${c.studentCount} students` : ""}</p>
                <div className="mt-3 flex gap-2"><Link href={`/teacher/courses/${c.id}/build`} className="btn-primary flex-1">Edit</Link><Link href={`/teacher/courses/${c.id}/build`} className="btn-secondary flex-1">Preview</Link></div>
              </div>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="No courses yet" body="Create your first course and add sections, lessons and quizzes." action={{ label: "Create course", href: "/dashboard/teacher/create-course" }} />}
    </Page>
  );
}

// ---------------------------------------------------------------- Tasks
export function TeacherTasksPage() {
  const [tab, setTab] = useState<"all" | "TODAY" | "TOMORROW" | "UPCOMING" | "OVERDUE">("all");
  const q = useTeacherTasks(tab === "all" ? undefined : tab);
  return (
    <Page title="To Do" q={q} actions={<Tabs value={tab} onChange={setTab} options={[{ value: "all", label: "All" }, { value: "OVERDUE", label: "Overdue" }, { value: "TODAY", label: "Due today" }, { value: "TOMORROW", label: "Due tomorrow" }, { value: "UPCOMING", label: "Upcoming" }]} />}>
      {(list) => list.length ? <ul className="space-y-2">{list.map((t) => { const due = dueLabel(t.dueAt); return (
        <Card key={t.id} as="li" className="flex items-center gap-3 p-4">
          <Pill tone="brand">{t.type[0] + t.type.slice(1).toLowerCase()}</Pill>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{t.title}</p><p className="text-xs text-muted">{t.className}</p></div>
          <Pill tone={due.tone}>{due.text}</Pill>
          {t.href && <Link href={t.href} className="btn-secondary py-1.5">Open</Link>}
        </Card>
      ); })}</ul> : <EmptyState title="Nothing to do" body="You're all caught up." />}
    </Page>
  );
}

// ---------------------------------------------------------------- Activity
export function TeacherActivityPage() {
  const [page, setPage] = useState(1);
  const q = useTeacherActivity(page);
  const total = q.data?.total ?? 0; const pages = Math.max(1, Math.ceil(total / 20));
  return (
    <Page title="Student Activity" q={q}>
      {(d) => <Card><CardBody className="pt-2">
        <ActivityList items={d.items} />
        {pages > 1 && <div className="mt-4 flex items-center justify-between text-xs text-muted"><span>Page {page} of {pages}</span><div className="flex gap-2"><button type="button" className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button type="button" className="btn-ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div></div>}
      </CardBody></Card>}
    </Page>
  );
}

// ---------------------------------------------------------------- Assignments (teacher view)
export function TeacherAssignmentsPage() {
  const [status, setStatus] = useState("all"); const [page, setPage] = useState(1);
  const q = useTeacherAssignments({ status: status === "all" ? undefined : status, page });
  return (
    <Page title="Assignments" q={q} actions={<><Select label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: "all", label: "All" }, { value: "DRAFT", label: "Draft" }, { value: "PUBLISHED", label: "Published" }, { value: "CLOSED", label: "Closed" }]} /><Link href="/teacher/assignments/new" className="btn-primary"><Plus size={16} /> New</Link></>}>
      {(d) => <Card><CardBody>
        <DataTable rows={d.items} page={d.page} pageSize={d.pageSize} total={d.total} onPage={setPage} empty={{ title: "No assignments", body: "Create one and assign it to a class." }}
          columns={[
            { key: "t", header: "Assignment", render: (a) => <Link href={`/teacher/assignments/${a.id}`} className="font-medium hover:text-brand-600">{a.title}</Link> },
            { key: "c", header: "Course", render: (a) => <span className="text-muted">{a.course}</span>, hideOnMobile: true },
            { key: "d", header: "Due", render: (a) => { const x = dueLabel(a.dueAt); return <Pill tone={x.tone}>{x.text}</Pill>; } },
            { key: "s", header: "Submitted", render: (a) => <span className="flex items-center gap-2"><ProgressBar value={(a.submitted / Math.max(1, a.total)) * 100} size="sm" className="w-20" />{a.submitted}/{a.total}</span> },
          ]} />
      </CardBody></Card>}
    </Page>
  );
}

// ---------------------------------------------------------------- Gradebook
export function TeacherGradebookPage() {
  const classes = useTeacherClasses();
  const [classId, setClassId] = useState(""); const [page, setPage] = useState(1);
  const q = useGradebook({ classId: classId || undefined, page, pageSize: 25 });
  return (
    <TeacherShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title="Gradebook" sub="Student × assessment" right={<Select label="Class" value={classId} onChange={(v) => { setClassId(v); setPage(1); }} options={[{ value: "", label: "All classes" }, ...(classes.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} />} />}>
      {q.isPending ? <Skeleton className="h-96" /> : q.isError ? <ErrorState error={q.error} retry={() => q.refetch()} /> : q.data && (q.data.assessments.length ? (
        <Card><CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted"><th scope="col" className="sticky left-0 bg-white pb-2 pr-4 font-medium">Student</th>{q.data.assessments.map((a) => <th key={a.id} scope="col" className="pb-2 pr-4 font-medium" title={a.type}>{a.title}<span className="block text-[10px] font-normal">/{a.max}</span></th>)}<th scope="col" className="pb-2 font-medium">Average</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {q.data.rows.items.map((r) => (
                  <tr key={r.student.id}>
                    <th scope="row" className="sticky left-0 bg-white py-2 pr-4 text-left font-medium"><span className="flex items-center gap-2"><Avatar name={r.student.name} src={r.student.avatarUrl} size={26} />{r.student.name}</span></th>
                    {r.cells.map((c) => <td key={c.assessmentId} className="py-2 pr-4">{c.status === "MISSING" ? <span className="text-slate-300">—</span> : c.status === "SUBMITTED" ? <Pill tone="info">To grade</Pill> : <span className={cn("font-semibold", (c.score ?? 0) / c.max >= 0.8 ? "text-success-700" : (c.score ?? 0) / c.max >= 0.6 ? "text-ink" : "text-danger-600")}>{c.score}</span>}</td>)}
                    <td className="py-2 font-semibold">{r.average != null ? `${Math.round(r.average)}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {q.data.rows.total > q.data.rows.pageSize && <div className="mt-4 flex justify-end gap-2 text-xs"><button type="button" className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button type="button" className="btn-ghost" disabled={page * q.data.rows.pageSize >= q.data.rows.total} onClick={() => setPage(page + 1)}>Next</button></div>}
        </CardBody></Card>
      ) : <EmptyState title="No assessments yet" body="Grades appear once you publish an assignment, quiz or exam." />)}
    </TeacherShell>
  );
}

// ---------------------------------------------------------------- Analytics
export function TeacherAnalyticsPage() {
  const classes = useTeacherClasses();
  const [classId, setClassId] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const q = useTeacherAnalytics({ classId: classId || undefined, from: from || undefined, to: to || undefined });
  return (
    <Page title="Analytics" q={q} actions={<>
      <Select label="Class" value={classId} onChange={setClassId} options={[{ value: "", label: "All classes" }, ...(classes.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
      <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input w-auto" aria-label="From date" />
      <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input w-auto" aria-label="To date" />
    </>}>
      {(a) => (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[["Assignment completion", a.assignmentCompletion], ["Quiz average", a.quizAverage], ["Exam average", a.examAverage]].map(([l, v]) => <Card key={l as string} className="p-4"><p className="text-xs text-muted">{l as string}</p><p className="text-2xl font-bold">{Math.round(v as number)}%</p><ProgressBar value={v as number} size="sm" className="mt-2" /></Card>)}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader title="Class performance" /><CardBody>{a.classPerformance.series.length ? <ProgressLineChart data={a.classPerformance} /> : <EmptyState title="No data for this range" />}</CardBody></Card>
            <Card><CardHeader title="Topic mastery" /><CardBody className="pt-3">{a.topics.length ? a.topics.map((t) => <div key={t.topic} className="grid grid-cols-[minmax(0,1fr)_auto_120px_auto] items-center gap-3 py-2 text-sm"><span className="truncate">{t.topic}</span><span className="text-xs text-muted">{t.mastered}/{t.total}</span><ProgressBar value={t.masteryPercent} size="sm" /><span className="w-9 text-right text-xs font-semibold">{t.masteryPercent}%</span></div>) : <EmptyState title="No topic data" />}</CardBody></Card>
          </div>
          <Card><CardHeader title="Students who need support" sub="Based on completion, scores and inactivity" /><CardBody className="pt-2">
            {a.atRisk.length ? <ul className="divide-y divide-slate-100">{a.atRisk.map((s) => <li key={s.id} className="flex items-center gap-3 py-2.5"><Avatar name={s.name} src={s.avatarUrl} size={32} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{s.name}</p><p className="text-xs text-muted">{s.className} · {s.progressPercent}% complete · avg {Math.round(s.averageScore)}%</p></div><Pill tone={healthTone(s.health)}>{healthLabel(s.health)}</Pill><Link href={`/teacher/messages?to=${s.id}`} className="btn-ghost py-1.5">Message</Link></li>)}</ul> : <EmptyState title="Everyone is on track" body="No students match the support rules right now." />}
          </CardBody></Card>
        </div>
      )}
    </Page>
  );
}
