import { useRef } from 'react';
import { useSettings } from '@/hooks/useSettings';
import type { PaymentMethod } from '@/types/erp';

interface CartItem {
  id: number;
  name: string;
  price: number;
  qty: number;
  image: string;
}

interface ReceiptModalProps {
  items: CartItem[];
  subtotal: number;
  tax: number;
  discountAmt: number;
  grandTotal: number;
  discount: number;
  paymentMethod: PaymentMethod;
  onClose: () => void;
  onNewSale: () => void;
}

function generateReceiptNo() {
  const ts = Date.now().toString().slice(-6);
  return `RCP-${ts}`;
}

const paymentLabels: Record<string, string> = {
  'Cash': 'Cash',
  'MoMo': 'Mobile Money',
  'Cheque': 'Cheque',
  'Bank Transfer': 'Bank Transfer',
};

const paymentIcons: Record<string, string> = {
  'Cash': 'ri-money-dollar-circle-line',
  'MoMo': 'ri-smartphone-line',
  'Cheque': 'ri-file-text-line',
  'Bank Transfer': 'ri-bank-line',
};

export default function ReceiptModal({
  items,
  subtotal,
  tax,
  discountAmt,
  grandTotal,
  discount,
  paymentMethod,
  onClose,
  onNewSale,
}: ReceiptModalProps) {
  const { settings } = useSettings();
  const receiptRef = useRef<HTMLDivElement>(null);
  const receiptNo = useRef(generateReceiptNo()).current;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=420,height=800');
    if (!win) return;

    const headerBg  = settings.receiptTheme === 'classic' ? '#1e293b' : settings.receiptTheme === 'minimal' ? '#f1f5f9' : '#4f46e5';
    const headerTxt = settings.receiptTheme === 'minimal' ? '#1e293b' : '#ffffff';
    const headerSub = settings.receiptTheme === 'minimal' ? '#64748b' : 'rgba(255,255,255,0.82)';
    const totalColor = settings.receiptTheme === 'modern' ? '#4f46e5' : '#1e293b';

    const itemsHtml = items.map((item) => `
      <div style="display:flex;align-items:flex-start;margin-bottom:8px;font-size:11px;">
        <div style="flex:1;padding-right:6px;">
          <div style="font-weight:700;color:#1e293b;">${item.name}</div>
          <div style="color:#94a3b8;font-size:10px;margin-top:1px;">${settings.currencySymbol}${item.price.toFixed(2)} each</div>
        </div>
        <div style="width:36px;text-align:center;color:#475569;">x${item.qty}</div>
        <div style="width:76px;text-align:right;font-weight:700;color:#1e293b;">${settings.currencySymbol}${(item.price * item.qty).toFixed(2)}</div>
      </div>`).join('');

    const taxHtml = settings.receiptShowTax && settings.taxEnabled
      ? `<div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:5px;">
           <span>${settings.taxLabel} (${settings.taxRate}%)</span>
           <span>${settings.currencySymbol}${tax.toFixed(2)}</span>
         </div>` : '';

    const discountHtml = discount > 0
      ? `<div style="display:flex;justify-content:space-between;font-size:11px;color:#059669;margin-bottom:5px;">
           <span>Discount (${discount}%)</span>
           <span>-${settings.currencySymbol}${discountAmt.toFixed(2)}</span>
         </div>` : '';

    const barcodeHtml = settings.receiptShowBarcode ? (() => {
      // seed bar widths from receipt number characters for unique-per-receipt pattern
      const seed = receiptNo.replace(/\D/g, '').split('').map(Number);
      const widths = [2,1,3,1,2,2,1,3,2,1,2,3,1,2,1,3,2,1,2,2,1,3,1,2,3,1,2,1,3,2].map(
        (w, i) => w + (seed[i % seed.length] % 2)
      );
      let x = 0;
      const rects = widths.map((w, i) => {
        const rect = i % 2 === 0
          ? `<rect x="${x}" y="0" width="${w * 2}" height="40" fill="#1e293b"/>`
          : '';
        x += w * 2 + 2;
        return rect;
      }).join('');
      const svgW = x;
      const svg = `<svg width="${svgW}" height="40" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">${rects}</svg>`;
      return `<div style="border-top:1px dashed #e2e8f0;padding:10px 14px;text-align:center;">
                ${svg}
                <div style="font-size:10px;color:#94a3b8;letter-spacing:3px;margin-top:5px;">${receiptNo}</div>
              </div>`;
    })() : '';

    const footerHtml = settings.receiptFooter
      ? `<div style="border-top:1px dashed #e2e8f0;padding:8px 14px 14px;text-align:center;">
           <p style="font-size:10px;color:#94a3b8;line-height:1.6;font-style:italic;">${settings.receiptFooter}</p>
         </div>` : '';

    const logoHtml = settings.receiptShowLogo
      ? `<div style="width:38px;height:38px;background:rgba(255,255,255,0.2);border-radius:9px;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;font-size:18px;color:#fff;">🏪</div>`
      : '';

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt ${receiptNo}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 80mm; font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; background: #fff; color: #1e293b; }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="background:${headerBg};color:${headerTxt};text-align:center;padding:18px 14px 14px;">
    ${logoHtml}
    <div style="font-size:15px;font-weight:800;margin-bottom:3px;">${settings.storeName}</div>
    <div style="font-size:10px;color:${headerSub};line-height:1.6;">${settings.storeAddress}</div>
    ${settings.storePhone ? `<div style="font-size:10px;color:${headerSub};">${settings.storePhone}</div>` : ''}
  </div>

  <!-- Meta -->
  <div style="padding:10px 14px;border-top:1px dashed #e2e8f0;">
    <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:11px;">
      <span style="color:#64748b;">Receipt No.</span>
      <span style="font-weight:700;color:#1e293b;">${receiptNo}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:11px;">
      <span style="color:#64748b;">Date</span>
      <span style="color:#1e293b;">${dateStr}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:11px;">
      <span style="color:#64748b;">Time</span>
      <span style="color:#1e293b;">${timeStr}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11px;">
      <span style="color:#64748b;">Payment</span>
      <span style="color:#1e293b;font-weight:500;">${paymentLabels[paymentMethod]}</span>
    </div>
  </div>

  <!-- Items -->
  <div style="padding:10px 14px;border-top:1px dashed #e2e8f0;">
    <div style="display:flex;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:6px;border-bottom:1px solid #e2e8f0;margin-bottom:8px;">
      <div style="flex:1;">Item</div>
      <div style="width:36px;text-align:center;">Qty</div>
      <div style="width:76px;text-align:right;">Amount</div>
    </div>
    ${itemsHtml}
  </div>

  <!-- Totals -->
  <div style="background:#f8fafc;padding:10px 14px;border-top:1px dashed #e2e8f0;">
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:5px;">
      <span>Subtotal</span>
      <span>${settings.currencySymbol}${subtotal.toFixed(2)}</span>
    </div>
    ${taxHtml}
    ${discountHtml}
    <div style="display:flex;justify-content:space-between;padding-top:7px;border-top:1px solid #cbd5e1;margin-top:3px;">
      <span style="font-weight:800;font-size:13px;color:#1e293b;">TOTAL</span>
      <span style="font-weight:800;font-size:15px;color:${totalColor};">${settings.currencySymbol}${grandTotal.toFixed(2)}</span>
    </div>
  </div>

  ${barcodeHtml}
  ${footerHtml}

  <script>window.onload = function() { window.print(); window.close(); }<\/script>
</body>
</html>`);
    win.document.close();
  };

  const themeClasses = {
    minimal: { header: 'bg-white', accent: 'text-slate-800', divider: 'border-dashed border-slate-300' },
    classic: { header: 'bg-slate-800 text-white', accent: 'text-slate-900', divider: 'border-dashed border-slate-400' },
    modern: { header: 'bg-indigo-600 text-white', accent: 'text-indigo-700', divider: 'border-dashed border-indigo-200' },
  };
  const theme = themeClasses[settings.receiptTheme];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-emerald-100 rounded-xl">
              <i className="ri-checkbox-circle-fill text-emerald-600 text-xl"></i>
            </div>
            <div>
              <h2 className="text-slate-800 font-bold text-base">Sale Complete!</h2>
              <p className="text-slate-400 text-xs">Receipt #{receiptNo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div
            ref={receiptRef}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden font-mono text-sm"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            {/* Receipt Header */}
            <div className={`px-5 py-4 text-center ${settings.receiptTheme === 'minimal' ? 'bg-slate-50' : settings.receiptTheme === 'classic' ? 'bg-slate-800 text-white' : 'bg-indigo-600 text-white'}`}>
              {settings.receiptShowLogo && (
                <div className="flex justify-center mb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${settings.receiptTheme === 'minimal' ? 'bg-indigo-600' : 'bg-white/20'}`}>
                    <i className={`ri-store-2-line text-xl ${settings.receiptTheme === 'minimal' ? 'text-white' : 'text-white'}`}></i>
                  </div>
                </div>
              )}
              <p className={`font-bold text-base ${settings.receiptTheme === 'minimal' ? 'text-slate-800' : 'text-white'}`}>
                {settings.storeName}
              </p>
              <p className={`text-xs mt-0.5 ${settings.receiptTheme === 'minimal' ? 'text-slate-500' : 'text-white/80'}`}>
                {settings.storeAddress}
              </p>
              {settings.storePhone && (
                <p className={`text-xs ${settings.receiptTheme === 'minimal' ? 'text-slate-500' : 'text-white/80'}`}>
                  {settings.storePhone}
                </p>
              )}
            </div>

            {/* Receipt Meta */}
            <div className="px-5 py-3 border-t border-dashed border-slate-200 bg-white">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Receipt No.</span>
                <span className="font-bold text-slate-700">{receiptNo}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Date</span>
                <span className="text-slate-700">{dateStr}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Time</span>
                <span className="text-slate-700">{timeStr}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Payment</span>
                <span className="flex items-center gap-1 text-slate-700">
                  <i className={`${paymentIcons[paymentMethod]} text-xs`}></i>
                  {paymentLabels[paymentMethod]}
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="px-5 py-3 border-t border-dashed border-slate-200 bg-white">
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <span className="flex-1">Item</span>
                <span className="w-10 text-center">Qty</span>
                <span className="w-20 text-right">Amount</span>
              </div>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-slate-800 font-semibold truncate">{item.name}</p>
                      <p className="text-slate-400">{settings.currencySymbol}{item.price.toFixed(2)} each</p>
                    </div>
                    <span className="w-10 text-center text-slate-600 font-mono">x{item.qty}</span>
                    <span className="w-20 text-right text-slate-800 font-bold font-mono">
                      {settings.currencySymbol}{(item.price * item.qty).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="px-5 py-3 border-t border-dashed border-slate-200 bg-slate-50">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-mono text-slate-700">{settings.currencySymbol}{subtotal.toFixed(2)}</span>
                </div>
                {settings.receiptShowTax && settings.taxEnabled && (
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{settings.taxLabel} ({settings.taxRate}%)</span>
                    <span className="font-mono text-slate-700">{settings.currencySymbol}{tax.toFixed(2)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600">
                    <span>Discount ({discount}%)</span>
                    <span className="font-mono">-{settings.currencySymbol}{discountAmt.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-300">
                  <span className="text-slate-800 font-bold text-sm">TOTAL</span>
                  <span className={`font-bold text-base font-mono ${settings.receiptTheme === 'modern' ? 'text-indigo-600' : 'text-slate-900'}`}>
                    {settings.currencySymbol}{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Barcode */}
            {settings.receiptShowBarcode && (
              <div className="px-5 py-3 border-t border-dashed border-slate-200 bg-white text-center">
                <div className="flex justify-center gap-px mb-1">
                  {receiptNo.split('').map((char, i) => (
                    <div
                      key={i}
                      className="bg-slate-800"
                      style={{
                        width: char === '-' ? '4px' : `${(i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1)}px`,
                        height: '32px',
                      }}
                    />
                  ))}
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={`b${i}`}
                      className={i % 3 === 0 ? 'bg-slate-800' : i % 2 === 0 ? 'bg-slate-400' : 'bg-transparent'}
                      style={{ width: `${i % 3 === 0 ? 3 : 2}px`, height: '32px' }}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-400 tracking-widest">{receiptNo}</p>
              </div>
            )}

            {/* Footer */}
            {settings.receiptFooter && (
              <div className="px-5 py-3 border-t border-dashed border-slate-200 bg-white text-center">
                <p className="text-xs text-slate-400 leading-relaxed">{settings.receiptFooter}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap"
          >
            <span className="w-5 h-5 flex items-center justify-center">
              <i className="ri-printer-line text-base"></i>
            </span>
            Print Receipt
          </button>
          <button
            onClick={onNewSale}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all cursor-pointer whitespace-nowrap"
          >
            <span className="w-5 h-5 flex items-center justify-center">
              <i className="ri-add-line text-base"></i>
            </span>
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
}
