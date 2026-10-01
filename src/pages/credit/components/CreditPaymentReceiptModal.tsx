import { useSettings } from '@/hooks/useSettings';
import { useBusiness } from '@/contexts/BusinessContext';
import type { PaymentMethod } from '@/types/erp';
import { escapePrintHtml, printHtml } from '@/lib/printDocument';

interface CreditPaymentReceipt {
  receiptNo: string;
  invoiceNo: string;
  customerName: string;
  invoiceDate: string;
  paymentDate: string;
  paymentMethod: Exclude<PaymentMethod, 'Credit'>;
  cashier: string;
  invoiceTotal: number;
  previousPaid: number;
  amountPaid: number;
  totalPaid: number;
  balanceLeft: number;
}

interface Props {
  receipt: CreditPaymentReceipt;
  onClose: () => void;
}

const paymentLabels: Record<Exclude<PaymentMethod, 'Credit'>, string> = {
  Cash: 'Cash',
  MoMo: 'Mobile Money',
  Cheque: 'Cheque',
  'Bank Transfer': 'Bank Transfer',
};

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return value;
  }
}

export default function CreditPaymentReceiptModal({ receipt, onClose }: Props) {
  const { settings } = useSettings();
  const { activeBusiness } = useBusiness();
  const currency = settings.currencySymbol || '₵';
  const fmt = (value: number) => `${currency}${value.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
  const paidInFull = receipt.balanceLeft <= 0.005;
  const businessLogo = settings.storeLogo || activeBusiness?.logoUrl || '';
  const storeName = settings.storeName || activeBusiness?.businessName || 'Store';
  const storeAddress = settings.storeAddress || activeBusiness?.address || '';
  const storePhone = settings.storePhone || activeBusiness?.phone || '';

  const handlePrint = () => {
    const rows = [
      ['Receipt No.', receipt.receiptNo],
      ['Invoice No.', receipt.invoiceNo],
      ['Customer', receipt.customerName],
      ['Invoice Date', formatDate(receipt.invoiceDate)],
      ['Payment Date', formatDate(receipt.paymentDate)],
      ['Payment Method', paymentLabels[receipt.paymentMethod]],
      ['Recorded By', receipt.cashier],
    ];
    printHtml(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payment Receipt ${receipt.receiptNo}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 80mm; background: #fff; color: #000; }
    body { font-family: 'Courier New', Courier, monospace; font-size: 10pt; }
    .receipt { width: 72mm; margin: 0 auto; padding: 2mm 0 4mm; }
    .header { text-align: center; }
    .logo { width: 12mm; height: 12mm; object-fit: contain; display: block; margin: 0 auto 2mm; }
    .store-name { font-size: 12pt; font-weight: 700; line-height: 1.2; }
    .store-detail { font-size: 8pt; line-height: 1.35; }
    .title { margin-top: 2mm; font-size: 10pt; font-weight: 700; }
    .rule { border: 0; border-top: 1px dashed #000; margin: 2mm 0; }
    .meta-row, .summary-row { display: flex; justify-content: space-between; gap: 3mm; margin-bottom: 1.2mm; }
    .meta-row { font-size: 8pt; }
    .meta-row span:last-child, .summary-row span:last-child { text-align: right; font-weight: 700; }
    .summary-row { font-size: 10pt; }
    .amount-paid { display: flex; justify-content: space-between; align-items: center; gap: 3mm; margin: 2mm 0; padding: 2mm; border: 2px solid #000; font-size: 17pt; font-weight: 700; line-height: 1.1; }
    .amount-paid .label { font-size: 10pt; text-transform: uppercase; }
    .balance { padding-top: 1.5mm; border-top: 1px solid #000; font-weight: 700; }
    .stamp { width: fit-content; margin: 3mm auto 0; padding: 1.5mm 3mm; border: 2px solid #000; font-size: 11pt; font-weight: 700; text-align: center; }
    .thank-you { margin-top: 3mm; font-size: 9pt; font-weight: 700; text-align: center; }
    .footer { margin-top: 1.5mm; font-size: 8pt; line-height: 1.35; text-align: center; }
  </style>
</head>
<body>
  <main class="receipt">
    <header class="header">
      ${businessLogo ? `<img class="logo" src="${escapePrintHtml(businessLogo)}" alt="${escapePrintHtml(storeName)} logo">` : ''}
      <div class="store-name">${escapePrintHtml(storeName)}</div>
      ${storeAddress ? `<div class="store-detail">${escapePrintHtml(storeAddress)}</div>` : ''}
      ${storePhone ? `<div class="store-detail">${escapePrintHtml(storePhone)}</div>` : ''}
      <div class="title">PAYMENT RECEIPT</div>
    </header>
    <hr class="rule">
    <section>
    ${rows.map(([label, value]) => `
      <div class="meta-row">
        <span>${label}</span>
        <span>${escapePrintHtml(value)}</span>
      </div>
    `).join('')}
    </section>
    <hr class="rule">
    <section>
    <div class="summary-row">
      <span>Invoice Total</span><span>${fmt(receipt.invoiceTotal)}</span>
    </div>
    <div class="summary-row">
      <span>Previously Paid</span><span>${fmt(receipt.previousPaid)}</span>
    </div>
    <div class="amount-paid">
      <span class="label">Amount Paid</span><span>${fmt(receipt.amountPaid)}</span>
    </div>
    <div class="summary-row">
      <span>Total Paid</span><span>${fmt(receipt.totalPaid)}</span>
    </div>
    <div class="summary-row balance">
      <span>BALANCE LEFT</span><span>${fmt(receipt.balanceLeft)}</span>
    </div>
    </section>
    <div class="stamp">
      ${paidInFull ? '*** SETTLED ***' : '*** PARTIAL PAYMENT ***'}
    </div>
    <p class="thank-you">Thank you!</p>
    ${settings.receiptFooter ? `<p class="footer">${escapePrintHtml(settings.receiptFooter)}</p>` : ''}
  </main>
</body>
</html>`, { title: `Payment Receipt ${receipt.receiptNo}`, windowFeatures: 'width=360,height=720', autoClose: false });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-indigo-100 rounded-xl">
              <i className="ri-receipt-line text-indigo-600 text-xl"></i>
            </div>
            <div>
              <h2 className="text-slate-800 font-bold text-base">Payment Receipt</h2>
              <p className="text-slate-400 text-xs">Receipt #{receipt.receiptNo}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="p-6">
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-indigo-600 text-white text-center px-5 py-4">
              {businessLogo && (
                <div className="mb-2 flex justify-center">
                  <div className="w-12 h-12 rounded-lg bg-white overflow-hidden flex items-center justify-center">
                    <img src={businessLogo} alt={`${storeName} logo`} className="w-full h-full object-contain p-1.5" />
                  </div>
                </div>
              )}
              <p className="font-bold text-base">{storeName}</p>
              <p className="text-xs text-white/80 mt-0.5">Credit Payment Receipt</p>
            </div>

            <div className="px-5 py-4 space-y-2 border-b border-dashed border-slate-200">
              {[
                ['Receipt No.', receipt.receiptNo],
                ['Invoice No.', receipt.invoiceNo],
                ['Customer', receipt.customerName],
                ['Payment Date', formatDate(receipt.paymentDate)],
                ['Payment Method', paymentLabels[receipt.paymentMethod]],
                ['Recorded By', receipt.cashier],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 text-xs">
                  <span className="text-slate-400">{label}</span>
                  <span className="text-slate-700 font-bold text-right">{value}</span>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 bg-slate-50 space-y-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Invoice Total</span>
                <span className="font-mono text-slate-700">{fmt(receipt.invoiceTotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Previously Paid</span>
                <span className="font-mono text-slate-700">{fmt(receipt.previousPaid)}</span>
              </div>
              <div className="flex justify-between text-sm text-emerald-600 font-bold">
                <span>Payment Received</span>
                <span className="font-mono">{fmt(receipt.amountPaid)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Total Paid</span>
                <span className="font-mono text-slate-700">{fmt(receipt.totalPaid)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-300">
                <span className="text-slate-800 font-bold text-sm">Balance Left</span>
                <span className={`font-mono font-extrabold text-base ${paidInFull ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {fmt(receipt.balanceLeft)}
                </span>
              </div>
            </div>
          </div>

          <div className={`mt-4 rounded-xl px-4 py-3 text-center text-sm font-bold ${paidInFull ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {paidInFull ? 'Invoice settled in full' : 'Partial payment recorded'}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all cursor-pointer"
          >
            <i className="ri-printer-line text-base"></i>
            Print Receipt
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export type { CreditPaymentReceipt };
