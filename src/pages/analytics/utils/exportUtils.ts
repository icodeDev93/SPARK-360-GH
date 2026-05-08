import type { SaleRecord } from '@/hooks/useSalesLog';
import type { ExpenseRecord, InventoryItem } from '@/types/erp';
import { inventoryItems } from '@/mocks/inventory';

// ─── CSV helpers ────────────────────────────────────────────────────────────

function escapeCSV(val: string | number): string {
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCSV(headers: string[], rows: (string | number)[][]): string {
  const lines = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ];
  return lines.join('\n');
}

function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sales CSV ───────────────────────────────────────────────────────────────

export function exportSalesCSV(sales: SaleRecord[], label: string): void {
  const completed = sales.filter((s) => s.status === 'completed');
  const headers = ['Receipt No', 'Date', 'Time', 'Cashier', 'Items', 'Subtotal (₵)', 'Tax (₵)', 'Discount (₵)', 'Grand Total (₵)', 'Payment Method', 'Status'];
  const rows = completed.map((s) => [
    s.receiptNo,
    s.date,
    s.time,
    s.cashier,
    s.items.map((i) => `${i.name} x${i.qty}`).join('; '),
    s.subtotal.toFixed(2),
    s.tax.toFixed(2),
    s.discountAmt.toFixed(2),
    s.grandTotal.toFixed(2),
    s.paymentMethod,
    s.status,
  ]);
  downloadCSV(`sales-report-${label}.csv`, buildCSV(headers, rows));
}

// ─── Products CSV ────────────────────────────────────────────────────────────

export function exportProductsCSV(sales: SaleRecord[], label: string): void {
  const completed = sales.filter((s) => s.status === 'completed');
  const map = new Map<number, { name: string; category: string; qty: number; revenue: number; cost: number; profit: number }>();

  completed.forEach((sale) => {
    sale.items.forEach((item) => {
      const inv = inventoryItems.find((i) => Number(i.itemId.replace(/\D/g, '')) === item.id);
      const cost = inv ? inv.costPrice * item.qty : 0;
      const revenue = item.price * item.qty;
      const existing = map.get(item.id);
      if (existing) {
        existing.qty += item.qty;
        existing.revenue += revenue;
        existing.cost += cost;
        existing.profit += revenue - cost;
      } else {
        map.set(item.id, {
          name: item.name,
          category: inv?.category || 'Other',
          qty: item.qty,
          revenue,
          cost,
          profit: revenue - cost,
        });
      }
    });
  });

  const headers = ['Product', 'Category', 'Qty Sold', 'Revenue (₵)', 'COGS (₵)', 'Gross Profit (₵)', 'Margin (%)'];
  const rows = Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .map((p) => [
      p.name,
      p.category,
      p.qty,
      p.revenue.toFixed(2),
      p.cost.toFixed(2),
      p.profit.toFixed(2),
      p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : '0.0',
    ]);

  downloadCSV(`products-report-${label}.csv`, buildCSV(headers, rows));
}

export function exportInventoryCSV(items: InventoryItem[], label: string): void {
  const headers = [
    'Product',
    'SKU',
    'Category',
    'Supplier',
    'Current Stock',
    'Reorder Level',
    'Cost Price (GHS)',
    'Selling Price (GHS)',
    'Stock Value (GHS)',
    'Margin (%)',
    'Status',
  ];
  const rows = items.map((item) => {
    const stockValue = item.costPrice * item.currentStock;
    const marginPct = item.sellingPrice > 0
      ? ((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100
      : 0;
    return [
      item.productName,
      item.sku,
      item.category,
      item.supplier,
      item.currentStock,
      item.reorderLevel,
      item.costPrice.toFixed(2),
      item.sellingPrice.toFixed(2),
      stockValue.toFixed(2),
      marginPct.toFixed(1),
      item.stockStatus,
    ];
  });
  downloadCSV(`inventory-report-${label}.csv`, buildCSV(headers, rows));
}

// ─── Expenses CSV ────────────────────────────────────────────────────────────

export function exportExpensesCSV(expenses: ExpenseRecord[], label: string): void {
  const headers = ['Description', 'Category', 'Amount (₵)', 'Date', 'Paid By', 'Notes'];
  const rows = expenses.map((e) => [
    e.description,
    e.category,
    e.amountGHS.toFixed(2),
    e.date,
    e.paidBy,
    e.notes,
  ]);
  downloadCSV(`expenses-report-${label}.csv`, buildCSV(headers, rows));
}

// ─── Profit Summary CSV ──────────────────────────────────────────────────────

export function exportProfitCSV(sales: SaleRecord[], expenses: ExpenseRecord[], label: string): void {
  const completed = sales.filter((s) => s.status === 'completed');
  const totalRevenue = completed.reduce((s, t) => s + t.grandTotal, 0);
  const totalCOGS = completed.reduce((sum, sale) => {
    return sum + sale.items.reduce((itemSum, item) => {
      const inv = inventoryItems.find((i) => Number(i.itemId.replace(/\D/g, '')) === item.id);
      return itemSum + (inv ? inv.costPrice * item.qty : 0);
    }, 0);
  }, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amountGHS, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpenses;

  const headers = ['Metric', 'Amount (₵)'];
  const rows: (string | number)[][] = [
    ['Total Revenue', totalRevenue.toFixed(2)],
    ['Cost of Goods Sold (COGS)', totalCOGS.toFixed(2)],
    ['Gross Profit', grossProfit.toFixed(2)],
    ['Gross Margin (%)', totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0'],
    ['Total Operating Expenses', totalExpenses.toFixed(2)],
    ['Net Profit', netProfit.toFixed(2)],
    ['Net Margin (%)', totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'],
  ];
  downloadCSV(`profit-summary-${label}.csv`, buildCSV(headers, rows));
}

// ─── PDF Print ───────────────────────────────────────────────────────────────

export function printAnalyticsPDF(tab: string, label: string): void {
  const printContent = document.getElementById('analytics-print-area');
  if (!printContent) return;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>SPark360 Analytics — ${tab} (${label})</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; padding: 32px; }
        h1 { font-size: 22px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
        .subtitle { font-size: 13px; color: #64748b; margin-bottom: 28px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
        .kpi-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
        .kpi-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 6px; }
        .kpi-value { font-size: 20px; font-weight: 700; color: #0f172a; font-family: monospace; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
        th { background: #f8fafc; text-align: left; padding: 10px 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; border-bottom: 1px solid #e2e8f0; }
        td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
        tfoot td { background: #f8fafc; font-weight: 700; color: #1e293b; border-top: 2px solid #e2e8f0; }
        .section-title { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 12px; margin-top: 24px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
        .badge-green { background: #dcfce7; color: #15803d; }
        .badge-amber { background: #fef9c3; color: #a16207; }
        .badge-red { background: #fee2e2; color: #b91c1c; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <h1>SPark360 Analytics Report</h1>
      <p class="subtitle">${tab} &nbsp;·&nbsp; Period: ${label} &nbsp;·&nbsp; Generated: ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
      ${printContent.innerHTML}
      <div class="footer">
        <span>SPark360 POS &amp; Inventory</span>
        <span>Confidential — Internal Use Only</span>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 400);
}
