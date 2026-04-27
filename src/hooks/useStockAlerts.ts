import { useState } from 'react';
import { inventoryItems } from '@/mocks/inventory';

export interface StockAlertItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  stock: number;
  reorder: number;
  image: string;
  severity: 'critical' | 'low' | 'warning';
}

const DISMISSED_KEY = 'spark360_dismissed_alerts';

function getSeverity(stock: number, reorder: number): 'critical' | 'low' | 'warning' {
  const ratio = stock / reorder;
  if (stock === 0) return 'critical';
  if (ratio <= 0.3) return 'critical';
  if (ratio <= 0.6) return 'low';
  return 'warning';
}

function loadDismissed(): Set<number> {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    if (stored) return new Set(JSON.parse(stored) as number[]);
  } catch { /* ignore */ }
  return new Set();
}

export function useStockAlerts() {
  const [dismissed, setDismissed] = useState<Set<number>>(loadDismissed);

  const allAlerts: StockAlertItem[] = inventoryItems
    .filter((item) => item.stock <= item.reorder)
    .map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      stock: item.stock,
      reorder: item.reorder,
      image: item.image,
      severity: getSeverity(item.stock, item.reorder),
    }))
    .sort((a, b) => {
      const order = { critical: 0, low: 1, warning: 2 };
      return order[a.severity] - order[b.severity];
    });

  const activeAlerts = allAlerts.filter((a) => !dismissed.has(a.id));

  const dismissAlert = (id: number) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
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

  const criticalCount = activeAlerts.filter((a) => a.severity === 'critical').length;
  const lowCount = activeAlerts.filter((a) => a.severity === 'low').length;

  return { allAlerts, activeAlerts, dismissAlert, dismissAll, restoreAll, criticalCount, lowCount };
}
