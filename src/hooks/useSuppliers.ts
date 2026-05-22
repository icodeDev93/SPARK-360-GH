import { useState, useEffect } from 'react';
import { Supplier, PurchaseOrder } from '@/mocks/suppliers';
import { supabase } from '@/lib/supabase';
import { sanitizeEmail, sanitizeMultiline, sanitizeText } from '@/lib/sanitize';
import { loadLocalCollection, queueLocalMutation, saveLocalCollection } from '@/lib/localCache';
import { useBusiness } from '@/contexts/BusinessContext';

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
  const { activeBusinessId } = useBusiness();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      if (!activeBusinessId) {
        setSuppliers([]);
        setOrders([]);
        setLoading(false);
        return;
      }
      const [cachedSuppliers, cachedOrders] = await Promise.all([
        loadLocalCollection<Supplier>('suppliers'),
        loadLocalCollection<PurchaseOrder>('purchases'),
      ]);
      if (cachedSuppliers.length) setSuppliers(cachedSuppliers);
      if (cachedOrders.length) setOrders(cachedOrders);
      const [supRes, ordRes] = await Promise.all([
        supabase.from('suppliers').select('*').eq('business_id', activeBusinessId).order('name'),
        supabase.from('purchases').select('*').eq('business_id', activeBusinessId).order('purchase_date', { ascending: false }),
      ]);
      if (supRes.error) console.error(supRes.error);
      if (ordRes.error) console.error(ordRes.error);
      if (!supRes.error && supRes.data) {
        const nextSuppliers = supRes.data.map((r) => toSupplier(r as SupplierRow));
        setSuppliers(nextSuppliers);
        saveLocalCollection('suppliers', nextSuppliers);
      }
      if (!ordRes.error && ordRes.data) {
        const nextOrders = ordRes.data.map((r) => toPurchaseOrder(r as PurchaseRow));
        setOrders(nextOrders);
        saveLocalCollection('purchases', nextOrders);
      }
      setLoading(false);
    };

    fetchAll();

    const channel = supabase
      .channel('suppliers-purchases-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, fetchAll)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeBusinessId]);

  const addSupplier = async (data: Omit<Supplier, 'id' | 'totalOrders' | 'totalSpent'>) => {
    if (!activeBusinessId) return;
    const cleanData = cleanSupplier(data);
    const newSup: Supplier = { ...cleanData, id: `SUP${Date.now()}`, totalOrders: 0, totalSpent: 0 };
    const nextSuppliers = [newSup, ...suppliers];
    setSuppliers(nextSuppliers);
    saveLocalCollection('suppliers', nextSuppliers);
    const { data: inserted, error } = await supabase.from('suppliers').insert({
      business_id: activeBusinessId, supplier_code: newSup.id, name: newSup.name, contact_name: newSup.contact, phone: newSup.phone,
      email: newSup.email, address: newSup.address, category: newSup.category,
      status: newSup.status, joined_date: toDateValue(newSup.joinedDate), notes: newSup.notes,
    }).select('*').single();
    if (error) {
      console.error(error);
      queueLocalMutation('suppliers', newSup.id, 'create', newSup);
    }
    if (inserted) {
      const savedSupplier = toSupplier(inserted as SupplierRow);
      const syncedSuppliers = nextSuppliers.map((supplier) => supplier.id === newSup.id ? savedSupplier : supplier);
      setSuppliers(syncedSuppliers);
      saveLocalCollection('suppliers', syncedSuppliers);
    }
  };

  const updateSupplier = async (id: string, data: Partial<Omit<Supplier, 'id'>>) => {
    const cleanData = cleanSupplierPatch(data);
    const nextSuppliers = suppliers.map((s) => s.id === id ? { ...s, ...cleanData } : s);
    setSuppliers(nextSuppliers);
    saveLocalCollection('suppliers', nextSuppliers);
    const { error } = await supabase.from('suppliers').update({
      name: cleanData.name, contact_name: cleanData.contact, phone: cleanData.phone, email: cleanData.email,
      address: cleanData.address, category: cleanData.category, status: cleanData.status,
      joined_date: cleanData.joinedDate ? toDateValue(cleanData.joinedDate) : undefined, notes: cleanData.notes,
    }).eq('business_id', activeBusinessId).eq('supplier_code', id);
    if (error) {
      console.error(error);
      queueLocalMutation('suppliers', id, 'update', nextSuppliers.find((supplier) => supplier.id === id));
    }
  };

  const deleteSupplier = async (id: string) => {
    const nextSuppliers = suppliers.filter((s) => s.id !== id);
    setSuppliers(nextSuppliers);
    saveLocalCollection('suppliers', nextSuppliers);
    const { error } = await supabase.from('suppliers').delete().eq('business_id', activeBusinessId).eq('supplier_code', id);
    if (error) {
      console.error(error);
      queueLocalMutation('suppliers', id, 'delete', { id });
    }
  };

  const addOrder = async (data: Omit<PurchaseOrder, 'id'>) => {
    if (!activeBusinessId) return;
    const cleanData = cleanOrder(data);
    const newOrder: PurchaseOrder = { ...cleanData, id: `PUR${Date.now()}` };
    const nextOrders = [newOrder, ...orders];
    const nextSuppliers = suppliers.map((s) =>
      s.id === cleanData.supplierId
        ? { ...s, totalOrders: s.totalOrders + 1, totalSpent: s.totalSpent + cleanData.total }
        : s
    );
    setOrders(nextOrders);
    setSuppliers(nextSuppliers);
    saveLocalCollection('purchases', nextOrders);
    saveLocalCollection('suppliers', nextSuppliers);
    const { data: inserted, error } = await supabase.from('purchases').insert({
      business_id: activeBusinessId,
      purchase_number: newOrder.id,
      supplier_code: newOrder.supplierId,
      supplier_name: newOrder.supplierName, purchase_date: toDateValue(newOrder.date),
      expected_date: toDateValue(newOrder.expectedDate), item_count: newOrder.items,
      subtotal: newOrder.total, total_amount: newOrder.total, status: newOrder.status,
      payment_status: newOrder.paymentStatus, notes: newOrder.notes,
    }).select('*').single();
    if (error) {
      console.error(error);
      queueLocalMutation('purchases', newOrder.id, 'create', newOrder);
    }
    if (inserted) {
      const savedOrder = toPurchaseOrder(inserted as PurchaseRow);
      const syncedOrders = nextOrders.map((order) => order.id === newOrder.id ? savedOrder : order);
      setOrders(syncedOrders);
      saveLocalCollection('purchases', syncedOrders);
    }
  };

  const deleteOrder = async (id: string) => {
    const nextOrders = orders.filter((o) => o.id !== id);
    setOrders(nextOrders);
    saveLocalCollection('purchases', nextOrders);
    const { error } = await supabase.from('purchases').delete().eq('business_id', activeBusinessId).eq('purchase_number', id);
    if (error) {
      console.error(error);
      queueLocalMutation('purchases', id, 'delete', { id });
    }
  };

  const updateOrderStatus = async (id: string, status: PurchaseOrder['status'], paymentStatus: PurchaseOrder['paymentStatus']) => {
    const nextOrders = orders.map((o) => o.id === id ? { ...o, status, paymentStatus } : o);
    setOrders(nextOrders);
    saveLocalCollection('purchases', nextOrders);
    const { error } = await supabase.from('purchases')
      .update({ status, payment_status: paymentStatus }).eq('business_id', activeBusinessId).eq('purchase_number', id);
    if (error) {
      console.error(error);
      queueLocalMutation('purchases', id, 'update', nextOrders.find((order) => order.id === id));
    }
  };

  const getSupplierOrders = (supplierId: string) => orders.filter((o) => o.supplierId === supplierId);

  return { suppliers, orders, loading, addSupplier, updateSupplier, deleteSupplier, addOrder, deleteOrder, updateOrderStatus, getSupplierOrders };
}
