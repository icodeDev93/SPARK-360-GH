/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { sanitizeEmail, sanitizeText, sanitizeUrl } from '@/lib/sanitize';
import { getStoredActiveBusinessId, setStoredActiveBusinessId } from '@/lib/businessScope';

export interface BusinessRecord {
  id: string;
  ownerId: string;
  businessName: string;
  legalName: string;
  phone: string;
  email: string;
  address: string;
  logoUrl: string;
  status: 'pending' | 'active' | 'inactive' | 'archived';
  archivedAt: string | null;
  createdAt: string;
}

interface BusinessContextValue {
  businesses: BusinessRecord[];
  activeBusiness: BusinessRecord | null;
  activeBusinessId: string | null;
  loading: boolean;
  loadError: string;
  selectBusiness: (businessId: string) => void;
  refreshBusinesses: (showLoading?: boolean) => Promise<void>;
  createBusiness: (input: BusinessInput) => Promise<{ success: boolean; error?: string }>;
  updateBusiness: (businessId: string, input: BusinessInput) => Promise<{ success: boolean; error?: string }>;
  archiveBusiness: (businessId: string) => Promise<{ success: boolean; error?: string }>;
}

export interface BusinessInput {
  businessName: string;
  legalName?: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
}

type BusinessRow = {
  id: string;
  owner_id: string;
  business_name: string;
  legal_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url: string | null;
  status: 'pending' | 'active' | 'inactive' | 'archived';
  archived_at: string | null;
  created_at: string;
};

const BusinessContext = createContext<BusinessContextValue | null>(null);
const BUSINESS_CACHE_PREFIX = 'bizzyapp:businesses:';
const visibleBusinessStatuses = new Set<BusinessRecord['status']>(['active', 'pending', 'inactive']);

const mapBusiness = (row: BusinessRow): BusinessRecord => ({
  id: row.id,
  ownerId: row.owner_id,
  businessName: row.business_name,
  legalName: row.legal_name ?? '',
  phone: row.phone ?? '',
  email: row.email ?? '',
  address: row.address ?? '',
  logoUrl: row.logo_url ?? '',
  status: row.status,
  archivedAt: row.archived_at,
  createdAt: row.created_at,
});

const cleanBusiness = (input: BusinessInput) => ({
  business_name: sanitizeText(input.businessName),
  legal_name: sanitizeText(input.legalName ?? ''),
  phone: sanitizeText(input.phone ?? ''),
  email: sanitizeEmail(input.email ?? ''),
  address: sanitizeText(input.address ?? ''),
  logo_url: sanitizeUrl(input.logoUrl ?? ''),
});

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function isUserBusy(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
}

function businessCacheKey(userId: string) {
  return `${BUSINESS_CACHE_PREFIX}${userId}`;
}

