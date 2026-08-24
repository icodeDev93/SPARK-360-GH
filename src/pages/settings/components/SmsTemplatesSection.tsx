import { useEffect, useState } from 'react';
import { StoreSettings } from '@/hooks/useSettings';
import { sanitizeMultiline } from '@/lib/sanitize';

interface Props {
  settings: StoreSettings;
  onChange: (updates: Partial<StoreSettings>) => void | Promise<void>;
}

const PLACEHOLDERS = [
  '{business_name}',
  '{customer_name}',
  '{invoice_no}',
  '{receipt_no}',
  '{amount_due}',
  '{amount_paid}',
  '{balance_due}',
  '{payment_method}',
  '{date}',
];

const TEMPLATE_LIMIT = 320;

export default function SmsTemplatesSection({ settings, onChange }: Props) {
  const [invoiceTemplate, setInvoiceTemplate] = useState(settings.invoiceSmsTemplate);
  const [paymentTemplate, setPaymentTemplate] = useState(settings.paymentSmsTemplate);

  useEffect(() => {
    setInvoiceTemplate(settings.invoiceSmsTemplate);
    setPaymentTemplate(settings.paymentSmsTemplate);
  }, [settings.invoiceSmsTemplate, settings.paymentSmsTemplate]);

  const saveTemplate = (
    key: 'invoiceSmsTemplate' | 'paymentSmsTemplate',
    value: string
  ) => {
    const next = sanitizeMultiline(value).slice(0, TEMPLATE_LIMIT);
    if (key === 'invoiceSmsTemplate') setInvoiceTemplate(next);
    if (key === 'paymentSmsTemplate') setPaymentTemplate(next);

    const result = onChange({ [key]: next } as Partial<StoreSettings>);
    if (result && typeof result === 'object' && 'catch' in result) {
      void result.catch((error: unknown) => console.error(error));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-slate-800 font-bold text-base mb-1">SMS Templates</h3>
        <p className="text-slate-400 text-sm">
          Optional message templates for invoice and payment notifications.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5">
        <div>
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <label className="block text-sm font-semibold text-slate-700">Invoice SMS Template</label>
            <span className="text-xs text-slate-400">{invoiceTemplate.length}/{TEMPLATE_LIMIT}</span>
          </div>
          <textarea
            value={invoiceTemplate}
            onChange={(e) => setInvoiceTemplate(e.target.value.slice(0, TEMPLATE_LIMIT))}
            onBlur={(e) => saveTemplate('invoiceSmsTemplate', e.target.value)}
            placeholder="Hello {customer_name}, your invoice {invoice_no} from {business_name} has been created. Amount due: {amount_due}."
            rows={4}
            maxLength={TEMPLATE_LIMIT}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
          />
          <p className="text-xs text-slate-400 mt-1">Leave blank to skip invoice SMS messages for now.</p>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <label className="block text-sm font-semibold text-slate-700">Payment SMS Template</label>
            <span className="text-xs text-slate-400">{paymentTemplate.length}/{TEMPLATE_LIMIT}</span>
          </div>
          <textarea
            value={paymentTemplate}
            onChange={(e) => setPaymentTemplate(e.target.value.slice(0, TEMPLATE_LIMIT))}
            onBlur={(e) => saveTemplate('paymentSmsTemplate', e.target.value)}
            placeholder="Hello {customer_name}, payment of {amount_paid} received for invoice {invoice_no}. Balance left: {balance_due}. Receipt: {receipt_no}."
            rows={4}
            maxLength={TEMPLATE_LIMIT}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
          />
          <p className="text-xs text-slate-400 mt-1">Leave blank to skip payment SMS messages for now.</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-700 mb-3">Available Placeholders</p>
        <div className="flex flex-wrap gap-2">
          {PLACEHOLDERS.map((placeholder) => (
            <span
              key={placeholder}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono text-slate-600"
            >
              {placeholder}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
