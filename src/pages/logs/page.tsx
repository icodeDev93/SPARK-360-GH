import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { supabase } from '@/lib/supabase';
import { ROLE_LABELS, useAuth } from '@/hooks/useAuth';
import { cleanLogText, type LogCategory, type LogAction, type LogChange } from '@/lib/activityLog';
import { loadLocalCollection, saveLocalCollection } from '@/lib/localCache';
import { useBusiness } from '@/contexts/BusinessContext';
import { printHtml } from '@/lib/printDocument';

interface LogRow {
  id: string;
  business_id: string | null;
  user_id: string | null;
  user_name: string;
  user_role: string;
  category: string;
  action: string;
  description: string;
  changes: LogChange[] | null;
  created_at: string;
}

const CATEGORY_META: Record<LogCategory, { label: string; icon: string; color: string; bg: string }> = {
  sales:     { label: 'Sales',       icon: 'ri-shopping-cart-2-line',    color: 'text-indigo-700',  bg: 'bg-indigo-100' },
  inventory: { label: 'Inventory',   icon: 'ri-archive-drawer-line',     color: 'text-violet-700',  bg: 'bg-violet-100' },
  expenses:  { label: 'Expenses',    icon: 'ri-wallet-3-line',           color: 'text-amber-700',   bg: 'bg-amber-100' },
  customers: { label: 'Customers',   icon: 'ri-group-line',              color: 'text-cyan-700',    bg: 'bg-cyan-100' },
  credit:    { label: 'Credit',      icon: 'ri-hand-coin-line',          color: 'text-purple-700',  bg: 'bg-purple-100' },
  'bank-deposit': { label: 'Bank Deposit', icon: 'ri-bank-card-line',     color: 'text-blue-700',    bg: 'bg-blue-100' },
  purchases: { label: 'Purchases',   icon: 'ri-store-3-line',            color: 'text-teal-700',    bg: 'bg-teal-100' },
  suppliers: { label: 'Suppliers',   icon: 'ri-truck-line',              color: 'text-orange-700',  bg: 'bg-orange-100' },
  users:     { label: 'Users',       icon: 'ri-user-settings-line',      color: 'text-rose-700',    bg: 'bg-rose-100' },
  settings:  { label: 'Settings',    icon: 'ri-settings-3-line',         color: 'text-slate-700',   bg: 'bg-slate-100' },
  auth:      { label: 'Auth',        icon: 'ri-shield-keyhole-line',     color: 'text-emerald-700', bg: 'bg-emerald-100' },
};

const ACTION_META: Record<LogAction, { label: string; color: string; bg: string }> = {
  create:   { label: 'Created',   color: 'text-emerald-700', bg: 'bg-emerald-100' },
  edit:     { label: 'Edited',    color: 'text-indigo-700',  bg: 'bg-indigo-100' },
  delete:   { label: 'Deleted',   color: 'text-red-700',     bg: 'bg-red-100' },
  login:    { label: 'Login',     color: 'text-emerald-700', bg: 'bg-emerald-100' },
  logout:   { label: 'Logout',    color: 'text-slate-600',   bg: 'bg-slate-100' },
  refund:   { label: 'Refunded',  color: 'text-red-700',     bg: 'bg-red-100' },
  complete: { label: 'Completed', color: 'text-indigo-700',  bg: 'bg-indigo-100' },
};

const ALL_CATEGORIES: LogCategory[] = ['sales', 'inventory', 'expenses', 'customers', 'credit', 'bank-deposit', 'purchases', 'suppliers', 'users', 'settings', 'auth'];
const ALL_ACTIONS: LogAction[] = ['create', 'edit', 'delete', 'login', 'logout', 'refund', 'complete'];

