import type { BusinessStatus } from '@/types';
import { statusConfig } from '@/lib/status';
import { cls } from '@/lib/format';

export function StatusBadge({ status }: { status: BusinessStatus }) {
  const config = statusConfig[status];
  return (
    <span className={cls('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', config.badge)}>
      <span className={cls('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}
