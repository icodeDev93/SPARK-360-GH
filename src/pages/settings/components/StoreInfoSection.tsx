import { StoreSettings } from '@/hooks/useSettings';
import { sanitizeText, sanitizeEmail, sanitizeMultiline } from '@/lib/sanitize';

interface Props {
  settings: StoreSettings;
  onChange: (updates: Partial<StoreSettings>) => void;
}

const currencies = [
  { code: 'GHS', symbol: '₵', label: 'Ghanaian Cedi' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'NGN', symbol: '₦', label: 'Nigerian Naira' },
  { code: 'KES', symbol: 'KSh', label: 'Kenyan Shilling' },
  { code: 'ZAR', symbol: 'R', label: 'South African Rand' },
  { code: 'CAD', symbol: 'CA$', label: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
];

const timezones = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Africa/Accra', 'Africa/Lagos',
  'Africa/Nairobi', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney',
];

export default function StoreInfoSection({ settings, onChange }: Props) {
  const handleCurrencyChange = (code: string) => {
    const found = currencies.find((c) => c.code === code);
    if (found) {
      onChange({ currency: found.code, currencySymbol: found.symbol });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-slate-800 font-bold text-base mb-1">Store Information</h3>
        <p className="text-slate-400 text-sm">Basic details about your store that appear on receipts and reports.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Store Name <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={settings.storeName}
            onChange={(e) => onChange({ storeName: e.target.value })}
            onBlur={(e) => onChange({ storeName: sanitizeText(e.target.value) })}
            placeholder="e.g. SPark360 Store"
            maxLength={100}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Store Email</label>
          <input
            type="email"
            value={settings.storeEmail}
            onChange={(e) => onChange({ storeEmail: e.target.value })}
            onBlur={(e) => onChange({ storeEmail: sanitizeEmail(e.target.value) })}
            placeholder="store@example.com"
            maxLength={200}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
          <input
            type="tel"
            value={settings.storePhone}
            onChange={(e) => onChange({ storePhone: e.target.value })}
            onBlur={(e) => onChange({ storePhone: sanitizeText(e.target.value) })}
            placeholder="+1 (555) 000-0000"
            maxLength={30}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Currency</label>
          <select
            value={settings.currency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-white cursor-pointer"
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} — {c.label} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Store Address</label>
          <textarea
            value={settings.storeAddress}
            onChange={(e) => onChange({ storeAddress: e.target.value })}
            onBlur={(e) => onChange({ storeAddress: sanitizeMultiline(e.target.value) })}
            placeholder="Full store address..."
            rows={2}
            maxLength={500}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Timezone</label>
          <select
            value={settings.timezone}
            onChange={(e) => onChange({ timezone: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-white cursor-pointer"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
