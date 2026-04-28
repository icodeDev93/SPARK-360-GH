import { useState } from 'react';
import { inventoryItems } from '@/mocks/inventory';

export interface StockAlertItem {
  id: string;
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
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);

  const allAlerts: StockAlertItem[] = inventoryItems
    .filter((item) => item.currentStock <= item.reorderLevel)
    .map((item) => ({
      id: item.itemId,
      name: item.productName,
      sku: item.sku,
      category: item.category,
      stock: item.currentStock,
      reorder: item.reorderLevel,
      image: item.image,
      severity: getSeverity(item.currentStock, item.reorderLevel),
    }))
    .sort((a, b) => {
      const order = { critical: 0, low: 1, warning: 2 };
      return order[a.severity] - order[b.severity];
    });

  const activeAlerts = allAlerts.filter((a) => !dismissed.has(a.id));

  const dismissAlert = (id: string) => {
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
