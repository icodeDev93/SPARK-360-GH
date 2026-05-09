import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '@/hooks/useInventory';
import { useCustomers } from '@/hooks/useCustomers';
import { useSalesLog } from '@/hooks/useSalesLog';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useExpenses } from '@/hooks/useExpenses';

interface SearchResult {
  id: string;
  category: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  route: string;
}

const PAGES: SearchResult[] = [
  { id: 'p-dashboard', category: 'Pages', icon: 'ri-dashboard-line',      iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-500', title: 'Dashboard',          subtitle: 'Overview & KPIs',              route: '/' },
  { id: 'p-pos',       category: 'Pages', icon: 'ri-store-2-line',         iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-500', title: 'Sales (POS)',         subtitle: 'Create new sales',             route: '/pos' },
  { id: 'p-sales',     category: 'Pages', icon: 'ri-receipt-line',         iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-500', title: 'Sales History',      subtitle: 'View past transactions',       route: '/sales-history' },
  { id: 'p-inv',       category: 'Pages', icon: 'ri-box-3-line',           iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-500', title: 'Inventory',          subtitle: 'Manage stock & products',      route: '/inventory' },
  { id: 'p-pur',       category: 'Pages', icon: 'ri-shopping-cart-2-line', iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-500', title: 'Purchases',          subtitle: 'Purchase orders',              route: '/purchases' },
  { id: 'p-sup',       category: 'Pages', icon: 'ri-truck-line',           iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-500', title: 'Suppliers',          subtitle: 'Manage suppliers',             route: '/suppliers' },
  { id: 'p-cus',       category: 'Pages', icon: 'ri-user-line',            iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-500', title: 'Customers',          subtitle: 'Customer management',          route: '/customers' },
  { id: 'p-exp',       category: 'Pages', icon: 'ri-wallet-3-line',        iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-500', title: 'Expenses',           subtitle: 'Expense tracking',             route: '/expenses' },
  { id: 'p-ana',       category: 'Pages', icon: 'ri-bar-chart-box-line',   iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-500', title: 'Analytics & Reports', subtitle: 'Charts, KPIs and exports',   route: '/analytics' },
  { id: 'p-set',       category: 'Pages', icon: 'ri-settings-3-line',      iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-500', title: 'Settings',           subtitle: 'App configuration',            route: '/settings' },
  { id: 'p-usr',       category: 'Pages', icon: 'ri-team-line',            iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-500', title: 'User Management',    subtitle: 'Manage staff accounts',        route: '/users' },
];

const BADGE_COLORS: Record<string, string> = {
  completed:      'bg-emerald-100 text-emerald-700',
  refunded:       'bg-red-100 text-red-600',
  OK:             'bg-emerald-100 text-emerald-700',
  LOW:            'bg-amber-100 text-amber-700',
  'OUT OF STOCK': 'bg-red-100 text-red-600',
  Active:         'bg-emerald-100 text-emerald-700',
  Inactive:       'bg-slate-100 text-slate-500',
  Blocked:        'bg-red-100 text-red-600',
  Retail:         'bg-indigo-100 text-indigo-700',
  Wholesale:      'bg-violet-100 text-violet-700',
  Pending:        'bg-amber-100 text-amber-700',
  Received:       'bg-emerald-100 text-emerald-700',
  Partial:        'bg-blue-100 text-blue-700',
  Cancelled:      'bg-red-100 text-red-600',
  Unpaid:         'bg-red-100 text-red-600',
  Paid:           'bg-emerald-100 text-emerald-700',
};

function badgeClass(badge?: string) {
  return badge ? (BADGE_COLORS[badge] ?? 'bg-slate-100 text-slate-500') : '';
}

function fmt(n: number) {
  return '₵' + n.toLocaleString('en-GH', { minimumFractionDigits: 2 });
}

export default function GlobalSearch() {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { items }               = useInventory();
  const { customers }           = useCustomers();
  const { invoices }            = useSalesLog();
  const { suppliers, orders }   = useSuppliers();
  const { expenses }            = useExpenses();

  // Global shortcut Ctrl/Cmd+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  useEffect(() => { setSelected(0); }, [query]);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();

    if (!q) return PAGES.slice(0, 8);

    const out: SearchResult[] = [];

    // Pages
    PAGES.filter(p =>
      p.title.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q)
    ).forEach(p => out.push(p));

    // Products / Inventory
    items.filter(i =>
      i.productName.toLowerCase().includes(q) ||
      i.sku.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q) ||
      i.supplier.toLowerCase().includes(q)
    ).slice(0, 5).forEach(i => out.push({
      id:         `product-${i.itemId}`,
      category:   'Products',
      icon:       'ri-box-3-line',
      iconBg:     'bg-emerald-50',
      iconColor:  'text-emerald-600',
      title:      i.productName,
      subtitle:   `${i.category} · SKU ${i.sku} · Stock: ${i.currentStock}`,
      badge:      i.stockStatus,
      route:      '/inventory',
    }));

    // Customers
    customers.filter(c =>
      c.fullName.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.email.toLowerCase().includes(q)
    ).slice(0, 5).forEach(c => out.push({
      id:         `customer-${c.customerId}`,
      category:   'Customers',
      icon:       'ri-user-line',
      iconBg:     'bg-blue-50',
      iconColor:  'text-blue-600',
      title:      c.fullName,
      subtitle:   `${c.phone}${c.email ? ' · ' + c.email : ''} · ${c.customerType}`,
      badge:      c.statusFlag,
      route:      '/customers',
    }));

    // Receipts
    invoices.filter(inv =>
      inv.receiptNo.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      inv.cashier.toLowerCase().includes(q) ||
      inv.paymentMethod.toLowerCase().includes(q)
    ).slice(0, 5).forEach(inv => out.push({
      id:         `receipt-${inv.invoiceNo}`,
      category:   'Receipts',
      icon:       'ri-receipt-line',
      iconBg:     'bg-violet-50',
      iconColor:  'text-violet-600',
      title:      inv.receiptNo,
      subtitle:   `${inv.customerName} · ${fmt(inv.netSales)} · ${inv.date}`,
      badge:      inv.status,
      route:      '/sales-history',
    }));

    // Suppliers
    suppliers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.contact.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    ).slice(0, 4).forEach(s => out.push({
      id:         `supplier-${s.id}`,
      category:   'Suppliers',
      icon:       'ri-truck-line',
      iconBg:     'bg-orange-50',
      iconColor:  'text-orange-500',
      title:      s.name,
      subtitle:   `${s.category} · ${s.phone}`,
      badge:      s.status,
      route:      '/suppliers',
    }));

    // Purchase Orders
    orders.filter(o =>
      o.id.toLowerCase().includes(q) ||
      o.supplierName.toLowerCase().includes(q)
    ).slice(0, 4).forEach(o => out.push({
      id:         `order-${o.id}`,
      category:   'Purchase Orders',
      icon:       'ri-shopping-cart-2-line',
      iconBg:     'bg-amber-50',
      iconColor:  'text-amber-600',
      title:      o.id,
      subtitle:   `${o.supplierName} · ${fmt(o.total)} · ${o.date}`,
      badge:      o.status,
      route:      '/purchases',
    }));

    // Expenses
    expenses.filter(e =>
      e.description.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q)
    ).slice(0, 4).forEach(e => out.push({
      id:         `expense-${e.expenseId}`,
      category:   'Expenses',
      icon:       'ri-wallet-3-line',
      iconBg:     'bg-rose-50',
      iconColor:  'text-rose-500',
      title:      e.description,
      subtitle:   `${e.category} · ${fmt(e.amountGHS)} · ${e.date}`,
      route:      '/expenses',
    }));

    return out;
  }, [query, items, customers, invoices, suppliers, orders, expenses]);

  function go(r: SearchResult) {
    navigate(r.route);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && results[selected]) go(results[selected]);
  }

  // Scroll active row into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  // Group results by category for rendering
  const groups = useMemo(() => {
    const map: Record<string, { result: SearchResult; flatIdx: number }[]> = {};
    let idx = 0;
    for (const r of results) {
      if (!map[r.category]) map[r.category] = [];
      map[r.category].push({ result: r, flatIdx: idx++ });
    }
    return map;
  }, [results]);

  return (
    <>
      {/* Trigger bar */}
      <div
        className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 w-72 mr-4 cursor-pointer hover:border-indigo-300 transition-all group"
        onClick={() => setOpen(true)}
      >
        <span className="w-4 h-4 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors">
          <i className="ri-search-line text-sm"></i>
        </span>
        <span className="text-sm text-slate-400 flex-1 select-none">Search anything...</span>
      </div>

      {/* Spotlight overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[8vh] bg-black/40 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 flex flex-col overflow-hidden" style={{ maxHeight: '72vh', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>

            {/* Input row */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 flex-shrink-0">
              <i className="ri-search-line text-slate-400 text-xl flex-shrink-0"></i>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search products, customers, receipts, suppliers..."
                className="flex-1 text-slate-800 text-base outline-none placeholder-slate-400 bg-transparent"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors flex-shrink-0"
                >
                  <i className="ri-close-circle-fill text-lg"></i>
                </button>
              )}
            </div>

            {/* Results */}
            <div ref={listRef} className="overflow-y-auto flex-1 p-2">
              {results.length === 0 ? (
                <div className="flex flex-col items-center py-14 text-slate-400">
                  <i className="ri-search-eye-line text-4xl mb-3"></i>
                  <p className="text-sm font-semibold text-slate-500">No results for "{query}"</p>
                  <p className="text-xs mt-1">Try a product name, receipt number, or customer phone</p>
                </div>
              ) : (
                Object.entries(groups).map(([cat, entries]) => (
                  <div key={cat}>
                    <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest px-3 py-2 mt-1">
                      {cat}
                    </p>
                    {entries.map(({ result: r, flatIdx: fi }) => {
                      const active = selected === fi;
                      return (
                        <button
                          key={r.id}
                          data-idx={fi}
                          onMouseEnter={() => setSelected(fi)}
                          onClick={() => go(r)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${active ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                        >
                          <span className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl ${r.iconBg} ${r.iconColor}`}>
                            <i className={`${r.icon} text-base`}></i>
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${active ? 'text-indigo-700' : 'text-slate-800'}`}>
                              {r.title}
                            </p>
                            <p className="text-xs text-slate-400 truncate">{r.subtitle}</p>
                          </div>
                          {r.badge && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 capitalize ${badgeClass(r.badge)}`}>
                              {r.badge}
                            </span>
                          )}
                          <i className={`ri-arrow-right-s-line flex-shrink-0 text-lg ${active ? 'text-indigo-400' : 'text-slate-200'}`}></i>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hints */}
            <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center gap-5 flex-shrink-0">
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <kbd className="font-mono text-slate-500 border border-slate-200 rounded px-1.5 py-0.5 bg-white text-[10px]">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <kbd className="font-mono text-slate-500 border border-slate-200 rounded px-1.5 py-0.5 bg-white text-[10px]">↵</kbd>
                Open
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <kbd className="font-mono text-slate-500 border border-slate-200 rounded px-1.5 py-0.5 bg-white text-[10px]">Esc</kbd>
                Close
              </span>
              {query && (
                <span className="ml-auto text-xs text-slate-400">{results.length} result{results.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
