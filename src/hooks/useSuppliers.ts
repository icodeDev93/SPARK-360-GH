import { useState, useEffect } from 'react';
import { Supplier, PurchaseOrder, seedSuppliers, seedPurchaseOrders } from '@/mocks/suppliers';
import { supabase } from '@/lib/supabase';

const toDateValue = (value: string) => {
  if (!value || value === 'TBD') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().split('T')[0];
};

type PurchaseRow = {
  purchase_number: string;
  supplier_code: string | null;
  supplier_name: string;
  purchase_date: string;
  expected_date: string | null;
  item_count: number;
  total_amount: number;
  status: PurchaseOrder['status'];
  payment_status: PurchaseOrder['paymentStatus'];
  notes: string | null;
};

type SupplierRow = {
  supplier_code: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  category: string | null;
  status: Supplier['status'];
  joined_date: string | null;
  notes: string | null;
};

const toSupplier = (r: SupplierRow): Supplier => ({
  id: r.supplier_code,
  name: r.name,
  contact: r.contact_name ?? '',
  phone: r.phone ?? '',
  email: r.email ?? '',
  address: r.address ?? '',
  category: r.category ?? '',
  totalOrders: 0,
  totalSpent: 0,
  status: r.status,
  joinedDate: r.joined_date ?? '',
  notes: r.notes ?? '',
});

const toPurchaseOrder = (r: PurchaseRow): PurchaseOrder => ({
  id: r.purchase_number,
  supplierId: r.supplier_code ?? '',
  supplierName: r.supplier_name,
  date: r.purchase_date,
  expectedDate: r.expected_date ?? 'TBD',
  items: r.item_count,
  total: r.total_amount,
  status: r.status,
  paymentStatus: r.payment_status,
  notes: r.notes ?? '',
});

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [supRes, ordRes] = await Promise.all([
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('purchases').select('*').order('purchase_date', { ascending: false }),
      ]);

      if (supRes.error) console.error(supRes.error);
      if (ordRes.error) console.error(ordRes.error);

      const sups: Supplier[] = supRes.data && supRes.data.length > 0
        ? supRes.data.map((r) => toSupplier(r as SupplierRow))
        : [];

      const ords: PurchaseOrder[] = ordRes.data && ordRes.data.length > 0
        ? ordRes.data.map((r) => toPurchaseOrder(r as PurchaseRow))
        : [];

      if (sups.length === 0) {
        const rows = seedSuppliers.map((s) => ({
          name: s.name, contact_name: s.contact, phone: s.phone,
          email: s.email, address: s.address, category: s.category, status: s.status,
          joined_date: toDateValue(s.joinedDate), notes: s.notes,
        }));
        const { data: seeded, error: seedError } = await supabase.from('suppliers').insert(rows).select('*');
        if (seedError) console.error(seedError);
        setSuppliers(seeded ? seeded.map((r) => toSupplier(r as SupplierRow)) : seedSuppliers);
      } else {
        setSuppliers(sups);
      }

      if (ords.length === 0) {
        const rows = seedPurchaseOrders.map((o) => ({
          supplier_code: o.supplierId, supplier_name: o.supplierName,
          purchase_date: toDateValue(o.date), expected_date: toDateValue(o.expectedDate),
          item_count: o.items, subtotal: o.total, total_amount: o.total, status: o.status,
          payment_status: o.paymentStatus, notes: o.notes,
        }));
        const { data: seeded, error: seedError } = await supabase.from('purchases').insert(rows).select('*');
        if (seedError) console.error(seedError);
        setOrders(seeded ? seeded.map((r) => toPurchaseOrder(r as PurchaseRow)) : seedPurchaseOrders);
      } else {
        setOrders(ords);
      }

      setLoading(false);
    })();
  }, []);

  const addSupplier = async (data: Omit<Supplier, 'id' | 'totalOrders' | 'totalSpent'>) => {
    const newSup: Supplier = { ...data, id: 'Pending...', totalOrders: 0, totalSpent: 0 };
    setSuppliers((prev) => [newSup, ...prev]);
    const { data: inserted, error } = await supabase.from('suppliers').insert({
      name: newSup.name, contact_name: newSup.contact, phone: newSup.phone,
      email: newSup.email, address: newSup.address, category: newSup.category,
      status: newSup.status, joined_date: toDateValue(newSup.joinedDate), notes: newSup.notes,
    }).select('*').single();
    if (error) console.error(error);
    if (inserted) {
      const savedSupplier = toSupplier(inserted as SupplierRow);
      setSuppliers((prev) => prev.map((supplier) => supplier === newSup ? savedSupplier : supplier));
    }
  };

  const updateSupplier = async (id: string, data: Partial<Omit<Supplier, 'id'>>) => {
    setSuppliers((prev) => prev.map((s) => s.id === id ? { ...s, ...data } : s));
    const { error } = await supabase.from('suppliers').update({
      name: data.name, contact_name: data.contact, phone: data.phone, email: data.email,
      address: data.address, category: data.category, status: data.status,
      joined_date: data.joinedDate ? toDateValue(data.joinedDate) : undefined, notes: data.notes,
    }).eq('supplier_code', id);
    if (error) console.error(error);
  };

  const deleteSupplier = async (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    const { error } = await supabase.from('suppliers').delete().eq('supplier_code', id);
    if (error) console.error(error);
  };

  const addOrder = async (data: Omit<PurchaseOrder, 'id'>) => {
    const newOrder: PurchaseOrder = { ...data, id: 'Pending...' };
    setOrders((prev) => [newOrder, ...prev]);
    setSuppliers((prev) => prev.map((s) =>
      s.id === data.supplierId
        ? { ...s, totalOrders: s.totalOrders + 1, totalSpent: s.totalSpent + data.total }
        : s
    ));
    const { data: inserted, error } = await supabase.from('purchases').insert({
      supplier_code: newOrder.supplierId,
      supplier_name: newOrder.supplierName, purchase_date: toDateValue(newOrder.date),
      expected_date: toDateValue(newOrder.expectedDate), item_count: newOrder.items,
      subtotal: newOrder.total, total_amount: newOrder.total, status: newOrder.status,
      payment_status: newOrder.paymentStatus, notes: newOrder.notes,
    }).select('*').single();
    if (error) console.error(error);
    if (inserted) {
      const savedOrder = toPurchaseOrder(inserted as PurchaseRow);
      setOrders((prev) => prev.map((order) => order === newOrder ? savedOrder : order));
    }
  };

  const updateOrderStatus = async (id: string, status: PurchaseOrder['status'], paymentStatus: PurchaseOrder['paymentStatus']) => {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status, paymentStatus } : o));
    const { error } = await supabase.from('purchases')
      .update({ status, payment_status: paymentStatus }).eq('purchase_number', id);
    if (error) console.error(error);
  };

  const getSupplierOrders = (supplierId: string) => orders.filter((o) => o.supplierId === supplierId);

  return { suppliers, orders, loading, addSupplier, updateSupplier, deleteSupplier, addOrder, updateOrderStatus, getSupplierOrders };
}
