interface KpiCardProps {
  label: string;
  value: string;
  trend: string;
  up: boolean;
  icon: string;
  color: string;
}

const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-l-indigo-500' },
  violet: { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-l-violet-500' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-l-emerald-500' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-l-amber-500' },
};

export default function KpiCard({ label, value, trend, up, icon, color }: KpiCardProps) {
  const c = colorMap[color] || colorMap.indigo;
  return (
    <div className={`bg-white rounded-xl border-l-4 ${c.border} p-5 flex items-start gap-4`}>
      <div className={`w-12 h-12 flex items-center justify-center rounded-xl ${c.bg} flex-shrink-0`}>
        <i className={`${icon} text-xl ${c.icon}`}></i>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-slate-900 text-2xl font-bold mt-1 font-mono">{value}</p>
        <div className={`flex items-center gap-1 mt-1.5 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
          <span className="w-3 h-3 flex items-center justify-center">
            <i className={up ? 'ri-arrow-up-line' : 'ri-arrow-down-line'}></i>
          </span>
          <span>{trend}</span>
          <span className="text-slate-400 font-normal">vs last month</span>
        </div>
      </div>
    </div>
  );
}
