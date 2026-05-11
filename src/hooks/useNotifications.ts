import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type NotifSeverity = 'critical' | 'warning' | 'info';
export type NotifCategory  = 'Stock' | 'Orders' | 'Sales';

export interface NotificationItem {
  id:          string;
  category:    NotifCategory;
  severity:    NotifSeverity;
  title:       string;
  subtitle:    string;
  image?:      string;
  initials?:   string;
  badge?:      string;
  badgeColor?: string;
  route:       string;
}

const DISMISSED_KEY = 'spark360_notifs_dismissed_v2';

function loadDismissed(): Set<string> {
  try {
    const s = localStorage.getItem(DISMISSED_KEY);
    if (s) return new Set(JSON.parse(s) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

function saveDismissed(s: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...s]));
}

function initials(name: string) {
  return name.trim().split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d     = new Date(dateStr); d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / 86_400_000);
}

function fmtGHS(n: number) {
  return '₵' + n.toLocaleString('en-GH', { minimumFractionDigits: 2 });
}

const SEV_ORDER: Record<NotifSeverity, number> = { critical: 0, warning: 1, info: 2 };

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dismissed, setDismissed]         = useState<Set<string>>(loadDismissed);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    (async () => {
      const today   = new Date().toISOString().split('T')[0];
      const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString().split('T')[0];

      const [invRes, poRes, salesRes] = await Promise.all([
        supabase
          .from('inventory')
          .select('product_code,product_name,sku,category_name,current_stock,reorder_level,expiry_date,image_url'),
        supabase
          .from('purchases')
          .select('purchase_number,supplier_name,expected_date,status,payment_status,total_amount,purchase_date'),
        supabase
          .from('sales')
          .select('id,receipt_number,sale_date,customer_name,total_amount,status,cashier,receipts(receipt_number)')
          .gte('sale_date', since7d)
          .order('sale_date', { ascending: false }),
      ]);

      const items: NotificationItem[] = [];

      // ── Stock level alerts ──────────────────────────────────────────────────
      for (const i of invRes.data ?? []) {
        if (i.current_stock > i.reorder_level) continue;
        const ratio = i.reorder_level > 0 ? i.current_stock / i.reorder_level : 0;
        const sev: NotifSeverity =
          i.current_stock === 0 || ratio <= 0.3 ? 'critical' : ratio <= 0.6 ? 'warning' : 'info';
        items.push({
          id:         `stock-${i.product_code}`,
          category:   'Stock',
          severity:   sev,
          title:      i.product_name,
          subtitle:   `${i.sku} · ${i.category_name ?? ''} · ${i.current_stock} / ${i.reorder_level} units`,
          image:      i.image_url ?? '',
          initials:   initials(i.product_name),
          badge:      i.current_stock === 0 ? 'Out of Stock' : 'Low Stock',
          badgeColor: i.current_stock === 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700',
          route:      '/inventory',
        });
      }

      // ── Expiring / expired products ─────────────────────────────────────────
      for (const i of invRes.data ?? []) {
        if (!i.expiry_date) continue;
        const days = daysUntil(i.expiry_date);
        if (days > 30) continue;
        const sev: NotifSeverity = days <= 0 ? 'critical' : days <= 7 ? 'warning' : 'info';
        items.push({
          id:         `expiry-${i.product_code}`,
          category:   'Stock',
          severity:   sev,
          title:      i.product_name,
          subtitle:   days <= 0
            ? `Expired on ${i.expiry_date}`
            : `Expires in ${days} day${days === 1 ? '' : 's'} · ${i.expiry_date}`,
          image:      i.image_url ?? '',
          initials:   initials(i.product_name),
          badge:      days <= 0 ? 'Expired' : 'Expiring Soon',
          badgeColor: days <= 0 ? 'bg-red-100 text-red-600' : days <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-600',
          route:      '/inventory',
        });
      }

      // ── Overdue purchase orders ─────────────────────────────────────────────
      for (const o of poRes.data ?? []) {
        if (!o.expected_date || o.expected_date === 'TBD') continue;
        if (!['Pending', 'Partial'].includes(o.status)) continue;
        if (o.expected_date >= today) continue;
        const daysLate = Math.abs(daysUntil(o.expected_date));
        items.push({
          id:         `overdue-${o.purchase_number}`,
          category:   'Orders',
          severity:   daysLate >= 7 ? 'critical' : 'warning',
          title:      `Overdue: ${o.purchase_number}`,
          subtitle:   `${o.supplier_name} · Expected ${o.expected_date} · ${fmtGHS(o.total_amount ?? 0)}`,
          badge:      `${daysLate}d overdue`,
          badgeColor: 'bg-red-100 text-red-600',
          route:      '/purchases',
        });
      }

      // ── Received but unpaid orders ──────────────────────────────────────────
      for (const o of poRes.data ?? []) {
        if (o.payment_status !== 'Unpaid' || o.status !== 'Received') continue;
        items.push({
          id:         `unpaid-${o.purchase_number}`,
          category:   'Orders',
          severity:   'warning',
          title:      `Unpaid: ${o.purchase_number}`,
          subtitle:   `${o.supplier_name} · Received · ${fmtGHS(o.total_amount ?? 0)}`,
          badge:      'Unpaid',
          badgeColor: 'bg-amber-100 text-amber-700',
          route:      '/purchases',
        });
      }

      // Helper: prefer the RCP- number from the receipts join, fall back to the sale's own field
      type SaleRow = { receipt_number: string; receipts: { receipt_number: string } | { receipt_number: string }[] | null };
      const getReceiptNo = (s: SaleRow) => {
        if (Array.isArray(s.receipts)) return s.receipts[0]?.receipt_number ?? s.receipt_number;
        return (s.receipts as { receipt_number: string } | null)?.receipt_number ?? s.receipt_number;
      };

      // ── Today's sales transactions ──────────────────────────────────────────
      const todaySales = (salesRes.data ?? [])
        .filter((s) => s.sale_date === today && s.status === 'completed')
        .slice(0, 8);

      for (const s of todaySales) {
        items.push({
          id:         `sale-${s.id}`,
          category:   'Sales',
          severity:   'info',
          title:      getReceiptNo(s),
          subtitle:   `${s.customer_name} · ${fmtGHS(s.total_amount ?? 0)}${s.cashier ? ' · ' + s.cashier : ''}`,
          badge:      'Completed',
          badgeColor: 'bg-emerald-100 text-emerald-700',
          route:      '/sales-history',
        });
      }

      // ── Recent refunds (last 7 days) ────────────────────────────────────────
      const refunds = (salesRes.data ?? [])
        .filter((s) => s.status === 'refunded')
        .slice(0, 5);

      for (const s of refunds) {
        items.push({
          id:         `refund-${s.id}`,
          category:   'Sales',
          severity:   'warning',
          title:      `Refund: ${getReceiptNo(s)}`,
          subtitle:   `${s.customer_name} · ${fmtGHS(s.total_amount ?? 0)} · ${s.sale_date}`,
          badge:      'Refunded',
          badgeColor: 'bg-red-100 text-red-600',
          route:      '/sales-history',
        });
      }

      items.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
      setNotifications(items);
      setLoading(false);
    })();
  }, []);

  const active = notifications.filter((n) => !dismissed.has(n.id));

  const dismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev); next.add(id);
      saveDismissed(next);
      return next;
    });
  };

  const dismissCategory = (cat?: NotifCategory) => {
    setDismissed((prev) => {
      const ids = cat
        ? notifications.filter((n) => n.category === cat).map((n) => n.id)
        : notifications.map((n) => n.id);
      const next = new Set([...prev, ...ids]);
      saveDismissed(next);
      return next;
    });
  };

  return {
    notifications: active,
    loading,
    dismiss,
    dismissAll: () => dismissCategory(),
    dismissCategory,
    criticalCount: active.filter((n) => n.severity === 'critical').length,
    byCategory: (cat: NotifCategory) => active.filter((n) => n.category === cat),
  };
}
