import type { InventoryItem, StockStatus } from '@/types/erp';

type InventoryItemDraft = Pick<
  InventoryItem,
  'itemId' | 'productName' | 'category' | 'supplier' | 'costPrice' | 'sellingPrice' | 'currentStock' | 'reorderLevel' | 'image'
> & Partial<Omit<InventoryItem, 'itemId' | 'productName' | 'category' | 'supplier' | 'costPrice' | 'sellingPrice' | 'currentStock' | 'reorderLevel' | 'image' | 'stockStatus' | 'marginPerUnit'>>;

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
  return items.reduce((sum, item) => sum + calcStockValue(item), 0);
}

export function calcCurrentStockUnits(item: Pick<InventoryItem, 'wholesaleQuantity' | 'singleQuantity' | 'quantityPerBox'>): number {
  const unitsPerPack = Math.max(0, Math.floor(item.quantityPerBox || 0));
  const packs = Math.max(0, Number(item.wholesaleQuantity) || 0);
  const singles = Math.max(0, Math.floor(item.singleQuantity || 0));
  return Math.floor(unitsPerPack > 0 ? packs * unitsPerPack + singles : singles);
}

export function calcStockValue(item: Pick<InventoryItem, 'wholesaleQuantity' | 'singleQuantity' | 'wholesaleCostPrice' | 'singleCostPrice'>): number {
  const packs = Math.max(0, Number(item.wholesaleQuantity) || 0);
  const singles = Math.max(0, Math.floor(item.singleQuantity || 0));
  return packs * Math.max(0, Number(item.wholesaleCostPrice) || 0) + singles * Math.max(0, Number(item.singleCostPrice) || 0);
}

export function calcRetailStockValue(item: Pick<InventoryItem, 'wholesaleQuantity' | 'singleQuantity' | 'wholesaleSellingPrice' | 'singleSellingPrice'>): number {
  const packs = Math.max(0, Number(item.wholesaleQuantity) || 0);
  const singles = Math.max(0, Math.floor(item.singleQuantity || 0));
  return packs * Math.max(0, Number(item.wholesaleSellingPrice) || 0) + singles * Math.max(0, Number(item.singleSellingPrice) || 0);
}

export function formatPackStock(item: Pick<InventoryItem, 'wholesaleQuantity' | 'singleQuantity' | 'quantityPerBox' | 'currentStock'>): string {
  const unitsPerPack = Math.max(0, Math.floor(item.quantityPerBox || 0));
  if (unitsPerPack <= 0) return `${Math.max(0, Math.floor(item.currentStock || 0))} pcs`;
  const packs = Math.max(0, Number(item.wholesaleQuantity) || 0);
  const singles = Math.max(0, Math.floor(item.singleQuantity || 0));
  const packLabel = packs === 1 ? 'pack' : 'packs';
  const pieceLabel = singles === 1 ? 'pc' : 'pcs';
  return `${packs} ${packLabel} + ${singles} ${pieceLabel}`;
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
  const calculatedStock = calcCurrentStockUnits({ wholesaleQuantity, singleQuantity, quantityPerBox });
  const currentStock = Math.max(0, Math.floor(item.currentStock ?? calculatedStock));
  const wholesaleCostPrice = item.wholesaleCostPrice ?? item.costPrice ?? 0;
  const singleCostPrice = item.singleCostPrice ?? item.costPrice ?? 0;
  const singleSellingPrice = item.singleSellingPrice ?? item.sellingPrice ?? 0;
  const reorderLevel = item.stockLimit ?? item.reorderLevel ?? 0;

  return {
    ...item,
    costPrice: wholesaleCostPrice,
    sellingPrice: singleSellingPrice,
    wholesaleCostPrice,
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
