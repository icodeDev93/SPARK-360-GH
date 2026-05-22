// ─── Inventory ────────────────────────────────────────────────────────────────

export type StockStatus = 'OK' | 'LOW' | 'OUT OF STOCK';

export interface InventoryItem {
  itemId: string;
  productName: string;
  category: string;
  supplier: string;
  costPrice: number;      // GHS
  sellingPrice: number;   // GHS
  wholesaleCostPrice: number;
  singleCostPrice: number;
  wholesaleSellingPrice: number;
  halfSellingPrice: number;
  quarterSellingPrice: number;
  singleSellingPrice: number;
  wholesaleQuantity: number;
  singleQuantity: number;
  quantityPerBox: number;
  stockLimit: number;
  description: string;
  priceLevels: { label: string; price: number }[];
  currentStock: number;
  reorderLevel: number;
  expiryDate: string;
  stockStatus: StockStatus;
  marginPerUnit: number;  // sellingPrice - costPrice
  image: string;
}

// ─── Sales ────────────────────────────────────────────────────────────────────

export type PaymentMethod = 'Cash' | 'MoMo' | 'Cheque' | 'Bank Transfer' | 'Credit';
export type ExpensePaymentMethod = Exclude<PaymentMethod, 'Credit'>;

export interface SaleLineItem {
  productId: string;
  productName: string;
  qty: number;
  returnsQty: number;
  netQty: number;        // qty - returnsQty
  unitPrice: number;     // GHS selling price
  costPrice: number;     // GHS cost price
  netSales: number;      // unitPrice * netQty
  totalCost: number;     // costPrice * netQty
  grossMargin: number;   // netSales - totalCost
}

export interface InvoiceRecord {
  invoiceNo: string;
  receiptNo: string | null;
  date: string;
  customerId: string;
  customerName: string;
  items: SaleLineItem[];
  netSales: number;          // sum of item netSales
  totalCost: number;         // sum of item totalCost
  grossMargin: number;       // netSales - totalCost
  amountPaid: number;
  balanceDue: number;
  paymentMethod: PaymentMethod;
  status: 'completed' | 'refunded' | 'credit';
  cashier: string;
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'Transport'
  | 'Payroll'
  | 'Rent'
  | 'Utilities'
  | 'Supplies'
  | 'Marketing'
  | 'Maintenance'
  | 'Insurance'
  | 'Other';

export interface ExpenseRecord {
  expenseId: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amountGHS: number;
  paidBy: ExpensePaymentMethod;
  notes: string;
  proofUrl: string | null;
}

export interface BankDepositRecord {
  depositId: string;
  date: string;
  bankId: string | null;
  bank: string;
  accountNo: string;
  amountGHS: number;
  remarks: string;
  createdBy: string;
  createdAt: string;
}

export interface BankRecord {
  bankId: string;
  bankName: string;
  branch: string;
  address: string;
  telephone: string;
  createdBy: string;
  createdAt: string;
}

// ─── CRM ──────────────────────────────────────────────────────────────────────

export type CustomerType = 'Wholesale' | 'Retail';
export type CustomerStatus = 'Active' | 'Inactive' | 'Blocked';

export interface Customer {
  customerId: string;
  fullName: string;
  customerType: CustomerType;
  phone: string;
  email: string;
  address: string;
  remarks: string;
  debtLimit: number;
  visitingDay: string;
  totalPurchases: number;      // total GHS spent
  outstandingBalance: number;  // GHS owed
  statusFlag: CustomerStatus;
  avatar: string;
  lastOrderDate: string;
  notes?: string;
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export type PurchaseOrderStatus = 'Pending' | 'Received' | 'Partial' | 'Cancelled';
export type POPaymentStatus = 'Unpaid' | 'Paid' | 'Partial';

export interface Supplier {
  supplierId: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  category: string;
  totalOrders: number;
  totalSpent: number;
  status: 'Active' | 'Inactive';
  joinedDate: string;
  notes: string;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  qty: number;
  unitCost: number;
  total: number;
}

export interface PurchaseOrder {
  orderId: string;
  supplierId: string;
  supplierName: string;
  date: string;
  expectedDate: string;
  items: PurchaseOrderItem[];
  total: number;
  status: PurchaseOrderStatus;
  paymentStatus: POPaymentStatus;
  notes: string;
}

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────

export interface KpiSummary {
  totalStockValue: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  grossMargin: number;
  creditOutstanding: number;
}

export interface CreditPayment {
  id: string;
  customerId: string;
  saleId?: string;
  invoiceNo?: string;
  receiptNo?: string | null;
  receiptId?: string | null;
  amount: number;
  paymentMethod: Exclude<PaymentMethod, 'Credit'>;
  notes: string;
  createdAt: string;
}

export interface MonthlyPerformance {
  month: string;
  income: number;
  expenses: number;
  profit: number;
}

export interface TopCustomer {
  customerId: string;
  fullName: string;
  customerType: CustomerType;
  totalPurchases: number;
  avatar: string;
}
