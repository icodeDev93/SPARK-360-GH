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
  status: 'active' | 'archived';
  archivedAt: string | null;
  createdAt: string;
}

interface BusinessContextValue {
  businesses: BusinessRecord[];
  activeBusiness: BusinessRecord | null;
  activeBusinessId: string | null;
  loading: boolean;
  selectBusiness: (businessId: string) => void;
  refreshBusinesses: () => Promise<void>;
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
  status: 'active' | 'archived';
  archived_at: string | null;
  created_at: string;
};

const BusinessContext = createContext<BusinessContextValue | null>(null);
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

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { currentUser, sessionLoading } = useAuth();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(() => getStoredActiveBusinessId());
  const [loading, setLoading] = useState(true);

  const refreshBusinesses = useCallback(async () => {
    if (!currentUser) {
      setBusinesses([]);
      setActiveBusinessId(null);
      setStoredActiveBusinessId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('status', 'active')
      .order('business_name');

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const nextBusinesses = (data ?? []).map((row) => mapBusiness(row as BusinessRow));
    setBusinesses(nextBusinesses);

    const stored = getStoredActiveBusinessId();
    const cashierBusiness = currentUser.role === 'cashier' ? currentUser.primaryBusinessId : null;
    const nextActive = cashierBusiness || (stored && nextBusinesses.some((business) => business.id === stored) ? stored : null);
    setActiveBusinessId(nextActive);
    setStoredActiveBusinessId(nextActive);
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    if (sessionLoading) return;
    refreshBusinesses();
  }, [refreshBusinesses, sessionLoading]);

  const selectBusiness = useCallback((businessId: string) => {
    setActiveBusinessId(businessId);
    setStoredActiveBusinessId(businessId);
    navigate('/', { replace: true });
  }, [navigate]);

  const createBusiness = async (input: BusinessInput) => {
    if (!currentUser || currentUser.role !== 'owner') return { success: false, error: 'Only owner can create businesses.' };
    const row = cleanBusiness(input);
    if (!row.business_name) return { success: false, error: 'Business name is required.' };
    const { error } = await supabase.from('businesses').insert({ owner_id: currentUser.id, ...row });
    if (error) return { success: false, error: error.message };
    await refreshBusinesses();
    return { success: true };
  };

  const updateBusiness = async (businessId: string, input: BusinessInput) => {
    if (!currentUser || currentUser.role !== 'owner') return { success: false, error: 'Only owner can update businesses.' };
    const row = cleanBusiness(input);
    if (!row.business_name) return { success: false, error: 'Business name is required.' };
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
