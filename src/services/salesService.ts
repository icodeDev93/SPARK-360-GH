import type { InvoiceRecord, SaleLineItem, PaymentMethod, SalePriceLevel } from '@/types/erp';
import { INVOICE_PREFIX } from '@/lib/constants';

export function generateNextInvoiceNo(existingInvoices: InvoiceRecord[]): string {
  if (existingInvoices.length === 0) return `${INVOICE_PREFIX}001`;
  const nums = existingInvoices
    .map((inv) => parseInt(inv.invoiceNo.replace(INVOICE_PREFIX, ''), 10))
    .filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${INVOICE_PREFIX}${String(next).padStart(3, '0')}`;
}

export function generateReceiptNo(): string {
  const now = new Date();
  const day = now.toISOString().slice(2, 10).replace(/-/g, '');
  const ms = Date.now().toString().slice(-6);
  return `RCP-${day}-${ms}`;
}

export function loadInvoiceById(
  invoices: InvoiceRecord[],
  invoiceNo: string
): InvoiceRecord | undefined {
  return invoices.find((inv) => inv.invoiceNo === invoiceNo);
}

export function calcLineItem(
  productId: string,
  productName: string,
  qty: number,
  returnsQty: number,
  unitPrice: number,
  costPrice: number,
  priceLevel: SalePriceLevel = 'Single',
  stockUnitsPerQty = 1
): SaleLineItem {
  const netQty = Math.max(0, qty - returnsQty);
  const netSales = unitPrice * netQty;
  const totalCost = costPrice * netQty;
  const stockUnitsDeducted = Math.max(0, Math.round(qty * Math.max(1, stockUnitsPerQty)));
  return {
    productId,
    productName,
    qty,
    returnsQty,
    netQty,
    unitPrice,
    costPrice,
    priceLevel,
    stockUnitsDeducted,
    netSales,
    totalCost,
    grossMargin: netSales - totalCost,
  };
}

export function calcInvoiceTotals(items: SaleLineItem[]): {
  netSales: number;
  totalCost: number;
  grossMargin: number;
} {
  return items.reduce(
    (acc, item) => ({
      netSales: acc.netSales + item.netSales,
      totalCost: acc.totalCost + item.totalCost,
      grossMargin: acc.grossMargin + item.grossMargin,
    }),
    { netSales: 0, totalCost: 0, grossMargin: 0 }
  );
}

export function buildInvoice(
  invoiceNo: string,
  receiptNo: string | null,
  customerId: string,
  customerName: string,
  items: SaleLineItem[],
  paymentMethod: PaymentMethod,
  cashier: string,
  status: InvoiceRecord['status'] = 'completed',
  adjustments: { subtotal?: number; taxAmount?: number; discountAmount?: number; totalAmount?: number } = {}
): InvoiceRecord {
  const totals = calcInvoiceTotals(items);
  const now = new Date();
  const subtotal = adjustments.subtotal ?? totals.netSales;
  const taxAmount = adjustments.taxAmount ?? 0;
  const discountAmount = adjustments.discountAmount ?? 0;
  const totalAmount = adjustments.totalAmount ?? Math.max(0, subtotal + taxAmount - discountAmount);
  const marginBase = Math.max(0, subtotal - discountAmount);
  return {
    invoiceNo,
    receiptNo,
    date: now.toISOString().split('T')[0],
    time: now.toISOString(),
    customerId,
    customerName,
    items,
    subtotal,
    taxAmount,
    discountAmount,
    netSales: totalAmount,
    totalCost: totals.totalCost,
    grossMargin: marginBase - totals.totalCost,
    amountPaid: status === 'credit' ? 0 : totalAmount,
    balanceDue: status === 'credit' ? totalAmount : 0,
    paymentMethod,
    status,
    cashier,
  };
}

export function refundInvoice(invoice: InvoiceRecord): InvoiceRecord {
  return { ...invoice, status: 'refunded' };
}

export function calcGrossMarginPercent(netSales: number, totalCost: number): number {
  if (netSales === 0) return 0;
  return ((netSales - totalCost) / netSales) * 100;
}
