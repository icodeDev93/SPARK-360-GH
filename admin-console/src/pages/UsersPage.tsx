import type { ProfileRow } from '@/types';
import { cls, formatDate, initials } from '@/lib/format';

export function UsersPage({ owners, businessCountByOwner }: { owners: ProfileRow[]; businessCountByOwner: Map<string, number> }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
      <div className="border-b border-slate-100 p-5">
        <h2 className="text-base font-extrabold text-slate-900">Owners</h2>
        <p className="text-xs font-medium text-slate-400">Platform owner accounts and their active business count.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-100 bg-slate-50/70">
            <tr>
              {['Owner', 'Phone', 'Address', 'Status', 'Businesses', 'Joined'].map((header) => (
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
            {owners.map((owner) => (
              <tr key={owner.id} className="transition-colors hover:bg-slate-50/60">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-xs font-extrabold text-white">
                      {initials(owner.name)}
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">{owner.name}</p>
                      <p className="text-xs text-slate-400">{owner.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-slate-500">{owner.phone || 'Not set'}</td>
                <td className="px-5 py-4 text-sm text-slate-500">{owner.address || 'Not set'}</td>
                <td className="px-5 py-4">
                  <span
                    className={cls(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                      owner.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                        : 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-500/10',
                    )}
                  >
                    <span className={cls('h-1.5 w-1.5 rounded-full', owner.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400')} />
                    {owner.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm font-extrabold text-slate-800">{businessCountByOwner.get(owner.id) ?? 0}</td>
                <td className="px-5 py-4 text-sm text-slate-500">{formatDate(owner.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
