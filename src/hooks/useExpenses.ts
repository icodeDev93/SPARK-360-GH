import { useState, useEffect } from 'react';
import type { ExpenseRecord, ExpenseCategory, ExpensePaymentMethod } from '@/types/erp';
import { totalByCategory, grandTotalGHS } from '@/services/expenseService';
import { supabase } from '@/lib/supabase';
import { sanitizeMultiline, sanitizeText, sanitizeUrl } from '@/lib/sanitize';
import { createLocalId, loadLocalCollection, queueLocalMutation, saveLocalCollection } from '@/lib/localCache';

export type { ExpenseRecord };

type Row = {
  id: string; created_by: string; expense_date: string; category: string;
  description: string; amount: number; paid_by: string; notes: string | null;
  proof_url: string | null;
};

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
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpenses = async () => {
      const cached = await loadLocalCollection<ExpenseRecord>('expenses');
      if (cached.length) setExpenses(cached);
      const { data, error } = await supabase
        .from('expenses').select('*').order('expense_date', { ascending: false });
      if (error) { console.error(error); setLoading(false); return; }
      const nextExpenses = data ? data.map(toRecord) : [];
      setExpenses(nextExpenses);
      saveLocalCollection('expenses', nextExpenses);
      setLoading(false);
    };

    fetchExpenses();

    const channel = supabase
      .channel('expenses-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchExpenses)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const addExpense = async (data: Omit<ExpenseRecord, 'expenseId'>) => {
    const rec: ExpenseRecord = cleanExpense({ ...data, expenseId: createLocalId() });
    const nextExpenses = [rec, ...expenses];
    setExpenses(nextExpenses);
    saveLocalCollection('expenses', nextExpenses);
    const { data: inserted, error } = await supabase
      .from('expenses')
      .insert({ id: rec.expenseId, ...toRow(rec) })
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
    }).eq('id', expenseId);
    if (error) {
      console.error(error);
      queueLocalMutation('expenses', expenseId, 'update', nextExpenses.find((e) => e.expenseId === expenseId));
    }
  };

  const deleteExpense = async (expenseId: string) => {
    const nextExpenses = expenses.filter((e) => e.expenseId !== expenseId);
    setExpenses(nextExpenses);
    saveLocalCollection('expenses', nextExpenses);
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
    if (error) {
      console.error(error);
      queueLocalMutation('expenses', expenseId, 'delete', { expenseId });
    }
  };

  return {
    expenses, loading, addExpense, updateExpense, deleteExpense,
    totalByCategory: totalByCategory(expenses),
    grandTotalGHS: grandTotalGHS(expenses),
    byCategory: (cat: ExpenseCategory) => expenses.filter((e) => e.category === cat),
  };
}
