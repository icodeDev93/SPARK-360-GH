import { useState, useEffect } from 'react';
import type { InvoiceRecord, SaleLineItem, PaymentMethod } from '@/types/erp';
import { generateNextInvoiceNo, buildInvoice, refundInvoice, calcLineItem, calcInvoiceTotals } from '@/services/salesService';
import { supabase } from '@/lib/supabase';

export type { InvoiceRecord, SaleLineItem, PaymentMethod };

export { calcLineItem };

export interface SaleRecord {
  receiptNo: string;
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
    items: [
      calcLineItem('P003', 'Milo Sachet (30g)', 100, 0, 4.00, 2.50),
      calcLineItem('P006', 'Bourbon Biscuits (150g)', 48, 0, 18.00, 12.00),
    ],
    netSales: 1264, totalCost: 826, grossMargin: 438,
    paymentMethod: 'MoMo', status: 'completed', cashier: 'Ama Owusu',
  },
  {
    invoiceNo: 'INV002', receiptNo: 'RCP-000002', date: '2026-04-21', customerId: 'C002', customerName: 'Mensah Superstore',
    items: [
      calcLineItem('P009', 'Malta Guinness (330ml)', 120, 0, 9.00, 5.50),
      calcLineItem('P001', 'Pringles Original (165g)', 24, 0, 42.00, 28.00),
    ],
    netSales: 2088, totalCost: 1332, grossMargin: 756,
    paymentMethod: 'Bank Transfer', status: 'completed', cashier: 'Kwame Mensah',
  },
  {
    invoiceNo: 'INV003', receiptNo: 'RCP-000003', date: '2026-04-22', customerId: 'C005', customerName: 'Boateng & Sons Dist.',
    items: [
      calcLineItem('P004', 'Ovaltine Tin (400g)', 30, 0, 65.00, 45.00),
      calcLineItem('P012', "Wrigley's Spearmint Gum (10s)", 200, 0, 5.00, 3.00),
    ],
    netSales: 2950, totalCost: 1950, grossMargin: 1000,
    paymentMethod: 'Cheque', status: 'completed', cashier: 'Ama Owusu',
  },
  {
    invoiceNo: 'INV004', receiptNo: 'RCP-000004', date: '2026-04-23', customerId: 'C003', customerName: 'Fatima Provision Store',
    items: [
      calcLineItem('P011', 'Table Water 500ml (Crate/24)', 10, 0, 48.00, 28.80),
      calcLineItem('P008', 'Choco Mallow (Pack of 6)', 20, 0, 14.00, 8.00),
    ],
    netSales: 760, totalCost: 448, grossMargin: 312,
    paymentMethod: 'Cash', status: 'refunded', cashier: 'Kwame Mensah',
  },
  {
    invoiceNo: 'INV005', receiptNo: 'RCP-000005', date: '2026-04-25', customerId: 'C007', customerName: 'Owusu Family Store',
    items: [
      calcLineItem('P015', 'Coca-Cola PET 500ml (Crate/24)', 20, 0, 120.00, 72.00),
      calcLineItem('P013', 'FanChoco Bar (50g)', 100, 0, 10.00, 6.00),
    ],
    netSales: 3400, totalCost: 2040, grossMargin: 1360,
    paymentMethod: 'Bank Transfer', status: 'completed', cashier: 'Ama Owusu',
  },
  {
    invoiceNo: 'INV006', receiptNo: 'RCP-000006', date: '2026-04-26', customerId: 'C004', customerName: 'Osei Kiosk Junction',
    items: [
      calcLineItem('P002', "Lay's Classic Chips (80g)", 12, 0, 22.00, 15.00),
      calcLineItem('P007', 'Kit Kat 4-Finger (41.5g)', 24, 0, 16.00, 10.00),
    ],
    netSales: 648, totalCost: 420, grossMargin: 228,
    paymentMethod: 'MoMo', status: 'completed', cashier: 'Kwame Mensah',
  },
];

type InvoiceRow = {
  id: string; receipt_number: string; sale_date: string;
  customer_id: string | null;
  customer_name: string; total_amount: number; total_cost: number; gross_margin: number;
  payment_method: string; status: string; cashier: string | null;
  items: string | null;
  sale_items: ItemRow[];
  receipts: ReceiptRow | ReceiptRow[] | null;
};

type ReceiptRow = {
  receipt_number: string;
};

type ItemRow = {
  product_code: string; product_name: string; quantity: number; returned_quantity: number | null;
  net_quantity: number | null; unit_price: number; unit_cost: number;
  line_total: number; line_cost: number; line_margin: number;
};

const toLineItem = (i: ItemRow): SaleLineItem => {
  const returnsQty = i.returned_quantity ?? 0;
  return {
    productId: i.product_code, productName: i.product_name, qty: i.quantity,
    returnsQty, netQty: i.net_quantity ?? (i.quantity - returnsQty),
    unitPrice: i.unit_price, costPrice: i.unit_cost,
    netSales: i.line_total, totalCost: i.line_cost, grossMargin: i.line_margin,
  };
};

