import { useState, useEffect } from 'react';
import type { ExpenseRecord, ExpenseCategory, PaymentMethod } from '@/types/erp';
import { totalByCategory, grandTotalGHS } from '@/services/expenseService';
import { supabase } from '@/lib/supabase';

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
  paidBy: r.paid_by as PaymentMethod, notes: r.notes ?? '',
  proofUrl: r.proof_url ?? null,
});

const toRow = (e: ExpenseRecord): Omit<Row, 'id' | 'created_by'> => ({
  expense_date: e.date, category: e.category,
  description: e.description, amount: e.amountGHS,
  paid_by: e.paidBy, notes: e.notes,
  proof_url: e.proofUrl ?? null,
});

export function useExpenses() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpenses = async () => {
      const { data, error } = await supabase
        .from('expenses').select('*').order('expense_date', { ascending: false });
      if (error) { console.error(error); setLoading(false); return; }
      setExpenses(data ? data.map(toRecord) : []);
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
    const rec: ExpenseRecord = { ...data, expenseId: `EXP${Date.now()}` };
    setExpenses((prev) => [rec, ...prev]);
    const { data: inserted, error } = await supabase
      .from('expenses')
      .insert(toRow(rec))
      .select('*')
      .single();
    if (error) console.error(error);
    if (inserted) {
      const saved = toRecord(inserted);
      setExpenses((prev) => prev.map((e) => e.expenseId === rec.expenseId ? saved : e));
    }
  };

  const updateExpense = async (expenseId: string, data: Partial<Omit<ExpenseRecord, 'expenseId'>>) => {
    setExpenses((prev) => prev.map((e) => e.expenseId === expenseId ? { ...e, ...data } : e));
    const { error } = await supabase.from('expenses').update({
      expense_date: data.date, category: data.category, description: data.description,
      amount: data.amountGHS, paid_by: data.paidBy, notes: data.notes,
      proof_url: data.proofUrl ?? null,
    }).eq('id', expenseId);
    if (error) console.error(error);
  };

  const deleteExpense = async (expenseId: string) => {
    setExpenses((prev) => prev.filter((e) => e.expenseId !== expenseId));
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
    if (error) console.error(error);
  };

  return {
    expenses, loading, addExpense, updateExpense, deleteExpense,
    totalByCategory: totalByCategory(expenses),
    grandTotalGHS: grandTotalGHS(expenses),
    byCategory: (cat: ExpenseCategory) => expenses.filter((e) => e.category === cat),
  };
}
