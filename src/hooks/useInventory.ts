import { useState, useEffect } from 'react';
import type { InventoryItem } from '@/types/erp';
import { inventoryItems as seedItems, inventoryCategories as seedCats } from '@/mocks/inventory';
import { enrichInventoryItem } from '@/services/inventoryService';
import { supabase } from '@/lib/supabase';

type Row = {
  id?: string; product_code: string; product_name: string; sku: string;
  category_name: string | null; supplier_name: string | null;
  cost_price: number; selling_price: number; current_stock: number;
  reorder_level: number; image_url: string | null;
};

const toItem = (r: Row): InventoryItem => enrichInventoryItem({
  itemId: r.product_code, productName: r.product_name, sku: r.sku,
  category: r.category_name ?? '', supplier: r.supplier_name ?? '',
  costPrice: r.cost_price, sellingPrice: r.selling_price,
  currentStock: r.current_stock, reorderLevel: r.reorder_level, image: r.image_url ?? '',
} as InventoryItem);

const toRow = (i: InventoryItem): Omit<Row, 'id' | 'product_code' | 'sku'> => ({
  product_name: i.productName,
  category_name: i.category, supplier_name: i.supplier,
  cost_price: i.costPrice, selling_price: i.sellingPrice,
  current_stock: i.currentStock, reorder_level: i.reorderLevel, image_url: i.image,
});

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [itemsRes, catsRes] = await Promise.all([
        supabase.from('inventory').select('*').order('product_name'),
        supabase.from('inventory_categories').select('name').order('name'),
      ]);
      if (itemsRes.error) console.error(itemsRes.error);
      if (catsRes.error) console.error(catsRes.error);

      const dbItems: InventoryItem[] = itemsRes.data && itemsRes.data.length > 0
        ? itemsRes.data.map(toItem) : [];
      const dbCats: string[] = catsRes.data && catsRes.data.length > 0
        ? catsRes.data.map((r: { name: string }) => r.name) : [];

      if (dbItems.length === 0) {
        const rows = seedItems.map(toRow);
        await supabase.from('inventory').insert(rows);
        setItems(seedItems.map(enrichInventoryItem));
      } else {
        setItems(dbItems);
      }

      if (dbCats.length === 0) {
        const cats = seedCats.filter((c) => c !== 'All');
        await supabase.from('inventory_categories').insert(cats.map((name) => ({ name })));
        setCategories(cats);
      } else {
        setCategories(dbCats);
      }

      setLoading(false);
    })();
  }, []);

  const saveItem = async (item: InventoryItem) => {
    const enriched = enrichInventoryItem(item);
    const existing = items.find((i) => i.itemId === enriched.itemId);
    setItems((prev) => {
      return existing
        ? prev.map((i) => i.itemId === enriched.itemId ? enriched : i)
        : [...prev, enriched];
    });
    const request = existing
      ? supabase.from('inventory').update(toRow(enriched)).eq('product_code', enriched.itemId).select('*').single()
      : supabase.from('inventory').insert(toRow(enriched)).select('*').single();

    const { data, error } = await request;
    if (error) console.error(error);
    if (data) {
      const saved = toItem(data);
      setItems((prev) => prev.map((i) => i.itemId === enriched.itemId ? saved : i));
    }
  };

  const deleteItem = async (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.itemId !== itemId));
    const { error } = await supabase.from('inventory').delete().eq('product_code', itemId);
    if (error) console.error(error);
  };

  const addCategory = async (name: string) => {
    if (categories.includes(name)) return;
    setCategories((prev) => [...prev, name]);
    const { error } = await supabase.from('inventory_categories').insert({ name });
    if (error) console.error(error);
  };

  const renameCategory = async (original: string, newName: string) => {
    setCategories((prev) => prev.map((c) => c === original ? newName : c));
    setItems((prev) => prev.map((i) =>
      i.category === original ? { ...i, category: newName } : i
    ));
    await supabase.from('inventory_categories')
      .update({ name: newName }).eq('name', original);
    await supabase.from('inventory')
      .update({ category_name: newName }).eq('category_name', original);
  };

  const deleteCategory = async (name: string) => {
    setCategories((prev) => prev.filter((c) => c !== name));
    const { error } = await supabase.from('inventory_categories').delete().eq('name', name);
    if (error) console.error(error);
  };

  return { items, categories, loading, saveItem, deleteItem, addCategory, renameCategory, deleteCategory };
}
