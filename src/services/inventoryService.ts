import type { InventoryItem, StockStatus } from '@/types/erp';

type InventoryItemDraft = Pick<
  InventoryItem,
  'itemId' | 'sku' | 'productName' | 'category' | 'supplier' | 'costPrice' | 'sellingPrice' | 'currentStock' | 'reorderLevel' | 'image'
> & Partial<Omit<InventoryItem, 'itemId' | 'sku' | 'productName' | 'category' | 'supplier' | 'costPrice' | 'sellingPrice' | 'currentStock' | 'reorderLevel' | 'image' | 'stockStatus' | 'marginPerUnit'>>;

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
  item: InventoryItemDraft
): InventoryItem {
  const quantityPerBox = item.quantityPerBox ?? 0;
  const wholesaleQuantity = item.wholesaleQuantity ?? 0;
  const singleQuantity = item.singleQuantity ?? item.currentStock ?? 0;
  const currentStock = quantityPerBox > 0
    ? Math.max(0, Math.floor(wholesaleQuantity * quantityPerBox + singleQuantity))
    : Math.max(0, Math.floor(item.currentStock ?? singleQuantity));
  const singleCostPrice = item.singleCostPrice ?? item.costPrice ?? 0;
  const singleSellingPrice = item.singleSellingPrice ?? item.sellingPrice ?? 0;
  const reorderLevel = item.stockLimit ?? item.reorderLevel ?? 0;

  return {
    ...item,
    costPrice: singleCostPrice,
    sellingPrice: singleSellingPrice,
    wholesaleCostPrice: item.wholesaleCostPrice ?? 0,
    singleCostPrice,
    wholesaleSellingPrice: item.wholesaleSellingPrice ?? 0,
    halfSellingPrice: item.halfSellingPrice ?? 0,
    quarterSellingPrice: item.quarterSellingPrice ?? 0,
    singleSellingPrice,
    wholesaleQuantity,
    singleQuantity,
    quantityPerBox,
    stockLimit: reorderLevel,
    description: item.description ?? '',
    priceLevels: item.priceLevels ?? [],
    currentStock,
    reorderLevel,
    expiryDate: item.expiryDate ?? '',
    stockStatus: getStockStatus(currentStock, reorderLevel),
    marginPerUnit: calcMarginPerUnit(singleSellingPrice, singleCostPrice),
  };
}
