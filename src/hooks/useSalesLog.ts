import { useState, useEffect } from 'react';
import type { InvoiceRecord, SaleLineItem, PaymentMethod } from '@/types/erp';
import { generateNextInvoiceNo, buildInvoice, refundInvoice, calcLineItem } from '@/services/salesService';
import { supabase } from '@/lib/supabase';

export type { InvoiceRecord, SaleLineItem, PaymentMethod };

export { calcLineItem };

const SEED_INVOICES: InvoiceRecord[] = [
  {
    invoiceNo: 'INV001', date: '2026-04-20', customerId: 'C001', customerName: 'Asante Mini Mart',
    items: [
      calcLineItem('P003', 'Milo Sachet (30g)', 100, 0, 4.00, 2.50),
      calcLineItem('P006', 'Bourbon Biscuits (150g)', 48, 0, 18.00, 12.00),
    ],
    netSales: 1264, totalCost: 826, grossMargin: 438,
    paymentMethod: 'MoMo', status: 'completed', cashier: 'Ama Owusu',
  },
  {
    invoiceNo: 'INV002', date: '2026-04-21', customerId: 'C002', customerName: 'Mensah Superstore',
    items: [
      calcLineItem('P009', 'Malta Guinness (330ml)', 120, 0, 9.00, 5.50),
      calcLineItem('P001', 'Pringles Original (165g)', 24, 0, 42.00, 28.00),
    ],
    netSales: 2088, totalCost: 1332, grossMargin: 756,
    paymentMethod: 'Bank Transfer', status: 'completed', cashier: 'Kwame Mensah',
  },
  {
    invoiceNo: 'INV003', date: '2026-04-22', customerId: 'C005', customerName: 'Boateng & Sons Dist.',
    items: [
      calcLineItem('P004', 'Ovaltine Tin (400g)', 30, 0, 65.00, 45.00),
      calcLineItem('P012', "Wrigley's Spearmint Gum (10s)", 200, 0, 5.00, 3.00),
    ],
    netSales: 2950, totalCost: 1950, grossMargin: 1000,
    paymentMethod: 'Cheque', status: 'completed', cashier: 'Ama Owusu',
  },
  {
    invoiceNo: 'INV004', date: '2026-04-23', customerId: 'C003', customerName: 'Fatima Provision Store',
    items: [
      calcLineItem('P011', 'Table Water 500ml (Crate/24)', 10, 0, 48.00, 28.80),
      calcLineItem('P008', 'Choco Mallow (Pack of 6)', 20, 0, 14.00, 8.00),
    ],
    netSales: 760, totalCost: 448, grossMargin: 312,
    paymentMethod: 'Cash', status: 'refunded', cashier: 'Kwame Mensah',
  },
  {
    invoiceNo: 'INV005', date: '2026-04-25', customerId: 'C007', customerName: 'Owusu Family Store',
    items: [
      calcLineItem('P015', 'Coca-Cola PET 500ml (Crate/24)', 20, 0, 120.00, 72.00),
      calcLineItem('P013', 'FanChoco Bar (50g)', 100, 0, 10.00, 6.00),
    ],
    netSales: 3400, totalCost: 2040, grossMargin: 1360,
    paymentMethod: 'Bank Transfer', status: 'completed', cashier: 'Ama Owusu',
  },
  {
    invoiceNo: 'INV006', date: '2026-04-26', customerId: 'C004', customerName: 'Osei Kiosk Junction',
    items: [
      calcLineItem('P002', "Lay's Classic Chips (80g)", 12, 0, 22.00, 15.00),
      calcLineItem('P007', 'Kit Kat 4-Finger (41.5g)', 24, 0, 16.00, 10.00),
    ],
    netSales: 648, totalCost: 420, grossMargin: 228,
    paymentMethod: 'MoMo', status: 'completed', cashier: 'Kwame Mensah',
  },
];

type InvoiceRow = {
  invoice_no: string; date: string; customer_id: string; customer_name: string;
  net_sales: number; total_cost: number; gross_margin: number;
  payment_method: string; status: string; cashier: string;
  invoice_items: ItemRow[];
};

