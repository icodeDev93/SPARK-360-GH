import { useState, useEffect } from 'react';
import type { InventoryItem } from '@/types/erp';
import { inventoryItems as seedItems, inventoryCategories as seedCats } from '@/mocks/inventory';
import { enrichInventoryItem } from '@/services/inventoryService';
import { supabase } from '@/lib/supabase';

type Row = {
  item_id: string; product_name: string; sku: string; category: string;
  supplier: string; cost_price: number; selling_price: number;
  current_stock: number; reorder_level: number; image: string;
};

const toItem = (r: Row): InventoryItem => enrichInventoryItem({
  itemId: r.item_id, productName: r.product_name, sku: r.sku, category: r.category,
  supplier: r.supplier, costPrice: r.cost_price, sellingPrice: r.selling_price,
  currentStock: r.current_stock, reorderLevel: r.reorder_level, image: r.image,
} as InventoryItem);

const toRow = (i: InventoryItem): Row => ({
  item_id: i.itemId, product_name: i.productName, sku: i.sku, category: i.category,
  supplier: i.supplier, cost_price: i.costPrice, selling_price: i.sellingPrice,
  current_stock: i.currentStock, reorder_level: i.reorderLevel, image: i.image,
});

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [itemsRes, catsRes] = await Promise.all([
        supabase.from('inventory_items').select('*').order('product_name'),
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
        await supabase.from('inventory_items').insert(rows);
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
    setItems((prev) => {
      const exists = prev.find((i) => i.itemId === enriched.itemId);
      return exists
        ? prev.map((i) => i.itemId === enriched.itemId ? enriched : i)
        : [...prev, enriched];
    });
    const { error } = await supabase
      .from('inventory_items').upsert(toRow(enriched));
    if (error) console.error(error);
  };

  const deleteItem = async (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.itemId !== itemId));
    const { error } = await supabase.from('inventory_items').delete().eq('item_id', itemId);
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
    await supabase.from('inventory_items')
      .update({ category: newName }).eq('category', original);
  };

  const deleteCategory = async (name: string) => {
    setCategories((prev) => prev.filter((c) => c !== name));
    const { error } = await supabase.from('inventory_categories').delete().eq('name', name);
    if (error) console.error(error);
  };

  return { items, categories, loading, saveItem, deleteItem, addCategory, renameCategory, deleteCategory };
}
