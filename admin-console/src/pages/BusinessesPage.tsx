import type { BusinessRow, BusinessStatus, ProfileRow } from '@/types';
import type { StatusFilter } from '@/lib/status';
import { cls, formatDate, initials, titleCase } from '@/lib/format';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { BusinessActions } from '@/components/business/BusinessActions';

export function BusinessesPage({
  businesses,
  profileById,
  actionId,
  search,
  statusFilter,
  onSearch,
  onStatusFilter,
  onUpdateStatus,
}: {
  businesses: BusinessRow[];
  profileById: Map<string, ProfileRow>;
  actionId: string;
  search: string;
  statusFilter: StatusFilter;
  onSearch: (value: string) => void;
  onStatusFilter: (value: StatusFilter) => void;
  onUpdateStatus: (business: BusinessRow, status: BusinessStatus) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm shadow-slate-200/40 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-md flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 transition-colors focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
          <i className="ri-search-line text-slate-400" />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search businesses, owners, email..."
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'active', 'inactive', 'archived'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => onStatusFilter(status)}
              className={cls(
                'rounded-lg px-3 py-2 text-xs font-extrabold transition-colors',
                statusFilter === status
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-600',
              )}
            >
              {status === 'all' ? 'All' : titleCase(status)}
            </button>
          ))}
        </div>
      </div>

      {businesses.length === 0 ? (
        <EmptyState icon="ri-building-line" title="No businesses found" text="Try a different search or status filter." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  {['Business', 'Owner', 'Address', 'Status', 'Created', 'Actions'].map((header) => (
                    <th
                      key={header}
                      className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {businesses.map((business) => {
                  const owner = profileById.get(business.owner_id);
                  return (
                    <tr key={business.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-50 text-sm font-extrabold text-indigo-600">
                            {business.logo_url ? (
                              <img src={business.logo_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              initials(business.business_name)
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-slate-900">{business.business_name}</p>
                            <p className="text-xs font-medium text-slate-400">{business.email || business.phone || 'No contact'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-slate-700">{owner?.name ?? 'Unknown owner'}</p>
                        <p className="text-xs text-slate-400">{owner?.email ?? business.owner_id}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">{business.address || 'No address'}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={business.status} />
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">{formatDate(business.created_at)}</td>
                      <td className="px-5 py-4">
                        <BusinessActions business={business} actionId={actionId} onUpdateStatus={onUpdateStatus} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
