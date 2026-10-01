import type { BusinessStatus } from '@/types';
import { statusConfig } from '@/lib/status';
import { cls } from '@/lib/format';

export function ActionButton({
  status,
  loading,
  disabled,
  onClick,
}: {
  status: BusinessStatus;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={cls(
        'rounded-lg border px-3 py-2 text-xs font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        statusConfig[status].action,
      )}
    >
      {loading ? <i className="ri-loader-4-line animate-spin" /> : statusConfig[status].actionLabel}
    </button>
  );
}
