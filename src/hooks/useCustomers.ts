import { useState, useEffect } from 'react';
import type { Customer, CustomerType, CustomerStatus } from '@/types/erp';
import { customers as seedCustomers } from '@/mocks/customers';
import { supabase } from '@/lib/supabase';

type Row = {
  customer_id: string; full_name: string; company_name: string; customer_type: string;
  phone: string; email: string; total_purchases: number; outstanding_balance: number;
  status_flag: string; avatar: string; last_order_date: string;
};

const toCustomer = (r: Row): Customer => ({
  customerId: r.customer_id, fullName: r.full_name, companyName: r.company_name,
  customerType: r.customer_type as CustomerType, phone: r.phone, email: r.email,
  totalPurchases: r.total_purchases, outstandingBalance: r.outstanding_balance,
  statusFlag: r.status_flag as CustomerStatus, avatar: r.avatar,
  lastOrderDate: r.last_order_date,
});

const toRow = (c: Customer): Row => ({
  customer_id: c.customerId, full_name: c.fullName, company_name: c.companyName,
  customer_type: c.customerType, phone: c.phone, email: c.email,
  total_purchases: c.totalPurchases, outstanding_balance: c.outstandingBalance,
  status_flag: c.statusFlag, avatar: c.avatar, last_order_date: c.lastOrderDate,
});

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('customers').select('*').order('full_name');
      if (error) { console.error(error); setLoading(false); return; }

      if (!data || data.length === 0) {
        await supabase.from('customers').insert(seedCustomers.map(toRow));
        setCustomers(seedCustomers);
      } else {
        setCustomers(data.map(toCustomer));
      }
      setLoading(false);
    })();
  }, []);

  const addCustomer = async (data: Omit<Customer, 'customerId' | 'totalPurchases' | 'outstandingBalance' | 'lastOrderDate'>) => {
    const newCustomer: Customer = {
      ...data, customerId: `C${Date.now()}`,
      totalPurchases: 0, outstandingBalance: 0,
      lastOrderDate: new Date().toISOString().split('T')[0],
    };
    setCustomers((prev) => [...prev, newCustomer]);
    const { error } = await supabase.from('customers').insert(toRow(newCustomer));
    if (error) console.error(error);
    return newCustomer;
  };

  const updateCustomer = async (customerId: string, data: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => c.customerId === customerId ? { ...c, ...data } : c));
    const updated = customers.find((c) => c.customerId === customerId);
    if (!updated) return;
    const { error } = await supabase.from('customers')
      .update(toRow({ ...updated, ...data })).eq('customer_id', customerId);
    if (error) console.error(error);
  };

  const deleteCustomer = async (customerId: string) => {
    setCustomers((prev) => prev.filter((c) => c.customerId !== customerId));
    const { error } = await supabase.from('customers').delete().eq('customer_id', customerId);
    if (error) console.error(error);
  };

  return { customers, loading, addCustomer, updateCustomer, deleteCustomer };
}
