import type { BusinessRow, BusinessStatus, BusinessUserRow, ProfileRow } from '@/types';
import { cls, formatDate, initials } from '@/lib/format';
import { statusConfig } from '@/lib/status';
import { MetricCard } from '@/components/ui/MetricCard';
import { SummaryLine } from '@/components/ui/SummaryLine';
import { StatusBadge } from '@/components/ui/StatusBadge';

const statusOrder: BusinessStatus[] = ['active', 'pending', 'inactive', 'archived'];

export function Dashboard({
  businesses,
  profiles,
  memberships,
  statusCounts,
  onOpenApprovals,
}: {
  businesses: BusinessRow[];
  profiles: ProfileRow[];
  memberships: BusinessUserRow[];
  statusCounts: Record<BusinessStatus, number>;
  onOpenApprovals: () => void;
}) {
  const owners = profiles.filter((profile) => profile.role === 'owner').length;
  const activeUsers = profiles.filter((profile) => profile.status === 'Active').length;
  const totalBusinesses = businesses.length || 1;

  const recentBusinesses = [...businesses]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const ownerName = (ownerId: string) => profiles.find((profile) => profile.id === ownerId)?.name ?? 'Unknown owner';

  return (
    <div className="space-y-6">
      {statusCounts.pending > 0 ? (
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <i className="ri-time-line text-xl" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-amber-900">
                {statusCounts.pending} business{statusCounts.pending === 1 ? '' : 'es'} waiting for approval
              </p>
              <p className="text-xs font-medium text-amber-700/80">New signups need a decision before they can start operating.</p>
            </div>
          </div>
          <button
            onClick={onOpenApprovals}
            className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-amber-200 transition-colors hover:bg-amber-700"
          >
            Review Pending
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <i className="ri-checkbox-circle-line text-xl" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-emerald-900">All caught up</p>
            <p className="text-xs font-medium text-emerald-700/80">No businesses are waiting for approval right now.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Businesses" value={businesses.length} icon="ri-building-line" color="bg-indigo-50 text-indigo-600" />
        <MetricCard label="Active Businesses" value={statusCounts.active} icon="ri-checkbox-circle-line" color="bg-emerald-50 text-emerald-600" />
        <MetricCard label="Platform Users" value={profiles.length} icon="ri-group-line" color="bg-slate-100 text-slate-600" />
        <MetricCard label="Owners" value={owners} icon="ri-user-star-line" color="bg-slate-100 text-slate-600" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40">
          <h2 className="text-base font-extrabold text-slate-900">Business Status</h2>
          <p className="text-xs font-medium text-slate-400">Approval state across the platform.</p>

          <div className="mt-5 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            {statusOrder.map((status) =>
              statusCounts[status] > 0 ? (
                <div
                  key={status}
                  className={statusConfig[status].dot}
                  style={{ width: `${(statusCounts[status] / totalBusinesses) * 100}%` }}
                />
              ) : null,
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {statusOrder.map((status) => (
              <div key={status} className="flex items-center gap-2">
                <span className={cls('h-2 w-2 shrink-0 rounded-full', statusConfig[status].dot)} />
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-slate-900">
                    {statusCounts[status]}
                    <span className="ml-1 text-xs font-medium text-slate-400">
                      {Math.round((statusCounts[status] / totalBusinesses) * 100)}%
                    </span>
                  </p>
                  <p className="truncate text-xs font-semibold text-slate-400">{statusConfig[status].label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40">
          <h2 className="text-base font-extrabold text-slate-900">User Snapshot</h2>
          <div className="mt-4 space-y-3">
            <SummaryLine label="Active Users" value={activeUsers} />
            <SummaryLine label="Business Memberships" value={memberships.length} />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-base font-extrabold text-slate-900">Recently Added Businesses</h2>
          <p className="text-xs font-medium text-slate-400">The latest signups across the platform.</p>
        </div>

        {recentBusinesses.length === 0 ? (
          <p className="p-5 text-sm font-medium text-slate-400">No businesses have been added yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  {['Business', 'Owner', 'Status', 'Created'].map((header) => (
                    <th
                      key={header}
                      className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentBusinesses.map((business) => (
                  <tr key={business.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-indigo-50 text-xs font-extrabold text-indigo-600">
                          {business.logo_url ? (
                            <img src={business.logo_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            initials(business.business_name)
                          )}
                        </div>
                        <p className="truncate text-sm font-extrabold text-slate-900">{business.business_name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{ownerName(business.owner_id)}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={business.status} />
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{formatDate(business.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
