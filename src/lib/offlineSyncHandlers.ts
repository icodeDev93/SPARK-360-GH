import { supabase } from './supabase';
import type { EntitySyncHandler } from './syncEngine';
import type { BankDepositRecord, BankRecord, Customer, ExpenseRecord, InventoryItem, InvoiceRecord, SaleLineItem } from '@/types/erp';
import type { StoreSettings } from '@/hooks/useSettings';
import type { PurchaseOrder, Supplier } from '@/mocks/suppliers';

const ACTIVE_BUSINESS_KEY = 'spark360:active-business-id';
const activeBusinessId = () => localStorage.getItem(ACTIVE_BUSINESS_KEY);

const itemRow = (item: InventoryItem) => ({
  business_id: activeBusinessId(),
  product_code: item.itemId ? item.itemId.toUpperCase() : undefined,
  product_name: item.productName,
  category_name: item.category,
  supplier_name: item.supplier,
  cost_price: item.costPrice,
  selling_price: item.sellingPrice,
  current_stock: item.currentStock,
  reorder_level: item.reorderLevel,
  expiry_date: item.expiryDate || null,
  image_url: item.image,
  wholesale_cost_price: item.wholesaleCostPrice,
  single_cost_price: item.singleCostPrice,
  wholesale_selling_price: item.wholesaleSellingPrice,
  half_selling_price: item.halfSellingPrice,
  quarter_selling_price: item.quarterSellingPrice,
  single_selling_price: item.singleSellingPrice,
  wholesale_quantity: item.wholesaleQuantity,
  single_quantity: item.singleQuantity,
  quantity_per_box: item.quantityPerBox,
  stock_limit: item.stockLimit,
  description: item.description,
  price_levels: item.priceLevels,
});

const customerRow = (customer: Customer) => ({
  business_id: activeBusinessId(),
  full_name: customer.fullName,
  phone: customer.phone,
  customer_type: customer.customerType,
  email: customer.email || null,
  address: customer.address || null,
  remarks: customer.remarks || customer.notes || null,
  debt_limit: customer.debtLimit,
  visiting_day: customer.visitingDay,
  outstanding_balance: customer.outstandingBalance,
  status: customer.statusFlag,
});

const expenseRow = (expense: ExpenseRecord) => ({
  business_id: activeBusinessId(),
  expense_date: expense.date,
  category: expense.category,
  description: expense.description,
  amount: expense.amountGHS,
  paid_by: expense.paidBy,
  notes: expense.notes,
  proof_url: expense.proofUrl ?? null,
});

const bankRow = (bank: BankRecord) => ({
  business_id: activeBusinessId(),
  bank_name: bank.bankName,
  branch: bank.branch,
  address: bank.address,
  telephone: bank.telephone,
});

const depositRow = (deposit: BankDepositRecord) => ({
  business_id: activeBusinessId(),
  deposit_date: deposit.date,
  bank_id: deposit.bankId,
  bank_name: deposit.bank,
  account_no: deposit.accountNo,
  amount: deposit.amountGHS,
  remarks: deposit.remarks,
});

const supplierRow = (supplier: Supplier) => ({
  business_id: activeBusinessId(),
  supplier_code: supplier.id,
  name: supplier.name,
  contact_name: supplier.contact,
  phone: supplier.phone,
  email: supplier.email,
  address: supplier.address,
  category: supplier.category,
  status: supplier.status,
  joined_date: supplier.joinedDate || null,
  notes: supplier.notes,
});

const purchaseRow = (order: PurchaseOrder) => ({
  business_id: activeBusinessId(),
  purchase_number: order.id,
  supplier_code: order.supplierId,
  supplier_name: order.supplierName,
  purchase_date: order.date || null,
  expected_date: order.expectedDate === 'TBD' ? null : order.expectedDate,
  item_count: Number(order.items || 0),
  subtotal: order.total,
  total_amount: order.total,
  status: order.status,
  payment_status: order.paymentStatus,
  notes: order.notes,
});

const saleItemsText = (invoice: InvoiceRecord) =>
  invoice.items.map((item) => `${item.productName} [${item.netQty} pcs]`).join(', ');

