import { useState, useEffect, useRef } from 'react';
import type { CreditPayment, InvoiceRecord, SaleLineItem, PaymentMethod, SalePriceLevel } from '@/types/erp';
import { generateNextInvoiceNo, generateReceiptNo, buildInvoice, refundInvoice, calcLineItem, calcInvoiceTotals } from '@/services/salesService';
import { supabase } from '@/lib/supabase';
import { sanitizeMultiline, sanitizeText } from '@/lib/sanitize';
import { loadLocalCollection, queueLocalMutation, saveLocalCollection } from '@/lib/localCache';
import { useBusiness } from '@/contexts/BusinessContext';

export type { InvoiceRecord, SaleLineItem, PaymentMethod };

export { calcLineItem };

export interface SaleRecord {
  invoiceNo: string;
  receiptNo: string | null;
  date: string;
  time: string;
  cashier: string;
  items: { id: number; code: string; name: string; price: number; qty: number }[];
  subtotal: number;
  tax: number;
  discountAmt: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  status: InvoiceRecord['status'];
}

const SEED_INVOICES: InvoiceRecord[] = [
  {
    invoiceNo: 'INV001', receiptNo: 'RCP-000001', date: '2026-04-20', customerId: 'C001', customerName: 'Asante Mini Mart',
    time: '2026-04-20T09:00:00.000Z',
    items: [
      calcLineItem('P003', 'Milo Sachet (30g)', 100, 0, 4.00, 2.50),
      calcLineItem('P006', 'Bourbon Biscuits (150g)', 48, 0, 18.00, 12.00),
    ],
    netSales: 1264, totalCost: 826, grossMargin: 438,
    amountPaid: 1264, balanceDue: 0,
    paymentMethod: 'MoMo', status: 'completed', cashier: 'Ama Owusu',
  },
  {
    invoiceNo: 'INV002', receiptNo: 'RCP-000002', date: '2026-04-21', customerId: 'C002', customerName: 'Mensah Superstore',
    time: '2026-04-21T10:15:00.000Z',
    items: [
      calcLineItem('P009', 'Malta Guinness (330ml)', 120, 0, 9.00, 5.50),
      calcLineItem('P001', 'Pringles Original (165g)', 24, 0, 42.00, 28.00),
    ],
    netSales: 2088, totalCost: 1332, grossMargin: 756,
    amountPaid: 2088, balanceDue: 0,
    paymentMethod: 'Bank Transfer', status: 'completed', cashier: 'Kwame Mensah',
  },
  {
    invoiceNo: 'INV003', receiptNo: 'RCP-000003', date: '2026-04-22', customerId: 'C005', customerName: 'Boateng & Sons Dist.',
    time: '2026-04-22T11:30:00.000Z',
    items: [
      calcLineItem('P004', 'Ovaltine Tin (400g)', 30, 0, 65.00, 45.00),
      calcLineItem('P012', "Wrigley's Spearmint Gum (10s)", 200, 0, 5.00, 3.00),
    ],
    netSales: 2950, totalCost: 1950, grossMargin: 1000,
    amountPaid: 2950, balanceDue: 0,
    paymentMethod: 'Cheque', status: 'completed', cashier: 'Ama Owusu',
  },
  {
    invoiceNo: 'INV004', receiptNo: 'RCP-000004', date: '2026-04-23', customerId: 'C003', customerName: 'Fatima Provision Store',
    time: '2026-04-23T12:45:00.000Z',
    items: [
      calcLineItem('P011', 'Table Water 500ml (Crate/24)', 10, 0, 48.00, 28.80),
      calcLineItem('P008', 'Choco Mallow (Pack of 6)', 20, 0, 14.00, 8.00),
    ],
    netSales: 760, totalCost: 448, grossMargin: 312,
    amountPaid: 760, balanceDue: 0,
    paymentMethod: 'Cash', status: 'refunded', cashier: 'Kwame Mensah',
  },
  {
    invoiceNo: 'INV005', receiptNo: 'RCP-000005', date: '2026-04-25', customerId: 'C007', customerName: 'Owusu Family Store',
    time: '2026-04-25T14:00:00.000Z',
    items: [
      calcLineItem('P015', 'Coca-Cola PET 500ml (Crate/24)', 20, 0, 120.00, 72.00),
      calcLineItem('P013', 'FanChoco Bar (50g)', 100, 0, 10.00, 6.00),
    ],
    netSales: 3400, totalCost: 2040, grossMargin: 1360,
    amountPaid: 3400, balanceDue: 0,
    paymentMethod: 'Bank Transfer', status: 'completed', cashier: 'Ama Owusu',
  },
  {
    invoiceNo: 'INV006', receiptNo: 'RCP-000006', date: '2026-04-26', customerId: 'C004', customerName: 'Osei Kiosk Junction',
    time: '2026-04-26T15:20:00.000Z',
    items: [
      calcLineItem('P002', "Lay's Classic Chips (80g)", 12, 0, 22.00, 15.00),
      calcLineItem('P007', 'Kit Kat 4-Finger (41.5g)', 24, 0, 16.00, 10.00),
    ],
    netSales: 648, totalCost: 420, grossMargin: 228,
    amountPaid: 648, balanceDue: 0,
    paymentMethod: 'MoMo', status: 'completed', cashier: 'Kwame Mensah',
  },
];

