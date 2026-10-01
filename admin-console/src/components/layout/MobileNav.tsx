import { navItems, type PageKey } from '@/lib/nav';
import { cls } from '@/lib/format';

export function MobileNav({ page, onNavigate }: { page: PageKey; onNavigate: (page: PageKey) => void }) {
  return (
    <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
      <div className="flex gap-2 overflow-x-auto">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={cls(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors',
              page === item.key ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600',
            )}
          >
            <i className={item.icon} />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
