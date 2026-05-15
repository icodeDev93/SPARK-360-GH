import { StoreSettings } from '@/hooks/useSettings';

interface Props {
  settings: StoreSettings;
  onChange: (updates: Partial<StoreSettings>) => void;
}

function exampleDueDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CreditSection({ settings, onChange }: Props) {
  const { invoiceDueDays } = settings;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-slate-800 font-bold text-base mb-1">Credit &amp; Invoice Terms</h3>
        <p className="text-slate-400 text-sm">
          Configure standard payment terms for credit sales made to wholesale customers.
        </p>
      </div>

      {/* Invoice Due Days */}
      <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <p className="text-slate-800 font-semibold text-sm">Invoice Due Days</p>
            <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
              Number of days a customer has to pay after a credit sale is made.
              This appears as the payment due date on the Credit Invoices page.
            </p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={365}
              value={invoiceDueDays}
              onChange={(e) => {
                const val = Math.min(365, Math.max(1, Number(e.target.value)));
                if (!isNaN(val)) onChange({ invoiceDueDays: val });
              }}
              className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-mono text-center outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
            <span className="text-slate-500 text-sm font-medium">days</span>
          </div>
        </div>

        {/* Quick presets */}
        <div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Common terms</p>
          <div className="flex gap-2 flex-wrap">
            {[7, 14, 30, 60, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onChange({ invoiceDueDays: d })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  invoiceDueDays === d
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                }`}
              >
                Net {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
        <p className="text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-3">Preview</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Sale date</span>
            <span className="font-mono font-semibold">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Payment terms</span>
            <span className="font-semibold">Net {invoiceDueDays}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-800 pt-2 border-t border-indigo-200">
            <span>Due date</span>
            <span className="font-mono text-indigo-700">{exampleDueDate(invoiceDueDays)}</span>
          </div>
        </div>
        <p className="text-indigo-500 text-xs mt-3">
          Credit invoices older than {invoiceDueDays} days will be marked <span className="font-bold text-red-500">Overdue</span> on the Credit Invoices page.
        </p>
      </div>
    </div>
  );
}
