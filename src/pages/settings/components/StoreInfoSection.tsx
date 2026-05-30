import { useEffect, useRef, useState } from 'react';
import { StoreSettings } from '@/hooks/useSettings';
import { sanitizeText, sanitizeEmail, sanitizeMultiline } from '@/lib/sanitize';
import { supabase } from '@/lib/supabase';

interface Props {
  settings: StoreSettings;
  onChange: (updates: Partial<StoreSettings>) => void;
}

const currencies = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
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
  const [draft, setDraft] = useState(settings);
  const [logoError, setLogoError] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const setField = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const saveField = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => {
    setField(key, value);
    onChange({ [key]: value } as Partial<StoreSettings>);
  };

  const handleCurrencyChange = (code: string) => {
    const found = currencies.find((c) => c.code === code);
    if (found) {
      setDraft((prev) => ({ ...prev, currency: found.code, currencySymbol: found.symbol }));
      onChange({ currency: found.code, currencySymbol: found.symbol });
    }
  };

  const handleLogoFile = async (file: File | undefined) => {
    setLogoError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setLogoError('Upload a JPEG or PNG logo.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Logo must be 2 MB or smaller.');
      return;
    }

    setUploadingLogo(true);
    try {
      const ext = file.type === 'image/png' ? 'png' : 'jpg';
      const safeName = (draft.storeName || 'store')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'store';
      const path = `${safeName}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('store-logos').upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const logoUrl = supabase.storage.from('store-logos').getPublicUrl(path).data.publicUrl;
      saveField('storeLogo', logoUrl);
    } catch (error) {
      console.error(error);
      setLogoError('Logo upload failed. Please try again.');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeLogo = () => {
    setLogoError('');
    saveField('storeLogo', '');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-slate-800 font-bold text-base mb-1">Store Information</h3>
        <p className="text-slate-400 text-sm">Basic details about your store that appear on receipts and reports.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Store Logo</label>
          <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center">
            <div className="w-20 h-20 flex-shrink-0 rounded-xl border border-slate-200 bg-white overflow-hidden flex items-center justify-center">
              {draft.storeLogo ? (
                <img src={draft.storeLogo} alt="Store logo" className="w-full h-full object-contain p-2" />
              ) : (
                <i className="ri-store-2-line text-3xl text-slate-300"></i>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-700">Receipt logo</p>
              <p className="text-xs text-slate-400 mt-0.5">Upload a JPEG or PNG logo up to 2 MB.</p>
              {logoError && <p className="text-xs text-red-500 mt-1">{logoError}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
                >
                  <i className={uploadingLogo ? 'ri-loader-4-line animate-spin' : 'ri-upload-2-line'}></i>
                  {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                </button>
                {draft.storeLogo && (
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    <i className="ri-delete-bin-line"></i>
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                className="hidden"
                onChange={(event) => handleLogoFile(event.target.files?.[0])}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Store Name <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={draft.storeName}
            onChange={(e) => setField('storeName', e.target.value)}
            onBlur={(e) => saveField('storeName', sanitizeText(e.target.value))}
            placeholder="e.g. Bizzy App Business Management System Store"
            maxLength={100}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Store Email</label>
          <input
            type="email"
            value={draft.storeEmail}
            onChange={(e) => setField('storeEmail', e.target.value)}
            onBlur={(e) => saveField('storeEmail', sanitizeEmail(e.target.value))}
            placeholder="store@example.com"
            maxLength={200}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
          <input
            type="tel"
            value={draft.storePhone}
            onChange={(e) => setField('storePhone', e.target.value)}
            onBlur={(e) => saveField('storePhone', sanitizeText(e.target.value))}
            placeholder="+1 (555) 000-0000"
            maxLength={30}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Currency</label>
          <select
            value={draft.currency}
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
            value={draft.storeAddress}
            onChange={(e) => setField('storeAddress', e.target.value)}
            onBlur={(e) => saveField('storeAddress', sanitizeMultiline(e.target.value))}
            placeholder="Full store address..."
            rows={2}
            maxLength={500}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Timezone</label>
          <select
            value={draft.timezone}
            onChange={(e) => saveField('timezone', e.target.value)}
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