function normalizeFilterValue(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

function getCategoryMeta(category: string) {
  return CATEGORY_META[normalizeFilterValue(category) as LogCategory] ?? {
    label: category || 'Other',
    icon: 'ri-file-list-3-line',
    color: 'text-slate-700',
    bg: 'bg-slate-100',
  };
}

function getActionMeta(action: string) {
  return ACTION_META[normalizeFilterValue(action) as LogAction] ?? {
    label: action || 'Action',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
  };
}

function fullTime(iso: string) {
  return new Date(iso).toLocaleString('en-GH', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function escapeCsv(value: unknown) {
  const text = cleanLogText(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportToCsv(rows: LogRow[], dateFrom: string, dateTo: string, businessName?: string) {
  const headers = ['Date', 'Time', 'User Name', 'User Role', 'Category', 'Action', 'Description', 'Changed Field', 'Previous Value', 'New Value'];
  const lines = rows.flatMap((log) => {
    const created = new Date(log.created_at);
    const base = [
      created.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' }),
      created.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      log.user_name,
      ROLE_LABELS[log.user_role as keyof typeof ROLE_LABELS]?.label ?? log.user_role,
      getCategoryMeta(log.category).label,
      getActionMeta(log.action).label,
      log.description,
    ];

    if (!log.changes?.length) return [[...base, '', '', ''].map(escapeCsv).join(',')];

    return log.changes.map((change) => [
      ...base,
      change.field,
      change.old,
      change.new,
    ].map(escapeCsv).join(','));
  });
  const csv = `\uFEFF${[headers.map(escapeCsv).join(','), ...lines].join('\n')}`;
  const suffix = dateFrom && dateTo ? `${dateFrom}-to-${dateTo}` : dateFrom ? `from-${dateFrom}` : dateTo ? `to-${dateTo}` : 'all';
  const scope = businessName ? `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-` : '';
  const filename = `activity-log-${scope}${suffix}.csv`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: unknown) {
  return cleanLogText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function expandedLogRows(rows: LogRow[]) {
  return rows.flatMap((log) => {
    const created = new Date(log.created_at);
    const base = {
      date: created.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: created.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      userName: log.user_name,
      userRole: ROLE_LABELS[log.user_role as keyof typeof ROLE_LABELS]?.label ?? log.user_role,
      category: getCategoryMeta(log.category).label,
      action: getActionMeta(log.action).label,
      description: log.description,
    };

    if (!log.changes?.length) return [{ ...base, field: '', old: '', next: '' }];
    return log.changes.map((change) => ({
      ...base,
      field: change.field,
      old: change.old,
      next: change.new,
    }));
  });
}

function printLogsPdf(rows: LogRow[], dateFrom: string, dateTo: string, businessName?: string) {
  const suffix = dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : dateFrom ? `From ${dateFrom}` : dateTo ? `To ${dateTo}` : 'All dates';
  const reportRows = expandedLogRows(rows);
  const generatedAt = new Date().toLocaleString('en-GH', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  printHtml(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Activity Log Report</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px; font-family: Arial, sans-serif; color: #0f172a; background: #fff; }
    .header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 18px; }
    h1 { margin: 0; font-size: 22px; line-height: 1.2; }
    .meta { margin-top: 6px; color: #64748b; font-size: 12px; line-height: 1.5; }
    .badge { display: inline-block; border: 1px solid #c7d2fe; background: #eef2ff; color: #4338ca; padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { text-align: left; background: #f8fafc; color: #475569; padding: 8px; border: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: .03em; }
    td { padding: 8px; border: 1px solid #e2e8f0; vertical-align: top; line-height: 1.35; }
    tr { break-inside: avoid; }
    .muted { color: #64748b; }
    .empty { text-align: center; color: #94a3b8; padding: 40px; border: 1px dashed #cbd5e1; border-radius: 12px; }
    @media print {
      body { padding: 18px; }
      .no-print { display: none; }
      table { font-size: 10px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Activity Log Report</h1>
      <div class="meta">
        <div><strong>Business:</strong> ${escapeHtml(businessName || 'Current Business')}</div>
        <div><strong>Date Range:</strong> ${escapeHtml(suffix)}</div>
        <div><strong>Generated:</strong> ${escapeHtml(generatedAt)}</div>
        <div><strong>Total Rows:</strong> ${reportRows.length}</div>
      </div>
    </div>
    <div class="badge">Bizzy App Business Management System</div>
  </div>

  ${reportRows.length === 0 ? '<div class="empty">No log entries found for the selected filters.</div>' : `
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Time</th>
        <th>User</th>
        <th>Role</th>
        <th>Category</th>
        <th>Action</th>
        <th>Description</th>
        <th>Changed Field</th>
        <th>Previous Value</th>
        <th>New Value</th>
      </tr>
    </thead>
    <tbody>
      ${reportRows.map((row) => `
        <tr>
          <td>${escapeHtml(row.date)}</td>
          <td>${escapeHtml(row.time)}</td>
          <td>${escapeHtml(row.userName)}</td>
          <td>${escapeHtml(row.userRole)}</td>
          <td>${escapeHtml(row.category)}</td>
          <td>${escapeHtml(row.action)}</td>
          <td>${escapeHtml(row.description)}</td>
          <td class="muted">${escapeHtml(row.field)}</td>
          <td class="muted">${escapeHtml(row.old)}</td>
          <td>${escapeHtml(row.next)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  `}
</body>
</html>`, { title: 'Activity Log Report', windowFeatures: 'width=1100,height=820' });
}

function getInitials(name: string) {
  return name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

const AVATAR_CYCLE = [
  'bg-indigo-600', 'bg-emerald-600', 'bg-amber-500',
  'bg-rose-500', 'bg-violet-600', 'bg-cyan-600',
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_CYCLE[Math.abs(hash) % AVATAR_CYCLE.length];
}

export default function LogsPage() {
  const { activeBusiness, activeBusinessId } = useBusiness();
  const { currentUser } = useAuth();
  const [logs, setLogs]               = useState<LogRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [catFilter, setCatFilter]     = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [search, setSearch]           = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');

  useEffect(() => {
    (async () => {
      if (!activeBusinessId) {
        setLogs([]);
        setLoading(false);
        return;
      }
      const cached = await loadLocalCollection<LogRow>('user_logs');
      if (cached.length) setLogs(cached.filter((log) => log.business_id === activeBusinessId));
      const { data, error } = await supabase
        .from('user_logs')
        .select('*')
        .eq('business_id', activeBusinessId)
        .order('created_at', { ascending: false })
        .limit(500);
      if (!error && data) {
        const nextLogs = data as LogRow[];
        setLogs(nextLogs);
        saveLocalCollection('user_logs', nextLogs);
      }
      setLoading(false);
    })();

    const channel = supabase
      .channel('user_logs_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_logs' }, (payload) => {
        const next = payload.new as LogRow;
        if (next.business_id === activeBusinessId) {
          setLogs((prev) => {
            if (prev.some((log) => log.id === next.id)) return prev;
            return [next, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeBusinessId]);

  const categoryOptions = useMemo(() => {
    const present = new Set(logs.map((log) => normalizeFilterValue(log.category)).filter(Boolean));
    return [
      ...ALL_CATEGORIES,
      ...Array.from(present).filter((category) => !ALL_CATEGORIES.includes(category as LogCategory)).sort(),
    ];
  }, [logs]);

  const logsForSelectedCategory = useMemo(
    () => logs.filter((log) => catFilter === 'all' || normalizeFilterValue(log.category) === catFilter),
    [catFilter, logs],
  );

  const actionOptions = useMemo(() => {
    const present = new Set(logsForSelectedCategory.map((log) => normalizeFilterValue(log.action)).filter(Boolean));
    return [
      ...ALL_ACTIONS,
      ...Array.from(present).filter((action) => !ALL_ACTIONS.includes(action as LogAction)).sort(),
    ];
  }, [logsForSelectedCategory]);

  useEffect(() => {
    if (catFilter !== 'all' && !categoryOptions.includes(catFilter)) setCatFilter('all');
  }, [catFilter, categoryOptions]);

  useEffect(() => {
    if (actionFilter !== 'all' && !actionOptions.includes(actionFilter)) setActionFilter('all');
  }, [actionFilter, actionOptions]);

  useEffect(() => {
    setExpandedId(null);
  }, [catFilter, actionFilter, search, dateFrom, dateTo, activeBusinessId]);

  const filtered = useMemo(() => logs.filter((log) => {
    const category = normalizeFilterValue(log.category);
    const action = normalizeFilterValue(log.action);
    if (catFilter !== 'all' && category !== catFilter) return false;
    if (actionFilter !== 'all' && action !== actionFilter) return false;

    const q = search.trim().toLowerCase();
    if (q) {
      const description = log.description.toLowerCase();
      const userName = log.user_name.toLowerCase();
      const categoryLabel = getCategoryMeta(log.category).label.toLowerCase();
      const actionLabel = getActionMeta(log.action).label.toLowerCase();
      if (!description.includes(q) && !userName.includes(q) && !categoryLabel.includes(q) && !actionLabel.includes(q)) return false;
    }

    const createdAt = new Date(log.created_at).getTime();
    if (dateFrom && createdAt < new Date(`${dateFrom}T00:00:00`).getTime()) return false;
    if (dateTo && createdAt > new Date(`${dateTo}T23:59:59`).getTime()) return false;
    return true;
  }), [actionFilter, catFilter, dateFrom, dateTo, logs, search]);

  const selectCategory = (category: string) => {
    setCatFilter(category);
    setActionFilter('all');
  };

  const handleDelete = async (logId: string) => {
    if (currentUser?.role !== 'owner') return;
    const { error } = await supabase.from('user_logs').delete().eq('id', logId);
    if (!error) {
      const nextLogs = logs.filter((log) => log.id !== logId);
      setLogs(nextLogs);
      saveLocalCollection('user_logs', nextLogs);
    }
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-slate-800 font-bold text-xl">Activity Log</h2>
          <p className="text-slate-400 text-sm mt-0.5">Full audit trail of all user actions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => printLogsPdf(filtered, dateFrom, dateTo, activeBusiness?.businessName)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 hover:text-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="ri-printer-line text-base"></i>
            Export to PDF
          </button>
          <button
            onClick={() => exportToCsv(filtered, dateFrom, dateTo, activeBusiness?.businessName)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 hover:text-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="ri-download-2-line text-base"></i>
            Export to CSV
          </button>
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <span className="text-indigo-700 text-xs font-semibold">Live</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 mb-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 flex-1">
            <i className="ri-search-line text-slate-400 text-sm"></i>
            <input
              type="text"
              placeholder="Search by description or user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none flex-1"
            />
          </div>
          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 outline-none focus:border-indigo-400 cursor-pointer"
            />
            <span className="text-slate-400 text-sm">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 outline-none focus:border-indigo-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => selectCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${catFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All Categories
          </button>
          {categoryOptions.map((cat) => {
            const m = getCategoryMeta(cat);
            return (
              <button
                key={cat}
                onClick={() => selectCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${catFilter === cat ? `${m.bg} ${m.color}` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <i className={`${m.icon} text-xs`}></i>
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Action pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActionFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${actionFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All Actions
          </button>
          {actionOptions.map((action) => {
            const m = getActionMeta(action);
            return (
              <button
                key={action}
                onClick={() => setActionFilter(action)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${actionFilter === action ? `${m.bg} ${m.color}` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Log entries */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <i className="ri-loader-4-line animate-spin text-2xl text-indigo-400"></i>
            <p className="text-slate-400 text-sm">Loading activity log…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <i className="ri-file-list-3-line text-3xl text-slate-300"></i>
            <p className="text-slate-400 text-sm font-medium">No log entries found</p>
            <p className="text-slate-300 text-xs">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((log) => {
              const catMeta    = getCategoryMeta(log.category);
              const actionMeta = getActionMeta(log.action);
              const roleMeta   = ROLE_LABELS[log.user_role as keyof typeof ROLE_LABELS];
              const expanded   = expandedId === log.id;
              const hasChanges = log.changes && log.changes.length > 0;

              return (
                <div key={log.id} className="px-5 py-4 hover:bg-slate-50/60 transition-all">
                  <div className="flex items-start gap-4">
                    {/* User avatar */}
                    <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${avatarColor(log.user_name)}`}>
                      {getInitials(log.user_name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Top row */}
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-slate-800 text-sm font-semibold">{log.user_name}</span>
                        {roleMeta && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleMeta.bg} ${roleMeta.color}`}>
                            {roleMeta.label}
                          </span>
                        )}
                        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${catMeta.bg} ${catMeta.color}`}>
                          <i className={`${catMeta.icon} text-xs`}></i>
                          {catMeta.label}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${actionMeta.bg} ${actionMeta.color}`}>
                          {actionMeta.label}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-slate-600 text-sm leading-relaxed">{log.description}</p>

                      {/* Changes diff */}
                      {hasChanges && (
                        <div className="mt-2">
                          <button
                            onClick={() => setExpandedId(expanded ? null : log.id)}
                            className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold hover:text-indigo-800 cursor-pointer"
                          >
                            <i className={`${expanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} text-sm`}></i>
                            {expanded ? 'Hide changes' : `Show ${log.changes!.length} change${log.changes!.length !== 1 ? 's' : ''}`}
                          </button>

                          {expanded && (
                            <div className="mt-2 rounded-lg border border-slate-100 overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-slate-50">
                                    <th className="text-left px-3 py-2 text-slate-500 font-semibold uppercase tracking-wide w-1/3">Field</th>
                                    <th className="text-left px-3 py-2 text-red-500 font-semibold uppercase tracking-wide w-1/3">Before</th>
                                    <th className="text-left px-3 py-2 text-emerald-600 font-semibold uppercase tracking-wide w-1/3">After</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {log.changes!.map((c, i) => (
                                    <tr key={i} className="bg-white">
                                      <td className="px-3 py-2 text-slate-700 font-semibold">{c.field}</td>
                                      <td className="px-3 py-2 text-red-600 font-mono line-through opacity-70">{c.old}</td>
                                      <td className="px-3 py-2 text-emerald-700 font-mono font-semibold">{c.new}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex-shrink-0 text-right">
                      <p className="text-slate-500 text-xs font-medium whitespace-nowrap">
                        {new Date(log.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                      {currentUser?.role === 'owner' && (
                        <button
                          type="button"
                          onClick={() => handleDelete(log.id)}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700"
                        >
                          <i className="ri-delete-bin-line"></i>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-slate-400 text-xs">
              Showing <strong className="text-slate-600">{filtered.length}</strong> of <strong className="text-slate-600">{logs.length}</strong> entries
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
