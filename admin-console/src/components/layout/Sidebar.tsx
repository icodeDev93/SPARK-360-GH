import { navItems, type PageKey } from '@/lib/nav';
import { cls } from '@/lib/format';

export function Sidebar({
  page,
  pendingCount,
  onNavigate,
}: {
  page: PageKey;
  pendingCount: number;
  onNavigate: (page: PageKey) => void;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
          <i className="ri-building-4-line text-xl" />
        </div>
        <div>
          <p className="text-sm font-extrabold text-slate-900">Bizzy App</p>
          <p className="text-xs font-semibold text-indigo-600">Admin Console</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Menu</p>
        {navItems.map((item) => {
          const active = page === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={cls(
                'group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-bold transition-colors cursor-pointer',
                active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
              )}
            >
              {active && <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-indigo-600" />}
              <i className={cls(item.icon, 'text-lg', active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-500')} />
              {item.label}
              {item.key === 'approvals' && pendingCount > 0 && (
                <span
                  className={cls(
                    'ml-auto rounded-full px-2 py-0.5 text-xs font-bold',
                    active ? 'bg-indigo-600 text-white' : 'bg-amber-100 text-amber-700',
                  )}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-4">
        <div className="rounded-xl bg-slate-50 px-3.5 py-3 text-xs font-medium leading-relaxed text-slate-400">
          Platform controls for business approval and access.
        </div>
      </div>
    </aside>
  );
}
