import { useState, useEffect } from 'react';
import { Supplier, PurchaseOrder } from '@/mocks/suppliers';
import { supabase } from '@/lib/supabase';
import { sanitizeEmail, sanitizeMultiline, sanitizeText } from '@/lib/sanitize';

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

const cleanSupplier = (supplier: Omit<Supplier, 'id' | 'totalOrders' | 'totalSpent'>): Omit<Supplier, 'id' | 'totalOrders' | 'totalSpent'> => ({
  ...supplier,
  name: sanitizeText(supplier.name),
  contact: sanitizeText(supplier.contact),
  phone: sanitizeText(supplier.phone),
  email: sanitizeEmail(supplier.email),
  address: sanitizeText(supplier.address),
  category: sanitizeText(supplier.category),
  joinedDate: sanitizeText(supplier.joinedDate),
  notes: sanitizeMultiline(supplier.notes),
});

const cleanSupplierPatch = (data: Partial<Omit<Supplier, 'id'>>): Partial<Omit<Supplier, 'id'>> => ({
  ...data,
  ...(data.name !== undefined ? { name: sanitizeText(data.name) } : {}),
  ...(data.contact !== undefined ? { contact: sanitizeText(data.contact) } : {}),
  ...(data.phone !== undefined ? { phone: sanitizeText(data.phone) } : {}),
  ...(data.email !== undefined ? { email: sanitizeEmail(data.email) } : {}),
  ...(data.address !== undefined ? { address: sanitizeText(data.address) } : {}),
  ...(data.category !== undefined ? { category: sanitizeText(data.category) } : {}),
  ...(data.joinedDate !== undefined ? { joinedDate: sanitizeText(data.joinedDate) } : {}),
  ...(data.notes !== undefined ? { notes: sanitizeMultiline(data.notes) } : {}),
});

const cleanOrder = (order: Omit<PurchaseOrder, 'id'>): Omit<PurchaseOrder, 'id'> => ({
  ...order,
  supplierId: sanitizeText(order.supplierId),
  supplierName: sanitizeText(order.supplierName),
  date: sanitizeText(order.date),
  expectedDate: sanitizeText(order.expectedDate),
  notes: sanitizeMultiline(order.notes),
});

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [supRes, ordRes] = await Promise.all([
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('purchases').select('*').order('purchase_date', { ascending: false }),
      ]);
      if (supRes.error) console.error(supRes.error);
      if (ordRes.error) console.error(ordRes.error);
      setSuppliers(supRes.data ? supRes.data.map((r) => toSupplier(r as SupplierRow)) : []);
      setOrders(ordRes.data ? ordRes.data.map((r) => toPurchaseOrder(r as PurchaseRow)) : []);
      setLoading(false);
    };

    fetchAll();

    const channel = supabase
      .channel('suppliers-purchases-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, fetchAll)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const addSupplier = async (data: Omit<Supplier, 'id' | 'totalOrders' | 'totalSpent'>) => {
    const cleanData = cleanSupplier(data);
    const newSup: Supplier = { ...cleanData, id: 'Pending...', totalOrders: 0, totalSpent: 0 };
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
    const cleanData = cleanSupplierPatch(data);
    setSuppliers((prev) => prev.map((s) => s.id === id ? { ...s, ...cleanData } : s));
    const { error } = await supabase.from('suppliers').update({
      name: cleanData.name, contact_name: cleanData.contact, phone: cleanData.phone, email: cleanData.email,
      address: cleanData.address, category: cleanData.category, status: cleanData.status,
      joined_date: cleanData.joinedDate ? toDateValue(cleanData.joinedDate) : undefined, notes: cleanData.notes,
    }).eq('supplier_code', id);
    if (error) console.error(error);
  };

  const deleteSupplier = async (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    const { error } = await supabase.from('suppliers').delete().eq('supplier_code', id);
    if (error) console.error(error);
  };

  const addOrder = async (data: Omit<PurchaseOrder, 'id'>) => {
    const cleanData = cleanOrder(data);
    const newOrder: PurchaseOrder = { ...cleanData, id: 'Pending...' };
    setOrders((prev) => [newOrder, ...prev]);
    setSuppliers((prev) => prev.map((s) =>
      s.id === cleanData.supplierId
        ? { ...s, totalOrders: s.totalOrders + 1, totalSpent: s.totalSpent + cleanData.total }
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

  const deleteOrder = async (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    const { error } = await supabase.from('purchases').delete().eq('purchase_number', id);
    if (error) console.error(error);
  };

  const updateOrderStatus = async (id: string, status: PurchaseOrder['status'], paymentStatus: PurchaseOrder['paymentStatus']) => {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status, paymentStatus } : o));
    const { error } = await supabase.from('purchases')
      .update({ status, payment_status: paymentStatus }).eq('purchase_number', id);
    if (error) console.error(error);
  };

  const getSupplierOrders = (supplierId: string) => orders.filter((o) => o.supplierId === supplierId);

  return { suppliers, orders, loading, addSupplier, updateSupplier, deleteSupplier, addOrder, deleteOrder, updateOrderStatus, getSupplierOrders };
}
