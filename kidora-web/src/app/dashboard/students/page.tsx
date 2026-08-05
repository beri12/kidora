'use client';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useStudents } from '@/features/teachers/hooks';
// import { Navbar } from '@/components/navbar/Navbar';

// Teacher/Admin only: class roster with progress.
export default function StudentsPage() {
  useRequireAuth(['TEACHER', 'ADMIN']);
  const { data: students = [], isLoading } = useStudents();
  return (
    <div className="min-h-screen bg-brand-50">
      {/* <Navbar /> */}
      <div className="max-w-[1000px] mx-auto px-6 py-10">
        <h1 className="font-display font-extrabold text-3xl text-brand-900 mb-6">Students</h1>
        <div className="bg-white rounded-3xl border-2 border-brand-100 p-4 shadow-card">
          {isLoading ? <div className="p-6 font-display text-brand-500">Loading…</div> : students.map((s) => (
            <div key={s.id} className="flex items-center gap-4 py-3 border-b border-brand-100 last:border-0">
              <div className="w-10 h-10 rounded-xl bg-brand-500 grid place-items-center text-white font-display font-extrabold">{s.initial}</div>
              <div className="w-40 font-display font-extrabold text-brand-900">{s.name}</div>
              <div className="flex-1 h-2.5 rounded-full bg-brand-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-brand-600 to-grass-500" style={{ width: `${s.progress}%` }} /></div>
              <span className="w-24 text-right font-body-x text-sm text-grass-600">{s.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
