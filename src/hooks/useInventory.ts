import { useState, useEffect } from 'react';
import type { InventoryItem } from '@/types/erp';
import { enrichInventoryItem } from '@/services/inventoryService';
import { supabase } from '@/lib/supabase';
import { sanitizeMultiline, sanitizeText, sanitizeUrl } from '@/lib/sanitize';
import { loadLocalCollection, queueLocalMutation, saveLocalCollection } from '@/lib/localCache';

type Row = {
  id?: string; product_code: string; product_name: string; sku: string;
  category_name: string | null; supplier_name: string | null;
  cost_price: number; selling_price: number; current_stock: number;
  reorder_level: number; expiry_date: string | null; image_url: string | null;
  wholesale_cost_price?: number | null; single_cost_price?: number | null;
  wholesale_selling_price?: number | null; half_selling_price?: number | null;
  quarter_selling_price?: number | null; single_selling_price?: number | null;
  wholesale_quantity?: number | null; single_quantity?: number | null;
  quantity_per_box?: number | null; stock_limit?: number | null;
  description?: string | null; price_levels?: { label: string; price: number }[] | null;
};

const toItem = (r: Row): InventoryItem => enrichInventoryItem({
  itemId: r.product_code, productName: r.product_name, sku: r.sku,
  category: r.category_name ?? '', supplier: r.supplier_name ?? '',
  costPrice: r.cost_price, sellingPrice: r.selling_price,
  wholesaleCostPrice: r.wholesale_cost_price ?? r.cost_price,
  singleCostPrice: r.single_cost_price ?? r.cost_price,
  wholesaleSellingPrice: r.wholesale_selling_price ?? r.selling_price,
  halfSellingPrice: r.half_selling_price ?? 0,
  quarterSellingPrice: r.quarter_selling_price ?? 0,
  singleSellingPrice: r.single_selling_price ?? r.selling_price,
  wholesaleQuantity: r.wholesale_quantity ?? 0,
  singleQuantity: r.single_quantity ?? r.current_stock,
  quantityPerBox: r.quantity_per_box ?? 0,
  stockLimit: r.stock_limit ?? r.reorder_level,
  description: r.description ?? '',
  priceLevels: r.price_levels ?? [],
  currentStock: r.current_stock, reorderLevel: r.reorder_level,
  expiryDate: r.expiry_date ?? '', image: r.image_url ?? '',
} as InventoryItem);

const cleanItem = (item: InventoryItem): InventoryItem => ({
  ...item,
  itemId: sanitizeText(item.itemId),
  productName: sanitizeText(item.productName),
  sku: sanitizeText(item.sku),
  category: sanitizeText(item.category),
  supplier: sanitizeText(item.supplier),
  description: sanitizeMultiline(item.description),
  expiryDate: sanitizeText(item.expiryDate),
  image: sanitizeUrl(item.image),
  priceLevels: item.priceLevels.map((level) => ({
    label: sanitizeText(level.label),
    price: Number(level.price) || 0,
  })),
});

