import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { sanitizeEmail, sanitizeMultiline, sanitizeText, sanitizeUrl } from '@/lib/sanitize';
import { loadLocalCollection, queueLocalMutation, saveLocalCollection } from '@/lib/localCache';
import { useBusiness } from '@/contexts/BusinessContext';

export interface StoreSettings {
  storeName: string; storeAddress: string; storePhone: string; storeEmail: string;
  storeSenderId: string;
  invoiceSmsTemplate: string; paymentSmsTemplate: string;
  storeLogo: string; currency: string; currencySymbol: string; taxRate: number;
  taxLabel: string; taxEnabled: boolean; receiptFooter: string; receiptShowLogo: boolean;
  receiptShowTax: boolean; receiptShowBarcode: boolean;
  receiptTheme: 'minimal' | 'classic' | 'modern'; timezone: string;
  invoiceDueDays: number;
}

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'Bizzy App Business Management System Store', storeAddress: '123 Market Street, Downtown, NY 10001',
  storePhone: '+1 (555) 234-5678', storeEmail: 'store@bizzyapp.com', storeSenderId: '',
  invoiceSmsTemplate: '', paymentSmsTemplate: '', storeLogo: '',
  currency: 'GHS', currencySymbol: '₵', taxRate: 10, taxLabel: 'VAT', taxEnabled: true,
  receiptFooter: 'Thank you for shopping with us! Returns accepted within 7 days with receipt.',
  receiptShowLogo: true, receiptShowTax: true, receiptShowBarcode: true,
  receiptTheme: 'minimal', timezone: 'Africa/Accra',
  invoiceDueDays: 30,
};

type Row = {
  id: string; settings_key: string; store_name: string; store_address: string; store_phone: string;
  store_email: string; store_sender_id: string | null; invoice_sms_template: string | null;
  payment_sms_template: string | null; store_logo: string; currency: string; currency_symbol: string;
  tax_rate: number; tax_label: string; tax_enabled: boolean; receipt_footer: string;
  receipt_show_logo: boolean; receipt_show_tax: boolean; receipt_show_barcode: boolean;
  receipt_theme: string; timezone: string; invoice_due_days: number | null;
};

const toSettings = (r: Row): StoreSettings => ({
  storeName: r.store_name, storeAddress: r.store_address, storePhone: r.store_phone,
  storeEmail: r.store_email, storeSenderId: r.store_sender_id ?? '',
  invoiceSmsTemplate: r.invoice_sms_template ?? '', paymentSmsTemplate: r.payment_sms_template ?? '',
  storeLogo: r.store_logo, currency: r.currency,
  currencySymbol: r.currency_symbol, taxRate: r.tax_rate, taxLabel: r.tax_label,
  taxEnabled: r.tax_enabled, receiptFooter: r.receipt_footer,
  receiptShowLogo: r.receipt_show_logo, receiptShowTax: r.receipt_show_tax,
  receiptShowBarcode: r.receipt_show_barcode,
  receiptTheme: r.receipt_theme as StoreSettings['receiptTheme'],
  timezone: r.timezone,
  invoiceDueDays: r.invoice_due_days ?? 30,
});

const cleanSettings = (settings: StoreSettings): StoreSettings => ({
  ...settings,
  storeName: sanitizeText(settings.storeName),
  storeAddress: sanitizeMultiline(settings.storeAddress),
  storePhone: sanitizeText(settings.storePhone),
  storeEmail: sanitizeEmail(settings.storeEmail),
  storeSenderId: sanitizeText(settings.storeSenderId).replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 11),
  invoiceSmsTemplate: sanitizeMultiline(settings.invoiceSmsTemplate).slice(0, 320),
  paymentSmsTemplate: sanitizeMultiline(settings.paymentSmsTemplate).slice(0, 320),
  storeLogo: sanitizeUrl(settings.storeLogo),
  currency: sanitizeText(settings.currency),
  currencySymbol: sanitizeText(settings.currencySymbol),
  taxLabel: sanitizeText(settings.taxLabel),
  receiptFooter: sanitizeMultiline(settings.receiptFooter),
  timezone: sanitizeText(settings.timezone),
});

function missingOptionalStoreSettingsColumn(error: unknown, column: string) {
  const message = typeof error === 'object' && error !== null && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : String(error ?? '');
  return new RegExp(column, 'i').test(message) && /schema cache|column/i.test(message);
}

const toSettingsRow = (next: StoreSettings): Partial<Row> => ({
  store_name: next.storeName,
  store_address: next.storeAddress,
  store_phone: next.storePhone,
  store_email: next.storeEmail,
  store_sender_id: next.storeSenderId,
  invoice_sms_template: next.invoiceSmsTemplate,
  payment_sms_template: next.paymentSmsTemplate,
  store_logo: next.storeLogo,
  currency: next.currency,
  currency_symbol: next.currencySymbol,
  tax_rate: next.taxRate,
  tax_label: next.taxLabel,
  tax_enabled: next.taxEnabled,
  receipt_footer: next.receiptFooter,
  receipt_show_logo: next.receiptShowLogo,
  receipt_show_tax: next.receiptShowTax,
  receipt_show_barcode: next.receiptShowBarcode,
  receipt_theme: next.receiptTheme,
  timezone: next.timezone,
  invoice_due_days: next.invoiceDueDays,
});

const withoutInvoiceDueDays = (row: Partial<Row>): Partial<Row> => {
  const { invoice_due_days: _invoiceDueDays, ...rest } = row;
  return rest;
};

