import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface StockAlertItem {
  id: string; name: string; sku: string; category: string;
  stock: number; reorder: number; image: string;
  severity: 'critical' | 'low' | 'warning';
}

const DISMISSED_KEY = 'spark360_dismissed_alerts';

function getSeverity(stock: number, reorder: number): 'critical' | 'low' | 'warning' {
  if (stock === 0) return 'critical';
  const ratio = stock / reorder;
  if (ratio <= 0.3) return 'critical';
  if (ratio <= 0.6) return 'low';
  return 'warning';
}

function loadDismissed(): Set<string> {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    if (stored) return new Set(JSON.parse(stored) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

export function useStockAlerts() {
  const [allAlerts, setAllAlerts] = useState<StockAlertItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);

  useEffect(() => {
    (async () => {
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select('item_id, product_name, sku, category, current_stock, reorder_level, image');

      if (error) return;

      const alerts: StockAlertItem[] = (items ?? [])
        .filter((i) => i.current_stock <= i.reorder_level)
        .map((i) => ({
          id: i.item_id, name: i.product_name, sku: i.sku, category: i.category,
          stock: i.current_stock, reorder: i.reorder_level, image: i.image,
          severity: getSeverity(i.current_stock, i.reorder_level),
        }))
        .sort((a, b) => {
          const order = { critical: 0, low: 1, warning: 2 };
          return order[a.severity] - order[b.severity];
        });

      setAllAlerts(alerts);
    })();
  }, []);

  const activeAlerts = allAlerts.filter((a) => !dismissed.has(a.id));

  const dismissAlert = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev); next.add(id);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const dismissAll = () => {
    const ids = allAlerts.map((a) => a.id);
    setDismissed((prev) => {
      const next = new Set([...prev, ...ids]);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const restoreAll = () => {
    setDismissed(new Set());
    localStorage.removeItem(DISMISSED_KEY);
  };

  return {
    allAlerts, activeAlerts, dismissAlert, dismissAll, restoreAll,
    criticalCount: activeAlerts.filter((a) => a.severity === 'critical').length,
    lowCount: activeAlerts.filter((a) => a.severity === 'low').length,
  };
}
