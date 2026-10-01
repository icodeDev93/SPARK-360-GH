import type { Session } from '@supabase/supabase-js';
import { navItems, type PageKey } from '@/lib/nav';
import { initials, titleCase } from '@/lib/format';
import type { PlatformAdminRow } from '@/types';

export function Topbar({
  page,
  session,
  admin,
  onRefresh,
  onSignOut,
}: {
  page: PageKey;
  session: Session;
  admin: PlatformAdminRow | null;
  onRefresh: () => void;
  onSignOut: () => void;
}) {
  const current = navItems.find((item) => item.key === page);

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md lg:px-8">
      <div>
        <h1 className="text-lg font-extrabold tracking-tight text-slate-900">{current?.label}</h1>
        <p className="text-xs font-medium text-slate-400">Platform controls for business approval and access.</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          className="hidden h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:flex"
        >
          <i className="ri-refresh-line" />
          Refresh
        </button>
        <div className="hidden h-9 w-px bg-slate-200 sm:block" />
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-xs font-extrabold text-white">
            {initials(session.user.email ?? 'Admin')}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-slate-800">{session.user.email}</p>
            <p className="text-xs font-semibold text-slate-400">
              {admin?.role ? titleCase(admin.role.replace('_', ' ')) : 'Platform Admin'}
            </p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          title="Sign out"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <i className="ri-logout-box-r-line text-lg" />
        </button>
      </div>
    </header>
  );
}
