'use client';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';

export default function ParentDashboard() {
  useRequireAuth(['PARENT']);
  return (
    <div>
      <h1 className="font-display font-extrabold text-3xl text-brand-900">Parent Dashboard</h1>
      <p className="font-body font-bold text-brand-600 mt-1 mb-6">Track progress, celebrate wins, manage your plan.</p>
      <div className="flex flex-wrap gap-4">
        <StatCard label="Time this week" value="4h 12m" sub="+18%" color="#8B5CF6" />
        <StatCard label="Lessons done" value={23} sub="5 this week" color="#16A34A" />
        <StatCard label="Badges" value={4} color="#F59E0B" />
        <StatCard label="Avg. quiz" value="88%" color="#0284C7" />
      </div>
      <div className="mt-6 bg-gradient-to-br from-brand-700 to-brand-900 rounded-3xl p-6 text-white flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="font-body-x text-xs uppercase opacity-90">Current plan</div>
          <div className="font-display font-extrabold text-2xl">Family Premium</div>
          <div className="font-body font-bold text-brand-100 text-sm">$12.99/mo · renews Jul 22</div>
        </div>
        <Link href="/pricing"><Button variant="outline">Manage subscription</Button></Link>
      </div>
    </div>
  );
}
