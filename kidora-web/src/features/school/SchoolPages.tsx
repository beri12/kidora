"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Plus, CreditCard } from "lucide-react";
import { SchoolShell } from "./SchoolShell";
import { useSchoolStudents, useSchoolTeachers, useSchoolClasses, useSchoolCourses, useSchoolAnalytics, useSchoolBilling } from "@/lib/hooks/queries";
import { TopHeader, Card, CardHeader, CardBody, Pill, ProgressBar, Avatar, EmptyState, ErrorState, Skeleton, SearchBar, Select, DataTable, ProgressLineChart, healthTone, healthLabel } from "@/components/dashboard";
import { fmtBytes, fmtDate, fmtNumber, timeAgo } from "@/lib/format";

const PAGE = 20;

export function SchoolStudentsPage({ initialHealth = "" }: { initialHealth?: string }) {
  const [search, setSearch] = useState(""); const [status, setStatus] = useState(initialHealth); const [page, setPage] = useState(1);
  const q = useSchoolStudents({ search, status: status || undefined, page, pageSize: PAGE });
  return (
    <SchoolShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title="Students" right={<>
      <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search students" className="w-56" />
      <Select label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: "", label: "All statuses" }, { value: "ON_TRACK", label: "On track" }, { value: "NEEDS_SUPPORT", label: "Needs support" }, { value: "AT_RISK", label: "At risk" }]} />
      <Link href="/school/students/new" className="btn-primary"><Plus size={16} /> Add</Link></>} />}>
      {q.isError ? <ErrorState error={q.error} retry={() => q.refetch()} /> : <Card><CardBody>
        <DataTable rows={q.data?.items ?? []} loading={q.isPending} page={page} pageSize={PAGE} total={q.data?.total ?? 0} onPage={setPage}
          empty={{ title: "No students found", body: search || status ? "Try clearing the filters." : "Add your first student to get started." }}
          columns={[
            { key: "n", header: "Student", render: (s) => <Link href={`/school/students/${s.id}`} className="flex items-center gap-2 font-medium hover:text-brand-600"><Avatar name={s.name} src={s.avatarUrl} size={30} />{s.name}</Link> },
            { key: "g", header: "Grade / Class", render: (s) => <span className="text-muted">{[s.grade, s.className].filter(Boolean).join(" · ") || "—"}</span>, hideOnMobile: true },
            { key: "p", header: "Progress", render: (s) => <span className="flex items-center gap-2"><ProgressBar value={s.progressPercent} size="sm" className="w-24" />{s.progressPercent}%</span> },
            { key: "a", header: "Avg score", render: (s) => `${Math.round(s.averageScore)}%` },
            { key: "h", header: "Status", render: (s) => <Pill tone={healthTone(s.health)}>{healthLabel(s.health)}</Pill> },
            { key: "l", header: "Last active", render: (s) => <span className="text-muted">{s.lastActiveAt ? timeAgo(s.lastActiveAt) : "Never"}</span>, hideOnMobile: true },
          ]}
          mobileCard={(s) => <Card className="flex items-center gap-3 p-3"><Avatar name={s.name} src={s.avatarUrl} size={34} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{s.name}</p><p className="text-xs text-muted">{s.className ?? s.grade ?? ""} · {s.progressPercent}%</p></div><Pill tone={healthTone(s.health)}>{healthLabel(s.health)}</Pill></Card>} />
      </CardBody></Card>}
    </SchoolShell>
  );
}

