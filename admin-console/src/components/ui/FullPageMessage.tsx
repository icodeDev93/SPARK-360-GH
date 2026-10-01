import { cls } from '@/lib/format';

export function FullPageMessage({
  icon,
  title,
  text,
  actionLabel,
  onAction,
}: {
  icon: string;
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/70 bg-white p-8 text-center shadow-sm shadow-slate-200/40">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <i className={cls(icon, 'text-2xl')} />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm font-medium text-slate-400">{text}</p>
        {actionLabel && (
          <button
            onClick={onAction}
            className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm shadow-indigo-200 transition-colors hover:bg-indigo-700"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
