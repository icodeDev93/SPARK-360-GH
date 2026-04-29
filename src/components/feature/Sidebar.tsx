import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth, ROLE_PERMISSIONS, ROLE_LABELS, ROLE_USERS } from '@/hooks/useAuth';

const ALL_NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: 'ri-dashboard-3-line', exact: true, permission: 'dashboard' },
  { path: '/pos', label: 'Sales (POS)', icon: 'ri-shopping-cart-2-line', badge: 'Live', permission: 'pos' },
  { path: '/sales-history', label: 'Sales History', icon: 'ri-receipt-line', permission: 'sales-history' },
  { path: '/customers', label: 'Customers', icon: 'ri-group-line', permission: 'customers' },
  { path: '/purchases', label: 'Purchases', icon: 'ri-truck-line', permission: 'purchases' },
  { path: '/suppliers', label: 'Suppliers', icon: 'ri-store-3-line', permission: 'purchases' },
  { path: '/inventory', label: 'Inventory', icon: 'ri-archive-drawer-line', permission: 'inventory' },
  { path: '/expenses', label: 'Expenses', icon: 'ri-wallet-3-line', permission: 'expenses' },
  { path: '/reports', label: 'Reports', icon: 'ri-bar-chart-box-line', permission: 'reports' },
  { path: '/analytics', label: 'Analytics', icon: 'ri-pie-chart-2-line', permission: 'reports' },
];

const BOTTOM_ITEMS = [
  { path: '/users',    label: 'User Management', icon: 'ri-user-settings-line', permission: 'users' },
  { path: '/settings', label: 'Settings',        icon: 'ri-settings-3-line',    permission: 'settings' },
];

export default function Sidebar() {
  const { currentUser, switchUser, allUsers } = useAuth();
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const permissions = ROLE_PERMISSIONS[currentUser.role];
  const roleInfo = ROLE_LABELS[currentUser.role];

  const visibleNav = ALL_NAV_ITEMS.filter((item) => permissions.includes(item.permission));
  const visibleBottom = BOTTOM_ITEMS.filter((item) => permissions.includes(item.permission));

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50">
        <img
          src="https://public.readdy.ai/ai/img_res/9cd4e698-d740-4b81-959f-322698fcc5bc.png"
          alt="SPark360"
          className="w-9 h-9 object-contain rounded-lg"
        />
        <div>
          <span className="text-white font-bold text-lg leading-none tracking-tight">SPark360</span>
          <p className="text-slate-400 text-xs mt-0.5">POS & Inventory</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest px-3 mb-3">Main Menu</p>
        <ul className="space-y-0.5">
          {visibleNav.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`w-5 h-5 flex items-center justify-center text-base ${isActive ? 'text-white' : 'text-slate-400'}`}>
                      <i className={item.icon}></i>
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-semibold">
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
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest px-3 mb-3">System</p>
            <ul className="space-y-0.5">
              {visibleBottom.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={`w-5 h-5 flex items-center justify-center text-base ${isActive ? 'text-white' : 'text-slate-400'}`}>
                          <i className={item.icon}></i>
                        </span>
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {/* User Profile + Role Switcher */}
      <div className="px-3 py-4 border-t border-slate-700/50 relative">
        <button
          onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 cursor-pointer transition-all"
        >
          <div className={`w-9 h-9 rounded-full ${currentUser.avatarColor} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
            {currentUser.initials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-white text-sm font-semibold truncate">{currentUser.name}</p>
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${roleInfo.bg} ${roleInfo.color}`}>
              {roleInfo.label}
            </span>
          </div>
          <span className="w-4 h-4 flex items-center justify-center text-slate-400">
            <i className={showRoleSwitcher ? 'ri-arrow-down-s-line text-sm' : 'ri-arrow-up-s-line text-sm'}></i>
          </span>
        </button>

        {/* Role Switcher Dropdown */}
        {showRoleSwitcher && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-700">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Switch User / Role</p>
            </div>
            {allUsers.map((user) => {
              const info = ROLE_LABELS[user.role];
              const isActive = user.id === currentUser.id;
              return (
                <button
                  key={user.id}
                  onClick={() => { switchUser(user.id); setShowRoleSwitcher(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-all cursor-pointer text-left ${isActive ? 'bg-slate-700/50' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full ${user.avatarColor} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                    {user.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{user.name}</p>
                    <span className={`text-xs font-semibold ${info.color}`}>{info.label}</span>
                  </div>
                  {isActive && (
                    <span className="w-5 h-5 flex items-center justify-center text-emerald-400">
                      <i className="ri-checkbox-circle-fill text-sm"></i>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
