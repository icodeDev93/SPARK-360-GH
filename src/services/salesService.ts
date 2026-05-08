import type { InvoiceRecord, SaleLineItem, PaymentMethod } from '@/types/erp';
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
  const ts = Date.now().toString().slice(-6);
  return `RCP-${ts}`;
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
  costPrice: number
): SaleLineItem {
  const netQty = Math.max(0, qty - returnsQty);
  const netSales = unitPrice * netQty;
  const totalCost = costPrice * netQty;
  return {
    productId,
    productName,
    qty,
    returnsQty,
    netQty,
    unitPrice,
    costPrice,
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
  receiptNo: string,
  customerId: string,
  customerName: string,
  items: SaleLineItem[],
  paymentMethod: PaymentMethod,
  cashier: string
): InvoiceRecord {
  const totals = calcInvoiceTotals(items);
  const now = new Date();
  return {
    invoiceNo,
    receiptNo,
    date: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    customerId,
    customerName,
    items,
    ...totals,
    paymentMethod,
    status: 'completed',
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