const receiptNumberFromRow = (r: InvoiceRow): string => {
  if (Array.isArray(r.receipts)) return r.receipts[0]?.receipt_number ?? r.receipt_number;
  return r.receipts?.receipt_number ?? r.receipt_number;
};

const toInvoice = (r: InvoiceRow): InvoiceRecord => ({
  invoiceNo: r.receipt_number, receiptNo: receiptNumberFromRow(r),
  date: r.sale_date, customerId: r.customer_id ?? '',
  customerName: r.customer_name, netSales: r.total_amount, totalCost: r.total_cost,
  grossMargin: r.gross_margin, paymentMethod: r.payment_method as PaymentMethod,
  status: r.status as InvoiceRecord['status'], cashier: r.cashier ?? '',
  items: (r.sale_items ?? []).map(toLineItem),
});

const saleItemsText = (items: SaleLineItem[]): string =>
  items.map((it) => `${it.productName} [${it.netQty} pcs]`).join(', ');

const saleRow = (inv: InvoiceRecord) => ({
  receipt_number: inv.invoiceNo,
  sale_date: inv.date,
  customer_id: inv.customerId || null,
  customer_name: inv.customerName,
  items: saleItemsText(inv.items),
  subtotal: inv.netSales,
  total_amount: inv.netSales,
  total_cost: inv.totalCost,
  gross_margin: inv.grossMargin,
  payment_method: inv.paymentMethod,
  status: inv.status,
  cashier: inv.cashier,
});

const insertSale = async (inv: InvoiceRecord) => {
  const result = await supabase.from('sales').insert(saleRow(inv)).select('id').single();
  if (result.error?.code === '42703') {
    const { items: _items, customer_id: _cid, ...safeRow } = saleRow(inv) as Record<string, unknown>;
    return supabase.from('sales').insert(safeRow).select('id').single();
  }
  return result;
};

const insertSaleItems = async (saleId: string, items: SaleLineItem[]) => {
  const rows = saleItemRows(saleId, items);
  const { error } = await supabase.from('sale_items').insert(rows);
  if (error) console.error(error);
};

// net_quantity is a generated column (quantity - returned_quantity) — never write it
const saleItemRows = (saleId: string, items: SaleLineItem[]) => items.map((it) => ({
  sale_id: saleId,
  product_code: it.productId,
  product_name: it.productName,
  quantity: it.qty,
  returned_quantity: it.returnsQty,
  unit_price: it.unitPrice,
  unit_cost: it.costPrice,
  line_total: it.netSales,
  line_cost: it.totalCost,
  line_margin: it.grossMargin,
}));

const receiptRow = (saleId: string, inv: InvoiceRecord) => ({
  sale_id: saleId,
  receipt_number: inv.receiptNo,
  customer_name: inv.customerName,
  cashier: inv.cashier,
  subtotal: inv.netSales,
  total_amount: inv.netSales,
  payment_method: inv.paymentMethod,
  receipt_payload: inv,
});

