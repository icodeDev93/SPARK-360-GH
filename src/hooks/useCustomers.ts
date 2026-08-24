import { useState, useEffect } from 'react';
import type { Customer, CustomerType, CustomerStatus } from '@/types/erp';
import { supabase } from '@/lib/supabase';
import { sanitizeText, sanitizeEmail, sanitizeMultiline, sanitizeUrl } from '@/lib/sanitize';
import { createLocalId, loadLocalCollection, queueLocalMutation, saveLocalCollection } from '@/lib/localCache';
import { useBusiness } from '@/contexts/BusinessContext';

type Row = {
  id: string;
  full_name: string;
  phone: string | null;
  address?: string | null;
  remarks?: string | null;
  debt_limit?: number | null;
  visiting_day?: string | null;
  outstanding_balance: number | null;
  status: string;
  customer_type?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  notes?: string | null;
  created_at?: string;
};

const toCustomer = (r: Row): Customer => ({
  customerId: r.id, fullName: r.full_name,
  customerType: (r.customer_type as CustomerType | null) ?? 'Retail',
  phone: r.phone ?? '',
  email: r.email ?? '',
  address: r.address ?? '',
  remarks: r.remarks ?? r.notes ?? '',
  debtLimit: r.debt_limit ?? 0,
  visitingDay: r.visiting_day ?? 'Sunday',
  totalPurchases: 0, outstandingBalance: r.outstanding_balance ?? 0,
  statusFlag: r.status as CustomerStatus,
  avatar: r.avatar_url ?? r.full_name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase(),
  lastOrderDate: r.created_at?.split('T')[0] ?? '',
  notes: r.remarks ?? r.notes ?? undefined,
});

const cleanCustomer = (c: Customer): Customer => ({
  ...c,
  fullName: sanitizeText(c.fullName),
  phone: sanitizeText(c.phone),
  email: sanitizeEmail(c.email),
  address: sanitizeText(c.address),
  remarks: sanitizeMultiline(c.remarks),
  visitingDay: sanitizeText(c.visitingDay),
  avatar: sanitizeUrl(c.avatar) || sanitizeText(c.avatar),
  notes: c.notes ? sanitizeMultiline(c.notes) : undefined,
});

const cleanCustomerPatch = (data: Partial<Customer>): Partial<Customer> => ({
  ...data,
  ...(data.fullName !== undefined ? { fullName: sanitizeText(data.fullName) } : {}),
  ...(data.phone !== undefined ? { phone: sanitizeText(data.phone) } : {}),
  ...(data.email !== undefined ? { email: sanitizeEmail(data.email) } : {}),
  ...(data.address !== undefined ? { address: sanitizeText(data.address) } : {}),
  ...(data.remarks !== undefined ? { remarks: sanitizeMultiline(data.remarks) } : {}),
  ...(data.visitingDay !== undefined ? { visitingDay: sanitizeText(data.visitingDay) } : {}),
  ...(data.avatar !== undefined ? { avatar: sanitizeUrl(data.avatar) || sanitizeText(data.avatar) } : {}),
  ...(data.notes !== undefined ? { notes: sanitizeMultiline(data.notes) } : {}),
});

const toRow = (customer: Customer) => {
  const c = cleanCustomer(customer);
  return ({
  full_name: c.fullName,
  phone: c.phone,
  address: c.address || null,
  remarks: c.remarks || c.notes || null,
  debt_limit: c.debtLimit,
  visiting_day: c.visitingDay,
  outstanding_balance: c.outstandingBalance,
  status: c.statusFlag,
})};

