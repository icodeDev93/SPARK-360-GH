import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from '@/contexts/SidebarContext';
import { useBusiness } from '@/contexts/BusinessContext';

const ALL_NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: 'ri-dashboard-3-line', exact: true, permission: 'dashboard' },
  { path: '/pos', label: 'Sales (POS)', icon: 'ri-shopping-cart-2-line', badge: 'Live', permission: 'pos' },
  { path: '/sales-history', label: 'Sales History', icon: 'ri-receipt-line', permission: 'sales-history' },
  { path: '/customers', label: 'Customers', icon: 'ri-group-line', permission: 'customers' },
  { path: '/credit',    label: 'Credit Invoices', icon: 'ri-hand-coin-line', permission: 'credit' },
  { path: '/suppliers', label: 'Purchases & Supplies', icon: 'ri-store-3-line', permission: 'purchases' },
  { path: '/inventory', label: 'Inventory', icon: 'ri-archive-drawer-line', permission: 'inventory' },
  { path: '/expenses', label: 'Expenses', icon: 'ri-wallet-3-line', permission: 'expenses' },
  { path: '/bank-deposit', label: 'Bank Deposit', icon: 'ri-bank-card-line', permission: 'bank-deposit' },
  { path: '/stock-transfer', label: 'Stock Transfer', icon: 'ri-arrow-left-right-line', permission: 'stock-transfer' },
  { path: '/analytics', label: 'Analytics & Reports', icon: 'ri-pie-chart-2-line', permission: 'reports' },
];

const BOTTOM_ITEMS = [
  { path: '/users',    label: 'User Management', icon: 'ri-user-settings-line', permission: 'users' },
  { path: '/settings', label: 'Settings',        icon: 'ri-settings-3-line',    permission: 'settings' },
];

export default function Sidebar() {
  const { hasPermission, currentUser } = useAuth();
  const { businesses, activeBusinessId, activeBusiness, selectBusiness } = useBusiness();
  const { isOpen, isCollapsed, close, toggleCollapsed } = useSidebar();
  const navigate = useNavigate();
  const visibleNav    = ALL_NAV_ITEMS.filter((item) => hasPermission(item.permission));
  const visibleBottom = [
    ...BOTTOM_ITEMS.filter((item) => hasPermission(item.permission)),
    ...(hasPermission('logs') ? [{ path: '/logs', label: 'Activity Log', icon: 'ri-file-list-3-line' }] : []),
  ];
  const canReturnToBusinessSelection = currentUser && currentUser.role !== 'cashier';

  const handleViewBusinesses = () => {
    navigate('/businesses');
    close();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[25] lg:hidden"
          onClick={close}
        />
      )}

      <aside className={`fixed left-0 top-0 h-screen bg-slate-900 flex flex-col z-30 transition-[width,transform] duration-200 ease-in-out ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Logo */}
        <div className={`flex items-center border-b border-slate-700/50 ${isCollapsed ? 'lg:justify-center lg:px-3' : 'px-5'} py-5 gap-3`}>
          {activeBusiness?.logoUrl ? (
            <div className="w-9 h-9 flex-shrink-0 rounded-lg bg-white overflow-hidden flex items-center justify-center">
              <img
                src={activeBusiness.logoUrl}
                alt={activeBusiness?.businessName ?? 'Selected business'}
                className="w-full h-full object-contain p-1"
              />
            </div>
          ) : (
            <img
              src="https://public.readdy.ai/ai/img_res/9cd4e698-d740-4b81-959f-322698fcc5bc.png"
              alt={activeBusiness?.businessName ?? 'Selected business'}
              className="w-9 h-9 object-contain rounded-lg"
            />
          )}
          <div className={`min-w-0 ${isCollapsed ? 'lg:hidden' : ''}`}>
            <span className="block truncate text-white font-bold text-sm leading-tight tracking-tight">
              {activeBusiness?.businessName ?? 'Select Business'}
            </span>
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            className={`hidden lg:flex w-8 h-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all cursor-pointer ${isCollapsed ? 'absolute -right-4 top-6 bg-slate-900 border border-slate-700' : 'ml-auto'}`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <i className={`${isCollapsed ? 'ri-arrow-right-s-line' : 'ri-arrow-left-s-line'} text-lg`}></i>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto overflow-x-hidden">
          <p className={`text-slate-500 text-xs font-semibold uppercase tracking-widest px-3 mb-3 ${isCollapsed ? 'lg:hidden' : ''}`}>Main Menu</p>
          <ul className="space-y-0.5">
            {visibleNav.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.exact}
                  onClick={close}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${isCollapsed ? 'lg:justify-center lg:px-2' : ''} ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`
                  }
                  title={isCollapsed ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      <span className={`w-5 h-5 flex items-center justify-center text-base ${isActive ? 'text-white' : 'text-slate-400'}`}>
                        <i className={item.icon}></i>
                      </span>
                      <span className={`flex-1 ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                      {item.badge && (
                        <span className={`flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-semibold ${isCollapsed ? 'lg:hidden' : ''}`}>
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          {visibleBottom.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-700/50">
              <p className={`text-slate-500 text-xs font-semibold uppercase tracking-widest px-3 mb-3 ${isCollapsed ? 'lg:hidden' : ''}`}>System</p>
              <ul className="space-y-0.5">
                {visibleBottom.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={close}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${isCollapsed ? 'lg:justify-center lg:px-2' : ''} ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`
                      }
                      title={isCollapsed ? item.label : undefined}
                    >
                      {({ isActive }) => (
                        <>
                          <span className={`w-5 h-5 flex items-center justify-center text-base ${isActive ? 'text-white' : 'text-slate-400'}`}>
                            <i className={item.icon}></i>
                          </span>
                          <span className={isCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        {canReturnToBusinessSelection && (
          <div className={`px-3 py-4 border-t border-slate-700/50 ${isCollapsed ? 'lg:hidden' : ''}`}>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest px-3 mb-2">Business</p>
            <div className="relative">
              <select
                value={activeBusinessId ?? ''}
                onChange={(event) => selectBusiness(event.target.value)}
                className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 pr-8 text-sm font-semibold text-white outline-none focus:border-indigo-400"
              >
                {businesses.filter((business) => business.status === 'active').map((business) => (
                  <option key={business.id} value={business.id}>{business.businessName}</option>
                ))}
              </select>
              <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
            </div>
            {activeBusiness && (
              <p className="text-slate-500 text-xs mt-2 px-1 truncate">{activeBusiness.address || 'No address set'}</p>
            )}
            <button
              type="button"
              onClick={handleViewBusinesses}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-bold text-slate-200 hover:border-indigo-400 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
            >
              <i className="ri-building-4-line text-base"></i>
              View All Businesses
            </button>
          </div>
        )}

      </aside>
    </>
  );
}
