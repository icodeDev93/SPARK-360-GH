import { useState, useEffect } from 'react';
import type { ExpenseRecord, ExpenseCategory, ExpensePaymentMethod } from '@/types/erp';
import { totalByCategory, grandTotalGHS } from '@/services/expenseService';
import { supabase } from '@/lib/supabase';
import { sanitizeMultiline, sanitizeText, sanitizeUrl } from '@/lib/sanitize';
import { createLocalId, loadLocalCollection, queueLocalMutation, saveLocalCollection } from '@/lib/localCache';
import { useBusiness } from '@/contexts/BusinessContext';

export type { ExpenseRecord };

type Row = {
  id: string; created_by: string; expense_date: string; category: string;
  description: string; amount: number; paid_by: string; notes: string | null;
  proof_url: string | null;
};

type CategoryRow = { id?: string; name: string };

const toRecord = (r: Row): ExpenseRecord => ({
  expenseId: r.id, date: r.expense_date,
  category: r.category as ExpenseCategory,
  description: r.description, amountGHS: r.amount,
  paidBy: r.paid_by as ExpensePaymentMethod, notes: r.notes ?? '',
  proofUrl: r.proof_url ?? null,
});

const cleanExpense = (expense: ExpenseRecord): ExpenseRecord => ({
  ...expense,
  date: sanitizeText(expense.date),
  category: sanitizeText(expense.category) as ExpenseCategory,
  description: sanitizeText(expense.description),
  paidBy: sanitizeText(expense.paidBy) as ExpensePaymentMethod,
  notes: sanitizeMultiline(expense.notes),
  proofUrl: expense.proofUrl ? sanitizeUrl(expense.proofUrl) : null,
});

const toRow = (expense: ExpenseRecord): Omit<Row, 'id' | 'created_by'> => {
  const e = cleanExpense(expense);
  return ({
  expense_date: e.date, category: e.category,
  description: e.description, amount: e.amountGHS,
  paid_by: e.paidBy, notes: e.notes,
  proof_url: e.proofUrl ?? null,
})};

