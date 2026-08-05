export function StatCard({ label, value, sub, color = '#8B5CF6' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-brand-100 p-5 flex-1 shadow-card">
      <div className="font-body-x text-[11px] text-brand-400 uppercase">{label}</div>
      <div className="font-display font-extrabold text-3xl mt-1" style={{ color }}>{value}</div>
      {sub && <div className="font-body-x text-[12px] text-grass-600 mt-0.5">{sub}</div>}
    </div>
  );
}
