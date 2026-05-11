import type { InventoryItem, StockStatus } from '@/types/erp';

export function getStockStatus(currentStock: number, reorderLevel: number): StockStatus {
  if (currentStock === 0) return 'OUT OF STOCK';
  if (currentStock <= reorderLevel) return 'LOW';
  return 'OK';
}

export function calcMarginPerUnit(sellingPrice: number, costPrice: number): number {
  return sellingPrice - costPrice;
}

export function calcMarginPercent(sellingPrice: number, costPrice: number): number {
  if (costPrice === 0) return 0;
  return ((sellingPrice - costPrice) / costPrice) * 100;
}

export function calcTotalStockValue(items: InventoryItem[]): number {
  return items.reduce((sum, item) => sum + item.currentStock * item.costPrice, 0);
}

export function decrementStock(
  items: InventoryItem[],
  productId: string,
  qty: number
): InventoryItem[] {
  return items.map((item) => {
    if (item.itemId !== productId) return item;
    const newStock = Math.max(0, item.currentStock - qty);
    return {
      ...item,
      currentStock: newStock,
      stockStatus: getStockStatus(newStock, item.reorderLevel),
    };
  });
}

export function incrementStock(
  items: InventoryItem[],
  productId: string,
  qty: number
): InventoryItem[] {
  return items.map((item) => {
    if (item.itemId !== productId) return item;
    const newStock = item.currentStock + qty;
    return {
      ...item,
      currentStock: newStock,
      stockStatus: getStockStatus(newStock, item.reorderLevel),
    };
  });
}

export function getLowStockItems(items: InventoryItem[]): InventoryItem[] {
  return items.filter((item) => item.stockStatus === 'LOW' || item.stockStatus === 'OUT OF STOCK');
}

export function enrichInventoryItem(
  item: Omit<InventoryItem, 'stockStatus' | 'marginPerUnit'> | Omit<InventoryItem, 'stockStatus' | 'marginPerUnit' | 'expiryDate'>
): InventoryItem {
  return {
    ...item,
    expiryDate: 'expiryDate' in item ? item.expiryDate : '',
    stockStatus: getStockStatus(item.currentStock, item.reorderLevel),
    marginPerUnit: calcMarginPerUnit(item.sellingPrice, item.costPrice),
  };
}
