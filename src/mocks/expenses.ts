import type { ExpenseRecord, ExpenseCategory, PaymentMethod } from '@/types/erp';

export { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/lib/constants';

function makeExpense(
  expenseId: string,
  date: string,
  category: ExpenseCategory,
  description: string,
  amountGHS: number,
  paidBy: PaymentMethod,
  notes: string = ''
): ExpenseRecord {
  return { expenseId, date, category, description, amountGHS, paidBy, notes };
}

export const seedExpenses: ExpenseRecord[] = [
  makeExpense('EXP001', '2026-04-01', 'Rent',        'Warehouse Rent — April 2026',             2800.00, 'Bank Transfer', 'Monthly warehouse lease payment'),
  makeExpense('EXP002', '2026-04-03', 'Utilities',   'Electricity Bill — March Invoice',          420.00, 'Cheque',        'ECG bill for March'),
  makeExpense('EXP003', '2026-04-05', 'Transport',   'Delivery Van Fuel — Week 1',                380.00, 'Cash',          'Fuel for delivery van'),
  makeExpense('EXP004', '2026-04-10', 'Payroll',     'Staff Salaries — April (5 staff)',         6500.00, 'Bank Transfer', 'April payroll for 5 staff members'),
  makeExpense('EXP005', '2026-04-12', 'Utilities',   'Internet & Mobile Data Bundle',              110.00, 'MoMo',          'Vodafone data bundle'),
  makeExpense('EXP006', '2026-04-14', 'Transport',   'Delivery Van Fuel — Week 2',                350.00, 'Cash',          ''),
  makeExpense('EXP007', '2026-04-15', 'Supplies',    'Packaging: Cartons, Tape & Labels',         480.00, 'Cheque',        'Bulk packaging materials order'),
  makeExpense('EXP008', '2026-04-18', 'Marketing',   'Social Media & Radio Ads — April',          750.00, 'Bank Transfer', 'Digital and radio advertising spend'),
  makeExpense('EXP009', '2026-04-20', 'Maintenance', 'Forklift Servicing & Repairs',              620.00, 'Cheque',        'Scheduled forklift maintenance'),
  makeExpense('EXP010', '2026-04-21', 'Transport',   'Delivery Van Fuel — Week 3',                370.00, 'Cash',          ''),
  makeExpense('EXP011', '2026-04-22', 'Supplies',    'Printer Ink, Paper & Office Stationery',    145.00, 'Cash',          ''),
  makeExpense('EXP012', '2026-04-25', 'Insurance',   'Business & Stock Insurance — Q2 Premium',  1800.00, 'Bank Transfer', 'Q2 insurance premium payment'),
  makeExpense('EXP013', '2026-04-26', 'Transport',   'Delivery Van Fuel — Week 4',                360.00, 'Cash',          ''),
  makeExpense('EXP014', '2026-04-28', 'Maintenance', 'Warehouse Cleaning & Pest Control',         280.00, 'MoMo',          'Monthly cleaning contract'),
];
