import { useSettings } from '@/hooks/useSettings';
import { useBusiness } from '@/contexts/BusinessContext';
import type { InvoiceRecord } from '@/types/erp';
import { escapePrintHtml, printHtml } from '@/lib/printDocument';

interface Props {
  invoice: InvoiceRecord;
  onClose: () => void;
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return value;
  }
}

function dueDate(value: string, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export default function CreditInvoiceModal({ invoice, onClose }: Props) {
  const { settings } = useSettings();
  const { activeBusiness } = useBusiness();
  const currency = settings.currencySymbol || 'GHS ';
  const fmt = (value: number) => `${currency}${value.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
  const due = dueDate(invoice.date, settings.invoiceDueDays);
  const subtotal = invoice.subtotal ?? invoice.items.reduce((sum, item) => sum + item.netSales, 0);
  const taxAmount = invoice.taxAmount ?? 0;
  const discountAmount = invoice.discountAmount ?? 0;
  const businessLogo = settings.storeLogo || activeBusiness?.logoUrl || '';
  const storeName = settings.storeName || activeBusiness?.businessName || 'Store';
  const storeAddress = settings.storeAddress || activeBusiness?.address || '';
  const storePhone = settings.storePhone || activeBusiness?.phone || '';
  const storeEmail = settings.storeEmail || activeBusiness?.email || '';

  const handlePrint = () => {
    const logoHtml = businessLogo
      ? `<img src="${escapePrintHtml(businessLogo)}" alt="${escapePrintHtml(storeName)} logo" style="width:44px;height:44px;object-fit:contain;background:#fff;border:1px solid #e2e8f0;border-radius:9px;padding:4px;display:block;margin:0 auto 8px;"/>`
      : `<div style="width:38px;height:38px;border-radius:9px;background:#4f46e5;color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;font-size:16px;font-weight:800;">${escapePrintHtml(storeName.slice(0, 1).toUpperCase())}</div>`;

    const itemsHtml = invoice.items.map((item, index) => `
      <div class="item">
        <div class="item-title">${index + 1}. ${escapePrintHtml(item.productName)}</div>
        <div class="row small"><span>${escapePrintHtml(item.productId)} - ${escapePrintHtml(item.priceLevel)}</span><span>${item.netQty} x ${fmt(item.unitPrice)}</span></div>
        <div class="row item-total"><span>Amount</span><span>${fmt(item.netSales)}</span></div>
      </div>
    `).join('');

    printHtml(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNo}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 80mm; font-family: 'Courier New', Consolas, Monaco, monospace; font-size: 10pt; color: #0f172a; background: #fff; }
    .receipt { width: 72mm; margin: 0 auto; padding: 4mm 0; }
    .center { text-align: center; }
    .store { font-size: 12pt; font-weight: 800; margin-bottom: 2px; }
    .muted { color: #64748b; font-size: 8.5pt; line-height: 1.4; }
    .title { border-top: 1px dashed #cbd5e1; border-bottom: 1px dashed #cbd5e1; margin-top: 10px; padding: 8px 0; text-align: center; }
    .title h1 { margin: 0; color: #4f46e5; font-size: 13pt; letter-spacing: 1px; }
    .invoice-no { font-size: 10pt; font-weight: 800; margin-top: 3px; }
    .stamp { display: inline-block; margin-top: 6px; padding: 3px 8px; border-radius: 999px; background: #fef3c7; color: #92400e; font-size: 8pt; font-weight: 900; }
    .section { border-top: 1px dashed #cbd5e1; padding: 8px 0; }
    .section-title { font-size: 9pt; font-weight: 800; text-transform: uppercase; margin-bottom: 6px; color: #475569; }
    .row { display: flex; justify-content: space-between; gap: 8px; font-size: 9.5pt; line-height: 1.45; }
    .row span:last-child { text-align: right; font-weight: 700; }
    .small { font-size: 8pt; color: #64748b; }
    .item { padding: 7px 0; border-bottom: 1px dotted #e2e8f0; }
    .item-title { font-size: 9.5pt; font-weight: 800; line-height: 1.35; margin-bottom: 3px; }
    .item-total { margin-top: 3px; }
    .total { margin-top: 7px; padding: 8px 0; border-top: 1px solid #94a3b8; font-weight: 900; }
    .total span { font-size: 13pt; }
    .balance span { font-size: 17pt; color: #4f46e5; }
    .note { border-top: 1px dashed #cbd5e1; padding-top: 8px; margin-top: 8px; color: #475569; font-size: 8.5pt; line-height: 1.45; text-align: center; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <main class="receipt">
    <div class="center">
      ${logoHtml}
      <div class="store">${escapePrintHtml(storeName)}</div>
      <div class="muted">${escapePrintHtml(storeAddress)}</div>
      ${storePhone ? `<div class="muted">${escapePrintHtml(storePhone)}</div>` : ''}
      ${storeEmail ? `<div class="muted">${escapePrintHtml(storeEmail)}</div>` : ''}
    </div>

    <div class="title">
      <h1>INVOICE</h1>
      <div class="invoice-no">${invoice.invoiceNo}</div>
      <div class="stamp">CREDIT SALE</div>
    </div>

    <div class="section">
      <div class="section-title">Customer</div>
      <div class="row"><span>Bill To</span><span>${escapePrintHtml(invoice.customerName)}</span></div>
    </div>

    <div class="section">
      <div class="section-title">Invoice Details</div>
      <div class="row"><span>Date</span><span>${formatDate(invoice.date)}</span></div>
      <div class="row"><span>Due Date</span><span>${formatDate(due)}</span></div>
      <div class="row"><span>Cashier</span><span>${escapePrintHtml(invoice.cashier)}</span></div>
    </div>

    <div class="section">
      <div class="section-title">Items</div>
      ${itemsHtml}
    </div>

    <div class="row"><span>Subtotal</span><strong>${fmt(subtotal)}</strong></div>
    ${taxAmount > 0 ? `<div class="row"><span>${escapePrintHtml(settings.taxLabel)} (${settings.taxRate}%)</span><span>${fmt(taxAmount)}</span></div>` : ''}
    ${discountAmount > 0 ? `<div class="row"><span>Discount</span><span>-${fmt(discountAmount)}</span></div>` : ''}
    <div class="row"><span>Invoice Total</span><strong>${fmt(invoice.netSales)}</strong></div>
    <div class="row"><span>Amount Paid</span><strong>${fmt(invoice.amountPaid)}</strong></div>
    <div class="row total balance"><span>Balance Due</span><span>${fmt(invoice.balanceDue)}</span></div>

    <div class="note">
      This is a credit invoice and does not represent payment received. A receipt will be generated only when payment is recorded and must reference invoice ${invoice.invoiceNo}.
      ${settings.receiptFooter ? `<br />${escapePrintHtml(settings.receiptFooter)}` : ''}
    </div>
  </main>

</body>
</html>`, { title: `Invoice ${invoice.invoiceNo}`, windowFeatures: 'width=420,height=800', autoClose: false });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-slate-800 font-bold text-base">Credit Invoice</h2>
            <p className="text-indigo-600 text-xs font-bold font-mono">{invoice.invoiceNo}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer">
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="p-6">
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-indigo-600 text-white px-5 py-4">
              <div className="flex items-center gap-3">
                {businessLogo ? (
                  <div className="w-12 h-12 rounded-lg bg-white overflow-hidden flex items-center justify-center shrink-0">
                    <img src={businessLogo} alt={`${storeName} logo`} className="w-full h-full object-contain p-1.5" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center shrink-0 text-sm font-black">
                    {storeName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/70 font-bold">Credit Invoice</p>
                  <p className="text-xl font-extrabold font-mono">{invoice.invoiceNo}</p>
                  <p className="text-xs text-white/80 mt-0.5">{storeName}</p>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Customer</span>
                <span className="text-slate-800 font-bold text-right">{invoice.customerName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Invoice Date</span>
                <span className="text-slate-700 font-semibold">{formatDate(invoice.date)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Due Date</span>
                <span className="text-slate-700 font-semibold">{formatDate(due)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Invoice Total</span>
                <span className="font-mono text-slate-800 font-bold">{fmt(invoice.netSales)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Balance Due</span>
                <span className="font-mono text-indigo-600 font-extrabold">{fmt(invoice.balanceDue)}</span>
              </div>
            </div>
          </div>

          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-700">
            No receipt number appears on this invoice. Receipts are generated only after payment and reference this invoice number.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all cursor-pointer">
            <i className="ri-printer-line text-base"></i>
            Print Invoice
          </button>
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all cursor-pointer">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
