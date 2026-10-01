import { cls } from '@/lib/format';

export function MetricCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-4">
        <div className={cls('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', color)}>
          <i className={cls(icon, 'text-xl')} />
        </div>
        <div>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900">{value}</p>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}