export function useCustomers() {
  const { activeBusinessId } = useBusiness();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!activeBusinessId) {
        setCustomers([]);
        setLoading(false);
        return;
      }
      const cached = await loadLocalCollection<Customer>('customers');
      if (cached.length) setCustomers(cached);
      const { data, error } = await supabase
        .from('customers').select('*').eq('business_id', activeBusinessId).order('full_name');
      if (error) { console.error(error); setLoading(false); return; }
      const nextCustomers = data ? data.map(toCustomer) : [];
      setCustomers(nextCustomers);
      saveLocalCollection('customers', nextCustomers);
      setLoading(false);
    };

    fetchCustomers();

    const channel = supabase
      .channel('customers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetchCustomers)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeBusinessId]);

  const addCustomer = async (data: Omit<Customer, 'customerId' | 'totalPurchases' | 'lastOrderDate'>) => {
    if (!activeBusinessId) return data as Customer;
    const newCustomer: Customer = {
      ...cleanCustomer(data as Customer),
      customerId: createLocalId(),
      totalPurchases: 0,
      lastOrderDate: new Date().toISOString().split('T')[0],
    };
    setCustomers((prev) => [...prev, newCustomer]);
    saveLocalCollection('customers', [...customers, newCustomer]);
    const { data: inserted, error } = await supabase
      .from('customers')
      .insert({ id: newCustomer.customerId, business_id: activeBusinessId, ...toRow(newCustomer) })
      .select('*')
      .single();
    if (error) {
      console.error(error);
      queueLocalMutation('customers', newCustomer.customerId, 'create', newCustomer);
      throw new Error(error.message || 'Customer could not be saved to the database.');
    }
    if (!inserted) return newCustomer;
    const savedCustomer = toCustomer(inserted);
    const syncedCustomers = customers.map((c) => c.customerId === newCustomer.customerId ? savedCustomer : c);
    if (!customers.some((c) => c.customerId === newCustomer.customerId)) syncedCustomers.push(savedCustomer);
    setCustomers(syncedCustomers);
    saveLocalCollection('customers', syncedCustomers);
    return savedCustomer;
  };

  const updateCustomer = async (customerId: string, data: Partial<Customer>) => {
    const cleanData = cleanCustomerPatch(data);
    const nextCustomers = customers.map((c) => c.customerId === customerId ? { ...c, ...cleanData } : c);
    setCustomers(nextCustomers);
    saveLocalCollection('customers', nextCustomers);
    const updated = customers.find((c) => c.customerId === customerId);
    if (!updated) return;
    const { error } = await supabase.from('customers')
      .update(toRow({ ...updated, ...cleanData })).eq('business_id', activeBusinessId).eq('id', customerId);
    if (error) {
      console.error(error);
      queueLocalMutation('customers', customerId, 'update', { ...updated, ...cleanData });
    }
  };

  const deleteCustomer = async (customerId: string) => {
    const nextCustomers = customers.filter((c) => c.customerId !== customerId);
    setCustomers(nextCustomers);
    saveLocalCollection('customers', nextCustomers);
    const { error } = await supabase.from('customers').delete().eq('business_id', activeBusinessId).eq('id', customerId);
    if (error) {
      console.error(error);
      queueLocalMutation('customers', customerId, 'delete', { customerId });
    }
  };

  const recordPayment = async (
    customerId: string,
    amount: number,
    paymentMethod: string,
    saleId?: string,
    notes = ''
  ) => {
    if (!activeBusinessId) return;
    const customer = customers.find((c) => c.customerId === customerId);
    if (!customer) return;
    const newBalance = Math.max(0, customer.outstandingBalance - amount);
    const nextCustomers = customers.map((c) =>
      c.customerId === customerId ? { ...c, outstandingBalance: newBalance } : c
    );
    setCustomers(nextCustomers);
    saveLocalCollection('customers', nextCustomers);
    await supabase.from('credit_payments').insert({
      business_id: activeBusinessId,
      customer_id: customerId,
      sale_id: saleId ?? null,
      amount,
      payment_method: paymentMethod,
      notes: sanitizeMultiline(notes),
    }).then(({ error: e }) => { if (e) console.error(e); });
    const { error } = await supabase.from('customers')
      .update({ outstanding_balance: newBalance }).eq('business_id', activeBusinessId).eq('id', customerId);
    if (error) {
      console.error(error);
      queueLocalMutation('customers', customerId, 'update', { ...customer, outstandingBalance: newBalance });
    }
  };

  return { customers, loading, addCustomer, updateCustomer, deleteCustomer, recordPayment };
}
