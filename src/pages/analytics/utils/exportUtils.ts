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

export function printAnalyticsPDF(
  tab: string,
  tabKey: string,
  label: string,
  sales: SaleRecord[],
  expenses: ExpenseRecord[],
  liveItems?: InventoryItem[],
): void {
  const win = window.open('', '_blank', 'width=1050,height=820');
  if (!win) return;

  // ── Computed metrics ─────────────────────────────────────────────────────
  const completed = sales.filter((s) => s.status === 'completed');
  const totalRevenue  = completed.reduce((s, t) => s + t.grandTotal, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amountGHS, 0);
  const totalCOGS = completed.reduce((sum, sale) =>
    sum + sale.items.reduce((is, item) => {
      const inv = inventoryItems.find((i) => Number(i.itemId.replace(/\D/g, '')) === item.id);
      return is + (inv ? inv.costPrice * item.qty : 0);
    }, 0), 0);
  const grossProfit = totalRevenue - totalCOGS;
  const netProfit   = grossProfit - totalExpenses;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netMargin   = totalRevenue > 0 ? (netProfit  / totalRevenue) * 100 : 0;

  // Daily revenue (last 14 days)
  const dailyMap = new Map<string, number>();
  completed.forEach((s) => { dailyMap.set(s.date, (dailyMap.get(s.date) || 0) + s.grandTotal); });
  const dailyRevenue = Array.from(dailyMap.entries())
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-14);

  // Top products
  const productMap = new Map<number, { name: string; qty: number; revenue: number; cost: number }>();
  completed.forEach((sale) => {
    sale.items.forEach((item) => {
      const inv = inventoryItems.find((i) => Number(i.itemId.replace(/\D/g, '')) === item.id);
      const cost = inv ? inv.costPrice * item.qty : 0;
      const rev  = item.price * item.qty;
      const e = productMap.get(item.id);
      if (e) { e.qty += item.qty; e.revenue += rev; e.cost += cost; }
      else    { productMap.set(item.id, { name: item.name, qty: item.qty, revenue: rev, cost }); }
    });
  });
  const topProducts = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);

  // Expense by category
  const expMap: Record<string, number> = {};
  expenses.forEach((e) => { expMap[e.category] = (expMap[e.category] || 0) + e.amountGHS; });
  const expByCategory = Object.entries(expMap)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Payment methods
  const pmMap: Record<string, { amount: number; count: number }> = {};
  completed.forEach((s) => {
    if (!pmMap[s.paymentMethod]) pmMap[s.paymentMethod] = { amount: 0, count: 0 };
    pmMap[s.paymentMethod].amount += s.grandTotal;
    pmMap[s.paymentMethod].count  += 1;
  });
  const paymentMethods = Object.entries(pmMap)
    .map(([method, d]) => ({ method, ...d }))
    .sort((a, b) => b.amount - a.amount);

  // Cashier performance
  const cashMap: Record<string, { revenue: number; count: number }> = {};
  completed.forEach((s) => {
    if (!cashMap[s.cashier]) cashMap[s.cashier] = { revenue: 0, count: 0 };
    cashMap[s.cashier].revenue += s.grandTotal;
    cashMap[s.cashier].count  += 1;
  });
  const cashierPerf = Object.entries(cashMap)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.revenue - a.revenue);

  // Inventory items to use
  const invItems = liveItems && liveItems.length > 0 ? liveItems : inventoryItems;

  // ── Format helpers ───────────────────────────────────────────────────────
  const C = '₵';
  const fmt = (n: number) =>
    `${C}${Math.abs(n).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtS = (n: number) => {
    if (n >= 1_000_000) return `${C}${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${C}${(n / 1_000).toFixed(1)}k`;
    return `${C}${n.toFixed(0)}`;
  };
  const sd  = (s: string) => {
    try { return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
    catch { return s; }
  };
  const pct = (a: number, b: number) => b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '—';

  // ── SVG bar chart ────────────────────────────────────────────────────────
  function barChart(data: { label: string; value: number }[], color: string, h = 200): string {
    if (!data.length) return '<p style="font-size:12px;color:#94a3b8;padding:20px 0;text-align:center;">No data for this period</p>';
    const W = 680, H = h;
    const PL = 56, PR = 14, PT = 28, PB = 34;
    const cW = W - PL - PR, cH = H - PT - PB;
    const max = Math.max(...data.map((d) => d.value), 1);
    const step = cW / data.length;
    const bW = Math.max(10, Math.min(40, step - 6));

    let out = `<svg width="${W}" height="${H}" style="display:block;max-width:100%;overflow:visible;">`;
    // Gridlines + y-axis labels
    for (let i = 0; i <= 4; i++) {
      const y = PT + cH - (i / 4) * cH;
      out += `<line x1="${PL}" y1="${y.toFixed(1)}" x2="${(W - PR).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${i === 0 ? '#cbd5e1' : '#f1f5f9'}" stroke-width="${i === 0 ? 1.5 : 1}"/>`;
      out += `<text x="${(PL - 5).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="9" fill="#94a3b8" font-family="Arial,Helvetica,sans-serif">${fmtS((i / 4) * max)}</text>`;
    }
    // Bars + x-labels
    data.forEach((d, i) => {
      const bH   = Math.max((d.value / max) * cH, 2);
      const x    = PL + i * step + (step - bW) / 2;
      const y    = PT + cH - bH;
      out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bW.toFixed(1)}" height="${bH.toFixed(1)}" fill="${color}" rx="3" opacity="0.88"/>`;
      if (bH > 22 && bW > 18)
        out += `<text x="${(x + bW / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" font-size="8" fill="${color}" font-family="Arial" font-weight="700">${fmtS(d.value)}</text>`;
      out += `<text x="${(x + bW / 2).toFixed(1)}" y="${(H - 3).toFixed(1)}" text-anchor="middle" font-size="8" fill="#64748b" font-family="Arial,Helvetica,sans-serif">${d.label}</text>`;
    });
    out += '</svg>';
    return out;
  }

  // ── Shared style tokens ──────────────────────────────────────────────────
  const TH  = `padding:9px 12px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;background:#f8fafc;border-bottom:1px solid #e2e8f0;white-space:nowrap;`;
  const THR = `${TH}text-align:right;`;
  const THC = `${TH}text-align:center;`;
  const TD  = `padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#334155;font-size:12px;`;
  const TDR = `${TD}text-align:right;`;
  const TDC = `${TD}text-align:center;`;
  const SEC = `background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:22px;`;
  const SH  = `padding:14px 20px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;`;

  // ── Component builders ───────────────────────────────────────────────────
  function kpi(lbl: string, val: string, sub: string, accent: string): string {
    return `<div style="flex:1;min-width:130px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;border-left:4px solid ${accent};">
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;margin-bottom:5px;">${lbl}</div>
      <div style="font-size:21px;font-weight:800;color:#0f172a;font-family:'Courier New',Courier,monospace;line-height:1.1;">${val}</div>
      <div style="font-size:11px;color:#64748b;margin-top:5px;">${sub}</div>
    </div>`;
  }

  function badge(text: string, bg: string, color: string): string {
    return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:${bg};color:${color};">${text}</span>`;
  }

  function marginBadge(m: number): string {
    return m >= 40
      ? badge(`${m.toFixed(1)}%`, '#dcfce7', '#15803d')
      : m >= 20
      ? badge(`${m.toFixed(1)}%`, '#fef9c3', '#a16207')
      : badge(`${m.toFixed(1)}%`, '#fee2e2', '#b91c1c');
  }

  function statusBadge(s: string): string {
    return s === 'OK'
      ? badge('In Stock', '#dcfce7', '#15803d')
      : s === 'LOW'
      ? badge('Low Stock', '#fef9c3', '#a16207')
      : badge('Out of Stock', '#fee2e2', '#b91c1c');
  }

  // P&L income-statement row
  function plRow(
    lbl: string, val: string, bold = false, color = '#334155',
    topBorder = false, indent = false, muted = false,
  ): string {
    const bg = bold
      ? (color === '#059669' ? '#f0fdf4' : color === '#e11d48' ? '#fff1f2' : '#f8fafc')
      : 'transparent';
    const fs   = bold ? '13px' : '12px';
    const fw   = bold ? '700' : indent ? '400' : '500';
    const tc   = muted ? '#94a3b8' : bold ? color : '#334155';
    const topB = topBorder ? 'border-top:2px solid #e2e8f0;' : '';
    const pl   = indent ? 'padding-left:36px;' : '';
    return `<tr style="background:${bg};">
      <td style="padding:10px 20px;font-size:${fs};font-weight:${fw};color:${tc};border-bottom:1px solid #f1f5f9;${topB}${pl}">${lbl}</td>
      <td style="padding:10px 20px;text-align:right;font-size:${fs};font-weight:${bold ? '800' : '600'};font-family:'Courier New',Courier,monospace;color:${color};border-bottom:1px solid #f1f5f9;${topB}">${val}</td>
    </tr>`;
  }

  // ── Tab detection ────────────────────────────────────────────────────────
  const isOverview  = tabKey === 'overview' || tabKey === 'sales';
  const isProfit    = tabKey === 'profit';
  const isProducts  = tabKey === 'products' || tabKey === 'top-products' || tabKey === 'product-report';
  const isCustomers = tabKey === 'customers' || tabKey === 'top-customers' || tabKey === 'customer-report';
  const isInventory = tabKey === 'inventory' || tabKey === 'stock-report';

  const now = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });
  let body = '';

  // ══════════════════════════════════════════════════════════════════════════
  // OVERVIEW / SALES
  // ══════════════════════════════════════════════════════════════════════════
  if (isOverview) {
    body += `
    <div style="display:flex;gap:12px;margin-bottom:22px;flex-wrap:wrap;">
      ${kpi('Total Revenue',  fmt(totalRevenue),  `${completed.length} completed sales`,             '#4f46e5')}
      ${kpi('Total Expenses', fmt(totalExpenses), `${expenses.length} expense records`,              '#e11d48')}
      ${kpi('Net Profit',     fmt(netProfit),     `Margin: ${netMargin.toFixed(1)}%`,                netProfit >= 0 ? '#059669' : '#e11d48')}
      ${kpi('Avg. Sale',      fmt(completed.length > 0 ? totalRevenue / completed.length : 0), 'Per transaction', '#d97706')}
    </div>

    ${dailyRevenue.length > 0 ? `
    <div style="${SEC}">
      <div style="${SH}">
        <h3 style="font-size:13px;font-weight:700;color:#1e293b;margin:0;">Daily Revenue Trend</h3>
        <span style="font-size:11px;color:#64748b;">${label} · ${dailyRevenue.length} data points</span>
      </div>
      <div style="padding:16px 20px;">${barChart(dailyRevenue.map((d) => ({ label: sd(d.date), value: d.revenue })), '#4f46e5', 200)}</div>
    </div>` : ''}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:22px;">

      <div style="${SEC}margin-bottom:0;">
        <div style="${SH}"><h3 style="font-size:13px;font-weight:700;color:#1e293b;margin:0;">Payment Methods</h3></div>
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr><th style="${TH}">Method</th><th style="${THC}">Sales</th><th style="${THR}">Revenue</th><th style="${THR}">Share</th></tr></thead>
          <tbody>
            ${paymentMethods.map((p, i) => `
            <tr style="background:${i % 2 ? '#fafafa' : '#fff'};">
              <td style="${TD}font-weight:600;">${p.method}</td>
              <td style="${TDC}">${p.count}</td>
              <td style="${TDR}font-weight:700;font-family:'Courier New',monospace;color:#4f46e5;">${fmt(p.amount)}</td>
              <td style="${TDR}color:#64748b;">${pct(p.amount, totalRevenue)}</td>
            </tr>`).join('')}
          </tbody>
          <tfoot><tr style="background:#f8fafc;border-top:2px solid #e2e8f0;">
            <td style="${TD}font-weight:700;color:#1e293b;" colspan="2">Total</td>
            <td style="${TDR}font-weight:800;font-family:'Courier New',monospace;color:#4f46e5;">${fmt(totalRevenue)}</td>
            <td style="${TDR}font-weight:700;">100%</td>
          </tr></tfoot>
        </table>
      </div>

      <div style="${SEC}margin-bottom:0;">
        <div style="${SH}"><h3 style="font-size:13px;font-weight:700;color:#1e293b;margin:0;">Financial Summary</h3></div>
        <table style="width:100%;border-collapse:collapse;">
          <tbody>
            ${[
              ['Revenue',                 fmt(totalRevenue),  '#4f46e5', false],
              ['Cost of Goods (COGS)',    `(${fmt(totalCOGS)})`, '#64748b', false],
              ['Gross Profit',            fmt(grossProfit),   '#059669', true],
              ['Operating Expenses',      `(${fmt(totalExpenses)})`, '#64748b', false],
              ['Net Profit',              fmt(netProfit),     netProfit >= 0 ? '#059669' : '#e11d48', true],
              ['Gross Margin %',          `${grossMargin.toFixed(1)}%`, '#64748b', false],
              ['Net Margin %',            `${netMargin.toFixed(1)}%`,   netProfit >= 0 ? '#059669' : '#e11d48', false],
            ].map(([l, v, c, b]) => `
            <tr style="background:${b ? '#f8fafc' : '#fff'};">
              <td style="${TD}font-weight:${b ? 700 : 500};color:${b ? '#1e293b' : '#334155'};">${l}</td>
              <td style="${TDR}font-weight:${b ? 800 : 600};font-family:'Courier New',monospace;color:${c};">${v}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>

    </div>

    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:22px;">
      ${[
        ['Completed',   `${completed.length}`,                                                                '#4f46e5'],
        ['Refunded',    `${sales.filter((s) => s.status === 'refunded').length}`,                             '#e11d48'],
        ['Units Sold',  `${completed.reduce((s, t) => s + t.items.reduce((is, it) => is + it.qty, 0), 0)}`,  '#7c3aed'],
        ['Gross Margin',`${grossMargin.toFixed(1)}%`,                                                         '#059669'],
        ['Net Margin',  `${netMargin.toFixed(1)}%`,                                                           netProfit >= 0 ? '#059669' : '#e11d48'],
      ].map(([l, v, c]) => `
      <div style="flex:1;min-width:90px;text-align:center;padding:14px 10px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
        <div style="font-size:21px;font-weight:800;color:${c};font-family:'Courier New',monospace;">${v}</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:5px;text-transform:uppercase;letter-spacing:0.05em;">${l}</div>
      </div>`).join('')}
    </div>

    ${cashierPerf.length > 0 ? `
    <div style="${SEC}">
      <div style="${SH}">
        <h3 style="font-size:13px;font-weight:700;color:#1e293b;margin:0;">Sales by Cashier</h3>
        <span style="font-size:11px;color:#64748b;">${cashierPerf.length} cashier${cashierPerf.length !== 1 ? 's' : ''}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr>
          <th style="${TH}">Cashier</th><th style="${THC}">Transactions</th>
          <th style="${THR}">Revenue</th><th style="${THR}">Avg. Sale</th><th style="${THR}">Share</th>
        </tr></thead>
        <tbody>
          ${cashierPerf.map((c, i) => `
          <tr style="background:${i % 2 ? '#fafafa' : '#fff'};">
            <td style="${TD}font-weight:600;">${c.name}</td>
            <td style="${TDC}">${c.count}</td>
            <td style="${TDR}font-weight:700;font-family:'Courier New',monospace;color:#4f46e5;">${fmt(c.revenue)}</td>
            <td style="${TDR}font-family:'Courier New',monospace;color:#64748b;">${fmt(c.count > 0 ? c.revenue / c.count : 0)}</td>
            <td style="${TDR}color:#64748b;">${pct(c.revenue, totalRevenue)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}`;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PROFIT & LOSS
  // ══════════════════════════════════════════════════════════════════════════
  if (isProfit) {
    body += `
    <div style="display:flex;gap:12px;margin-bottom:22px;flex-wrap:wrap;">
      ${kpi('Total Revenue', fmt(totalRevenue), `${completed.length} transactions`, '#4f46e5')}
      ${kpi('COGS',          fmt(totalCOGS),    `Ratio: ${pct(totalCOGS, totalRevenue)}`,     '#f97316')}
      ${kpi('Gross Profit',  fmt(grossProfit),  `Margin: ${grossMargin.toFixed(1)}%`,          '#059669')}
      ${kpi('Net Profit',    fmt(netProfit),    `Margin: ${netMargin.toFixed(1)}%`,            netProfit >= 0 ? '#059669' : '#e11d48')}
    </div>

    <div style="${SEC}">
      <div style="background:#0f172a;padding:15px 20px;">
        <div style="font-size:12px;font-weight:700;color:#fff;letter-spacing:0.06em;text-transform:uppercase;">Income Statement</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:3px;">Period: ${label}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>
          ${plRow('Revenue',                         fmt(totalRevenue),    false, '#4f46e5')}
          ${plRow('Cost of Goods Sold (COGS)',        `(${fmt(totalCOGS)})`, false, '#64748b')}
          ${plRow('GROSS PROFIT',                    fmt(grossProfit),     true,  grossProfit >= 0 ? '#059669' : '#e11d48', true)}
          ${plRow('Gross Margin',                    `${grossMargin.toFixed(2)}%`, false, '#64748b', false, true, true)}
          <tr><td colspan="2" style="padding:2px;background:#f8fafc;"></td></tr>
          ${plRow('Operating Expenses',              `(${fmt(totalExpenses)})`, false, '#64748b')}
          ${expByCategory.map((e) => plRow(e.category, `(${fmt(e.amount)})`, false, '#94a3b8', false, true, true)).join('')}
          ${plRow('NET PROFIT',                      fmt(netProfit),       true,  netProfit >= 0 ? '#059669' : '#e11d48', true)}
          ${plRow('Net Margin',                      `${netMargin.toFixed(2)}%`, false, '#64748b', false, true, true)}
        </tbody>
      </table>
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:22px;">

      ${dailyRevenue.length > 0 ? `
      <div style="${SEC}margin-bottom:0;">
        <div style="${SH}">
          <h3 style="font-size:13px;font-weight:700;color:#1e293b;margin:0;">Revenue Trend</h3>
          <span style="font-size:11px;color:#64748b;">${label}</span>
        </div>
        <div style="padding:16px 20px;">${barChart(dailyRevenue.map((d) => ({ label: sd(d.date), value: d.revenue })), '#4f46e5', 180)}</div>
      </div>` : '<div></div>'}

      <div style="${SEC}margin-bottom:0;">
        <div style="${SH}"><h3 style="font-size:13px;font-weight:700;color:#1e293b;margin:0;">Expense Breakdown</h3></div>
        <div style="padding:16px 20px;">
          ${expByCategory.length === 0
            ? '<p style="font-size:12px;color:#94a3b8;text-align:center;padding:20px 0;">No expenses</p>'
            : expByCategory.map((e, i) => {
                const COLORS = ['#4f46e5','#e11d48','#059669','#d97706','#7c3aed','#0891b2','#ea580c','#0f766e'];
                const c = COLORS[i % COLORS.length];
                const w = totalExpenses > 0 ? (e.amount / totalExpenses) * 100 : 0;
                return `
                <div style="margin-bottom:11px;">
                  <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">
                    <span style="color:#334155;font-weight:600;">${e.category}</span>
                    <span style="color:#64748b;font-family:'Courier New',monospace;">${fmt(e.amount)}</span>
                  </div>
                  <div style="width:100%;height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden;">
                    <div style="width:${w.toFixed(1)}%;height:100%;background:${c};border-radius:4px;"></div>
                  </div>
                  <div style="font-size:10px;color:#94a3b8;margin-top:2px;">${w.toFixed(0)}% of total</div>
                </div>`;
              }).join('')}
        </div>
      </div>

    </div>

    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      ${[
        ['Gross Margin',  `${grossMargin.toFixed(1)}%`, 'Revenue − COGS',    grossMargin >= 30 ? '#059669' : grossMargin >= 15 ? '#d97706' : '#e11d48'],
        ['Net Margin',    `${netMargin.toFixed(1)}%`,   'After all costs',   netMargin   >= 15 ? '#059669' : netMargin   >= 5  ? '#d97706' : '#e11d48'],
        ['Expense Ratio', `${pct(totalExpenses, totalRevenue)}`, 'Expenses ÷ Revenue', '#64748b'],
        ['COGS Ratio',    `${pct(totalCOGS,     totalRevenue)}`, 'COGS ÷ Revenue',     '#64748b'],
      ].map(([l, v, s, c]) => kpi(l as string, v as string, s as string, c as string)).join('')}
    </div>`;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRODUCTS
  // ══════════════════════════════════════════════════════════════════════════
  if (isProducts) {
    const totalUnits = completed.reduce((s, t) => s + t.items.reduce((is, it) => is + it.qty, 0), 0);
    body += `
    <div style="display:flex;gap:12px;margin-bottom:22px;flex-wrap:wrap;">
      ${kpi('Total Revenue', fmt(totalRevenue), `From ${topProducts.length} products`, '#4f46e5')}
      ${kpi('Gross Profit',  fmt(grossProfit),  `Margin: ${grossMargin.toFixed(1)}%`,  '#059669')}
      ${kpi('Top Product',   topProducts[0]?.name.split(' ').slice(0, 2).join(' ') || '—', topProducts[0] ? `${fmt(topProducts[0].revenue)} revenue` : '—', '#7c3aed')}
      ${kpi('Units Sold',    `${totalUnits}`,   'Total units',                          '#d97706')}
    </div>

    ${topProducts.length > 0 ? `
    <div style="${SEC}">
      <div style="${SH}">
        <h3 style="font-size:13px;font-weight:700;color:#1e293b;margin:0;">Revenue by Product — Top 10</h3>
        <span style="font-size:11px;color:#64748b;">${label}</span>
      </div>
      <div style="padding:16px 20px;">
        ${barChart(topProducts.slice(0, 10).map((p) => ({ label: p.name.split(' ').slice(0, 2).join(' '), value: p.revenue })), '#7c3aed', 190)}
      </div>
    </div>` : ''}

    <div style="${SEC}">
      <div style="${SH}">
        <h3 style="font-size:13px;font-weight:700;color:#1e293b;margin:0;">Product Performance</h3>
        <span style="font-size:11px;color:#64748b;">${topProducts.length} products · ${label}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr>
          <th style="${TH}width:28px;">#</th>
          <th style="${TH}">Product</th>
          <th style="${THC}">Qty</th>
          <th style="${THR}">Revenue</th>
          <th style="${THR}">COGS</th>
          <th style="${THR}">Gross Profit</th>
          <th style="${THR}">Margin</th>
        </tr></thead>
        <tbody>
          ${topProducts.map((p, i) => {
            const profit = p.revenue - p.cost;
            const margin = p.revenue > 0 ? (profit / p.revenue) * 100 : 0;
            return `
            <tr style="background:${i % 2 ? '#fafafa' : '#fff'};">
              <td style="${TDC}">
                <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:${i < 3 ? '#4f46e5' : '#e2e8f0'};color:${i < 3 ? '#fff' : '#64748b'};font-size:9px;font-weight:700;">${i + 1}</span>
              </td>
              <td style="${TD}font-weight:600;color:#1e293b;">${p.name}</td>
              <td style="${TDC}">${p.qty}</td>
              <td style="${TDR}font-weight:700;font-family:'Courier New',monospace;color:#4f46e5;">${fmt(p.revenue)}</td>
              <td style="${TDR}font-family:'Courier New',monospace;color:#64748b;">${fmt(p.cost)}</td>
              <td style="${TDR}font-weight:700;font-family:'Courier New',monospace;color:#059669;">${fmt(profit)}</td>
              <td style="${TDR}">${marginBadge(margin)}</td>
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot style="background:#f8fafc;border-top:2px solid #e2e8f0;">
          <tr>
            <td colspan="2" style="${TD}font-weight:700;color:#1e293b;">TOTAL</td>
            <td style="${TDC}font-weight:700;">${topProducts.reduce((s, p) => s + p.qty, 0)}</td>
            <td style="${TDR}font-weight:800;font-family:'Courier New',monospace;color:#4f46e5;">${fmt(totalRevenue)}</td>
            <td style="${TDR}font-weight:700;font-family:'Courier New',monospace;color:#64748b;">${fmt(totalCOGS)}</td>
            <td style="${TDR}font-weight:800;font-family:'Courier New',monospace;color:#059669;">${fmt(grossProfit)}</td>
            <td style="${TDR}font-weight:700;">${grossMargin.toFixed(1)}%</td>
          </tr>
        </tfoot>
      </table>
    </div>`;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CUSTOMERS / TOP CUSTOMERS
  // ══════════════════════════════════════════════════════════════════════════
  if (isCustomers) {
    body += `
    <div style="display:flex;gap:12px;margin-bottom:22px;flex-wrap:wrap;">
      ${kpi('Total Revenue', fmt(totalRevenue), `${completed.length} transactions`, '#4f46e5')}
      ${kpi('Cashiers Active', `${cashierPerf.length}`, 'In this period', '#7c3aed')}
      ${kpi('Avg. Sale', fmt(completed.length > 0 ? totalRevenue / completed.length : 0), 'Per transaction', '#d97706')}
      ${kpi('Refunds', `${sales.filter((s) => s.status === 'refunded').length}`, 'Refunded transactions', '#e11d48')}
    </div>

    ${cashierPerf.length > 0 ? `
    <div style="${SEC}">
      <div style="${SH}"><h3 style="font-size:13px;font-weight:700;color:#1e293b;margin:0;">Revenue by Cashier</h3></div>
      <div style="padding:16px 20px;">
        ${barChart(cashierPerf.map((c) => ({ label: c.name.split(' ')[0], value: c.revenue })), '#059669', 180)}
      </div>
    </div>` : ''}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">

      <div style="${SEC}margin-bottom:0;">
        <div style="${SH}"><h3 style="font-size:13px;font-weight:700;color:#1e293b;margin:0;">Cashier Performance</h3></div>
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr>
            <th style="${TH}">Cashier</th><th style="${THC}">Txns</th>
            <th style="${THR}">Revenue</th><th style="${THR}">Avg</th>
          </tr></thead>
          <tbody>
            ${cashierPerf.map((c, i) => `
            <tr style="background:${i % 2 ? '#fafafa' : '#fff'};">
              <td style="${TD}font-weight:600;">${c.name}</td>
              <td style="${TDC}">${c.count}</td>
              <td style="${TDR}font-weight:700;font-family:'Courier New',monospace;color:#059669;">${fmt(c.revenue)}</td>
              <td style="${TDR}font-family:'Courier New',monospace;color:#64748b;">${fmt(c.count > 0 ? c.revenue / c.count : 0)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div style="${SEC}margin-bottom:0;">
        <div style="${SH}"><h3 style="font-size:13px;font-weight:700;color:#1e293b;margin:0;">Payment Methods</h3></div>
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr>
            <th style="${TH}">Method</th><th style="${THC}">Txns</th>
            <th style="${THR}">Revenue</th><th style="${THR}">Share</th>
          </tr></thead>
          <tbody>
            ${paymentMethods.map((p, i) => `
            <tr style="background:${i % 2 ? '#fafafa' : '#fff'};">
              <td style="${TD}font-weight:600;">${p.method}</td>
              <td style="${TDC}">${p.count}</td>
              <td style="${TDR}font-weight:700;font-family:'Courier New',monospace;color:#4f46e5;">${fmt(p.amount)}</td>
              <td style="${TDR}color:#64748b;">${pct(p.amount, totalRevenue)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>

    </div>`;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STOCK / INVENTORY
  // ══════════════════════════════════════════════════════════════════════════
  if (isInventory) {
    const totalValue   = invItems.reduce((s, i) => s + i.costPrice * i.currentStock, 0);
    const outOfStock   = invItems.filter((i) => i.stockStatus === 'OUT OF STOCK').length;
    const lowStock     = invItems.filter((i) => i.stockStatus === 'LOW').length;
    const catMap: Record<string, number> = {};
    invItems.forEach((i) => { catMap[i.category] = (catMap[i.category] || 0) + i.costPrice * i.currentStock; });
    const catValues = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

    body += `
    <div style="display:flex;gap:12px;margin-bottom:22px;flex-wrap:wrap;">
      ${kpi('Total SKUs',    `${invItems.length}`, 'Products tracked',     '#4f46e5')}
      ${kpi('Stock Value',   fmt(totalValue),      'At cost price',         '#059669')}
      ${kpi('Low Stock',     `${lowStock}`,         'At or below reorder',  '#d97706')}
      ${kpi('Out of Stock',  `${outOfStock}`,       'Zero units remaining', '#e11d48')}
    </div>

    ${catValues.length > 0 ? `
    <div style="${SEC}">
      <div style="${SH}">
        <h3 style="font-size:13px;font-weight:700;color:#1e293b;margin:0;">Stock Value by Category</h3>
      </div>
      <div style="padding:16px 20px;">
        ${barChart(catValues.map(([c, v]) => ({ label: c, value: v })), '#059669', 160)}
      </div>
    </div>` : ''}

    <div style="${SEC}">
      <div style="${SH}">
        <h3 style="font-size:13px;font-weight:700;color:#1e293b;margin:0;">Inventory Status</h3>
        <span style="font-size:11px;color:#64748b;">${invItems.length} items</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr>
          <th style="${TH}">Product</th><th style="${TH}">SKU</th><th style="${TH}">Category</th>
          <th style="${THR}">Stock</th><th style="${THR}">Reorder</th>
          <th style="${THR}">Cost</th><th style="${THR}">Price</th><th style="${THR}">Value</th>
          <th style="${THC}">Status</th>
        </tr></thead>
        <tbody>
          ${invItems.map((item, i) => {
            const value = item.costPrice * item.currentStock;
            return `
            <tr style="background:${i % 2 ? '#fafafa' : '#fff'};">
              <td style="${TD}font-weight:600;color:#1e293b;">${item.productName}</td>
              <td style="${TD}font-family:'Courier New',monospace;color:#64748b;font-size:11px;">${item.sku}</td>
              <td style="${TD}color:#64748b;">${item.category}</td>
              <td style="${TDR}font-weight:700;">${item.currentStock}</td>
              <td style="${TDR}color:#64748b;">${item.reorderLevel}</td>
              <td style="${TDR}font-family:'Courier New',monospace;color:#64748b;">${fmt(item.costPrice)}</td>
              <td style="${TDR}font-family:'Courier New',monospace;color:#4f46e5;">${fmt(item.sellingPrice)}</td>
              <td style="${TDR}font-weight:700;font-family:'Courier New',monospace;">${fmt(value)}</td>
              <td style="${TDC}">${statusBadge(item.stockStatus)}</td>
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot style="background:#f8fafc;border-top:2px solid #e2e8f0;">
          <tr>
            <td colspan="7" style="${TD}font-weight:700;color:#1e293b;">Total Stock Value</td>
            <td style="${TDR}font-weight:800;font-family:'Courier New',monospace;color:#4f46e5;">${fmt(totalValue)}</td>
            <td style="${TDC}"></td>
          </tr>
        </tfoot>
      </table>
    </div>`;
  }

  // ── Assemble full document ───────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SPark360 — ${tab} Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 16mm 15mm; }
    body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color: #1e293b; background: #fff; font-size: 12px; line-height: 1.45; }
    @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:3px solid #4f46e5;margin-bottom:22px;">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:36px;height:36px;background:#4f46e5;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">🏪</div>
      <div>
        <div style="font-size:20px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;line-height:1.1;">SPark360</div>
        <div style="font-size:10px;color:#64748b;margin-top:2px;">POS &amp; Inventory Management</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:17px;font-weight:800;color:#0f172a;margin-bottom:4px;">${tab} Report</div>
      <div style="font-size:11px;color:#64748b;">Period: <strong>${label}</strong></div>
      <div style="font-size:10px;color:#94a3b8;margin-top:2px;">Generated: ${now}</div>
    </div>
  </div>

  ${body}

  <div style="margin-top:34px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
    <span style="font-size:10px;color:#94a3b8;">SPark360 POS &amp; Inventory — Confidential · Internal Use Only</span>
    <span style="font-size:10px;color:#94a3b8;">${tab} · ${label}</span>
  </div>

  <script>window.onload = function () { setTimeout(function () { window.print(); }, 380); };<\/script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
  win.focus();
}
