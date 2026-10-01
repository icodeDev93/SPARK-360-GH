import type { BusinessRow, BusinessStatus, ProfileRow } from '@/types';
import { initials } from '@/lib/format';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ActionButton } from '@/components/ui/ActionButton';

export function BusinessCard({
  business,
  owner,
  actionId,
  primaryActions,
  onUpdateStatus,
}: {
  business: BusinessRow;
  owner?: ProfileRow;
  actionId: string;
  primaryActions: BusinessStatus[];
  onUpdateStatus: (business: BusinessRow, status: BusinessStatus) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40 transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-50 text-sm font-extrabold text-indigo-600">
            {business.logo_url ? (
              <img src={business.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(business.business_name)
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold text-slate-900">{business.business_name}</p>
            <p className="truncate text-sm font-medium text-slate-400">{business.address || 'No address'}</p>
          </div>
        </div>
        <StatusBadge status={business.status} />
      </div>
      <div className="mb-4 rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Owner</p>
        <p className="mt-1 text-sm font-extrabold text-slate-800">{owner?.name ?? 'Unknown owner'}</p>
        <p className="text-xs text-slate-500">{owner?.email ?? business.owner_id}</p>
        {owner?.phone && <p className="mt-1 text-xs text-slate-500">{owner.phone}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {primaryActions.map((status) => (
          <ActionButton
            key={status}
            status={status}
            loading={actionId === `${business.id}:${status}`}
            disabled={business.status === status}
            onClick={() => onUpdateStatus(business, status)}
          />
        ))}
      </div>
    </div>
  );
}
