import type { InventoryItem } from '@/types/erp';
import { enrichInventoryItem } from '@/services/inventoryService';

const raw: Omit<InventoryItem, 'stockStatus' | 'marginPerUnit' | 'expiryDate'>[] = [
  { itemId: 'P001', sku: 'SN-PRG-001', productName: 'Pringles Original (165g)', category: 'Chips & Crisps', supplier: 'Kelloggs GH Dist.', costPrice: 28.00, sellingPrice: 42.00, currentStock: 240, reorderLevel: 60, image: '' },
  { itemId: 'P002', sku: 'SN-LAY-002', productName: "Lay's Classic Chips (80g)", category: 'Chips & Crisps', supplier: 'PepsiCo GH Dist.', costPrice: 15.00, sellingPrice: 22.00, currentStock: 18, reorderLevel: 50, image: '' },
  { itemId: 'P003', sku: 'BV-MIL-003', productName: 'Milo Sachet (30g)', category: 'Beverages', supplier: 'Nestle Ghana Ltd.', costPrice: 2.50, sellingPrice: 4.00, currentStock: 1200, reorderLevel: 300, image: '' },
  { itemId: 'P004', sku: 'BV-OVA-004', productName: 'Ovaltine Tin (400g)', category: 'Beverages', supplier: 'Associated Brand Ind.', costPrice: 45.00, sellingPrice: 65.00, currentStock: 85, reorderLevel: 30, image: '' },
  { itemId: 'P005', sku: 'BS-DIG-005', productName: 'McVities Digestive (400g)', category: 'Biscuits', supplier: 'United Biscuits GH', costPrice: 18.00, sellingPrice: 28.00, currentStock: 0, reorderLevel: 40, image: '' },
  { itemId: 'P006', sku: 'BS-BRB-006', productName: 'Bourbon Biscuits (150g)', category: 'Biscuits', supplier: 'United Biscuits GH', costPrice: 12.00, sellingPrice: 18.00, currentStock: 320, reorderLevel: 80, image: '' },
  { itemId: 'P007', sku: 'CN-KIT-007', productName: 'Kit Kat 4-Finger (41.5g)', category: 'Confectionery', supplier: 'Nestle Ghana Ltd.', costPrice: 10.00, sellingPrice: 16.00, currentStock: 42, reorderLevel: 100, image: '' },
  { itemId: 'P008', sku: 'CN-CHM-008', productName: 'Choco Mallow (Pack of 6)', category: 'Confectionery', supplier: 'Pee Gee Foods', costPrice: 8.00, sellingPrice: 14.00, currentStock: 150, reorderLevel: 60, image: '' },
  { itemId: 'P009', sku: 'BV-MLT-009', productName: 'Malta Guinness (330ml)', category: 'Beverages', supplier: 'Guinness Ghana Brew.', costPrice: 5.50, sellingPrice: 9.00, currentStock: 500, reorderLevel: 120, image: '' },
  { itemId: 'P010', sku: 'BV-ALV-010', productName: 'Alvaro Malt Pear (330ml)', category: 'Beverages', supplier: 'Kasapreko Co. Ltd.', costPrice: 5.00, sellingPrice: 8.00, currentStock: 25, reorderLevel: 120, image: '' },
  { itemId: 'P011', sku: 'BV-TWR-011', productName: 'Table Water 500ml (Crate/24)', category: 'Beverages', supplier: 'Voltic GH Ltd.', costPrice: 28.80, sellingPrice: 48.00, currentStock: 60, reorderLevel: 20, image: '' },
  { itemId: 'P012', sku: 'CN-GUM-012', productName: "Wrigley's Spearmint Gum (10s)", category: 'Confectionery', supplier: 'Wrigley West Africa', costPrice: 3.00, sellingPrice: 5.00, currentStock: 600, reorderLevel: 150, image: '' },
  { itemId: 'P013', sku: 'SN-FCB-013', productName: 'FanChoco Bar (50g)', category: 'Confectionery', supplier: 'Fan Milk Ghana Ltd.', costPrice: 6.00, sellingPrice: 10.00, currentStock: 200, reorderLevel: 80, image: '' },
  { itemId: 'P014', sku: 'BS-RCR-014', productName: 'Rich Tea Cream Crackers (200g)', category: 'Biscuits', supplier: 'United Biscuits GH', costPrice: 14.00, sellingPrice: 22.00, currentStock: 7, reorderLevel: 40, image: '' },
  { itemId: 'P015', sku: 'BV-CCP-015', productName: 'Coca-Cola PET 500ml (Crate/24)', category: 'Beverages', supplier: 'Coca-Cola Bottling GH', costPrice: 72.00, sellingPrice: 120.00, currentStock: 30, reorderLevel: 15, image: '' },
];

export const inventoryItems: InventoryItem[] = raw.map(enrichInventoryItem);

export const inventoryCategories = [
  'All',
  'Beverages',
  'Confectionery',
  'Cleaning Supplies',
  'Household Items',
  'Baby Products',
  'Personal Care',
  'Food Staples',
  'Canned Foods',
  'Bakery',
  'Packaging',
  'Miscellaneous',
];