type InvoiceRow = {
  id: string; invoice_number: string | null; receipt_number: string | null; sale_date: string;
  sale_time?: string | null;
  created_at?: string | null;
  customer_id: string | null;
  customer_name: string; total_amount: number; total_cost: number; gross_margin: number;
  subtotal?: number | null; tax_amount?: number | null; discount_amount?: number | null;
  payment_method: string; status: string; cashier: string | null;
  items: string | null;
  sale_items: ItemRow[];
  receipts: ReceiptRow | ReceiptRow[] | null;
};

type ReceiptRow = {
  receipt_number: string;
};

type CreditPaymentRow = {
  id?: string;
  customer_id?: string | null;
  sale_id: string | null;
  invoice_number: string | null;
  receipt_id?: string | null;
  amount: number;
  payment_method?: string | null;
  notes?: string | null;
  created_at?: string | null;
  receipts?: ReceiptRow | ReceiptRow[] | null;
};

type ItemRow = {
  product_code: string; product_name: string; quantity: number; returned_quantity: number | null;
  net_quantity: number | null; unit_price: number; unit_cost: number;
  line_total: number; line_cost: number; line_margin: number;
  price_level?: string | null; stock_units_deducted?: number | null;
};

const toLineItem = (i: ItemRow): SaleLineItem => {
  const returnsQty = i.returned_quantity ?? 0;
  return {
    productId: i.product_code, productName: i.product_name, qty: i.quantity,
    returnsQty, netQty: i.net_quantity ?? (i.quantity - returnsQty),
    unitPrice: i.unit_price, costPrice: i.unit_cost,
    priceLevel: (i.price_level ?? 'Single') as SalePriceLevel,
    stockUnitsDeducted: i.stock_units_deducted ?? i.quantity,
    netSales: i.line_total, totalCost: i.line_cost, grossMargin: i.line_margin,
  };
};

const invoiceNumberFromRow = (r: InvoiceRow): string => r.invoice_number ?? r.receipt_number ?? r.id;

const joinedReceiptNumberFromRow = (r: InvoiceRow): string | null => {
  if (Array.isArray(r.receipts)) return r.receipts[0]?.receipt_number ?? null;
  return r.receipts?.receipt_number ?? null;
};

const receiptNumberFromRow = (r: InvoiceRow): string | null => {
  if (r.receipt_number && !/^INV\d+$/i.test(r.receipt_number)) return r.receipt_number;
  const receiptNo = joinedReceiptNumberFromRow(r);
  if (receiptNo) return receiptNo;
  return null;
};

const paymentTotalForRow = (r: InvoiceRow, paymentsByKey: Map<string, number>): number => {
  const invoiceNo = invoiceNumberFromRow(r);
  return Math.min(r.total_amount, paymentsByKey.get(invoiceNo) ?? paymentsByKey.get(r.id) ?? 0);
};

const toInvoice = (r: InvoiceRow, paymentsByKey = new Map<string, number>()): InvoiceRecord => {
  const amountPaid = paymentTotalForRow(r, paymentsByKey);
  const balanceDue = Math.max(0, r.total_amount - amountPaid);
  const isPaidSale = r.status === 'completed' || r.status === 'refunded';
  const taxAmount = Number(r.tax_amount ?? 0);
  const discountAmount = Number(r.discount_amount ?? 0);
  const subtotal = Number(r.subtotal ?? Math.max(0, r.total_amount - taxAmount + discountAmount));

  return {
    invoiceNo: invoiceNumberFromRow(r), receiptNo: receiptNumberFromRow(r),
    date: r.sale_date, time: r.sale_time ?? r.created_at ?? r.sale_date,
    customerId: r.customer_id ?? '',
    customerName: r.customer_name, subtotal, taxAmount, discountAmount,
    netSales: r.total_amount, totalCost: r.total_cost,
    grossMargin: r.gross_margin,
    amountPaid: isPaidSale && amountPaid === 0 ? r.total_amount : amountPaid,
    balanceDue: isPaidSale ? 0 : balanceDue,
    paymentMethod: r.payment_method as PaymentMethod,
    status: r.status as InvoiceRecord['status'], cashier: r.cashier ?? '',
    items: (r.sale_items ?? []).map(toLineItem),
  };
};