export function SchoolTeachersPage() {
  const [search, setSearch] = useState(""); const [page, setPage] = useState(1);
  const q = useSchoolTeachers({ search, page, pageSize: PAGE });
  return (
    <SchoolShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title="Teachers" right={<><SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search teachers" className="w-56" /><Link href="/school/teachers/new" className="btn-primary"><Plus size={16} /> Add</Link></>} />}>
      {q.isError ? <ErrorState error={q.error} retry={() => q.refetch()} /> : <Card><CardBody>
        <DataTable rows={q.data?.items ?? []} loading={q.isPending} page={page} pageSize={PAGE} total={q.data?.total ?? 0} onPage={setPage} empty={{ title: "No teachers yet", body: "Invite teachers so they can build courses and manage classes." }}
          columns={[
            { key: "n", header: "Teacher", render: (t) => <Link href={`/school/teachers/${t.id}`} className="flex items-center gap-2 font-medium hover:text-brand-600"><Avatar name={t.name} src={t.avatarUrl} size={30} />{t.name}</Link> },
            { key: "e", header: "Email", render: (t) => <span className="text-muted">{t.email}</span>, hideOnMobile: true },
            { key: "s", header: "Subject", render: (t) => t.subject ?? "—" },
            { key: "c", header: "Classes", render: (t) => t.classCount },
            { key: "st", header: "Students", render: (t) => fmtNumber(t.studentCount) },
            { key: "v", header: "Status", render: (t) => <Pill tone={t.verified ? "success" : "warning"}>{t.verified ? "Verified" : "Pending"}</Pill> },
          ]}
          mobileCard={(t) => <Card className="flex items-center gap-3 p-3"><Avatar name={t.name} src={t.avatarUrl} size={34} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{t.name}</p><p className="text-xs text-muted">{t.subject ?? t.email} · {t.classCount} classes</p></div><Pill tone={t.verified ? "success" : "warning"}>{t.verified ? "Verified" : "Pending"}</Pill></Card>} />
      </CardBody></Card>}
    </SchoolShell>
  );
}

export function SchoolClassesPage() {
  const [search, setSearch] = useState(""); const [page, setPage] = useState(1);
  const q = useSchoolClasses({ search, page, pageSize: PAGE });
  return (
    <SchoolShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title="Classes" right={<><SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search classes" className="w-56" /><Link href="/school/classes/new" className="btn-primary"><Plus size={16} /> New class</Link></>} />}>
      {q.isPending ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div> : q.isError ? <ErrorState error={q.error} retry={() => q.refetch()} /> : q.data?.items.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{q.data.items.map((c) => (
          <Link key={c.id} href={`/school/classes/${c.id}`} className="focus-ring rounded-2xl"><Card as="article" className="h-full p-4 hover:shadow-md">
            <div className="flex items-start justify-between"><div><p className="font-semibold">{c.name}</p><p className="text-xs text-muted">{c.grade}{c.subject ? ` · ${c.subject}` : ""}</p></div>{c.atRiskCount > 0 && <Pill tone="danger">{c.atRiskCount} at risk</Pill>}</div>
            <p className="mt-3 text-sm text-muted">{c.studentCount} students · avg {Math.round(c.averageScore)}%</p>
            <div className="mt-2 flex items-center gap-2"><ProgressBar value={c.completionPercent} size="sm" /><span className="text-xs font-semibold">{c.completionPercent}%</span></div>
          </Card></Link>
        ))}</div>
      ) : <EmptyState title="No classes yet" body="Create grades first, then add classes to them." action={{ label: "Create class", href: "/school/classes/new" }} />}
    </SchoolShell>
  );
}

export function SchoolCoursesPage() {
  const [search, setSearch] = useState(""); const [status, setStatus] = useState(""); const [page, setPage] = useState(1);
  const q = useSchoolCourses({ search, status: status || undefined, page, pageSize: PAGE });
  const tone = (s: string) => s === "PUBLISHED" ? "success" : s === "REVIEW" ? "warning" : s === "ARCHIVED" ? "neutral" : "info";
  return (
    <SchoolShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title="Courses" right={<>
      <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search courses" className="w-56" />
      <Select label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: "", label: "All" }, { value: "REVIEW", label: "Awaiting approval" }, { value: "PUBLISHED", label: "Published" }, { value: "DRAFT", label: "Draft" }, { value: "ARCHIVED", label: "Archived" }]} />
      <Link href="/school/courses/new" className="btn-primary"><Plus size={16} /> New</Link></>} />}>
      {q.isError ? <ErrorState error={q.error} retry={() => q.refetch()} /> : <Card><CardBody>
        <DataTable rows={q.data?.items ?? []} loading={q.isPending} page={page} pageSize={PAGE} total={q.data?.total ?? 0} onPage={setPage} empty={{ title: "No courses", body: "Teachers can create courses, or add one here." }}
          columns={[
            { key: "t", header: "Course", render: (c) => <Link href={`/school/courses/${c.id}`} className="flex items-center gap-2 font-medium hover:text-brand-600"><span className="h-8 w-8 shrink-0 rounded-lg" style={{ background: c.subjectAccent }} aria-hidden />{c.title}</Link> },
            { key: "s", header: "Subject / Grade", render: (c) => <span className="text-muted">{[c.subject, c.grade].filter(Boolean).join(" · ")}</span>, hideOnMobile: true },
            { key: "te", header: "Teacher", render: (c) => c.teacher ?? "—", hideOnMobile: true },
            { key: "l", header: "Lessons", render: (c) => c.totalLessons },
            { key: "st", header: "Status", render: (c) => <Pill tone={tone(c.status)}>{c.status === "REVIEW" ? "Awaiting approval" : c.status[0] + c.status.slice(1).toLowerCase()}</Pill> },
          ]} />
      </CardBody></Card>}
    </SchoolShell>
  );
}

