export function SummaryLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <span className="text-sm font-extrabold text-slate-900">{value}</span>
    </div>
  );
}
