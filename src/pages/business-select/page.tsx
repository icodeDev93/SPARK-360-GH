import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness, type BusinessRecord } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import { sanitizeText } from '@/lib/sanitize';
import { useFeedbackModal } from '@/hooks/useFeedbackModal';

interface BusinessStats {
  revenue: number;
  orders: number;
  staff: number;
  lastActive: string | null;
}

const EMPTY_STATS: BusinessStats = { revenue: 0, orders: 0, staff: 0, lastActive: null };

const formatCurrencyCompact = (value: number) => {
  if (value >= 1_000_000) return `GH₵${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `GH₵${(value / 1_000).toFixed(1)}K`;
  return `GH₵${value.toFixed(0)}`;
};

const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);

const initialsFor = (name: string) =>
  name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'B';

const relativeTime = (iso: string | null) => {
  if (!iso) return 'No activity yet';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60_000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const defaultForm = { businessName: '', address: '' };

export default function BusinessSelectPage() {
  const navigate = useNavigate();
  const { currentUser, sessionLoading, logout } = useAuth();
  const {
    businesses,
    activeBusinessId,
    loading,
    loadError,
    selectBusiness,
    refreshBusinesses,
    createBusiness,
    updateBusiness,
    archiveBusiness,
  } = useBusiness();
  const { showFeedback } = useFeedbackModal();

  const [query, setQuery] = useState('');
  const [menuBusinessId, setMenuBusinessId] = useState<string | null>(null);
  const [editingBusiness, setEditingBusiness] = useState<BusinessRecord | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<BusinessRecord | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [statsByBusiness, setStatsByBusiness] = useState<Record<string, BusinessStats>>({});
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isOwner = currentUser?.role === 'owner';
  const canManageBusiness = currentUser?.role === 'owner';

  useEffect(() => {
    const fetchStats = async () => {
      const ids = businesses.map((b) => b.id);
      if (!ids.length) { setStatsByBusiness({}); return; }

      const next = Object.fromEntries(ids.map((id) => [id, { ...EMPTY_STATS }])) as Record<string, BusinessStats>;

      const [salesRes, membersRes] = await Promise.all([
        supabase.from('sales').select('business_id,total_amount,status,created_at,sale_time').in('business_id', ids),
        supabase.from('business_users').select('business_id').in('business_id', ids),
      ]);

      if (!salesRes.error) {
        for (const row of salesRes.data ?? []) {
          const bid = row.business_id as string;
          if (!next[bid]) continue;
          if (row.status !== 'voided' && row.status !== 'refunded') next[bid].orders += 1;
          if (row.status === 'completed') next[bid].revenue += Number(row.total_amount ?? 0);
          const activity = (row.sale_time ?? row.created_at ?? null) as string | null;
          if (activity && (!next[bid].lastActive || new Date(activity) > new Date(next[bid].lastActive!))) {
            next[bid].lastActive = activity;
          }
        }
      }

      if (!membersRes.error) {
        for (const row of membersRes.data ?? []) {
          const bid = row.business_id as string;
          if (next[bid]) next[bid].staff += 1;
        }
      }

      setStatsByBusiness(next);
    };

    fetchStats();
  }, [businesses]);

  useEffect(() => {
    if (!menuBusinessId) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenuBusinessId(null);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [menuBusinessId]);

  const filteredBusinesses = businesses.filter((b) => {
    const needle = query.toLowerCase().trim();
    if (!needle) return true;
    return b.businessName.toLowerCase().includes(needle) || b.address.toLowerCase().includes(needle);
  });

  const totals = useMemo(() => {
    const stats = businesses.map((b) => statsByBusiness[b.id] ?? EMPTY_STATS);
    return {
      businesses: businesses.length,
      revenue: stats.reduce((s, st) => s + st.revenue, 0),
      staff: stats.reduce((s, st) => s + st.staff, 0),
      orders: stats.reduce((s, st) => s + st.orders, 0),
    };
  }, [businesses, statsByBusiness]);

  const resetForm = () => { setForm(defaultForm); setError(''); setSaving(false); setEditingBusiness(null); setShowCreate(false); };
  const openCreate = () => { setForm(defaultForm); setError(''); setEditingBusiness(null); setShowCreate(true); };
  const openEdit = (b: BusinessRecord) => { setForm({ businessName: b.businessName, address: b.address }); setError(''); setEditingBusiness(b); setShowCreate(true); setMenuBusinessId(null); };

  const handleSave = async () => {
    const businessName = sanitizeText(form.businessName);
    const address = sanitizeText(form.address);
    if (!businessName) { setError('Business name is required.'); return; }
    if (!address) { setError('Business address is required.'); return; }
    setSaving(true);
    const result = editingBusiness
      ? await updateBusiness(editingBusiness.id, { businessName, address })
      : await createBusiness({ businessName, address });
    setSaving(false);
    if (!result.success) { setError(result.error ?? 'Unable to save business.'); return; }
    showFeedback({
      title: editingBusiness ? 'Business Updated' : 'Business Created',
      message: editingBusiness ? `${businessName} has been updated.` : `${businessName} has been added.`,
      buttonLabel: 'Continue',
    });
    resetForm();
  };

  const handleSelect = (businessId: string) => { selectBusiness(businessId); setMenuBusinessId(null); };
  const handleManageMembers = (businessId: string) => { selectBusiness(businessId); setMenuBusinessId(null); navigate('/users'); };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setSaving(true);
    const result = await archiveBusiness(archiveTarget.id);
    setSaving(false);
    if (!result.success) { setError(result.error ?? 'Unable to remove business.'); return; }
    showFeedback({ title: 'Business Removed', message: `${archiveTarget.businessName} has been archived.`, buttonLabel: 'Continue', kind: 'deleted' });
    setArchiveTarget(null);
  };

  const kpiCards = [
    { label: 'Total Businesses', value: formatNumber(totals.businesses), icon: 'ri-building-4-line', cls: 'bg-indigo-50 text-indigo-600' },
    { label: 'Total Revenue', value: formatCurrencyCompact(totals.revenue), icon: 'ri-cash-line', cls: 'bg-indigo-50 text-indigo-600' },
    { label: 'Total Staff', value: formatNumber(totals.staff), icon: 'ri-team-line', cls: 'bg-indigo-50 text-indigo-600' },
    { label: 'Active Orders', value: formatNumber(totals.orders), icon: 'ri-shopping-cart-2-line', cls: 'bg-indigo-50 text-indigo-600' },
  ];

  if (!sessionLoading && !currentUser) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
            <i className="ri-building-4-line text-base"></i>
          </div>
          <span className="text-slate-950 text-[17px] font-bold tracking-tight">Bizzy App Business Management System</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50">
            <i className="ri-moon-line text-base"></i>
          </button>
          <button type="button" className="relative w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50">
            <i className="ri-notification-3-line text-base"></i>
            <span className="absolute right-1.5 top-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white"></span>
          </button>
          <div className="h-6 w-px bg-slate-100 mx-1"></div>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full ${currentUser?.avatarColor ?? 'bg-slate-400'} text-white flex items-center justify-center text-xs font-bold overflow-hidden`}>
              {currentUser?.avatarUrl
                ? <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                : (currentUser?.initials ?? 'OW')}
            </div>
            <span className="hidden sm:block text-slate-800 text-sm font-semibold">{currentUser?.name ?? 'Owner'}</span>
          </div>
          <button type="button" onClick={logout} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50">
            <i className="ri-logout-box-r-line text-base"></i>
          </button>
        </div>
      </header>

      <main className="px-4 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-[960px]">

          {/* Title */}
          <div className="mb-7">
            <h1 className="text-slate-950 text-[22px] font-bold leading-tight">Your Businesses</h1>
            <p className="text-slate-400 text-[13px] mt-0.5">Select a business to manage, or create a new one.</p>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {kpiCards.map((card) => (
              <div key={card.label} className="bg-white border border-slate-200 rounded-xl px-4 py-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${card.cls} flex items-center justify-center shrink-0`}>
                  <i className={`${card.icon} text-lg`}></i>
                </div>
                <div className="min-w-0">
                  <p className="text-slate-950 font-bold text-xl leading-tight">{card.value}</p>
                  <p className="text-slate-400 text-xs leading-tight truncate">{card.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="relative w-52">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search businesses..."
                className="w-full h-9 border border-slate-200 rounded-lg pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white"
              />
            </div>
            {isOwner && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 h-9 rounded-lg text-sm font-semibold transition-colors"
              >
                <i className="ri-add-line text-base"></i>
                Add Business
              </button>
            )}
          </div>

          {loadError && (
            <div className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <i className="ri-error-warning-line mt-0.5 text-base"></i>
                <span>{loadError}</span>
              </div>
              <button
                type="button"
                onClick={() => void refreshBusinesses()}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Grid */}
          {loading || sessionLoading ? (
            <div className="bg-white border border-slate-100 rounded-xl p-12 flex flex-col items-center gap-3">
              <i className="ri-loader-4-line animate-spin text-indigo-600 text-2xl"></i>
              <p className="text-slate-400 text-sm">Loading businesses...</p>
            </div>
          ) : !isOwner && businesses.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <i className="ri-building-line text-4xl text-slate-300"></i>
              <h2 className="text-slate-800 font-bold mt-4">No businesses available</h2>
              <p className="text-slate-400 text-sm mt-1">Ask the owner to assign you to a business.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBusinesses.length === 0 && businesses.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-center text-center px-6 py-14">
                  <i className="ri-search-eye-line text-3xl text-slate-300"></i>
                  <p className="text-slate-600 text-sm font-semibold mt-3">No businesses match your search.</p>
                </div>
              )}

              {filteredBusinesses.map((business) => {
                const isActive = activeBusinessId === business.id;
                const stats = statsByBusiness[business.id] ?? EMPTY_STATS;
                return (
                  <button
                    key={business.id}
                    type="button"
                    onClick={() => handleSelect(business.id)}
                    className={`relative bg-white border rounded-2xl p-5 text-left transition-all hover:shadow-md flex flex-col ${
                      isActive
                        ? 'border-indigo-400 ring-1 ring-indigo-400 bg-indigo-50/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-3.5 top-3.5 inline-flex items-center bg-indigo-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        Selected
                      </span>
                    )}

                    {/* Logo + menu row */}
                    <div className={`flex items-start justify-between mb-4 ${isActive ? 'mt-6' : ''}`}>
                      <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                        {business.logoUrl
                          ? <img src={business.logoUrl} alt={business.businessName} className="w-full h-full object-cover" />
                          : initialsFor(business.businessName)}
                      </div>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                        <div className="relative" ref={menuBusinessId === business.id ? menuRef : null}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setMenuBusinessId(menuBusinessId === business.id ? null : business.id); }}
                            className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
                          >
                            <i className="ri-more-2-fill text-base"></i>
                          </button>
                          {menuBusinessId === business.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-9 z-20 w-52 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                            >
                              <div className="px-3 py-2.5 border-b border-slate-100">
                                <p className="text-slate-500 text-sm font-bold truncate">{business.businessName}</p>
                              </div>
                              {canManageBusiness && (
                                <button type="button" onClick={() => openEdit(business)} className="w-full px-3 py-2.5 flex items-center gap-3 text-sm text-slate-700 hover:bg-slate-50">
                                  <i className="ri-pencil-line text-indigo-600"></i>
                                  Update info
                                </button>
                              )}
                              <button type="button" onClick={() => handleManageMembers(business.id)} className="w-full px-3 py-2.5 flex items-center gap-3 text-sm text-slate-700 hover:bg-slate-50">
                                <i className="ri-team-line text-indigo-600"></i>
                                Manage members
                              </button>
                              <button type="button" disabled className="w-full px-3 py-2.5 flex items-center gap-3 text-sm text-slate-400 cursor-not-allowed">
                                <i className="ri-star-line"></i>
                                Business Subscription
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelect(business.id)}
                                disabled={isActive}
                                className="w-full px-3 py-2.5 flex items-center justify-between text-sm disabled:cursor-default hover:bg-slate-50"
                              >
                                <span className={`inline-flex items-center gap-3 ${isActive ? 'text-indigo-600' : 'text-slate-700'}`}>
                                  <i className="ri-checkbox-circle-line text-indigo-600"></i>
                                  Set Active
                                </span>
                                {isActive && <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full">Active</span>}
                              </button>
                              {canManageBusiness && (
                                <button
                                  type="button"
                                  onClick={() => { setArchiveTarget(business); setMenuBusinessId(null); }}
                                  className="w-full px-3 py-2.5 flex items-center gap-3 text-sm text-red-600 hover:bg-red-50 border-t border-slate-100"
                                >
                                  <i className="ri-delete-bin-line"></i>
                                  Remove Business
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Name + address */}
                    <h2 className="text-slate-900 text-[15px] font-bold leading-snug">{business.businessName}</h2>
                    <p className="text-[13px] text-teal-600 mt-1 line-clamp-2 leading-5 min-h-[38px]">{business.address}</p>

                    {/* Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-slate-500 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        Active · {relativeTime(stats.lastActive)}
                      </span>
                      <i className="ri-arrow-right-line text-slate-300 text-sm"></i>
                    </div>
                  </button>
                );
              })}

              {isOwner && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded-2xl border border-dashed border-slate-300 bg-white/60 hover:bg-white hover:border-indigo-300 transition-all flex flex-col items-center justify-center text-center px-6 py-14"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mb-3">
                    <i className="ri-add-line text-xl"></i>
                  </div>
                  <p className="text-slate-800 text-[13px] font-bold">Add New Business</p>
                  <p className="text-slate-400 text-xs mt-1">Connect another business to your account</p>
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Create / Edit modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-slate-900 font-bold text-lg">{editingBusiness ? 'Update Business' : 'Add Business'}</h2>
              <button type="button" onClick={resetForm} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            {error && <div className="mb-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>}
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Business Name</label>
            <input
              autoFocus
              value={form.businessName}
              onChange={(e) => setForm((prev) => ({ ...prev, businessName: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="e.g. Acme Store"
              maxLength={120}
            />
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 mt-4">Business Address</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full min-h-[88px] resize-none border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="Enter the business address"
              maxLength={240}
            />
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={resetForm} className="flex-1 border border-slate-200 rounded-lg py-2.5 text-sm font-semibold text-slate-600">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.businessName.trim() || !form.address.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-bold"
              >
                {saving ? 'Saving...' : 'Save Details'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive confirm modal */}
      {archiveTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
              <i className="ri-delete-bin-line text-xl"></i>
            </div>
            <h2 className="text-slate-900 font-bold text-lg">Remove Business</h2>
            <p className="text-slate-500 text-sm mt-2">
              {archiveTarget.businessName} will be archived and removed from active business selection.
            </p>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setArchiveTarget(null)} className="flex-1 border border-slate-200 rounded-lg py-2.5 text-sm font-semibold text-slate-600">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchive}
                disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-bold"
              >
                {saving ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