export function useExpenses() {
  const { activeBusinessId } = useBusiness();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpenses = async () => {
      if (!activeBusinessId) {
        setExpenses([]);
        setCategories([]);
        setLoading(false);
        return;
      }
      const [cached, cachedCategories] = await Promise.all([
        loadLocalCollection<ExpenseRecord>('expenses'),
        loadLocalCollection<string>('expense_categories'),
      ]);
      if (cached.length) setExpenses(cached);
      if (cachedCategories.length) setCategories(cachedCategories);
      const [expensesRes, categoriesRes] = await Promise.all([
        supabase
          .from('expenses').select('*').eq('business_id', activeBusinessId).order('expense_date', { ascending: false }),
        supabase
          .from('expense_categories').select('name').eq('business_id', activeBusinessId).order('name'),
      ]);
      if (expensesRes.error) { console.error(expensesRes.error); setLoading(false); return; }
      if (categoriesRes.error) console.error(categoriesRes.error);
      const nextExpenses = expensesRes.data ? expensesRes.data.map(toRecord) : [];
      const savedCategories = categoriesRes.data ? (categoriesRes.data as CategoryRow[]).map((row) => row.name) : [];
      const usedCategories = nextExpenses.map((expense) => expense.category).filter(Boolean);
      const nextCategories = Array.from(new Set([...savedCategories, ...usedCategories])).sort((a, b) => a.localeCompare(b));
      setExpenses(nextExpenses);
      setCategories(nextCategories);
      saveLocalCollection('expenses', nextExpenses);
      saveLocalCollection('expense_categories', nextCategories);
      setLoading(false);
    };

    fetchExpenses();

    const channel = supabase
      .channel('expenses-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchExpenses)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_categories' }, fetchExpenses)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeBusinessId]);

  const addCategory = async (name: string) => {
    if (!activeBusinessId) return { success: false, error: 'Select a business before adding a category.' };
    const cleanName = sanitizeText(name);
    if (!cleanName) return { success: false, error: 'Category name is required.' };
    if (categories.some((category) => category.toLowerCase() === cleanName.toLowerCase())) {
      return { success: false, error: 'This category already exists.' };
    }

    const nextCategories = [...categories, cleanName].sort((a, b) => a.localeCompare(b));
    setCategories(nextCategories);
    saveLocalCollection('expense_categories', nextCategories);

    const { error } = await supabase
      .from('expense_categories')
      .insert({ business_id: activeBusinessId, name: cleanName });
    if (error) {
      console.error(error);
      queueLocalMutation('expense_categories', cleanName, 'create', { name: cleanName });
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  const renameCategory = async (originalName: string, nextName: string) => {
    if (!activeBusinessId) return { success: false, error: 'Select a business before editing a category.' };
    const cleanOriginal = sanitizeText(originalName);
    const cleanNext = sanitizeText(nextName);
    if (!cleanOriginal || !cleanNext) return { success: false, error: 'Category name is required.' };
    if (cleanOriginal.toLowerCase() === cleanNext.toLowerCase()) return { success: true };
    if (categories.some((category) => category.toLowerCase() === cleanNext.toLowerCase())) {
      return { success: false, error: 'This category already exists.' };
    }

    const nextCategories = categories
      .map((category) => category === cleanOriginal ? cleanNext : category)
      .sort((a, b) => a.localeCompare(b));
    const nextExpenses = expenses.map((expense) =>
      expense.category === cleanOriginal ? { ...expense, category: cleanNext } : expense
    );
    setCategories(nextCategories);
    setExpenses(nextExpenses);
    saveLocalCollection('expense_categories', nextCategories);
    saveLocalCollection('expenses', nextExpenses);

    const categoryUpdate = await supabase
      .from('expense_categories')
      .update({ name: cleanNext })
      .eq('business_id', activeBusinessId)
      .eq('name', cleanOriginal)
      .select('id')
      .maybeSingle();

    if (categoryUpdate.error && categoryUpdate.error.code !== 'PGRST116') {
      console.error(categoryUpdate.error);
      queueLocalMutation('expense_categories', cleanOriginal, 'update', { original: cleanOriginal, name: cleanNext });
      return { success: false, error: categoryUpdate.error.message };
    }

    if (!categoryUpdate.data) {
      const { error: insertError } = await supabase
        .from('expense_categories')
        .insert({ business_id: activeBusinessId, name: cleanNext });
      if (insertError) {
        console.error(insertError);
        queueLocalMutation('expense_categories', cleanNext, 'create', { name: cleanNext });
        return { success: false, error: insertError.message };
      }
    }

    const { error: expenseError } = await supabase
      .from('expenses')
      .update({ category: cleanNext })
      .eq('business_id', activeBusinessId)
      .eq('category', cleanOriginal);
    if (expenseError) {
      console.error(expenseError);
      queueLocalMutation('expenses', `category-${cleanOriginal}`, 'update', { original: cleanOriginal, name: cleanNext });
      return { success: false, error: expenseError.message };
    }

    return { success: true };
  };

  const deleteCategory = async (name: string) => {
    if (!activeBusinessId) return { success: false, error: 'Select a business before deleting a category.' };
    const cleanName = sanitizeText(name);
    if (!cleanName) return { success: false, error: 'Category name is required.' };
    const usedCount = expenses.filter((expense) => expense.category === cleanName).length;
    if (usedCount > 0) {
      return {
        success: false,
        error: `${cleanName} is used by ${usedCount} expense${usedCount !== 1 ? 's' : ''}. Rename it or edit those expenses before deleting.`,
      };
    }

    const nextCategories = categories.filter((category) => category !== cleanName);
    setCategories(nextCategories);
    saveLocalCollection('expense_categories', nextCategories);
    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('business_id', activeBusinessId)
      .eq('name', cleanName);
    if (error) {
      console.error(error);
      queueLocalMutation('expense_categories', cleanName, 'delete', { name: cleanName });
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  const addExpense = async (data: Omit<ExpenseRecord, 'expenseId'>) => {
    if (!activeBusinessId) return;
    const rec: ExpenseRecord = cleanExpense({ ...data, expenseId: createLocalId() });
    const nextExpenses = [rec, ...expenses];
    setExpenses(nextExpenses);
    saveLocalCollection('expenses', nextExpenses);
    const { data: inserted, error } = await supabase
      .from('expenses')
      .insert({ id: rec.expenseId, business_id: activeBusinessId, ...toRow(rec) })
      .select('*')
      .single();
    if (error) {
      console.error(error);
      queueLocalMutation('expenses', rec.expenseId, 'create', rec);
    }
    if (inserted) {
      const saved = toRecord(inserted);
      const syncedExpenses = nextExpenses.map((e) => e.expenseId === rec.expenseId ? saved : e);
      setExpenses(syncedExpenses);
      saveLocalCollection('expenses', syncedExpenses);
    }
  };

  const updateExpense = async (expenseId: string, data: Partial<Omit<ExpenseRecord, 'expenseId'>>) => {
    const cleanData = {
      ...data,
      ...(data.date !== undefined ? { date: sanitizeText(data.date) } : {}),
      ...(data.category !== undefined ? { category: sanitizeText(data.category) as ExpenseCategory } : {}),
      ...(data.description !== undefined ? { description: sanitizeText(data.description) } : {}),
      ...(data.paidBy !== undefined ? { paidBy: sanitizeText(data.paidBy) as ExpensePaymentMethod } : {}),
      ...(data.notes !== undefined ? { notes: sanitizeMultiline(data.notes) } : {}),
      ...(data.proofUrl !== undefined ? { proofUrl: data.proofUrl ? sanitizeUrl(data.proofUrl) : null } : {}),
    };
    const nextExpenses = expenses.map((e) => e.expenseId === expenseId ? { ...e, ...cleanData } : e);
    setExpenses(nextExpenses);
    saveLocalCollection('expenses', nextExpenses);
    const { error } = await supabase.from('expenses').update({
      expense_date: cleanData.date, category: cleanData.category, description: cleanData.description,
      amount: cleanData.amountGHS, paid_by: cleanData.paidBy, notes: cleanData.notes,
      proof_url: cleanData.proofUrl ?? null,
    }).eq('business_id', activeBusinessId).eq('id', expenseId);
    if (error) {
      console.error(error);
      queueLocalMutation('expenses', expenseId, 'update', nextExpenses.find((e) => e.expenseId === expenseId));
    }
  };

  const deleteExpense = async (expenseId: string) => {
    const nextExpenses = expenses.filter((e) => e.expenseId !== expenseId);
    setExpenses(nextExpenses);
    saveLocalCollection('expenses', nextExpenses);
    const { error } = await supabase.from('expenses').delete().eq('business_id', activeBusinessId).eq('id', expenseId);
    if (error) {
      console.error(error);
      queueLocalMutation('expenses', expenseId, 'delete', { expenseId });
    }
  };

  return {
    expenses, categories, loading, addExpense, updateExpense, deleteExpense, addCategory, renameCategory, deleteCategory,
    totalByCategory: totalByCategory(expenses),
    grandTotalGHS: grandTotalGHS(expenses),
    byCategory: (cat: ExpenseCategory) => expenses.filter((e) => e.category === cat),
  };
}
