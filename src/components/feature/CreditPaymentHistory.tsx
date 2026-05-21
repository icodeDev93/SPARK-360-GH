import type { CreditPayment, InvoiceRecord } from '@/types/erp';

interface Props {
  invoice: InvoiceRecord;
  payments: CreditPayment[];
}

function fmt(n: number) {
  return `₵${n.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  if (!iso) return 'Date unavailable';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CreditPaymentHistory({ invoice, payments }: Props) {
  const history = payments
    .filter((payment) => payment.invoiceNo === invoice.invoiceNo)
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

  let runningPaid = 0;
  const rows = history.map((payment) => {
    runningPaid += payment.amount;
    return {
      ...payment,
      balanceLeft: Math.max(0, invoice.netSales - runningPaid),
    };
  });

  return (
    <div className="border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Payment History</p>
        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
          {rows.length} {rows.length === 1 ? 'payment' : 'payments'}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
          <i className="ri-receipt-line text-2xl text-slate-300"></i>
          <p className="text-slate-500 text-sm font-semibold mt-1">No payment recorded yet</p>
          <p className="text-slate-400 text-xs mt-0.5">Payments made against this invoice will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((payment, index) => (
            <div key={payment.id} className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-slate-800 text-sm font-bold font-mono truncate">
                    {payment.receiptNo ?? `Payment ${index + 1}`}
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {formatDate(payment.createdAt)} &middot; {payment.paymentMethod}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-emerald-600 text-sm font-bold font-mono">{fmt(payment.amount)}</p>
                  <p className="text-slate-400 text-xs font-mono">Bal. {fmt(payment.balanceLeft)}</p>
                </div>
              </div>
              {payment.notes && (
                <p className="text-slate-500 text-xs mt-2 leading-relaxed">{payment.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