const saleRow = (invoice: InvoiceRecord) => ({
  business_id: activeBusinessId(),
  invoice_number: invoice.invoiceNo,
  receipt_number: invoice.receiptNo,
  sale_date: invoice.date,
  customer_id: invoice.customerId && invoice.customerId !== 'walk-in' ? invoice.customerId : null,
  customer_name: invoice.customerName,
  items: saleItemsText(invoice),
  subtotal: invoice.netSales,
  total_amount: invoice.netSales,
  total_cost: invoice.totalCost,
  gross_margin: invoice.grossMargin,
  payment_method: invoice.paymentMethod,
  status: invoice.status,
  cashier: invoice.cashier,
});

const saleItemRows = (saleId: string, items: SaleLineItem[]) => items.map((item) => ({
  sale_id: saleId,
  product_code: item.productId,
  product_name: item.productName,
  quantity: item.qty,
  returned_quantity: item.returnsQty,
  unit_price: item.unitPrice,
  unit_cost: item.costPrice,
  line_total: item.netSales,
  line_cost: item.totalCost,
  line_margin: item.grossMargin,
}));

const receiptRow = (saleId: string, invoice: InvoiceRecord) => ({
  sale_id: saleId,
  receipt_number: invoice.receiptNo,
  customer_name: invoice.customerName,
  cashier: invoice.cashier,
  subtotal: invoice.netSales,
  total_amount: invoice.netSales,
  payment_method: invoice.paymentMethod,
  receipt_payload: invoice,
});

const settingsRow = (settings: StoreSettings) => ({
  settings_key: 'default',
  store_name: settings.storeName,
  store_address: settings.storeAddress,
  store_phone: settings.storePhone,
  store_email: settings.storeEmail,
  store_logo: settings.storeLogo,
  currency: settings.currency,
  currency_symbol: settings.currencySymbol,
  tax_rate: settings.taxRate,
  tax_label: settings.taxLabel,
  tax_enabled: settings.taxEnabled,
  receipt_footer: settings.receiptFooter,
  receipt_show_logo: settings.receiptShowLogo,
  receipt_show_tax: settings.receiptShowTax,
  receipt_show_barcode: settings.receiptShowBarcode,
  receipt_theme: settings.receiptTheme,
  timezone: settings.timezone,
  invoice_due_days: settings.invoiceDueDays,
});

function throwIfError<T>(result: { error: T }) {
  if (result.error) throw result.error;
}

