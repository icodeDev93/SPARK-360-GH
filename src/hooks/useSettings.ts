import { useState } from 'react';

export interface StoreSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail: string;
  storeLogo: string;
  currency: string;
  currencySymbol: string;
  taxRate: number;
  taxLabel: string;
  taxEnabled: boolean;
  receiptFooter: string;
  receiptShowLogo: boolean;
  receiptShowTax: boolean;
  receiptShowBarcode: boolean;
  receiptTheme: 'minimal' | 'classic' | 'modern';
  timezone: string;
}

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'SPark360 Store',
  storeAddress: '123 Market Street, Downtown, NY 10001',
  storePhone: '+1 (555) 234-5678',
  storeEmail: 'store@spark360.com',
  storeLogo: '',
  currency: 'GHS',
  currencySymbol: '₵',
  taxRate: 10,
  taxLabel: 'VAT',
  taxEnabled: true,
  receiptFooter: 'Thank you for shopping with us! Returns accepted within 7 days with receipt.',
  receiptShowLogo: true,
  receiptShowTax: true,
  receiptShowBarcode: true,
  receiptTheme: 'minimal',
  timezone: 'Africa/Accra',
};

const STORAGE_KEY = 'spark360_settings';

export function useSettings() {
  const [settings, setSettings] = useState<StoreSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  const updateSettings = (updates: Partial<StoreSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetSettings = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSettings(DEFAULT_SETTINGS);
  };

  return { settings, updateSettings, resetSettings };
}