type ItemRow = {
  product_id: string; product_name: string; qty: number; returns_qty: number;
  net_qty: number; unit_price: number; cost_price: number;
  net_sales: number; total_cost: number; gross_margin: number;
};

const toInvoice = (r: InvoiceRow): InvoiceRecord => ({
  invoiceNo: r.invoice_no, date: r.date, customerId: r.customer_id,
  customerName: r.customer_name, netSales: r.net_sales, totalCost: r.total_cost,
  grossMargin: r.gross_margin, paymentMethod: r.payment_method as PaymentMethod,
  status: r.status as InvoiceRecord['status'], cashier: r.cashier,
  items: (r.invoice_items ?? []).map((i) => ({
    productId: i.product_id, productName: i.product_name, qty: i.qty,
    returnsQty: i.returns_qty, netQty: i.net_qty, unitPrice: i.unit_price,
    costPrice: i.cost_price, netSales: i.net_sales, totalCost: i.total_cost,
    grossMargin: i.gross_margin,
  })),
});

export function useSalesLog() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .order('date', { ascending: false });
      if (error) { console.error(error); setLoading(false); return; }

      if (!data || data.length === 0) {
        // Seed invoices then items
        for (const inv of SEED_INVOICES) {
          await supabase.from('invoices').insert({
            invoice_no: inv.invoiceNo, date: inv.date, customer_id: inv.customerId,
            customer_name: inv.customerName, net_sales: inv.netSales,
            total_cost: inv.totalCost, gross_margin: inv.grossMargin,
            payment_method: inv.paymentMethod, status: inv.status, cashier: inv.cashier,
          });
          if (inv.items.length > 0) {
            await supabase.from('invoice_items').insert(inv.items.map((it) => ({
              invoice_no: inv.invoiceNo, product_id: it.productId, product_name: it.productName,
              qty: it.qty, returns_qty: it.returnsQty, net_qty: it.netQty,
              unit_price: it.unitPrice, cost_price: it.costPrice,
              net_sales: it.netSales, total_cost: it.totalCost, gross_margin: it.grossMargin,
            })));
          }
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
      invoiceNo, data.customerId, data.customerName,
      data.items, data.paymentMethod, data.cashier
    );
    // Optimistic update
    setInvoices((prev) => [newInvoice, ...prev]);
    // Background save
    supabase.from('invoices').insert({
      invoice_no: newInvoice.invoiceNo, date: newInvoice.date,
      customer_id: newInvoice.customerId, customer_name: newInvoice.customerName,
      net_sales: newInvoice.netSales, total_cost: newInvoice.totalCost,
      gross_margin: newInvoice.grossMargin, payment_method: newInvoice.paymentMethod,
      status: newInvoice.status, cashier: newInvoice.cashier,
    }).then(({ error }) => {
      if (error) { console.error(error); return; }
      if (newInvoice.items.length > 0) {
        supabase.from('invoice_items').insert(newInvoice.items.map((it) => ({
          invoice_no: newInvoice.invoiceNo, product_id: it.productId, product_name: it.productName,
          qty: it.qty, returns_qty: it.returnsQty, net_qty: it.netQty,
          unit_price: it.unitPrice, cost_price: it.costPrice,
          net_sales: it.netSales, total_cost: it.totalCost, gross_margin: it.grossMargin,
        }))).then(({ error: e }) => { if (e) console.error(e); });
      }
    });
    return newInvoice;
  };

  const refund = async (invoiceNo: string) => {
    setInvoices((prev) => prev.map((inv) =>
      inv.invoiceNo === invoiceNo ? refundInvoice(inv) : inv
    ));
    const { error } = await supabase.from('invoices')
      .update({ status: 'refunded' }).eq('invoice_no', invoiceNo);
    if (error) console.error(error);
  };

  const totalRevenue = invoices
    .filter((inv) => inv.status === 'completed')
    .reduce((sum, inv) => sum + inv.netSales, 0);

  const todayInvoices = invoices.filter((inv) => {
    const today = new Date().toISOString().split('T')[0];
    return inv.date === today && inv.status === 'completed';
  });

  return { invoices, loading, addInvoice, refund, totalRevenue, todayInvoices };
}
