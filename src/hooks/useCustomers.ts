import { useState, useEffect } from 'react';
import type { Customer, CustomerType, CustomerStatus } from '@/types/erp';
import { supabase } from '@/lib/supabase';

type Row = {
  id: string; full_name: string;
  customer_type: string; phone: string | null; email: string | null;
  outstanding_balance: number | null; status: string; avatar_url: string | null;
  notes: string | null;
  created_at?: string;
};

const toCustomer = (r: Row): Customer => ({
  customerId: r.id, fullName: r.full_name,
  customerType: r.customer_type as CustomerType, phone: r.phone ?? '', email: r.email ?? '',
  totalPurchases: 0, outstandingBalance: r.outstanding_balance ?? 0,
  statusFlag: r.status as CustomerStatus, avatar: r.avatar_url ?? '',
  lastOrderDate: r.created_at?.split('T')[0] ?? '',
  notes: r.notes ?? undefined,
});

const toRow = (c: Customer): Omit<Row, 'id'> => ({
  full_name: c.fullName,
  customer_type: c.customerType, phone: c.phone, email: c.email,
  outstanding_balance: c.outstandingBalance, status: c.statusFlag, avatar_url: c.avatar,
  notes: c.notes ?? null,
});

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase
        .from('customers').select('*').order('full_name');
      if (error) { console.error(error); setLoading(false); return; }
      setCustomers(data ? data.map(toCustomer) : []);
      setLoading(false);
    };

    fetchCustomers();

    const channel = supabase
      .channel('customers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetchCustomers)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const addCustomer = async (data: Omit<Customer, 'customerId' | 'totalPurchases' | 'outstandingBalance' | 'lastOrderDate'>) => {
    const newCustomer: Customer = {
      ...data, customerId: `C${Date.now()}`,
      totalPurchases: 0, outstandingBalance: 0,
      lastOrderDate: new Date().toISOString().split('T')[0],
    };
    setCustomers((prev) => [...prev, newCustomer]);
    const { data: inserted, error } = await supabase
      .from('customers')
      .insert(toRow(newCustomer))
      .select('*')
      .single();
    if (error) console.error(error);
    if (!inserted) return newCustomer;
    const savedCustomer = toCustomer(inserted);
    setCustomers((prev) => prev.map((c) => c.customerId === newCustomer.customerId ? savedCustomer : c));
    return savedCustomer;
  };

  const updateCustomer = async (customerId: string, data: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => c.customerId === customerId ? { ...c, ...data } : c));
    const updated = customers.find((c) => c.customerId === customerId);
    if (!updated) return;
    const { error } = await supabase.from('customers')
      .update(toRow({ ...updated, ...data })).eq('id', customerId);
    if (error) console.error(error);
  };

  const deleteCustomer = async (customerId: string) => {
    setCustomers((prev) => prev.filter((c) => c.customerId !== customerId));
    const { error } = await supabase.from('customers').delete().eq('id', customerId);
    if (error) console.error(error);
  };

  const recordPayment = async (
    customerId: string,
    amount: number,
    paymentMethod: string,
    saleId?: string,
    notes = ''
  ) => {
    const customer = customers.find((c) => c.customerId === customerId);
    if (!customer) return;
    const newBalance = Math.max(0, customer.outstandingBalance - amount);
    setCustomers((prev) => prev.map((c) =>
      c.customerId === customerId ? { ...c, outstandingBalance: newBalance } : c
    ));
    await supabase.from('credit_payments').insert({
      customer_id: customerId,
      sale_id: saleId ?? null,
      amount,
      payment_method: paymentMethod,
      notes,
    }).then(({ error: e }) => { if (e) console.error(e); });
    const { error } = await supabase.from('customers')
      .update({ outstanding_balance: newBalance }).eq('id', customerId);
    if (error) console.error(error);
  };

  return { customers, loading, addCustomer, updateCustomer, deleteCustomer, recordPayment };
}