const toCreditPayment = (payment: CreditPaymentRow): CreditPayment => ({
  id: payment.id ?? `${payment.sale_id ?? payment.invoice_number ?? 'payment'}-${payment.created_at ?? Date.now()}`,
  customerId: payment.customer_id ?? '',
  saleId: payment.sale_id ?? undefined,
  invoiceNo: payment.invoice_number ?? undefined,
  receiptNo: joinedReceiptNumberFromRow({ receipts: payment.receipts } as InvoiceRow),
  receiptId: payment.receipt_id ?? null,
  amount: Number(payment.amount ?? 0),
  paymentMethod: (payment.payment_method ?? 'Cash') as Exclude<PaymentMethod, 'Credit'>,
  notes: payment.notes ?? '',
  createdAt: payment.created_at ?? '',
});

const fetchCreditPayments = async (businessId: string): Promise<CreditPaymentRow[]> => {
  const fullResult = await supabase
    .from('credit_payments')
    .select('id,customer_id,sale_id,invoice_number,receipt_id,amount,payment_method,notes,created_at,receipts(receipt_number)')
    .eq('business_id', businessId);

  if (!fullResult.error) return (fullResult.data ?? []) as CreditPaymentRow[];

  const metadataResult = await supabase
    .from('credit_payments')
    .select('id,customer_id,sale_id,invoice_number,receipt_id,amount,payment_method,notes,created_at')
    .eq('business_id', businessId);

  if (!metadataResult.error) return (metadataResult.data ?? []) as CreditPaymentRow[];

  const totalsResult = await supabase
    .from('credit_payments')
    .select('sale_id,invoice_number,amount')
    .eq('business_id', businessId);

  if (totalsResult.error) {
    console.error(fullResult.error);
    console.error(metadataResult.error);
    console.error(totalsResult.error);
    return [];
  }

  return (totalsResult.data ?? []) as CreditPaymentRow[];
};

const saleItemsText = (items: SaleLineItem[]): string =>
  items.map((it) => `${it.productName} [${it.netQty} pcs]`).join(', ');

const cleanLineItem = (item: SaleLineItem): SaleLineItem => ({
  ...item,
  productId: sanitizeText(item.productId),
  productName: sanitizeText(item.productName),
});

const cleanInvoice = (inv: InvoiceRecord): InvoiceRecord => ({
  ...inv,
  invoiceNo: sanitizeText(inv.invoiceNo),
  receiptNo: inv.receiptNo ? sanitizeText(inv.receiptNo) : null,
  date: sanitizeText(inv.date),
  time: sanitizeText(inv.time || inv.date),
  customerId: sanitizeText(inv.customerId),
  customerName: sanitizeText(inv.customerName),
  paymentMethod: sanitizeText(inv.paymentMethod) as PaymentMethod,
  cashier: sanitizeText(inv.cashier),
  items: inv.items.map(cleanLineItem),
});

const saleRow = (invoice: InvoiceRecord, businessId: string) => {
  const inv = cleanInvoice(invoice);
  return ({
  business_id: businessId,
  invoice_number: inv.invoiceNo,
  receipt_number: inv.receiptNo,
  sale_date: inv.date,
  sale_time: inv.time || inv.date,
  customer_id: inv.customerId && inv.customerId !== 'walk-in' ? inv.customerId : null,
  customer_name: inv.customerName,
  items: saleItemsText(inv.items),
  subtotal: inv.subtotal ?? inv.items.reduce((sum, item) => sum + item.netSales, 0),
  discount_amount: inv.discountAmount ?? 0,
  tax_amount: inv.taxAmount ?? 0,
  total_amount: inv.netSales,
  total_cost: inv.totalCost,
  gross_margin: inv.grossMargin,
  payment_method: inv.paymentMethod,
  status: inv.status,
  cashier: inv.cashier,
})};

const insertSale = async (inv: InvoiceRecord, businessId: string) => {
  const result = await supabase.from('sales').insert(saleRow(inv, businessId)).select('id').single();
  if (result.error?.code === '42703') {
    const { items: _items, customer_id: _cid, invoice_number: _invoiceNo, business_id: _bid, ...safeRow } = saleRow(inv, businessId) as Record<string, unknown>;
    return supabase.from('sales').insert({ ...safeRow, receipt_number: inv.invoiceNo }).select('id').single();
  }
  return result;
};