export const offlineSyncHandlers: Record<string, EntitySyncHandler> = {
  inventory: async (operation) => {
    if (operation.operation === 'delete') {
      await throwIfError(await supabase.from('inventory').delete().eq('product_code', operation.recordId));
      return;
    }
    const payload = operation.payload as InventoryItem;
    const existing = await supabase.from('inventory').select('product_code').eq('product_code', operation.recordId).maybeSingle();
    if (existing.data) await throwIfError(await supabase.from('inventory').update(itemRow(payload)).eq('product_code', operation.recordId));
    else await throwIfError(await supabase.from('inventory').insert(itemRow(payload)));
  },
  inventory_categories: async (operation) => {
    if (operation.operation === 'delete') {
      await throwIfError(await supabase.from('inventory_categories').delete().eq('name', operation.recordId));
      return;
    }
    const payload = operation.payload as { name?: string; original?: string };
    if (operation.operation === 'update' && payload.original) {
      await throwIfError(await supabase.from('inventory_categories').update({ name: payload.name }).eq('name', payload.original));
    } else {
      await throwIfError(await supabase.from('inventory_categories').insert({ name: payload.name ?? operation.recordId }));
    }
  },
  customers: async (operation) => {
    if (operation.operation === 'delete') {
      await throwIfError(await supabase.from('customers').delete().eq('id', operation.recordId));
      return;
    }
    const payload = operation.payload as Customer;
    const existing = await supabase.from('customers').select('id').eq('id', operation.recordId).maybeSingle();
    if (existing.data) await throwIfError(await supabase.from('customers').update(customerRow(payload)).eq('id', operation.recordId));
    else await throwIfError(await supabase.from('customers').insert({ id: operation.recordId, ...customerRow(payload) }));
  },
  expenses: async (operation) => {
    if (operation.operation === 'delete') {
      await throwIfError(await supabase.from('expenses').delete().eq('id', operation.recordId));
      return;
    }
    const payload = operation.payload as ExpenseRecord;
    const existing = await supabase.from('expenses').select('id').eq('id', operation.recordId).maybeSingle();
    if (existing.data) await throwIfError(await supabase.from('expenses').update(expenseRow(payload)).eq('id', operation.recordId));
    else await throwIfError(await supabase.from('expenses').insert({ id: operation.recordId, ...expenseRow(payload) }));
  },
  banks: async (operation) => {
    if (operation.operation === 'delete') {
      await throwIfError(await supabase.from('banks').delete().eq('id', operation.recordId));
      return;
    }
    const payload = operation.payload as BankRecord;
    const existing = await supabase.from('banks').select('id').eq('id', operation.recordId).maybeSingle();
    if (existing.data) await throwIfError(await supabase.from('banks').update(bankRow(payload)).eq('id', operation.recordId));
    else await throwIfError(await supabase.from('banks').insert({ id: operation.recordId, ...bankRow(payload) }));
  },
  bank_deposits: async (operation) => {
    if (operation.operation === 'delete') {
      await throwIfError(await supabase.from('bank_deposits').delete().eq('id', operation.recordId));
      return;
    }
    const payload = operation.payload as BankDepositRecord;
    const existing = await supabase.from('bank_deposits').select('id').eq('id', operation.recordId).maybeSingle();
    if (existing.data) await throwIfError(await supabase.from('bank_deposits').update(depositRow(payload)).eq('id', operation.recordId));
    else await throwIfError(await supabase.from('bank_deposits').insert({ id: operation.recordId, ...depositRow(payload) }));
  },
  suppliers: async (operation) => {
    if (operation.operation === 'delete') {
      await throwIfError(await supabase.from('suppliers').delete().eq('supplier_code', operation.recordId));
      return;
    }
    const payload = operation.payload as Supplier;
    const existing = await supabase.from('suppliers').select('supplier_code').eq('supplier_code', operation.recordId).maybeSingle();
    if (existing.data) await throwIfError(await supabase.from('suppliers').update(supplierRow(payload)).eq('supplier_code', operation.recordId));
    else await throwIfError(await supabase.from('suppliers').insert(supplierRow(payload)));
  },
  purchases: async (operation) => {
    if (operation.operation === 'delete') {
      await throwIfError(await supabase.from('purchases').delete().eq('purchase_number', operation.recordId));
      return;
    }
    const payload = operation.payload as PurchaseOrder;
    const existing = await supabase.from('purchases').select('purchase_number').eq('purchase_number', operation.recordId).maybeSingle();
    if (existing.data) await throwIfError(await supabase.from('purchases').update(purchaseRow(payload)).eq('purchase_number', operation.recordId));
    else await throwIfError(await supabase.from('purchases').insert(purchaseRow(payload)));
  },
  sales: async (operation) => {
    if (operation.operation === 'delete') {
      await throwIfError(await supabase.from('sales').delete().eq('invoice_number', operation.recordId));
      return;
    }
    const payload = operation.payload as InvoiceRecord;
    const existing = await supabase.from('sales').select('id').eq('invoice_number', operation.recordId).maybeSingle();
    if (existing.data) {
      await throwIfError(await supabase.from('sales').update(saleRow(payload)).eq('invoice_number', operation.recordId));
      return;
    }

    const saleResult = await supabase.from('sales').insert(saleRow(payload)).select('id').single();
    throwIfError(saleResult);
    if (!saleResult.data) return;
    if (payload.items.length) {
      await throwIfError(await supabase.from('sale_items').insert(saleItemRows(saleResult.data.id, payload.items)));
    }
    if (payload.receiptNo) {
      await throwIfError(await supabase.from('receipts').insert(receiptRow(saleResult.data.id, payload)));
    }
  },
  credit_payments: async (operation) => {
    await throwIfError(await supabase.from('credit_payments').insert(operation.payload));
  },
  store_settings: async (operation) => {
    await throwIfError(await supabase.from('store_settings').upsert(settingsRow(operation.payload as StoreSettings), { onConflict: 'settings_key' }));
  },
  user_logs: async (operation) => {
    await throwIfError(await supabase.from('user_logs').insert(operation.payload));
  },
};
