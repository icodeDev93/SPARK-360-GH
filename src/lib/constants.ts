export const INVOICE_PREFIX = 'INV';
export const TAX_RATE = 0.10;
export const CURRENCY_SYMBOL = '₵';

export const EXPENSE_CATEGORIES = [
  'Transport',
  'Salaries',
  'Rent',
  'Utilities',
  'Supplies',
  'Marketing',
  'Maintenance',
  'Insurance',
  'Other',
] as const;

export const PAYMENT_METHODS = [
  'Cash',
  'MoMo',
  'Cheque',
  'Bank Transfer',
] as const;

export const CUSTOMER_TYPES = ['Wholesale', 'Retail'] as const;

export const STOCK_THRESHOLDS = {
  // currentStock / reorderLevel ratio thresholds
  CRITICAL: 0.3,   // ≤ 30%  → OUT OF STOCK treated as critical alert
  LOW: 0.6,        // ≤ 60%  → LOW
} as const;