const insertSaleItems = async (saleId: string, items: SaleLineItem[], businessId: string) => {
  const rows = saleItemRows(saleId, items, businessId);
  const { error } = await supabase.from('sale_items').insert(rows);
  if (error) {
    console.error(error);
    throw new Error(error.message || 'Sale items could not be saved.');
  }
  window.dispatchEvent(new CustomEvent('bizzyapp:inventory-refresh', { detail: { businessId } }));
};

// net_quantity is a generated column (quantity - returned_quantity) — never write it
const saleItemRows = (saleId: string, items: SaleLineItem[], businessId: string) => items.map((it) => ({
  business_id: businessId,
  sale_id: saleId,
  product_code: sanitizeText(it.productId),
  product_name: sanitizeText(it.productName),
  quantity: it.qty,
  returned_quantity: it.returnsQty,
  unit_price: it.unitPrice,
  unit_cost: it.costPrice,
  price_level: it.priceLevel,
  stock_units_deducted: it.stockUnitsDeducted,
  line_total: it.netSales,
  line_cost: it.totalCost,
  line_margin: it.grossMargin,
}));

const receiptRow = (
  saleId: string,
  inv: InvoiceRecord,
  receiptNo: string,
  paymentMethod: Exclude<PaymentMethod, 'Credit'> | PaymentMethod = inv.paymentMethod,
  paymentAmount = inv.netSales,
  businessId?: string | null
) => ({
  business_id: businessId,
  sale_id: saleId,
  receipt_number: sanitizeText(receiptNo),
  customer_name: sanitizeText(inv.customerName),
  cashier: sanitizeText(inv.cashier),
  subtotal: paymentAmount === inv.netSales ? (inv.subtotal ?? paymentAmount) : paymentAmount,
  tax_amount: paymentAmount === inv.netSales ? (inv.taxAmount ?? 0) : 0,
  discount_amount: paymentAmount === inv.netSales ? (inv.discountAmount ?? 0) : 0,
  total_amount: paymentAmount,
  payment_method: sanitizeText(paymentMethod) as PaymentMethod,
  receipt_payload: cleanInvoice({ ...inv, receiptNo, paymentMethod }),
});

