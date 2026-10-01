import { cls } from '@/lib/format';

export function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <i className={cls(icon, 'text-2xl')} />
      </div>
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm text-slate-500">{text}</p>
    </div>
  );
}
