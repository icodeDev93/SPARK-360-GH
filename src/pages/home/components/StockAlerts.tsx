import { useStockAlerts } from '@/hooks/useStockAlerts';

const severityStyle = {
  critical: 'bg-red-50 border-red-100',
  low:      'bg-amber-50 border-amber-100',
  warning:  'bg-yellow-50 border-yellow-100',
};

const severityBadge = {
  critical: 'bg-red-100 text-red-600',
  low:      'bg-amber-100 text-amber-700',
  warning:  'bg-yellow-100 text-yellow-700',
};

export default function StockAlerts() {
  const { activeAlerts, dismissAlert, criticalCount } = useStockAlerts();

  return (
    <div className="bg-white rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <i className="ri-alert-line text-base text-amber-500"></i>
          <h3 className="text-slate-800 font-bold text-base">Low Stock Alerts</h3>
          {criticalCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              {criticalCount}
            </span>
          )}
        </div>
        <button className="text-indigo-600 text-xs font-semibold hover:underline cursor-pointer whitespace-nowrap">
          View All
        </button>
      </div>

      {activeAlerts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <i className="ri-checkbox-circle-line text-3xl text-emerald-400 mb-2"></i>
          <p className="text-slate-500 text-sm font-medium">All stock levels are healthy</p>
        </div>
      ) : (
        <ul className="space-y-3 overflow-y-auto flex-1">
          {activeAlerts.map((item) => (
            <li
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${severityStyle[item.severity]}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 text-sm font-semibold truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${severityBadge[item.severity]}`}>
                    {item.severity.toUpperCase()}
                  </span>
                  <span className="text-slate-500 text-xs">{item.stock} / {item.reorder} units</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button className="text-xs border border-amber-300 text-amber-700 px-2.5 py-1 rounded-md hover:bg-amber-100 transition-all cursor-pointer font-medium whitespace-nowrap">
                  Reorder
                </button>
                <button
                  onClick={() => dismissAlert(item.id)}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                  title="Dismiss"
                >
                  <i className="ri-close-line text-sm"></i>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
