// ─── Inventory ────────────────────────────────────────────────────────────────

export type StockStatus = 'OK' | 'LOW' | 'OUT OF STOCK';

export interface InventoryItem {
  itemId: string;
  productName: string;
  category: string;
  supplier: string;
  costPrice: number;      // GHS
  sellingPrice: number;   // GHS
  currentStock: number;
  reorderLevel: number;
  stockStatus: StockStatus;
  marginPerUnit: number;  // sellingPrice - costPrice
  sku: string;
  image: string;
}

// ─── Sales ────────────────────────────────────────────────────────────────────

export type PaymentMethod = 'Cash' | 'MoMo' | 'Cheque' | 'Bank Transfer';

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
  date: string;
  customerId: string;
  customerName: string;
  items: SaleLineItem[];
  netSales: number;          // sum of item netSales
  totalCost: number;         // sum of item totalCost
  grossMargin: number;       // netSales - totalCost
  paymentMethod: PaymentMethod;
  status: 'completed' | 'refunded';
  cashier: string;
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'Transport'
  | 'Salaries'
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
  approvedBy: string;
}

// ─── CRM ──────────────────────────────────────────────────────────────────────

export type CustomerType = 'Wholesale' | 'Retail';
export type CustomerStatus = 'Active' | 'Inactive' | 'Blocked';

export interface Customer {
  customerId: string;
  fullName: string;
  companyName: string;
  customerType: CustomerType;
  phone: string;
  email: string;
  totalPurchases: number;      // total GHS spent
  outstandingBalance: number;  // GHS owed
  statusFlag: CustomerStatus;
  avatar: string;
  lastOrderDate: string;
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
  companyName: string;
  customerType: CustomerType;
  totalPurchases: number;
  avatar: string;
}
