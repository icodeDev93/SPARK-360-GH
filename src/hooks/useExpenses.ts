import { useState } from 'react';
import type { ExpenseRecord, ExpenseCategory } from '@/types/erp';
import { seedExpenses } from '@/mocks/expenses';
import { buildExpense, totalByCategory, grandTotalGHS } from '@/services/expenseService';

export type { ExpenseRecord };

const EXPENSES_KEY = 'spark360_expenses';

function loadExpenses(): ExpenseRecord[] {
  try {
    const stored = localStorage.getItem(EXPENSES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ExpenseRecord[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(seedExpenses));
  return seedExpenses;
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(loadExpenses);

  const addExpense = (data: Omit<ExpenseRecord, 'expenseId'>) => {
    const built = buildExpense(data);
    const newExp: ExpenseRecord = { ...built, expenseId: `EXP${Date.now()}` };
    setExpenses((prev) => {
      const next = [newExp, ...prev];
      localStorage.setItem(EXPENSES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const updateExpense = (
    expenseId: string,
    data: Partial<Omit<ExpenseRecord, 'expenseId'>>
  ) => {
    setExpenses((prev) => {
      const next = prev.map((e) => {
        if (e.expenseId !== expenseId) return e;
        return { ...e, ...data };
      });
      localStorage.setItem(EXPENSES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const deleteExpense = (expenseId: string) => {
    setExpenses((prev) => {
      const next = prev.filter((e) => e.expenseId !== expenseId);
      localStorage.setItem(EXPENSES_KEY, JSON.stringify(next));
      return next;
    });
  };

  return {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    totalByCategory: totalByCategory(expenses),
    grandTotalGHS: grandTotalGHS(expenses),
    byCategory: (cat: ExpenseCategory) => expenses.filter((e) => e.category === cat),
  };
}