const withoutStoreSenderId = (row: Partial<Row>): Partial<Row> => {
  const { store_sender_id: _storeSenderId, ...rest } = row;
  return rest;
};

const withoutSmsTemplates = (row: Partial<Row>): Partial<Row> => {
  const {
    invoice_sms_template: _invoiceSmsTemplate,
    payment_sms_template: _paymentSmsTemplate,
    ...rest
  } = row;
  return rest;
};

export function useSettings() {
  const { activeBusiness, activeBusinessId, refreshBusinesses } = useBusiness();
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);

  const businessDefaults = useCallback((): StoreSettings => cleanSettings({
    ...DEFAULT_SETTINGS,
    storeName: activeBusiness?.businessName || DEFAULT_SETTINGS.storeName,
    storeAddress: activeBusiness?.address || DEFAULT_SETTINGS.storeAddress,
    storePhone: activeBusiness?.phone || DEFAULT_SETTINGS.storePhone,
    storeEmail: activeBusiness?.email || DEFAULT_SETTINGS.storeEmail,
    storeLogo: activeBusiness?.logoUrl || '',
  }), [activeBusiness]);

  const saveSettingsRow = useCallback(async (next: StoreSettings) => {
    const row = toSettingsRow(next);
    const payload = { business_id: activeBusinessId, settings_key: 'default', ...row };
    const result = await supabase
      .from('store_settings')
      .upsert(payload, { onConflict: 'business_id,settings_key' });
    if (!result.error) return result;

    const optionalColumnMissing =
      missingOptionalStoreSettingsColumn(result.error, 'invoice_due_days') ||
      missingOptionalStoreSettingsColumn(result.error, 'store_sender_id') ||
      missingOptionalStoreSettingsColumn(result.error, 'invoice_sms_template') ||
      missingOptionalStoreSettingsColumn(result.error, 'payment_sms_template');

    if (!optionalColumnMissing) {
      return result;
    }

    const firstFallback = await supabase
      .from('store_settings')
      .upsert({
        business_id: activeBusinessId,
        settings_key: 'default',
        ...withoutSmsTemplates(withoutStoreSenderId(withoutInvoiceDueDays(row))),
      }, { onConflict: 'business_id,settings_key' });

    return firstFallback;
  }, [activeBusinessId]);

  useEffect(() => {
    (async () => {
      if (!activeBusinessId) return;
      const cached = await loadLocalCollection<StoreSettings>('store_settings');
      if (cached[0]) setSettings(cached[0]);
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('business_id', activeBusinessId)
        .eq('settings_key', 'default')
        .maybeSingle();
      if (data) {
        const defaults = businessDefaults();
        const loaded = toSettings(data as Row);
        const shouldUseBusinessName = !loaded.storeName || loaded.storeName === DEFAULT_SETTINGS.storeName;
        const shouldUseBusinessAddress = !loaded.storeAddress || loaded.storeAddress === DEFAULT_SETTINGS.storeAddress;
        const next = cleanSettings({
          ...loaded,
          storeName: shouldUseBusinessName ? defaults.storeName : loaded.storeName,
          storeAddress: shouldUseBusinessAddress ? defaults.storeAddress : loaded.storeAddress,
        });
        setSettings(next);
        saveLocalCollection('store_settings', [next]);
        if (shouldUseBusinessName || shouldUseBusinessAddress) {
          const { error: hydrateError } = await supabase
            .from('store_settings')
            .update({ store_name: next.storeName, store_address: next.storeAddress })
            .eq('business_id', activeBusinessId)
            .eq('settings_key', 'default');
          if (hydrateError) console.error(hydrateError);
        }
      }
      else if (error) {
        console.error(error);
      }
      else {
        const next = businessDefaults();
        setSettings(next);
        saveLocalCollection('store_settings', [next]);
        const { error: insertError } = await saveSettingsRow(next);
        if (insertError) console.error(insertError);
      }
    })();
  }, [activeBusinessId, businessDefaults, saveSettingsRow]);

  const updateSettings = async (updates: Partial<StoreSettings>) => {
    if (!activeBusinessId) return;
    const next = cleanSettings({ ...settings, ...updates });
    setSettings(next);
    const { error } = await saveSettingsRow(next);
    saveLocalCollection('store_settings', [next]);
    if (error) {
      console.error(error);
      queueLocalMutation('store_settings', 'default', 'update', next);
      throw new Error(error.message || 'Store settings could not be saved to the database.');
    }

    const shouldSyncBusiness =
      'storeName' in updates || 'storeAddress' in updates || 'storePhone' in updates ||
      'storeEmail' in updates || 'storeLogo' in updates;
    if (shouldSyncBusiness && next.storeName) {
      const { error: businessError } = await supabase
        .from('businesses')
        .update({
          business_name: next.storeName,
          address: next.storeAddress,
          phone: next.storePhone,
          email: next.storeEmail,
          logo_url: next.storeLogo,
        })
        .eq('id', activeBusinessId);
      if (businessError) {
        console.error(businessError);
      } else {
        await refreshBusinesses();
      }
    }
  };

  const resetSettings = async () => {
    if (!activeBusinessId) return;
    const next = businessDefaults();
    setSettings(next);
    saveLocalCollection('store_settings', [next]);
    const { error } = await saveSettingsRow(next);
    if (error) queueLocalMutation('store_settings', 'default', 'update', next);
  };

  return { settings, updateSettings, resetSettings };
}
