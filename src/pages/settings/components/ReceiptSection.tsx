import { StoreSettings } from '@/hooks/useSettings';
import { sanitizeMultiline } from '@/lib/sanitize';

interface Props {
  settings: StoreSettings;
  onChange: (updates: Partial<StoreSettings>) => void;
}

const themes = [
  {
    key: 'minimal',
    label: 'Minimal',
    desc: 'Clean white header, simple layout',
    preview: 'bg-white border-slate-200',
    headerBg: 'bg-slate-50',
    headerText: 'text-slate-800',
  },
  {
    key: 'classic',
    label: 'Classic',
    desc: 'Dark header, traditional receipt look',
    preview: 'bg-white border-slate-200',
    headerBg: 'bg-slate-800',
    headerText: 'text-white',
  },
  {
    key: 'modern',
    label: 'Modern',
    desc: 'Indigo accent, contemporary style',
    preview: 'bg-white border-indigo-200',
    headerBg: 'bg-indigo-600',
    headerText: 'text-white',
  },
];

export default function ReceiptSection({ settings, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-slate-800 font-bold text-base mb-1">Receipt Customization</h3>
        <p className="text-slate-400 text-sm">Customize how your receipts look and what information they include.</p>
      </div>

      {/* Theme Picker */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-3">Receipt Theme</label>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => (
            <button
              key={t.key}
              onClick={() => onChange({ receiptTheme: t.key as StoreSettings['receiptTheme'] })}
              className={`relative border-2 rounded-xl overflow-hidden transition-all cursor-pointer text-left ${
                settings.receiptTheme === t.key
                  ? 'border-indigo-500 ring-2 ring-indigo-100'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Mini receipt preview */}
              <div className={`${t.headerBg} px-3 py-2`}>
                <div className={`text-xs font-bold ${t.headerText} truncate`}>{settings.storeName || 'Store Name'}</div>
                <div className={`text-xs ${t.headerText} opacity-70 truncate`}>Receipt</div>
              </div>
              <div className="bg-white px-3 py-2 space-y-1">
                <div className="flex justify-between">
                  <div className="h-1.5 bg-slate-200 rounded w-16"></div>
                  <div className="h-1.5 bg-slate-200 rounded w-8"></div>
                </div>
                <div className="flex justify-between">
                  <div className="h-1.5 bg-slate-200 rounded w-12"></div>
                  <div className="h-1.5 bg-slate-200 rounded w-10"></div>
                </div>
                <div className="border-t border-dashed border-slate-200 pt-1 flex justify-between">
                  <div className="h-2 bg-slate-300 rounded w-8"></div>
                  <div className={`h-2 rounded w-10 ${t.key === 'modern' ? 'bg-indigo-400' : 'bg-slate-700'}`}></div>
                </div>
              </div>
              <div className="px-3 py-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-700">{t.label}</p>
                <p className="text-xs text-slate-400">{t.desc}</p>
              </div>
              {settings.receiptTheme === t.key && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                  <i className="ri-check-line text-white text-xs"></i>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle Options */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-slate-700">Receipt Elements</label>
        {[
          { key: 'receiptShowLogo', label: 'Show Store Logo/Icon', desc: 'Display store icon at the top of receipt' },
          { key: 'receiptShowTax', label: 'Show Tax Breakdown', desc: 'Display tax amount as a separate line item' },
          { key: 'receiptShowBarcode', label: 'Show Barcode', desc: 'Include a barcode at the bottom of receipt' },
        ].map((opt) => (
          <div key={opt.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <p className="text-slate-800 font-semibold text-sm">{opt.label}</p>
              <p className="text-slate-400 text-xs mt-0.5">{opt.desc}</p>
            </div>
            <button
              onClick={() => onChange({ [opt.key]: !settings[opt.key as keyof StoreSettings] })}
              className={`relative w-12 h-6 rounded-full transition-all cursor-pointer flex-shrink-0 ${
                settings[opt.key as keyof StoreSettings] ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${
                  settings[opt.key as keyof StoreSettings] ? 'left-6' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Footer Message */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Receipt Footer Message</label>
        <textarea
          value={settings.receiptFooter}
          onChange={(e) => onChange({ receiptFooter: e.target.value })}
          onBlur={(e) => onChange({ receiptFooter: sanitizeMultiline(e.target.value) })}
          placeholder="e.g. Thank you for shopping with us! Returns accepted within 7 days."
          rows={3}
          maxLength={500}
          className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
        />
        <p className="text-xs text-slate-400 mt-1">{settings.receiptFooter.length}/500 characters — appears at the bottom of every receipt</p>
      </div>
    </div>
  );
}
