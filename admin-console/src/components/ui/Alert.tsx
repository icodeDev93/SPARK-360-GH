import { cls } from '@/lib/format';

export function Alert({ kind, text, onClose }: { kind: 'success' | 'error'; text: string; onClose?: () => void }) {
  const isSuccess = kind === 'success';
  return (
    <div
      className={cls(
        'mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm',
        isSuccess ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-600',
      )}
    >
      <i className={cls('mt-0.5 text-base', isSuccess ? 'ri-checkbox-circle-line' : 'ri-error-warning-line')} />
      <span className="flex-1 leading-relaxed">{text}</span>
      {onClose && (
        <button onClick={onClose} className="rounded-md p-0.5 text-current opacity-60 transition-opacity hover:opacity-100">
          <i className="ri-close-line" />
        </button>
      )}
    </div>
  );
}
