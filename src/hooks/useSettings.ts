import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface StoreSettings {
  storeName: string; storeAddress: string; storePhone: string; storeEmail: string;
  storeLogo: string; currency: string; currencySymbol: string; taxRate: number;
  taxLabel: string; taxEnabled: boolean; receiptFooter: string; receiptShowLogo: boolean;
  receiptShowTax: boolean; receiptShowBarcode: boolean;
  receiptTheme: 'minimal' | 'classic' | 'modern'; timezone: string;
}

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'SPark360 Store', storeAddress: '123 Market Street, Downtown, NY 10001',
  storePhone: '+1 (555) 234-5678', storeEmail: 'store@spark360.com', storeLogo: '',
  currency: 'GHS', currencySymbol: '₵', taxRate: 10, taxLabel: 'VAT', taxEnabled: true,
  receiptFooter: 'Thank you for shopping with us! Returns accepted within 7 days with receipt.',
  receiptShowLogo: true, receiptShowTax: true, receiptShowBarcode: true,
  receiptTheme: 'minimal', timezone: 'Africa/Accra',
};

type Row = {
  id: number; store_name: string; store_address: string; store_phone: string;
  store_email: string; store_logo: string; currency: string; currency_symbol: string;
  tax_rate: number; tax_label: string; tax_enabled: boolean; receipt_footer: string;
  receipt_show_logo: boolean; receipt_show_tax: boolean; receipt_show_barcode: boolean;
  receipt_theme: string; timezone: string;
};

const toSettings = (r: Row): StoreSettings => ({
  storeName: r.store_name, storeAddress: r.store_address, storePhone: r.store_phone,
  storeEmail: r.store_email, storeLogo: r.store_logo, currency: r.currency,
  currencySymbol: r.currency_symbol, taxRate: r.tax_rate, taxLabel: r.tax_label,
  taxEnabled: r.tax_enabled, receiptFooter: r.receipt_footer,
  receiptShowLogo: r.receipt_show_logo, receiptShowTax: r.receipt_show_tax,
  receiptShowBarcode: r.receipt_show_barcode,
  receiptTheme: r.receipt_theme as StoreSettings['receiptTheme'],
  timezone: r.timezone,
});

export function useSettings() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('store_settings').select('*').eq('id', 1).single();
      if (data) setSettings(toSettings(data as Row));
      else {
        await supabase.from('store_settings').insert({ id: 1, ...Object.fromEntries(
          Object.entries(DEFAULT_SETTINGS).map(([k, v]) => [
            k.replace(/([A-Z])/g, '_$1').toLowerCase(), v
          ])
        ) });
      }
    })();
  }, []);

  const updateSettings = async (updates: Partial<StoreSettings>) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    const row: Partial<Row> = {
      store_name: next.storeName, store_address: next.storeAddress, store_phone: next.storePhone,
      store_email: next.storeEmail, store_logo: next.storeLogo, currency: next.currency,
      currency_symbol: next.currencySymbol, tax_rate: next.taxRate, tax_label: next.taxLabel,
      tax_enabled: next.taxEnabled, receipt_footer: next.receiptFooter,
      receipt_show_logo: next.receiptShowLogo, receipt_show_tax: next.receiptShowTax,
      receipt_show_barcode: next.receiptShowBarcode, receipt_theme: next.receiptTheme,
      timezone: next.timezone,
    };
    const { error } = await supabase.from('store_settings').upsert({ id: 1, ...row });
    if (error) console.error(error);
  };

  const resetSettings = async () => {
    setSettings(DEFAULT_SETTINGS);
    await supabase.from('store_settings').upsert({ id: 1,
      store_name: DEFAULT_SETTINGS.storeName, store_address: DEFAULT_SETTINGS.storeAddress,
      store_phone: DEFAULT_SETTINGS.storePhone, store_email: DEFAULT_SETTINGS.storeEmail,
      store_logo: '', currency: 'GHS', currency_symbol: '₵', tax_rate: 10, tax_label: 'VAT',
      tax_enabled: true, receipt_footer: DEFAULT_SETTINGS.receiptFooter,
      receipt_show_logo: true, receipt_show_tax: true, receipt_show_barcode: true,
      receipt_theme: 'minimal', timezone: 'Africa/Accra',
    });
  };

  return { settings, updateSettings, resetSettings };
}