const toRow = (item: InventoryItem): Omit<Row, 'id' | 'product_code' | 'sku'> => {
  const i = cleanItem(item);
  return ({
  product_name: i.productName,
  category_name: i.category, supplier_name: i.supplier,
  cost_price: i.costPrice, selling_price: i.sellingPrice,
  current_stock: i.currentStock, reorder_level: i.reorderLevel,
  expiry_date: i.expiryDate || null, image_url: i.image,
  wholesale_cost_price: i.wholesaleCostPrice,
  single_cost_price: i.singleCostPrice,
  wholesale_selling_price: i.wholesaleSellingPrice,
  half_selling_price: i.halfSellingPrice,
  quarter_selling_price: i.quarterSellingPrice,
  single_selling_price: i.singleSellingPrice,
  wholesale_quantity: i.wholesaleQuantity,
  single_quantity: i.singleQuantity,
  quantity_per_box: i.quantityPerBox,
  stock_limit: i.stockLimit,
  description: i.description,
  price_levels: i.priceLevels,
})};

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      const [cachedItems, cachedCategories] = await Promise.all([
        loadLocalCollection<InventoryItem>('inventory'),
        loadLocalCollection<string>('inventory_categories'),
      ]);
      if (cachedItems.length) setItems(cachedItems);
      if (cachedCategories.length) setCategories(cachedCategories);

      const [itemsRes, catsRes] = await Promise.all([
        supabase.from('inventory').select('*').order('product_name'),
        supabase.from('inventory_categories').select('name').order('name'),
      ]);
      if (itemsRes.error) console.error(itemsRes.error);
      if (catsRes.error) console.error(catsRes.error);
      if (!itemsRes.error && itemsRes.data) {
        const nextItems = itemsRes.data.map(toItem);
        setItems(nextItems);
        saveLocalCollection('inventory', nextItems);
      }
      if (!catsRes.error && catsRes.data) {
        const nextCategories = catsRes.data.map((r: { name: string }) => r.name);
        setCategories(nextCategories);
        saveLocalCollection('inventory_categories', nextCategories);
      }
      setLoading(false);
    };

    fetchInventory();

    const channel = supabase
      .channel('inventory-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, fetchInventory)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_categories' }, fetchInventory)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const saveItem = async (item: InventoryItem) => {
    const enriched = enrichInventoryItem(cleanItem(item));
    const existing = items.find((i) => i.itemId === enriched.itemId);
    const optimisticItems = existing
      ? items.map((i) => i.itemId === enriched.itemId ? enriched : i)
      : [...items, enriched];
    setItems(optimisticItems);
    saveLocalCollection('inventory', optimisticItems);
    const request = existing
      ? supabase.from('inventory').update(toRow(enriched)).eq('product_code', enriched.itemId).select('*').single()
      : supabase.from('inventory').insert(toRow(enriched)).select('*').single();

    const { data, error } = await request;
    if (error) {
      console.error(error);
      queueLocalMutation('inventory', enriched.itemId, existing ? 'update' : 'create', enriched);
    }
    if (data) {
      const saved = toItem(data);
      const syncedItems = optimisticItems.map((i) => i.itemId === enriched.itemId ? saved : i);
      setItems(syncedItems);
      saveLocalCollection('inventory', syncedItems);
    }
  };

  const deleteItem = async (itemId: string) => {
    const nextItems = items.filter((i) => i.itemId !== itemId);
    setItems(nextItems);
    saveLocalCollection('inventory', nextItems);
    const { error } = await supabase.from('inventory').delete().eq('product_code', itemId);
    if (error) {
      console.error(error);
      queueLocalMutation('inventory', itemId, 'delete', { itemId });
    }
  };

  const addCategory = async (name: string) => {
    const cleanName = sanitizeText(name);
    if (!cleanName || categories.includes(cleanName)) return;
    const nextCategories = [...categories, cleanName];
    setCategories(nextCategories);
    saveLocalCollection('inventory_categories', nextCategories);
    const { error } = await supabase.from('inventory_categories').insert({ name: cleanName });
    if (error) {
      console.error(error);
      queueLocalMutation('inventory_categories', cleanName, 'create', { name: cleanName });
    }
  };

  const renameCategory = async (original: string, newName: string) => {
    const cleanOriginal = sanitizeText(original);
    const cleanNewName = sanitizeText(newName);
    if (!cleanNewName) return;
    const nextCategories = categories.map((c) => c === cleanOriginal ? cleanNewName : c);
    const nextItems = items.map((i) =>
      i.category === cleanOriginal ? { ...i, category: cleanNewName } : i
    );
    setCategories(nextCategories);
    setItems(nextItems);
    saveLocalCollection('inventory_categories', nextCategories);
    saveLocalCollection('inventory', nextItems);
    await supabase.from('inventory_categories')
      .update({ name: cleanNewName }).eq('name', cleanOriginal);
    const { error } = await supabase.from('inventory')
      .update({ category_name: cleanNewName }).eq('category_name', cleanOriginal);
    if (error) queueLocalMutation('inventory_categories', cleanOriginal, 'update', { original: cleanOriginal, name: cleanNewName });
  };

  const deleteCategory = async (name: string) => {
    const cleanName = sanitizeText(name);
    const nextCategories = categories.filter((c) => c !== cleanName);
    setCategories(nextCategories);
    saveLocalCollection('inventory_categories', nextCategories);
    const { error } = await supabase.from('inventory_categories').delete().eq('name', cleanName);
    if (error) {
      console.error(error);
      queueLocalMutation('inventory_categories', cleanName, 'delete', { name: cleanName });
    }
  };

  return { items, categories, loading, saveItem, deleteItem, addCategory, renameCategory, deleteCategory };
}