const productNumber = (productId: string) => {
  const n = Number(productId.replace(/\D/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const toSaleRecord = (inv: InvoiceRecord): SaleRecord => ({
  invoiceNo: inv.invoiceNo,
  receiptNo: inv.receiptNo,
  date: inv.date,
  time: inv.time,
  cashier: inv.cashier,
  items: inv.items.map((item) => ({
    id: productNumber(item.productId),
    code: item.productId,
    name: item.productName,
    price: item.unitPrice,
    qty: item.netQty,
  })),
  subtotal: inv.subtotal ?? inv.netSales,
  tax: inv.taxAmount ?? 0,
  discountAmt: inv.discountAmount ?? 0,
  grandTotal: inv.netSales,
  paymentMethod: inv.paymentMethod,
  status: inv.status,
});

const findSaleByInvoiceNo = async (invoiceNo: string, businessId: string): Promise<{ id: string } | null> => {
  const byInvoice = await supabase
    .from('sales')
    .select('id')
    .eq('business_id', businessId)
    .eq('invoice_number', invoiceNo)
    .maybeSingle();

  if (byInvoice.data) return byInvoice.data;
  if (byInvoice.error && byInvoice.error.code !== 'PGRST116' && byInvoice.error.code !== '42703') {
    console.error(byInvoice.error);
  }

  const byLegacyReceipt = await supabase
    .from('sales')
    .select('id')
    .eq('business_id', businessId)
    .eq('receipt_number', invoiceNo)
    .maybeSingle();

  if (byLegacyReceipt.error && byLegacyReceipt.error.code !== 'PGRST116') {
    console.error(byLegacyReceipt.error);
  }
  return byLegacyReceipt.data ?? null;
};

export function useSalesLog() {
  const { activeBusinessId, activeBusiness, loading: businessLoading } = useBusiness();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [creditPayments, setCreditPayments] = useState<CreditPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const creditPaymentsInFlight = useRef(new Set<string>());

  useEffect(() => {
    const fetchSales = async () => {
      if (!activeBusinessId) {
        setInvoices([]);
        setCreditPayments([]);
        setLoading(false);
        return;
      }
      const [cachedInvoices, cachedPayments] = await Promise.all([
        loadLocalCollection<InvoiceRecord>('sales_invoices'),
        loadLocalCollection<CreditPayment>('credit_payments'),
      ]);
      if (cachedInvoices.length) setInvoices(cachedInvoices);
      if (cachedPayments.length) setCreditPayments(cachedPayments);

      const { data, error } = await supabase
        .from('sales')
        .select('*, sale_items(*), receipts(receipt_number)')
        .eq('business_id', activeBusinessId)
        .order('sale_date', { ascending: false });
      if (error) { console.error(error); setLoading(false); return; }
      const paymentTotals = new Map<string, number>();
      const payments = await fetchCreditPayments(activeBusinessId);
      payments.forEach((payment) => {
        [payment.invoice_number, payment.sale_id].forEach((key) => {
          if (!key) return;
          paymentTotals.set(key, (paymentTotals.get(key) ?? 0) + Number(payment.amount ?? 0));
        });
      });
      const nextPayments = payments.map(toCreditPayment);
      const nextInvoices = data ? (data as InvoiceRow[]).map((row) => toInvoice(row, paymentTotals)) : [];
      setCreditPayments(nextPayments);
      setInvoices(nextInvoices);
      saveLocalCollection('credit_payments', nextPayments);
      saveLocalCollection('sales_invoices', nextInvoices);
      setLoading(false);
    };

    fetchSales();

    const channel = supabase
      .channel('sales-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, fetchSales)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_items' }, fetchSales)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receipts' }, fetchSales)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_payments' }, fetchSales)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeBusinessId]);

  const addInvoice = async (
    data: Omit<InvoiceRecord, 'invoiceNo' | 'receiptNo' | 'date' | 'time' | 'status' | 'netSales' | 'totalCost' | 'grossMargin' | 'amountPaid' | 'balanceDue'>
      & { receiptNo?: string | null; status?: InvoiceRecord['status']; totalAmount?: number }
  ): Promise<InvoiceRecord> => {
    if (!activeBusinessId) throw new Error('Select a business before recording sales.');
    if (businessLoading || !activeBusiness || activeBusiness.id !== activeBusinessId) {
      throw new Error('This business is not confirmed for your account. Please reselect the business and try again.');
    }
    let invoiceNo = generateNextInvoiceNo(invoices);
    const liveInvoices = await supabase
      .from('sales')
      .select('invoice_number')
      .eq('business_id', activeBusinessId)
      .not('invoice_number', 'is', null);
    if (!liveInvoices.error && liveInvoices.data) {
      invoiceNo = generateNextInvoiceNo([
        ...invoices,
        ...liveInvoices.data.map((row) => ({ invoiceNo: row.invoice_number ?? '' } as InvoiceRecord)),
      ]);
    }
    const status = data.status ?? 'completed';
    const receiptNo = status === 'credit' ? null : data.receiptNo ? sanitizeText(data.receiptNo) : generateReceiptNo();
    const cleanData = {
      ...data,
      customerId: sanitizeText(data.customerId),
      customerName: sanitizeText(data.customerName),
      paymentMethod: sanitizeText(data.paymentMethod) as PaymentMethod,
      cashier: sanitizeText(data.cashier),
      items: data.items.map(cleanLineItem),
    };
    const newInvoice = buildInvoice(
      invoiceNo, receiptNo, cleanData.customerId, cleanData.customerName,
      cleanData.items, cleanData.paymentMethod, cleanData.cashier, status,
      {
        subtotal: cleanData.subtotal,
        taxAmount: cleanData.taxAmount,
        discountAmount: cleanData.discountAmount,
        totalAmount: cleanData.totalAmount,
      }
    );
    // Optimistic update
    const nextInvoices = [newInvoice, ...invoices];
    setInvoices(nextInvoices);
    saveLocalCollection('sales_invoices', nextInvoices);
    try {
      const { data: sale, error } = await insertSale(newInvoice, activeBusinessId);
      if (error) {
        console.error(error);
        const isPermissionError = error.code === '42501' || error.message?.toLowerCase().includes('permission denied');
        if (!isPermissionError) queueLocalMutation('sales', newInvoice.invoiceNo, 'create', newInvoice);
        if (isPermissionError) {
          throw new Error('You are not allowed to record sales for this business. Please reselect the correct business or ask the owner to assign you to it.');
        }
        throw new Error(error.message || 'Sale could not be saved to the database.');
      }
      if (!sale) throw new Error('Sale was not saved to the database.');
      if (newInvoice.items.length > 0) {
        await insertSaleItems(sale.id, newInvoice.items, activeBusinessId);
      }
      if (newInvoice.receiptNo) {
        const receiptResult = await supabase
          .from('receipts')
          .insert(receiptRow(sale.id, newInvoice, newInvoice.receiptNo, newInvoice.paymentMethod, newInvoice.netSales, activeBusinessId));
        if (receiptResult.error) throw new Error(receiptResult.error.message || 'Receipt could not be saved.');
      }
      // Stock deduction is handled by the DB trigger on sale_items INSERT
      // For credit sales, increase the customer's outstanding balance
      if (status === 'credit' && newInvoice.customerId && newInvoice.customerId !== 'walk-in') {
        const { data: cust } = await supabase
          .from('customers').select('outstanding_balance').eq('business_id', activeBusinessId).eq('id', newInvoice.customerId).single();
        if (cust) {
          await supabase.from('customers').update({
            outstanding_balance: (cust.outstanding_balance ?? 0) + newInvoice.netSales,
          }).eq('business_id', activeBusinessId).eq('id', newInvoice.customerId);
        }
      }
    } catch (error) {
      const rolledBackInvoices = invoices.filter((invoice) => invoice.invoiceNo !== newInvoice.invoiceNo);
      setInvoices(rolledBackInvoices);
      saveLocalCollection('sales_invoices', rolledBackInvoices);
      throw error;
    }
    return newInvoice;
  };

  const refund = async (invoiceNo: string) => {
    const nextInvoices = invoices.map((inv) =>
      inv.invoiceNo === invoiceNo ? refundInvoice(inv) : inv
    );
    setInvoices(nextInvoices);
    saveLocalCollection('sales_invoices', nextInvoices);
    if (!activeBusinessId) return;
    const sale = await findSaleByInvoiceNo(invoiceNo, activeBusinessId);
    if (!sale) {
      queueLocalMutation('sales', invoiceNo, 'update', nextInvoices.find((inv) => inv.invoiceNo === invoiceNo));
      return;
    }
    const { error } = await supabase.from('sales')
      .update({ status: 'refunded' }).eq('id', sale.id);
    if (error) {
      console.error(error);
      queueLocalMutation('sales', invoiceNo, 'update', nextInvoices.find((inv) => inv.invoiceNo === invoiceNo));
    }
  };

  const deleteInvoice = async (invoiceNo: string): Promise<{ success: boolean; error?: string }> => {
    const invoice = invoices.find((inv) => inv.invoiceNo === invoiceNo);
    const nextInvoices = invoices.filter((inv) => inv.invoiceNo !== invoiceNo);
    setInvoices(nextInvoices);
    saveLocalCollection('sales_invoices', nextInvoices);

    const nextPayments = creditPayments.filter((payment) => payment.invoiceNo !== invoiceNo);
    setCreditPayments(nextPayments);
    saveLocalCollection('credit_payments', nextPayments);

    if (!activeBusinessId) return { success: true };
    const sale = await findSaleByInvoiceNo(invoiceNo, activeBusinessId);
    if (sale) {
      await supabase.from('credit_payments').delete().eq('business_id', activeBusinessId).eq('sale_id', sale.id);
      await supabase.from('credit_payments').delete().eq('business_id', activeBusinessId).eq('invoice_number', invoiceNo);
      await supabase.from('sale_items').delete().eq('business_id', activeBusinessId).eq('sale_id', sale.id);
      await supabase.from('receipts').delete().eq('business_id', activeBusinessId).eq('sale_id', sale.id);
      if (invoice?.status === 'credit' && invoice.customerId && invoice.customerId !== 'walk-in' && invoice.balanceDue > 0) {
        const { data: cust } = await supabase
          .from('customers')
          .select('outstanding_balance')
          .eq('business_id', activeBusinessId)
          .eq('id', invoice.customerId)
          .maybeSingle();
        if (cust) {
          await supabase.from('customers').update({
            outstanding_balance: Math.max(0, Number(cust.outstanding_balance ?? 0) - invoice.balanceDue),
          }).eq('business_id', activeBusinessId).eq('id', invoice.customerId);
        }
      }
    }
    const { error } = sale
      ? await supabase.from('sales').delete().eq('id', sale.id)
      : await supabase.from('sales').delete().eq('business_id', activeBusinessId).eq('receipt_number', invoiceNo);
    if (error) {
      console.error(error);
      queueLocalMutation('sales', invoiceNo, 'delete', { invoiceNo });
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  const recordCreditPayment = async (
    invoiceNo: string,
    amount: number,
    paymentMethod: Exclude<PaymentMethod, 'Credit'>,
    notes = ''
  ): Promise<{ receiptNo: string; remainingBalance: number } | null> => {
    const cleanInvoiceNo = sanitizeText(invoiceNo);
    if (!activeBusinessId) return null;
    if (creditPaymentsInFlight.current.has(cleanInvoiceNo)) return null;

    const inv = invoices.find((i) => i.invoiceNo === cleanInvoiceNo);
    if (!inv || inv.status !== 'credit') return null;

    const currentBalance = Math.max(0, inv.balanceDue || inv.netSales - inv.amountPaid);
    const paymentAmount = Math.min(currentBalance, Math.max(0, amount));
    if (paymentAmount <= 0) return null;
    creditPaymentsInFlight.current.add(cleanInvoiceNo);

    try {
      const nextAmountPaid = Math.min(inv.netSales, inv.amountPaid + paymentAmount);
      const remainingBalance = Math.max(0, inv.netSales - nextAmountPaid);
      const nextStatus: InvoiceRecord['status'] = remainingBalance <= 0.005 ? 'completed' : 'credit';
      const receiptNo = generateReceiptNo();
      const updatedInvoice: InvoiceRecord = {
        ...inv,
        receiptNo,
        amountPaid: nextAmountPaid,
        balanceDue: remainingBalance,
        status: nextStatus,
      };

      const nextInvoices = invoices.map((i) =>
        i.invoiceNo === cleanInvoiceNo ? updatedInvoice : i
      );
      setInvoices(nextInvoices);
      saveLocalCollection('sales_invoices', nextInvoices);

      const sale = await findSaleByInvoiceNo(cleanInvoiceNo, activeBusinessId);
      if (!sale) {
        queueLocalMutation('credit_payments', `${cleanInvoiceNo}-${receiptNo}`, 'create', {
          invoiceNo: cleanInvoiceNo,
          receiptNo,
          amount: paymentAmount,
          paymentMethod,
          notes,
        });
        return { receiptNo, remainingBalance };
      }

      const { error } = await supabase.from('sales')
        .update({ status: nextStatus, receipt_number: receiptNo }).eq('business_id', activeBusinessId).eq('id', sale.id);
      if (error) {
        console.error(error);
        queueLocalMutation('credit_payments', `${cleanInvoiceNo}-${receiptNo}`, 'create', {
          invoiceNo: cleanInvoiceNo,
          receiptNo,
          amount: paymentAmount,
          paymentMethod,
          notes,
        });
        return { receiptNo, remainingBalance };
      }

      if (inv.customerId && inv.customerId !== 'walk-in') {
        const { data: cust } = await supabase
          .from('customers').select('outstanding_balance').eq('business_id', activeBusinessId).eq('id', inv.customerId).single();
        if (cust) {
          await supabase.from('customers').update({
            outstanding_balance: Math.max(0, (cust.outstanding_balance ?? 0) - paymentAmount),
          }).eq('business_id', activeBusinessId).eq('id', inv.customerId);
        }
      }

      const { data: receipt, error: receiptError } = await supabase
        .from('receipts')
        .insert(receiptRow(sale.id, updatedInvoice, receiptNo, paymentMethod, paymentAmount, activeBusinessId))
        .select('id')
        .single();
      if (receiptError) console.error(receiptError);

      const paymentPayload = {
        business_id: activeBusinessId,
        customer_id: inv.customerId && inv.customerId !== 'walk-in' ? inv.customerId : null,
        sale_id: sale.id,
        invoice_number: cleanInvoiceNo,
        receipt_id: receipt?.id ?? null,
        amount: paymentAmount,
        payment_method: sanitizeText(paymentMethod),
        notes: sanitizeMultiline(notes) || `${nextStatus === 'completed' ? 'Final' : 'Partial'} payment for credit invoice ${cleanInvoiceNo}`,
      };

      const paymentResult = await supabase.from('credit_payments').insert(paymentPayload);
      if (paymentResult.error?.code === '42703') {
        const { invoice_number: _invoiceNumber, receipt_id: _receiptId, ...legacyPayload } = paymentPayload;
        const legacyResult = await supabase.from('credit_payments').insert(legacyPayload);
        if (legacyResult.error) console.error(legacyResult.error);
      } else if (paymentResult.error) {
        console.error(paymentResult.error);
      }

      const nextPayments = [
        {
          id: `${cleanInvoiceNo}-${receiptNo}`,
          customerId: inv.customerId,
          saleId: sale.id,
          invoiceNo: cleanInvoiceNo,
          receiptNo,
          receiptId: receipt?.id ?? null,
          amount: paymentAmount,
          paymentMethod,
          notes: sanitizeMultiline(notes),
          createdAt: new Date().toISOString(),
        },
        ...creditPayments,
      ];
      setCreditPayments(nextPayments);
      saveLocalCollection('credit_payments', nextPayments);

      return { receiptNo, remainingBalance };
    } finally {
      creditPaymentsInFlight.current.delete(cleanInvoiceNo);
    }
  };

  const markCreditAsPaid = async (invoiceNo: string, paymentMethod: Exclude<PaymentMethod, 'Credit'>): Promise<string | null> => {
    const inv = invoices.find((i) => i.invoiceNo === invoiceNo);
    if (!inv) return null;
    const result = await recordCreditPayment(invoiceNo, inv.balanceDue || inv.netSales - inv.amountPaid, paymentMethod);
    return result?.receiptNo ?? null;
  };

  const processReturn = async (invoiceNo: string, returns: { productId: string; returnQty: number }[]) => {
    const inv = invoices.find((i) => i.invoiceNo === invoiceNo);
    if (!inv) return;

    const updatedItems = inv.items.map((item) => {
      const ret = returns.find((r) => r.productId === item.productId);
      if (!ret || ret.returnQty <= 0) return item;
      const newReturnsQty = Math.min(item.qty, item.returnsQty + ret.returnQty);
      return calcLineItem(
        item.productId,
        item.productName,
        item.qty,
        newReturnsQty,
        item.unitPrice,
        item.costPrice,
        item.priceLevel,
        item.stockUnitsDeducted / Math.max(1, item.qty),
      );
    });

    const newTotals = calcInvoiceTotals(updatedItems);
    const nextBalanceDue = Math.max(0, newTotals.netSales - inv.amountPaid);
    const nextStatus: InvoiceRecord['status'] =
      inv.status === 'credit' && nextBalanceDue <= 0.005 ? 'completed' : inv.status;
    const nextInvoices = invoices.map((i) =>
      i.invoiceNo === invoiceNo
        ? { ...i, items: updatedItems, ...newTotals, balanceDue: nextBalanceDue, status: nextStatus }
        : i
    );
    setInvoices(nextInvoices);
    saveLocalCollection('sales_invoices', nextInvoices);

    if (!activeBusinessId) return;
    const sale = await findSaleByInvoiceNo(invoiceNo, activeBusinessId);
    if (!sale) {
      queueLocalMutation('sales', invoiceNo, 'update', nextInvoices.find((i) => i.invoiceNo === invoiceNo));
      return;
    }

    for (const ret of returns) {
      if (ret.returnQty <= 0) continue;
      const item = inv.items.find((i) => i.productId === ret.productId);
      if (!item) continue;
      const newReturnsQty = Math.min(item.qty, item.returnsQty + ret.returnQty);
      const netQty = item.qty - newReturnsQty;
      const lineTotal = item.unitPrice * netQty;
      const lineCost = item.costPrice * netQty;
      // net_quantity is generated — only update returned_quantity and line totals
      const { error: siErr } = await supabase.from('sale_items').update({
        returned_quantity: newReturnsQty,
        line_total: lineTotal,
        line_cost: lineCost,
        line_margin: lineTotal - lineCost,
      }).eq('sale_id', sale.id).eq('product_code', ret.productId);
      if (siErr) console.error(siErr);

      // Stock is restored by the DB trigger on sale_items returned_quantity UPDATE
    }

    await supabase.from('sales').update({
      total_amount: newTotals.netSales,
      total_cost: newTotals.totalCost,
      gross_margin: newTotals.grossMargin,
      status: nextStatus,
    }).eq('business_id', activeBusinessId).eq('id', sale.id);

    // For credit sales, reduce the customer's outstanding balance by the returned value
    if (inv.status === 'credit' && inv.customerId && inv.customerId !== 'walk-in') {
      const returnedValue = returns.reduce((sum, ret) => {
        const item = inv.items.find((i) => i.productId === ret.productId);
        return sum + (item ? item.unitPrice * ret.returnQty : 0);
      }, 0);
      const outstandingReduction = Math.min(inv.balanceDue, returnedValue);
      if (outstandingReduction > 0) {
        const { data: cust } = await supabase
          .from('customers').select('outstanding_balance').eq('business_id', activeBusinessId).eq('id', inv.customerId).single();
        if (cust) {
          await supabase.from('customers').update({
            outstanding_balance: Math.max(0, (cust.outstanding_balance ?? 0) - outstandingReduction),
          }).eq('business_id', activeBusinessId).eq('id', inv.customerId);
        }
      }
    }
  };

  const totalRevenue = invoices
    .filter((inv) => inv.status === 'completed')
    .reduce((sum, inv) => sum + inv.netSales, 0);

  const todayInvoices = invoices.filter((inv) => {
    const today = new Date().toISOString().split('T')[0];
    return inv.date === today && inv.status === 'completed';
  });

  const sales = invoices.map(toSaleRecord);

  return { invoices, sales, creditPayments, loading, addInvoice, refund, deleteInvoice, recordCreditPayment, markCreditAsPaid, processReturn, totalRevenue, todayInvoices };
}
