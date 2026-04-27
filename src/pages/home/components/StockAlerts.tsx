import { stockAlerts } from '@/mocks/dashboard';

export default function StockAlerts() {
  return (
    <div className="bg-white rounded-xl p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 flex items-center justify-center text-amber-500">
            <i className="ri-alert-line text-base"></i>
          </span>
          <h3 className="text-slate-800 font-bold text-base">Low Stock Alerts</h3>
        </div>
        <button className="text-indigo-600 text-xs font-semibold hover:underline cursor-pointer whitespace-nowrap">View All</button>
      </div>

      <ul className="space-y-3">
        {stockAlerts.map((item) => (
          <li key={item.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
            <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-white border border-amber-100">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover object-top" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-800 text-sm font-semibold truncate">{item.name}</p>
              <p className="text-red-500 text-xs font-semibold">{item.stock} units left</p>
            </div>
            <button className="text-xs border border-amber-300 text-amber-700 px-2.5 py-1 rounded-md hover:bg-amber-100 transition-all cursor-pointer whitespace-nowrap font-medium">
              Reorder
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
