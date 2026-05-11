import { useState, useEffect } from 'react';
import type { InvoiceRecord, SaleLineItem, PaymentMethod } from '@/types/erp';
import { generateNextInvoiceNo, buildInvoice, refundInvoice, calcLineItem } from '@/services/salesService';
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
  product_code: string; product_name: string; quantity: number; returned_quantity: number;
  net_quantity: number; unit_price: number; unit_cost: number;
  line_total: number; line_cost: number; line_margin: number;
};

const toLineItem = (i: ItemRow): SaleLineItem => ({
  productId: i.product_code, productName: i.product_name, qty: i.quantity,
  returnsQty: i.returned_quantity, netQty: i.net_quantity, unitPrice: i.unit_price,
  costPrice: i.unit_cost, netSales: i.line_total, totalCost: i.line_cost,
  grossMargin: i.line_margin,
});

const receiptNumberFromRow = (r: InvoiceRow): string => {
  if (Array.isArray(r.receipts)) return r.receipts[0]?.receipt_number ?? r.receipt_number;
  return r.receipts?.receipt_number ?? r.receipt_number;
};

const toInvoice = (r: InvoiceRow): InvoiceRecord => ({
  invoiceNo: r.receipt_number, receiptNo: receiptNumberFromRow(r),
  date: r.sale_date, customerId: '',
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

const saleRowWithoutItems = (inv: InvoiceRecord) => {
  const { items: _items, ...row } = saleRow(inv);
  return row;
};

const insertSale = async (inv: InvoiceRecord) => {
  const result = await supabase.from('sales').insert(saleRow(inv)).select('id').single();
  if (result.error?.code === '42703' && result.error.message.includes('items')) {
    return supabase.from('sales').insert(saleRowWithoutItems(inv)).select('id').single();
  }
  return result;
};

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
    (async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*, sale_items(*), receipts(receipt_number)')
        .order('sale_date', { ascending: false });
      if (error) { console.error(error); setLoading(false); return; }

      if (!data || data.length === 0) {
        // Seed invoices then items
        for (const inv of SEED_INVOICES) {
          const { data: sale, error: saleError } = await insertSale(inv);
          if (saleError || !sale) { console.error(saleError); continue; }
          if (inv.items.length > 0) {
            await supabase.from('sale_items').insert(saleItemRows(sale.id, inv.items));
          }
          await supabase.from('receipts').insert(receiptRow(sale.id, inv));
        }
        setInvoices(SEED_INVOICES);
      } else {
        setInvoices(data.map(toInvoice));
      }
      setLoading(false);
    })();
  }, []);

  const addInvoice = (
    data: Omit<InvoiceRecord, 'invoiceNo' | 'date' | 'status' | 'netSales' | 'totalCost' | 'grossMargin'>
  ): InvoiceRecord => {
    const invoiceNo = generateNextInvoiceNo(invoices);
    const newInvoice = buildInvoice(
      invoiceNo, data.receiptNo, data.customerId, data.customerName,
      data.items, data.paymentMethod, data.cashier
    );
    // Optimistic update
    setInvoices((prev) => [newInvoice, ...prev]);
    // Background save
    insertSale(newInvoice).then(({ data: sale, error }) => {
      if (error) { console.error(error); return; }
      if (!sale) return;
      if (newInvoice.items.length > 0) {
        supabase.from('sale_items').insert(saleItemRows(sale.id, newInvoice.items))
          .then(({ error: e }) => { if (e) console.error(e); });
      }
      supabase.from('receipts').insert(receiptRow(sale.id, newInvoice))
        .then(({ error: e }) => { if (e) console.error(e); });
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

  const totalRevenue = invoices
    .filter((inv) => inv.status === 'completed')
    .reduce((sum, inv) => sum + inv.netSales, 0);

  const todayInvoices = invoices.filter((inv) => {
    const today = new Date().toISOString().split('T')[0];
    return inv.date === today && inv.status === 'completed';
  });

  const sales = invoices.map(toSaleRecord);

  return { invoices, sales, loading, addInvoice, refund, totalRevenue, todayInvoices };
}
