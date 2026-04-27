import { StoreSettings } from '@/hooks/useSettings';

interface Props {
  settings: StoreSettings;
  onChange: (updates: Partial<StoreSettings>) => void;
}

export default function TaxSection({ settings, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-slate-800 font-bold text-base mb-1">Tax Configuration</h3>
        <p className="text-slate-400 text-sm">Configure how taxes are calculated and displayed on receipts.</p>
      </div>

      {/* Enable Tax Toggle */}
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
        <div>
          <p className="text-slate-800 font-semibold text-sm">Enable Tax Calculation</p>
          <p className="text-slate-400 text-xs mt-0.5">Automatically add tax to all sales transactions</p>
        </div>
        <button
          onClick={() => onChange({ taxEnabled: !settings.taxEnabled })}
          className={`relative w-12 h-6 rounded-full transition-all cursor-pointer flex-shrink-0 ${
            settings.taxEnabled ? 'bg-indigo-600' : 'bg-slate-300'
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${
              settings.taxEnabled ? 'left-6' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {settings.taxEnabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tax Rate (%)</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={settings.taxRate}
                onChange={(e) => onChange({ taxRate: Math.min(100, Math.max(0, Number(e.target.value))) })}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 pr-10 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">%</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Applied to all sales unless overridden per item</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tax Label</label>
            <input
              type="text"
              value={settings.taxLabel}
              onChange={(e) => onChange({ taxLabel: e.target.value })}
              placeholder="e.g. VAT, GST, Sales Tax"
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
            <p className="text-xs text-slate-400 mt-1">This label appears on receipts and invoices</p>
          </div>
        </div>
      )}

      {/* Tax Preview */}
      {settings.taxEnabled && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
          <p className="text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-3">Tax Preview</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Item price</span>
              <span className="font-mono">{settings.currencySymbol}100.00</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{settings.taxLabel} ({settings.taxRate}%)</span>
              <span className="font-mono">+{settings.currencySymbol}{(100 * settings.taxRate / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-800 pt-2 border-t border-indigo-200">
              <span>Total charged</span>
              <span className="font-mono text-indigo-700">{settings.currencySymbol}{(100 + 100 * settings.taxRate / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