const productNumber = (productId: string) => {
  const n = Number(productId.replace(/\D/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const toSaleRecord = (inv: InvoiceRecord): SaleRecord => ({
  receiptNo: inv.receiptNo,
  date: inv.date,
  time: '00:00',
  cashier: inv.cashier,
  items: inv.items.map((item) => ({
    id: productNumber(item.productId),
    code: item.productId,
    name: item.productName,
    price: item.unitPrice,
    qty: item.netQty,
  })),
  subtotal: inv.netSales,
  tax: 0,
  discountAmt: 0,
  grandTotal: inv.netSales,
  paymentMethod: inv.paymentMethod,
  status: inv.status,
});

export function useSalesLog() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSales = async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*, sale_items(*), receipts(receipt_number)')
        .order('sale_date', { ascending: false });
      if (error) { console.error(error); setLoading(false); return; }
      setInvoices(data ? data.map(toInvoice) : []);
      setLoading(false);
    };

    fetchSales();

    const channel = supabase
      .channel('sales-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, fetchSales)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_items' }, fetchSales)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receipts' }, fetchSales)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const addInvoice = (
    data: Omit<InvoiceRecord, 'invoiceNo' | 'date' | 'status' | 'netSales' | 'totalCost' | 'grossMargin'>
      & { status?: InvoiceRecord['status'] }
  ): InvoiceRecord => {
    const invoiceNo = generateNextInvoiceNo(invoices);
    const status = data.status ?? 'completed';
    const newInvoice = buildInvoice(
      invoiceNo, data.receiptNo, data.customerId, data.customerName,
      data.items, data.paymentMethod, data.cashier, status
    );
    // Optimistic update
    setInvoices((prev) => [newInvoice, ...prev]);
    // Background save
    insertSale(newInvoice).then(async ({ data: sale, error }) => {
      if (error) { console.error(error); return; }
      if (!sale) return;
      if (newInvoice.items.length > 0) {
        insertSaleItems(sale.id, newInvoice.items);
      }
      supabase.from('receipts').insert(receiptRow(sale.id, newInvoice))
        .then(({ error: e }) => { if (e) console.error(e); });
      // Stock deduction is handled by the DB trigger on sale_items INSERT
      // For credit sales, increase the customer's outstanding balance
      if (status === 'credit' && newInvoice.customerId && newInvoice.customerId !== 'walk-in') {
        const { data: cust } = await supabase
          .from('customers').select('outstanding_balance').eq('id', newInvoice.customerId).single();
        if (cust) {
          await supabase.from('customers').update({
            outstanding_balance: (cust.outstanding_balance ?? 0) + newInvoice.netSales,
          }).eq('id', newInvoice.customerId);
        }
      }
    });
    return newInvoice;
  };

  const refund = async (invoiceNo: string) => {
    setInvoices((prev) => prev.map((inv) =>
      inv.invoiceNo === invoiceNo ? refundInvoice(inv) : inv
    ));
    const { error } = await supabase.from('sales')
      .update({ status: 'refunded' }).eq('receipt_number', invoiceNo);
    if (error) console.error(error);
  };

  const deleteInvoice = async (invoiceNo: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.invoiceNo !== invoiceNo));
    const { data: sale } = await supabase.from('sales').select('id').eq('receipt_number', invoiceNo).single();
    if (sale) {
      await supabase.from('sale_items').delete().eq('sale_id', sale.id);
      await supabase.from('receipts').delete().eq('sale_id', sale.id);
    }
    const { error } = await supabase.from('sales').delete().eq('receipt_number', invoiceNo);
    if (error) console.error(error);
  };

  const markCreditAsPaid = async (invoiceNo: string, paymentMethod: Exclude<PaymentMethod, 'Credit'>) => {
    const inv = invoices.find((i) => i.invoiceNo === invoiceNo);
    if (!inv || inv.status !== 'credit') return;

    setInvoices((prev) => prev.map((i) =>
      i.invoiceNo === invoiceNo ? { ...i, status: 'completed' as const } : i
    ));

    const { error } = await supabase.from('sales')
      .update({ status: 'completed' }).eq('receipt_number', invoiceNo);
    if (error) { console.error(error); return; }

    if (inv.customerId && inv.customerId !== 'walk-in') {
      const { data: cust } = await supabase
        .from('customers').select('outstanding_balance').eq('id', inv.customerId).single();
      if (cust) {
        await supabase.from('customers').update({
          outstanding_balance: Math.max(0, (cust.outstanding_balance ?? 0) - inv.netSales),
        }).eq('id', inv.customerId);
      }
    }

    await supabase.from('credit_payments').insert({
      customer_id: inv.customerId || null,
      sale_id: invoiceNo,
      amount: inv.netSales,
      payment_method: paymentMethod,
      notes: `Full payment for credit sale ${invoiceNo}`,
    }).then(({ error: e }) => { if (e) console.error(e); });
  };

  const processReturn = async (invoiceNo: string, returns: { productId: string; returnQty: number }[]) => {
    const inv = invoices.find((i) => i.invoiceNo === invoiceNo);
    if (!inv) return;

    const updatedItems = inv.items.map((item) => {
      const ret = returns.find((r) => r.productId === item.productId);
      if (!ret || ret.returnQty <= 0) return item;
      const newReturnsQty = Math.min(item.qty, item.returnsQty + ret.returnQty);
      return calcLineItem(item.productId, item.productName, item.qty, newReturnsQty, item.unitPrice, item.costPrice);
    });

    const newTotals = calcInvoiceTotals(updatedItems);
    setInvoices((prev) => prev.map((i) =>
      i.invoiceNo === invoiceNo ? { ...i, items: updatedItems, ...newTotals } : i
    ));

    const { data: sale } = await supabase.from('sales').select('id').eq('receipt_number', invoiceNo).single();
    if (!sale) return;

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
    }).eq('id', sale.id);

    // For credit sales, reduce the customer's outstanding balance by the returned value
    if (inv.status === 'credit' && inv.customerId && inv.customerId !== 'walk-in') {
      const returnedValue = returns.reduce((sum, ret) => {
        const item = inv.items.find((i) => i.productId === ret.productId);
        return sum + (item ? item.unitPrice * ret.returnQty : 0);
      }, 0);
      if (returnedValue > 0) {
        const { data: cust } = await supabase
          .from('customers').select('outstanding_balance').eq('id', inv.customerId).single();
        if (cust) {
          await supabase.from('customers').update({
            outstanding_balance: Math.max(0, (cust.outstanding_balance ?? 0) - returnedValue),
          }).eq('id', inv.customerId);
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

  return { invoices, sales, loading, addInvoice, refund, deleteInvoice, markCreditAsPaid, processReturn, totalRevenue, todayInvoices };
}
