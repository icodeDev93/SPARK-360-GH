export interface ExpenseRecord {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  paidBy: string;
  notes: string;
}

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Utilities',
  'Payroll',
  'Supplies',
  'Marketing',
  'Maintenance',
  'Transport',
  'Insurance',
  'Other',
];

export const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Card', 'Mobile Money'];

export const seedExpenses: ExpenseRecord[] = [
  { id: 'e001', description: 'Store Rent - April', category: 'Rent', amount: 1200.00, date: '2026-04-01', paidBy: 'Bank Transfer', notes: 'Monthly rent for main store location' },
  { id: 'e002', description: 'Electricity Bill', category: 'Utilities', amount: 320.00, date: '2026-04-05', paidBy: 'Cash', notes: '' },
  { id: 'e003', description: 'Staff Salaries', category: 'Payroll', amount: 2400.00, date: '2026-04-10', paidBy: 'Bank Transfer', notes: '3 staff members' },
  { id: 'e004', description: 'Internet & Phone', category: 'Utilities', amount: 85.00, date: '2026-04-12', paidBy: 'Mobile Money', notes: 'Fibre + mobile data bundle' },
  { id: 'e005', description: 'Packaging Materials', category: 'Supplies', amount: 215.00, date: '2026-04-15', paidBy: 'Cash', notes: 'Bags, boxes, tape' },
  { id: 'e006', description: 'Marketing / Ads', category: 'Marketing', amount: 500.00, date: '2026-04-18', paidBy: 'Card', notes: 'Social media ads for April campaign' },
  { id: 'e007', description: 'Cleaning Services', category: 'Maintenance', amount: 150.00, date: '2026-04-22', paidBy: 'Cash', notes: 'Weekly cleaning contract' },
  { id: 'e008', description: 'Printer Ink & Paper', category: 'Supplies', amount: 75.00, date: '2026-04-24', paidBy: 'Cash', notes: '' },
  { id: 'e009', description: 'Delivery Van Fuel', category: 'Transport', amount: 180.00, date: '2026-04-25', paidBy: 'Cash', notes: 'April fuel expenses' },
  { id: 'e010', description: 'Business Insurance', category: 'Insurance', amount: 420.00, date: '2026-04-26', paidBy: 'Bank Transfer', notes: 'Quarterly premium' },
];
