import type { ExpenseRecord, ExpenseCategory } from '@/types/erp';

export function buildExpense(
  data: Omit<ExpenseRecord, 'expenseId'>
): Omit<ExpenseRecord, 'expenseId'> {
  return { ...data };
}

export function totalByCategory(expenses: ExpenseRecord[]): Record<ExpenseCategory, number> {
  return expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amountGHS;
    return acc;
  }, {}) as Record<ExpenseCategory, number>;
}

export function grandTotalGHS(expenses: ExpenseRecord[]): number {
  return expenses.reduce((sum, e) => sum + e.amountGHS, 0);
}

export function monthlyTotals(
  expenses: ExpenseRecord[],
  year: number
): Array<{ month: string; total: number }> {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const totals = Array(12).fill(0) as number[];
  expenses.forEach((e) => {
    const d = new Date(e.date);
    if (d.getFullYear() === year) {
      totals[d.getMonth()] += e.amountGHS;
    }
  });
  return months.map((month, i) => ({ month, total: totals[i] }));
}

export function filterByCategory(
  expenses: ExpenseRecord[],
  category: ExpenseCategory
): ExpenseRecord[] {
  return expenses.filter((e) => e.category === category);
}
