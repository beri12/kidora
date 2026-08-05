'use client';
import { Navbar } from '@/components/navbar/Navbar';
import { Button } from '@/components/ui/button';
import { useSubscription, useInvoices } from '@/features/subscription/hooks';

export default function AccountPage() {
  const { data: sub, usage, setPlan, cancel } = useSubscription();
  const { data: invoices } = useInvoices();
  const u = usage.data ?? { lessons: 0, aiChats: 0, games: 0 };

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <div className="max-w-[820px] mx-auto px-6 py-10">
        <h1 className="font-display font-extrabold text-3xl text-brand-900 mb-6">My Subscription 📋</h1>

        <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-3xl p-6 text-white flex flex-wrap justify-between gap-4 items-center">
          <div>
            <div className="font-body font-extrabold text-xs uppercase opacity-80">Current Plan</div>
            <div className="font-display font-extrabold text-3xl capitalize">{sub?.plan ?? 'free'}</div>
            <div className="font-body font-bold text-brand-100 text-sm mt-1">Status: {sub?.status ?? '—'}{sub?.renewsAt ? ' · renews ' + new Date(sub.renewsAt).toLocaleDateString() : ''}</div>
          </div>
          <div className="px-4 py-2 rounded-full bg-white/20 font-display font-extrabold">● {sub?.status ?? 'active'}</div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          {[['Lessons', u.lessons, '#8B5CF6'], ['AI chats', u.aiChats, '#16A34A'], ['Games', u.games, '#0284C7']].map(([label, val, color]) => (
            <div key={label as string} className="bg-white rounded-2xl border-2 border-brand-100 shadow-card p-4 text-center">
              <div className="font-display font-extrabold text-2xl" style={{ color: color as string }}>{val as number}</div>
              <div className="font-body font-bold text-brand-500 text-xs">{label as string}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-4 flex-wrap">
          <Button variant="grass" onClick={() => setPlan.mutate('family')}>Upgrade to Family</Button>
          <Button variant="outline" onClick={() => setPlan.mutate('free')}>Downgrade</Button>
          <Button variant="ghost" onClick={() => cancel.mutate()}>Cancel</Button>
        </div>

        <h2 className="font-display font-extrabold text-2xl text-brand-900 mt-10 mb-3">Invoices 🧾</h2>
        <div className="bg-white rounded-2xl border-2 border-brand-100 shadow-card overflow-hidden">
          {(invoices ?? []).length === 0 && <div className="p-5 font-body font-bold text-brand-400">No invoices yet.</div>}
          {(invoices ?? []).map((inv: any) => (
            <div key={inv.id} className="grid grid-cols-[1.2fr_1fr_.8fr_.6fr] items-center px-4 py-3 border-b border-brand-50 font-body font-bold text-brand-800 text-sm">
              <span>{inv.number}</span>
              <span className="capitalize">{inv.plan}</span>
              <span className="font-display font-extrabold">${inv.amount}</span>
              <a href={inv.pdfUrl} className="justify-self-end text-xs font-display font-extrabold text-white bg-gradient-to-br from-brand-600 to-brand-800 rounded-lg px-3 py-1.5">PDF</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