export function SchoolAnalyticsPage() {
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const q = useSchoolAnalytics({ from: from || undefined, to: to || undefined });
  return (
    <SchoolShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title="Reports & Analytics" right={<><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input w-auto" aria-label="From" /><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input w-auto" aria-label="To" /></>} />}>
      {q.isPending ? <Skeleton className="h-96" /> : q.isError ? <ErrorState error={q.error} retry={() => q.refetch()} /> : q.data && (
        <div className="space-y-4">
          <Card><CardHeader title="School-wide progress" /><CardBody>{q.data.progress.series.length ? <ProgressLineChart data={q.data.progress} height={280} /> : <EmptyState title="No data in this range" />}</CardBody></Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card id="subjects"><CardHeader title="Subject performance" /><CardBody className="pt-3">{q.data.subjects.length ? q.data.subjects.map((s) => <div key={s.subject} className="grid grid-cols-[minmax(0,1fr)_60px_60px_60px] items-center gap-2 py-2 text-sm"><span className="flex items-center gap-2 truncate"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.accent }} />{s.subject}</span><span className="text-right text-xs">Avg {Math.round(s.averageScore)}%</span><span className="text-right text-xs">{s.completion}% done</span><span className="text-right text-xs font-semibold">{s.mastery}%</span></div>) : <EmptyState title="No subject data" />}</CardBody></Card>
            <Card><CardHeader title="Student risk distribution" /><CardBody className="pt-3">{[["On track", q.data.health.onTrack, "#22C55E"], ["Needs support", q.data.health.needsSupport, "#F59E0B"], ["At risk", q.data.health.atRisk, "#EF4444"]].map(([l, v, c]) => <div key={l as string} className="py-2"><div className="mb-1 flex justify-between text-sm"><span>{l as string}</span><span className="font-semibold">{fmtNumber(v as number)}</span></div><ProgressBar value={((v as number) / Math.max(1, q.data!.health.total)) * 100} size="sm" color={c as string} /></div>)}</CardBody></Card>
          </div>
        </div>
      )}
    </SchoolShell>
  );
}

export function SchoolBillingPage() {
  const q = useSchoolBilling();
  return (
    <SchoolShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title="Billing & Subscription" />}>
      {q.isPending ? <Skeleton className="h-64" /> : q.isError ? <ErrorState error={q.error} retry={() => q.refetch()} /> : q.data && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600"><CreditCard size={22} /></span><div><p className="text-xs text-muted">Current plan</p><p className="text-xl font-bold">{q.data.plan[0].toUpperCase() + q.data.plan.slice(1)}</p></div><Pill tone={q.data.status === "active" ? "success" : "warning"} className="ml-auto">{q.data.status}</Pill></div>
            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Next billing date</dt><dd className="font-medium">{q.data.renewsAt ? fmtDate(q.data.renewsAt, { year: "numeric", month: "long", day: "numeric" }) : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Payment provider</dt><dd className="font-medium">{q.data.provider ?? "—"}</dd></div>
            </dl>
            <Link href="/pricing" className="btn-primary mt-5">Manage plan</Link>
          </Card>
          <Card className="space-y-5 p-5">
            <div><div className="mb-1 flex justify-between text-sm"><span>Students</span><span className="font-semibold">{fmtNumber(q.data.studentsUsed)} / {fmtNumber(q.data.studentLimit)}</span></div><ProgressBar value={(q.data.studentsUsed / Math.max(1, q.data.studentLimit)) * 100} /></div>
            <div><div className="mb-1 flex justify-between text-sm"><span>Storage</span><span className="font-semibold">{fmtBytes(q.data.storageUsedBytes)} / {fmtBytes(q.data.storageLimitBytes)}</span></div><ProgressBar value={(q.data.storageUsedBytes / Math.max(1, q.data.storageLimitBytes)) * 100} /></div>
          </Card>
        </div>
      )}
    </SchoolShell>
  );
}
