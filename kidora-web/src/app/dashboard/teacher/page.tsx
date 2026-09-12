'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { useCourseWizard } from '@/stores/courseWizard.store';

export default function TeacherDashboard() {
  const user = useRequireAuth(['TEACHER']);
  const router = useRouter();
  const resetWizard = useCourseWizard((s) => s.reset);

  function startNewCourse() {
    // Clear any leftover draft from a previous session so Basic Info starts blank.
    resetWizard();
    router.push('/dashboard/teacher/create-course');
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-brand-900">Hi {user?.name?.split(' ')[0]} 🍎</h1>
          <p className="font-body font-bold text-brand-600 mt-1">Grade 2 · Sunflower Class · 22 students</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/teacher/upload"><Button variant="grass">⬆️ Upload content</Button></Link>
          <Button onClick={startNewCourse}>+ New course</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 mt-6">
        <StatCard label="Students" value={22} color="#8B5CF6" />
        <StatCard label="Avg. progress" value="66%" color="#16A34A" />
        <StatCard label="My courses" value={4} color="#F59E0B" />
        <StatCard label="Need help" value={1} color="#E11D48" />
      </div>
      <div className="mt-6 bg-white rounded-3xl border-2 border-brand-100 p-6 shadow-card">
        <h3 className="font-display font-extrabold text-xl text-brand-900 mb-3">Assignments</h3>
        {[['Addition Adventures — L3', 'Due Fri', '18/22'], ['Shapes Quiz', 'Due Mon', '12/22'], ['Story Time', 'Due Wed', '20/22']].map(([t, d, done]) => (
          <div key={t} className="flex items-center justify-between py-3 border-b border-brand-100">
            <span className="font-display font-extrabold text-brand-900">{t}</span>
            <span className="font-body-x text-sm text-coral-600">{d}</span>
            <span className="font-body-x text-sm text-grass-600">{done} done</span>
          </div>
        ))}
      </div>
    </div>
  );
}