import { useState } from 'react';
import { ExpenseRecord, seedExpenses } from '@/mocks/expenses';

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

  const addExpense = (data: Omit<ExpenseRecord, 'id'>) => {
    const newExp: ExpenseRecord = { ...data, id: `e${Date.now()}` };
    setExpenses((prev) => {
      const next = [newExp, ...prev];
      localStorage.setItem(EXPENSES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const updateExpense = (id: string, data: Partial<Omit<ExpenseRecord, 'id'>>) => {
    setExpenses((prev) => {
      const next = prev.map((e) => e.id === id ? { ...e, ...data } : e);
      localStorage.setItem(EXPENSES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => {
      const next = prev.filter((e) => e.id !== id);
      localStorage.setItem(EXPENSES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const totalByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  return { expenses, addExpense, updateExpense, deleteExpense, totalByCategory, grandTotal };
}
