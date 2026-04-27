import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '@/hooks/useAuth';
import { useStockAlerts } from '@/hooks/useStockAlerts';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/pos': 'Sales (POS)',
  '/sales-history': 'Sales History',
  '/customers': 'Customers',
  '/purchases': 'Purchases',
  '/suppliers': 'Suppliers',
  '/inventory': 'Inventory',
  '/expenses': 'Expenses',
  '/reports': 'Reports',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500', icon: 'ri-error-warning-line' },
  low: { label: 'Low Stock', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500', icon: 'ri-alert-line' },
  warning: { label: 'Warning', color: 'text-orange-500', bg: 'bg-orange-50', dot: 'bg-orange-400', icon: 'ri-alert-line' },
};

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const title = pageTitles[location.pathname] || 'SPark360';
  const [showNotif, setShowNotif] = useState(false);
  const { currentUser } = useAuth();
  const roleInfo = ROLE_LABELS[currentUser.role];
  const { activeAlerts, dismissAlert, dismissAll, criticalCount } = useStockAlerts();

  const totalAlerts = activeAlerts.length;

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-slate-200 flex items-center px-6 z-20">
      {/* Title */}
      <div className="flex-1">
        <h1 className="text-slate-800 font-bold text-lg">{title}</h1>
        <p className="text-slate-400 text-xs">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Search */}
      <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 w-72 mr-4">
        <span className="w-4 h-4 flex items-center justify-center text-slate-400">
          <i className="ri-search-line text-sm"></i>
        </span>
        <input
          type="text"
          placeholder="Search products, customers..."
          className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none flex-1"
        />
        <span className="text-xs text-slate-300 font-mono bg-slate-200 px-1.5 py-0.5 rounded">⌘K</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Stock Alert Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all cursor-pointer relative"
          >
            <i className="ri-notification-3-line text-lg"></i>
            {totalAlerts > 0 && (
              <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-white text-xs font-bold px-1 ${criticalCount > 0 ? 'bg-red-500' : 'bg-amber-500'}`}>
                {totalAlerts}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-11 w-96 bg-white border border-slate-200 rounded-xl overflow-hidden z-50" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm">Stock Alerts</span>
                  {totalAlerts > 0 && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${criticalCount > 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                      {totalAlerts} active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {totalAlerts > 0 && (
                    <button
                      onClick={dismissAll}
                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer whitespace-nowrap transition-all"
                    >
                      Dismiss all
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotif(false)}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 cursor-pointer"
                  >
                    <i className="ri-close-line text-sm"></i>
                  </button>
                </div>
              </div>

              {/* Alert List */}
              <div className="max-h-80 overflow-y-auto">
                {activeAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <span className="w-10 h-10 flex items-center justify-center bg-emerald-50 rounded-full">
                      <i className="ri-checkbox-circle-line text-emerald-500 text-xl"></i>
                    </span>
                    <p className="text-slate-500 text-sm font-semibold">All stock levels are healthy</p>
                    <p className="text-slate-400 text-xs">No alerts at this time</p>
                  </div>
                ) : (
                  activeAlerts.map((alert) => {
                    const cfg = SEVERITY_CONFIG[alert.severity];
                    const pct = Math.round((alert.stock / alert.reorder) * 100);
                    return (
                      <div key={alert.id} className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-all ${alert.severity === 'critical' ? 'bg-red-50/30' : ''}`}>
                        <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                          <img src={alert.image} alt={alert.name} className="w-full h-full object-cover object-top" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`w-4 h-4 flex items-center justify-center ${cfg.color}`}>
                              <i className={`${cfg.icon} text-sm`}></i>
                            </span>
                            <p className="text-slate-800 text-sm font-semibold truncate">{alert.name}</p>
                          </div>
                          <p className="text-slate-400 text-xs mb-1.5">{alert.sku} · {alert.category}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${alert.severity === 'critical' ? 'bg-red-500' : alert.severity === 'low' ? 'bg-amber-500' : 'bg-orange-400'}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-bold font-mono whitespace-nowrap ${cfg.color}`}>
                              {alert.stock} / {alert.reorder}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => dismissAlert(alert.id)}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 text-slate-300 hover:text-slate-500 cursor-pointer flex-shrink-0 mt-0.5 transition-all"
                        >
                          <i className="ri-close-line text-sm"></i>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {activeAlerts.filter((a) => a.severity === 'critical').length} critical · {activeAlerts.filter((a) => a.severity === 'low').length} low
                </span>
                <button
                  onClick={() => { navigate('/inventory'); setShowNotif(false); }}
                  className="text-indigo-600 text-xs font-semibold hover:underline cursor-pointer whitespace-nowrap"
                >
                  View Inventory →
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* User */}
        <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-all">
          <div className={`w-8 h-8 rounded-full ${currentUser.avatarColor} flex items-center justify-center text-white text-xs font-bold`}>{currentUser.initials}</div>
          <div className="hidden lg:block">
            <p className="text-slate-800 text-sm font-semibold leading-none">{currentUser.name}</p>
            <p className={`text-xs mt-0.5 font-semibold ${roleInfo.color}`}>{roleInfo.label}</p>
          </div>
          <span className="w-4 h-4 flex items-center justify-center text-slate-400">
            <i className="ri-arrow-down-s-line text-sm"></i>
          </span>
        </div>
      </div>
    </header>
  );
}
