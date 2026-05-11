import type {
  InventoryItem,
  InvoiceRecord,
  ExpenseRecord,
  Customer,
  KpiSummary,
  MonthlyPerformance,
  TopCustomer,
} from '@/types/erp';
import { calcTotalStockValue } from './inventoryService';
import { grandTotalGHS } from './expenseService';

export function calcKpiSummary(
  inventory: InventoryItem[],
  invoices: InvoiceRecord[],
  expenses: ExpenseRecord[]
): KpiSummary {
  const completedInvoices = invoices.filter((inv) => inv.status === 'completed');
  const totalRevenue = completedInvoices.reduce((sum, inv) => sum + inv.netSales, 0);
  const totalCost = completedInvoices.reduce((sum, inv) => sum + inv.totalCost, 0);
  const grossMargin = totalRevenue - totalCost;
  const totalExpenses = grandTotalGHS(expenses);
  const netProfit = grossMargin - totalExpenses;

  return {
    totalStockValue: calcTotalStockValue(inventory),
    totalRevenue,
    totalExpenses,
    netProfit,
    grossMargin,
  };
}

export function calcMonthlyPerformance(
  invoices: InvoiceRecord[],
  expenses: ExpenseRecord[],
  year: number
): MonthlyPerformance[] {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const income = Array(12).fill(0) as number[];
  const expenseArr = Array(12).fill(0) as number[];

  invoices.forEach((inv) => {
    const d = new Date(inv.date);
    if (d.getFullYear() === year && inv.status === 'completed') {
      income[d.getMonth()] += inv.netSales;
    }
  });

  expenses.forEach((e) => {
    const d = new Date(e.date);
    if (d.getFullYear() === year) {
      expenseArr[d.getMonth()] += e.amountGHS;
    }
  });

  return months.map((month, i) => ({
    month,
    income: income[i],
    expenses: expenseArr[i],
    profit: income[i] - expenseArr[i],
  }));
}

export function getTop5CustomersByPurchase(customers: Customer[]): TopCustomer[] {
  return [...customers]
    .sort((a, b) => b.totalPurchases - a.totalPurchases)
    .slice(0, 5)
    .map(({ customerId, fullName, customerType, totalPurchases, avatar }) => ({
      customerId,
      fullName,
      customerType,
      totalPurchases,
      avatar,
    }));
}

export function calcNetProfit(invoices: InvoiceRecord[], expenses: ExpenseRecord[]): number {
  const grossMargin = invoices
    .filter((inv) => inv.status === 'completed')
    .reduce((sum, inv) => sum + inv.grossMargin, 0);
  return grossMargin - grandTotalGHS(expenses);
}
