import { useSettings } from '@/hooks/useSettings';
import type { PaymentMethod } from '@/types/erp';

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
  const currency = settings.currencySymbol || '₵';
  const fmt = (value: number) => `${currency}${value.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
  const paidInFull = receipt.balanceLeft <= 0.005;

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=420,height=800');
    if (!win) return;

    const rows = [
      ['Receipt No.', receipt.receiptNo],
      ['Invoice No.', receipt.invoiceNo],
      ['Customer', receipt.customerName],
      ['Invoice Date', formatDate(receipt.invoiceDate)],
      ['Payment Date', formatDate(receipt.paymentDate)],
      ['Payment Method', paymentLabels[receipt.paymentMethod]],
      ['Recorded By', receipt.cashier],
    ];

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payment Receipt ${receipt.receiptNo}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: 80mm; font-family: Arial, sans-serif; color: #1e293b; background: #fff; }
  </style>
</head>
<body>
  <div style="background:#4f46e5;color:#fff;text-align:center;padding:18px 14px 14px;">
    <div style="font-size:15px;font-weight:800;margin-bottom:3px;">${settings.storeName}</div>
    <div style="font-size:10px;color:rgba(255,255,255,0.82);line-height:1.5;">${settings.storeAddress}</div>
    ${settings.storePhone ? `<div style="font-size:10px;color:rgba(255,255,255,0.82);">${settings.storePhone}</div>` : ''}
    <div style="font-size:11px;font-weight:700;margin-top:10px;letter-spacing:0.08em;">CREDIT PAYMENT RECEIPT</div>
  </div>

  <div style="padding:12px 14px;border-top:1px dashed #cbd5e1;">
    ${rows.map(([label, value]) => `
      <div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:6px;font-size:11px;">
        <span style="color:#64748b;">${label}</span>
        <span style="font-weight:700;color:#1e293b;text-align:right;">${value}</span>
      </div>
    `).join('')}
  </div>

  <div style="background:#f8fafc;padding:12px 14px;border-top:1px dashed #cbd5e1;">
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:6px;">
      <span>Invoice Total</span><span>${fmt(receipt.invoiceTotal)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:6px;">
      <span>Previously Paid</span><span>${fmt(receipt.previousPaid)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#059669;margin-bottom:6px;font-weight:800;">
      <span>Payment Received</span><span>${fmt(receipt.amountPaid)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:7px;">
      <span>Total Paid</span><span>${fmt(receipt.totalPaid)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid #cbd5e1;">
      <span style="font-size:13px;font-weight:800;color:#1e293b;">BALANCE LEFT</span>
      <span style="font-size:15px;font-weight:900;color:${paidInFull ? '#059669' : '#dc2626'};">${fmt(receipt.balanceLeft)}</span>
    </div>
  </div>

  <div style="padding:10px 14px;text-align:center;border-top:1px dashed #cbd5e1;">
    <div style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:10px;font-weight:800;background:${paidInFull ? '#dcfce7' : '#fef3c7'};color:${paidInFull ? '#15803d' : '#b45309'};">
      ${paidInFull ? 'INVOICE SETTLED' : 'PARTIAL PAYMENT'}
    </div>
    ${settings.receiptFooter ? `<p style="font-size:10px;color:#94a3b8;line-height:1.5;margin-top:10px;">${settings.receiptFooter}</p>` : ''}
  </div>

  <script>window.onload = function() { window.print(); window.close(); }<\/script>
</body>
</html>`);
    win.document.close();
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
              <p className="font-bold text-base">{settings.storeName}</p>
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