function loadCachedBusinesses(userId: string): BusinessRecord[] {
  try {
    const raw = localStorage.getItem(businessCacheKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCachedBusinesses(userId: string, records: BusinessRecord[]) {
  localStorage.setItem(businessCacheKey(userId), JSON.stringify(records));
}

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { currentUser, sessionLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(() => getStoredActiveBusinessId());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const refreshBusinesses = useCallback(async (showLoading = true) => {
    if (!currentUser) {
      setBusinesses([]);
      setActiveBusinessId(null);
      setStoredActiveBusinessId(null);
      setLoadError('');
      setLoading(false);
      return;
    }

    const cachedBusinesses = loadCachedBusinesses(currentUser.id)
      .filter((business) => visibleBusinessStatuses.has(business.status));
    if (cachedBusinesses.length) {
      setBusinesses(cachedBusinesses);
    }

    if (showLoading) setLoading(true);
    setLoadError('');

    let data: unknown[] | null = null;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await supabase.rpc('get_accessible_businesses');

      if (!response.error) {
        data = response.data ?? [];
        if (data.length > 0 || cachedBusinesses.length === 0 || attempt === 3) break;
      } else {
        lastError = response.error;
      }

      if (attempt < 3) await wait(attempt * 450);
    }

    if (lastError && data === null) {
      console.error(lastError);
      if (cachedBusinesses.length && !navigator.onLine) {
        setBusinesses(cachedBusinesses);
        setLoadError('Showing the last saved business list because the live database could not be reached.');
        const stored = getStoredActiveBusinessId();
        const nextActive = stored && cachedBusinesses.some((business) => business.id === stored && business.status === 'active') ? stored : null;
        setActiveBusinessId(nextActive);
        setStoredActiveBusinessId(nextActive);
      } else {
        setBusinesses([]);
        setActiveBusinessId(null);
        setStoredActiveBusinessId(null);
        setLoadError('Unable to load businesses from the live database. Check your connection and try again.');
      }
      setLoading(false);
      return;
    }

    const nextBusinesses = (data ?? [])
      .map((row) => mapBusiness(row as BusinessRow))
      .filter((business) => visibleBusinessStatuses.has(business.status));

    setBusinesses(nextBusinesses);
    saveCachedBusinesses(currentUser.id, nextBusinesses);

    const activeBusinesses = nextBusinesses.filter((business) => business.status === 'active');

    if (
      currentUser.role === 'cashier'
      && currentUser.primaryBusinessId
      && !activeBusinesses.some((business) => business.id === currentUser.primaryBusinessId)
    ) {
      setLoading(false);
      await logout();
      navigate('/login', { replace: true, state: { reason: 'business-deactivated' } });
      return;
    }

    const stored = getStoredActiveBusinessId();
    const cashierBusiness = currentUser.role === 'cashier' && currentUser.primaryBusinessId
      && activeBusinesses.some((business) => business.id === currentUser.primaryBusinessId)
      ? currentUser.primaryBusinessId
      : null;
    const nextActive = cashierBusiness || (stored && activeBusinesses.some((business) => business.id === stored) ? stored : null);
    setActiveBusinessId(nextActive);
    setStoredActiveBusinessId(nextActive);
    setLoading(false);
  }, [currentUser, logout, navigate]);

  useEffect(() => {
    if (sessionLoading) return;
    refreshBusinesses();
  }, [refreshBusinesses, sessionLoading]);

  useEffect(() => {
    if (sessionLoading || !currentUser) return undefined;

    const refreshVisibleBusinesses = () => {
      if (!document.hidden && !isUserBusy()) void refreshBusinesses(false);
    };

    window.addEventListener('focus', refreshVisibleBusinesses);
    window.addEventListener('online', refreshVisibleBusinesses);
    document.addEventListener('visibilitychange', refreshVisibleBusinesses);
    const intervalId = window.setInterval(refreshVisibleBusinesses, 30_000);

    return () => {
      window.removeEventListener('focus', refreshVisibleBusinesses);
      window.removeEventListener('online', refreshVisibleBusinesses);
      document.removeEventListener('visibilitychange', refreshVisibleBusinesses);
      window.clearInterval(intervalId);
    };
  }, [currentUser, refreshBusinesses, sessionLoading]);

  const selectBusiness = useCallback((businessId: string) => {
    const business = businesses.find((item) => item.id === businessId);
    if (!business || business.status !== 'active') return;
    setActiveBusinessId(businessId);
    setStoredActiveBusinessId(businessId);
    navigate('/', { replace: true });
  }, [businesses, navigate]);

  const createBusiness = async (input: BusinessInput) => {
    if (!currentUser || currentUser.role !== 'owner') return { success: false, error: 'Only owner can create businesses.' };
    const row = cleanBusiness(input);
    if (!row.business_name) return { success: false, error: 'Business name is required.' };
    if (!row.address) return { success: false, error: 'Business address is required.' };
    const { error } = await supabase.from('businesses').insert({ owner_id: currentUser.id, ...row });
    if (error) return { success: false, error: error.message };
    await refreshBusinesses();
    return { success: true };
  };

  const updateBusiness = async (businessId: string, input: BusinessInput) => {
    if (!currentUser || currentUser.role !== 'owner') return { success: false, error: 'Only owner can update businesses.' };
    const row = cleanBusiness(input);
    if (!row.business_name) return { success: false, error: 'Business name is required.' };
    if (!row.address) return { success: false, error: 'Business address is required.' };
    const { error } = await supabase.from('businesses').update(row).eq('id', businessId);
    if (error) return { success: false, error: error.message };
    await refreshBusinesses();
    return { success: true };
  };

  const archiveBusiness = async (businessId: string) => {
    if (!currentUser || currentUser.role !== 'owner') return { success: false, error: 'Only owner can archive businesses.' };
    const { error } = await supabase
      .from('businesses')
      .update({ status: 'archived', archived_at: new Date().toISOString() })
      .eq('id', businessId);
    if (error) return { success: false, error: error.message };
    if (activeBusinessId === businessId) {
      setActiveBusinessId(null);
      setStoredActiveBusinessId(null);
    }
    await refreshBusinesses();
    return { success: true };
  };

  const activeBusiness = useMemo(
    () => businesses.find((business) => business.id === activeBusinessId) ?? null,
    [activeBusinessId, businesses],
  );

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        activeBusiness,
        activeBusinessId,
        loading,
        loadError,
        selectBusiness,
        refreshBusinesses,
        createBusiness,
        updateBusiness,
        archiveBusiness,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (!context) throw new Error('useBusiness must be used within BusinessProvider');
  return context;
}
