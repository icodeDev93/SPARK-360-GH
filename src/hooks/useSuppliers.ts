import { useState, useEffect } from 'react';
import { Supplier, PurchaseOrder, seedSuppliers, seedPurchaseOrders } from '@/mocks/suppliers';
import { supabase } from '@/lib/supabase';

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [supRes, ordRes] = await Promise.all([
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('purchase_orders').select('*').order('date', { ascending: false }),
      ]);

      if (supRes.error) console.error(supRes.error);
      if (ordRes.error) console.error(ordRes.error);

      const sups: Supplier[] = supRes.data && supRes.data.length > 0
        ? supRes.data.map((r) => ({
            id: r.id, name: r.name, contact: r.contact, phone: r.phone,
            email: r.email, address: r.address, category: r.category,
            totalOrders: r.total_orders, totalSpent: r.total_spent,
            status: r.status, joinedDate: r.joined_date, notes: r.notes,
          }))
        : [];

      const ords: PurchaseOrder[] = ordRes.data && ordRes.data.length > 0
        ? ordRes.data.map((r) => ({
            id: r.id, supplierId: r.supplier_id, supplierName: r.supplier_name,
            date: r.date, expectedDate: r.expected_date, items: r.items,
            total: r.total, status: r.status, paymentStatus: r.payment_status, notes: r.notes,
          }))
        : [];

      if (sups.length === 0) {
        const rows = seedSuppliers.map((s) => ({
          id: s.id, name: s.name, contact: s.contact, phone: s.phone, email: s.email,
          address: s.address, category: s.category, total_orders: s.totalOrders,
          total_spent: s.totalSpent, status: s.status, joined_date: s.joinedDate, notes: s.notes,
        }));
        await supabase.from('suppliers').insert(rows);
        setSuppliers(seedSuppliers);
      } else {
        setSuppliers(sups);
      }

      if (ords.length === 0) {
        const rows = seedPurchaseOrders.map((o) => ({
          id: o.id, supplier_id: o.supplierId, supplier_name: o.supplierName,
          date: o.date, expected_date: o.expectedDate, items: o.items,
          total: o.total, status: o.status, payment_status: o.paymentStatus, notes: o.notes,
        }));
        await supabase.from('purchase_orders').insert(rows);
        setOrders(seedPurchaseOrders);
      } else {
        setOrders(ords);
      }

      setLoading(false);
    })();
  }, []);

  const addSupplier = async (data: Omit<Supplier, 'id' | 'totalOrders' | 'totalSpent'>) => {
    const newSup: Supplier = { ...data, id: `sup${Date.now()}`, totalOrders: 0, totalSpent: 0 };
    setSuppliers((prev) => [newSup, ...prev]);
    const { error } = await supabase.from('suppliers').insert({
      id: newSup.id, name: newSup.name, contact: newSup.contact, phone: newSup.phone,
      email: newSup.email, address: newSup.address, category: newSup.category,
      total_orders: 0, total_spent: 0, status: newSup.status,
      joined_date: newSup.joinedDate, notes: newSup.notes,
    });
    if (error) console.error(error);
  };

  const updateSupplier = async (id: string, data: Partial<Omit<Supplier, 'id'>>) => {
    setSuppliers((prev) => prev.map((s) => s.id === id ? { ...s, ...data } : s));
    const { error } = await supabase.from('suppliers').update({
      name: data.name, contact: data.contact, phone: data.phone, email: data.email,
      address: data.address, category: data.category, status: data.status,
      joined_date: data.joinedDate, notes: data.notes,
    }).eq('id', id);
    if (error) console.error(error);
  };

  const deleteSupplier = async (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) console.error(error);
  };

  const addOrder = async (data: Omit<PurchaseOrder, 'id'>) => {
    const newOrder: PurchaseOrder = { ...data, id: `PO-${String(Date.now()).slice(-6)}` };
    setOrders((prev) => [newOrder, ...prev]);
    setSuppliers((prev) => prev.map((s) =>
      s.id === data.supplierId
        ? { ...s, totalOrders: s.totalOrders + 1, totalSpent: s.totalSpent + data.total }
        : s
    ));
    const { error } = await supabase.from('purchase_orders').insert({
      id: newOrder.id, supplier_id: newOrder.supplierId, supplier_name: newOrder.supplierName,
      date: newOrder.date, expected_date: newOrder.expectedDate, items: newOrder.items,
      total: newOrder.total, status: newOrder.status,
      payment_status: newOrder.paymentStatus, notes: newOrder.notes,
    });
    if (error) console.error(error);
    const sup = suppliers.find((s) => s.id === data.supplierId);
    if (sup) {
      await supabase.from('suppliers').update({
        total_orders: sup.totalOrders + 1,
        total_spent:  sup.totalSpent + data.total,
      }).eq('id', data.supplierId);
    }
  };

  const updateOrderStatus = async (id: string, status: PurchaseOrder['status'], paymentStatus: PurchaseOrder['paymentStatus']) => {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status, paymentStatus } : o));
    const { error } = await supabase.from('purchase_orders')
      .update({ status, payment_status: paymentStatus }).eq('id', id);
    if (error) console.error(error);
  };

  const getSupplierOrders = (supplierId: string) => orders.filter((o) => o.supplierId === supplierId);

  return { suppliers, orders, loading, addSupplier, updateSupplier, deleteSupplier, addOrder, updateOrderStatus, getSupplierOrders };
}
