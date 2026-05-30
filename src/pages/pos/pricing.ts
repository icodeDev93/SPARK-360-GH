import type { InventoryItem, SalePriceLevel } from '@/types/erp';

export const PRICE_LEVELS: SalePriceLevel[] = ['Single', 'Quarter', 'Half', 'Wholesale'];

export interface CartItem {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  qty: number;
  stock: number;
  image: string;
  priceLevel: SalePriceLevel;
  stockUnitsPerQty: number;
  prices: Record<SalePriceLevel, { price: number; costPrice: number; stockUnitsPerQty: number }>;
}

const unitsForLevel = (level: SalePriceLevel, quantityPerBox: number): number => {
  const boxUnits = Math.max(0, Math.floor(quantityPerBox));
  if (level === 'Single' || boxUnits <= 0) return 1;
  if (level === 'Wholesale') return boxUnits;
  if (level === 'Half') return Math.max(1, Math.ceil(boxUnits / 2));
  return Math.max(1, Math.ceil(boxUnits / 4));
};

export function priceForLevel(item: InventoryItem, level: SalePriceLevel) {
  const units = unitsForLevel(level, item.quantityPerBox);
  if (level === 'Single') {
    return {
      price: item.singleSellingPrice || item.sellingPrice,
      costPrice: item.singleCostPrice || item.costPrice,
      stockUnitsPerQty: units,
    };
  }
  if (level === 'Wholesale') {
    return {
      price: item.wholesaleSellingPrice || item.sellingPrice,
      costPrice: item.wholesaleCostPrice || item.costPrice,
      stockUnitsPerQty: units,
    };
  }
  if (level === 'Half') {
    return {
      price: item.halfSellingPrice,
      costPrice: item.wholesaleCostPrice > 0 ? item.wholesaleCostPrice / 2 : item.singleCostPrice * units,
      stockUnitsPerQty: units,
    };
  }
  return {
    price: item.quarterSellingPrice,
    costPrice: item.wholesaleCostPrice > 0 ? item.wholesaleCostPrice / 4 : item.singleCostPrice * units,
    stockUnitsPerQty: units,
  };
}

export function defaultPriceLevelForItem(item: InventoryItem): SalePriceLevel {
  if (item.singleSellingPrice > 0) return 'Single';
  if (item.wholesaleSellingPrice > 0) return 'Wholesale';
  if (item.halfSellingPrice > 0) return 'Half';
  if (item.quarterSellingPrice > 0) return 'Quarter';
  return 'Single';
}

export function buildCartItem(item: InventoryItem, level: SalePriceLevel = 'Single'): CartItem {
  const prices = PRICE_LEVELS.reduce((acc, priceLevel) => ({
    ...acc,
    [priceLevel]: priceForLevel(item, priceLevel),
  }), {} as CartItem['prices']);
  const selected = prices[level];
  return {
    id: item.itemId,
    name: item.productName,
    price: selected.price,
    costPrice: selected.costPrice,
    qty: 1,
    stock: item.currentStock,
    image: item.image,
    priceLevel: level,
    stockUnitsPerQty: selected.stockUnitsPerQty,
    prices,
  };
}

export function maxQtyForCartItem(item: CartItem): number {
  return Math.max(0, Math.floor(item.stock / Math.max(1, item.stockUnitsPerQty)));
}

export function applyPriceLevel(item: CartItem, level: SalePriceLevel): CartItem {
  const selected = item.prices[level];
  const next = {
    ...item,
    priceLevel: level,
    price: selected.price,
    costPrice: selected.costPrice,
    stockUnitsPerQty: selected.stockUnitsPerQty,
  };
  return { ...next, qty: Math.max(1, Math.min(next.qty, maxQtyForCartItem(next) || 1)) };
}
