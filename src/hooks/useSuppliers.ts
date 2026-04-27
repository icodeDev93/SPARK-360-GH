import { useState } from 'react';
import { Supplier, PurchaseOrder, seedSuppliers, seedPurchaseOrders } from '@/mocks/suppliers';

const SUP_KEY = 'spark360_suppliers';
const PO_KEY = 'spark360_purchase_orders';

function loadData<T>(key: string, seed: T[]): T[] {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored) as T[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => loadData(SUP_KEY, seedSuppliers));
  const [orders, setOrders] = useState<PurchaseOrder[]>(() => loadData(PO_KEY, seedPurchaseOrders));

  const addSupplier = (data: Omit<Supplier, 'id' | 'totalOrders' | 'totalSpent'>) => {
    const newSup: Supplier = { ...data, id: `sup${Date.now()}`, totalOrders: 0, totalSpent: 0 };
    setSuppliers((prev) => {
      const next = [newSup, ...prev];
      localStorage.setItem(SUP_KEY, JSON.stringify(next));
      return next;
    });
  };

  const updateSupplier = (id: string, data: Partial<Omit<Supplier, 'id'>>) => {
    setSuppliers((prev) => {
      const next = prev.map((s) => s.id === id ? { ...s, ...data } : s);
      localStorage.setItem(SUP_KEY, JSON.stringify(next));
      return next;
    });
  };

  const deleteSupplier = (id: string) => {
    setSuppliers((prev) => {
      const next = prev.filter((s) => s.id !== id);
      localStorage.setItem(SUP_KEY, JSON.stringify(next));
      return next;
    });
  };

  const addOrder = (data: Omit<PurchaseOrder, 'id'>) => {
    const newOrder: PurchaseOrder = { ...data, id: `PO-${String(Date.now()).slice(-4)}` };
    setOrders((prev) => {
      const next = [newOrder, ...prev];
      localStorage.setItem(PO_KEY, JSON.stringify(next));
      return next;
    });
    // Update supplier stats
    setSuppliers((prev) => {
      const next = prev.map((s) =>
        s.id === data.supplierId
          ? { ...s, totalOrders: s.totalOrders + 1, totalSpent: s.totalSpent + data.total }
          : s
      );
      localStorage.setItem(SUP_KEY, JSON.stringify(next));
      return next;
    });
  };

  const updateOrderStatus = (id: string, status: PurchaseOrder['status'], paymentStatus: PurchaseOrder['paymentStatus']) => {
    setOrders((prev) => {
      const next = prev.map((o) => o.id === id ? { ...o, status, paymentStatus } : o);
      localStorage.setItem(PO_KEY, JSON.stringify(next));
      return next;
    });
  };

  const getSupplierOrders = (supplierId: string) => orders.filter((o) => o.supplierId === supplierId);

  return { suppliers, orders, addSupplier, updateSupplier, deleteSupplier, addOrder, updateOrderStatus, getSupplierOrders };
}
