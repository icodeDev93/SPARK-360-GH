import { useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useSalesLog } from '@/hooks/useSalesLog';
import { useAuth } from '@/hooks/useAuth';
import { useCustomers } from '@/hooks/useCustomers';
import { useBusiness } from '@/contexts/BusinessContext';
import { calcLineItem, generateReceiptNo } from '@/services/salesService';
import type { PaymentMethod, SalePriceLevel } from '@/types/erp';
import ReceiptModal from './ReceiptModal';
import CustomerSelectModal from './CustomerSelectModal';
import { writeLog } from '@/lib/activityLog';
import { maxQtyForCartItem, PRICE_LEVELS, type CartItem } from '../pricing';

interface CartPanelProps {
  items: CartItem[];
  onUpdateQty: (id: string, qty: number) => void;
  onUpdatePriceLevel: (id: string, priceLevel: SalePriceLevel) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'Cash',          label: 'Cash',   icon: 'ri-money-dollar-circle-line' },
  { key: 'MoMo',          label: 'MoMo',   icon: 'ri-smartphone-line' },
  { key: 'Cheque',        label: 'Cheque', icon: 'ri-file-text-line' },
  { key: 'Bank Transfer', label: 'Bank',   icon: 'ri-bank-line' },
];
const CREDIT_METHOD = { key: 'Credit' as PaymentMethod, label: 'Credit Sale', icon: 'ri-hand-coin-line' };

function productInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function CartPanel({ items, onUpdateQty, onUpdatePriceLevel, onRemove, onClear }: CartPanelProps) {
  const { settings } = useSettings();
  const { addInvoice } = useSalesLog();
  const { currentUser } = useAuth();
  const { customers, addCustomer } = useCustomers();
  const { activeBusinessId } = useBusiness();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [discount, setDiscount] = useState(0);
  const [showPaymentComplete, setShowPaymentComplete] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptNo, setReceiptNo] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [receiptCustomerName, setReceiptCustomerName] = useState('');
  const [creditInvoice, setCreditInvoice] = useState<{ invoiceNo: string; customerName: string; amount: number } | null>(null);

  const taxRate    = settings.taxEnabled ? settings.taxRate / 100 : 0;
  const subtotal   = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tax        = subtotal * taxRate;
  const discountAmt = (subtotal * discount) / 100;
  const grandTotal = subtotal + tax - discountAmt;

  const handleCompleteSale = () => {
    if (items.length === 0) return;
    setShowCustomerModal(true);
  };

  const handleCreditSale = () => {
    setPaymentMethod('Credit');
    if (items.length > 0) setShowCustomerModal(true);
  };

  const handleCustomerConfirm = (customerId: string | null, customerName: string) => {
    setShowCustomerModal(false);
    const saleItems = items.map((item) =>
      calcLineItem(item.id, item.name, item.qty, 0, item.price, item.costPrice, item.priceLevel, item.stockUnitsPerQty)
    );
    const isCreditSale = paymentMethod === 'Credit';
    const nextReceiptNo = isCreditSale ? null : generateReceiptNo();
    setReceiptCustomerName(customerName);
    const invoice = addInvoice({
      receiptNo:    nextReceiptNo,
      customerId:   customerId ?? 'walk-in',
      customerName,
      items:        saleItems,
      paymentMethod,
      cashier:      currentUser.name,
      status:       isCreditSale ? 'credit' : 'completed',
    });
    window.dispatchEvent(new CustomEvent('bizzyapp:inventory-stock-adjusted', {
      detail: {
        businessId: activeBusinessId,
        items: saleItems.map((item) => ({
          productId: item.productId,
          stockUnitsDeducted: item.stockUnitsDeducted,
        })),
      },
    }));
    if (nextReceiptNo) setReceiptNo(nextReceiptNo);
    const saleDescription = isCreditSale
      ? `Created credit invoice ${invoice.invoiceNo} for ${customerName} — ₵${grandTotal.toFixed(2)} (${saleItems.length} item${saleItems.length !== 1 ? 's' : ''})`
      : `Completed sale ${nextReceiptNo} for ${customerName} — ₵${grandTotal.toFixed(2)} via ${paymentMethod} (${saleItems.length} item${saleItems.length !== 1 ? 's' : ''})`;
    writeLog(currentUser, {
      category: isCreditSale ? 'credit' : 'sales', action: 'complete',
      description: saleDescription,
    });
    if (isCreditSale) {
      setCreditInvoice({ invoiceNo: invoice.invoiceNo, customerName, amount: grandTotal });
    } else {
      setShowPaymentComplete(true);
    }
  };

  const handleNewSale = () => {
    setShowPaymentComplete(false);
    setShowReceipt(false);
    onClear();
    setDiscount(0);
    setPaymentMethod('Cash');
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setShowPaymentComplete(false);
    onClear();
    setDiscount(0);
    setPaymentMethod('Cash');
  };

  const handlePrintReceipt = () => {
    setShowPaymentComplete(false);
    setShowReceipt(true);
  };

  const handleCloseCreditInvoice = () => {
    setCreditInvoice(null);
    onClear();
    setDiscount(0);
    setPaymentMethod('Cash');
  };

  return (
    <>
      <div className="flex flex-col h-full min-w-0 bg-white border-l border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-slate-800 font-bold text-base">Current Sale</h2>
            <p className="text-slate-400 text-xs">{items.length} item{items.length !== 1 ? 's' : ''} in cart</p>
          </div>
          {items.length > 0 && (
            <button
              onClick={onClear}
              className="text-red-500 text-xs font-semibold hover:text-red-700 cursor-pointer whitespace-nowrap transition-all"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-300">
              <span className="w-12 h-12 flex items-center justify-center text-4xl mb-2">
                <i className="ri-shopping-cart-2-line"></i>
              </span>
              <p className="text-sm text-slate-400">Cart is empty</p>
              <p className="text-xs text-slate-300 mt-1">Add products to start a sale</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg min-w-0">
                <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover object-top" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-indigo-600">
                      <i className="ri-shopping-bag-3-line text-base leading-none"></i>
                      <span className="text-[10px] font-bold leading-none mt-0.5">{productInitials(item.name)}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 text-xs font-semibold truncate">{item.name}</p>
                  <p className="text-indigo-600 text-xs font-bold font-mono">{settings.currencySymbol}{item.price.toFixed(2)}</p>
                  <select
                    value={item.priceLevel}
                    onChange={(event) => onUpdatePriceLevel(item.id, event.target.value as SalePriceLevel)}
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 outline-none focus:border-indigo-400"
                  >
                    {PRICE_LEVELS.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {item.stockUnitsPerQty} stock unit{item.stockUnitsPerQty !== 1 ? 's' : ''} per {item.priceLevel.toLowerCase()}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => item.qty > 1 ? onUpdateQty(item.id, item.qty - 1) : onRemove(item.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                  >
                    <i className="ri-subtract-line text-xs"></i>
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-slate-800 font-mono">{item.qty}</span>
                  <button
                    onClick={() => onUpdateQty(item.id, item.qty + 1)}
                    disabled={item.qty >= maxQtyForCartItem(item)}
                    className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 hover:bg-indigo-100 hover:border-indigo-300 disabled:bg-slate-100 disabled:text-slate-300 disabled:hover:border-slate-200 text-slate-600 hover:text-indigo-600 transition-all cursor-pointer"
                  >
                    <i className="ri-add-line text-xs"></i>
                  </button>
                </div>
                <button
                  onClick={() => onRemove(item.id)}
                  className="w-6 h-6 flex-shrink-0 flex items-center justify-center text-slate-300 hover:text-red-500 transition-all cursor-pointer"
                >
                  <i className="ri-delete-bin-line text-sm"></i>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Checkout Panel */}
        <div className="border-t border-slate-100 px-5 py-4 space-y-3">
          {/* Discount */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-medium whitespace-nowrap">Discount %</label>
            <input
              type="number" min={0} max={100}
              value={discount}
              onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
              className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-400 font-mono"
            />
          </div>

          {/* Totals */}
          <div className="bg-slate-50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="text-slate-700 font-mono font-semibold">{settings.currencySymbol}{subtotal.toFixed(2)}</span>
            </div>
            {settings.taxEnabled && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{settings.taxLabel} ({settings.taxRate}%)</span>
                <span className="text-slate-700 font-mono font-semibold">{settings.currencySymbol}{tax.toFixed(2)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-emerald-600">Discount ({discount}%)</span>
                <span className="text-emerald-600 font-mono font-semibold">-{settings.currencySymbol}{discountAmt.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="text-slate-800 font-bold text-base">Grand Total</span>
              <span className="text-indigo-600 font-bold text-xl font-mono">{settings.currencySymbol}{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-4 gap-1.5 min-w-0">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setPaymentMethod(m.key)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer min-w-0 ${
                    paymentMethod === m.key
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                  }`}
                >
                  <i className={`${m.icon} text-base`}></i>
                  <span className="truncate max-w-full px-1">{m.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={handleCreditSale}
              disabled={items.length === 0}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                items.length === 0
                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  : paymentMethod === 'Credit'
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'
              }`}
            >
              <i className={`${CREDIT_METHOD.icon} text-base`}></i>
              <span>{CREDIT_METHOD.label}</span>
              {paymentMethod !== 'Credit' && (
                <span className="text-slate-400 font-normal">(registered customers only)</span>
              )}
            </button>
          </div>

          {/* Complete Sale */}
          <button
            onClick={handleCompleteSale}
            disabled={items.length === 0}
            className={`w-full py-4 rounded-xl font-bold text-base transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 ${
              items.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <i className={`${paymentMethod === 'Credit' ? 'ri-file-list-3-line' : 'ri-check-line'} text-lg`}></i>
            {paymentMethod === 'Credit' ? 'Create Invoice' : 'Complete Sale'}
          </button>
        </div>
      </div>

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <CustomerSelectModal
          customers={customers}
          addCustomer={addCustomer}
          onComplete={handleCustomerConfirm}
          onCancel={() => setShowCustomerModal(false)}
          paymentMethod={paymentMethod}
        />
      )}

      {showPaymentComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-40 bg-indigo-50"></div>
            <div className="absolute inset-x-0 top-0 h-40 opacity-50">
              <div className="grid grid-cols-5 gap-4 p-5 text-white/70">
                {Array.from({ length: 15 }).map((_, index) => (
                  <i key={index} className="ri-sparkling-2-line text-sm"></i>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleNewSale}
              className="absolute right-4 top-4 z-10 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-white/80 hover:text-slate-600 transition-all cursor-pointer"
              aria-label="Close"
            >
              <i className="ri-close-line text-xl"></i>
            </button>

            <div className="relative px-7 pb-7 pt-12 text-center">
              <div className="mx-auto mb-8 w-32 h-32 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-400 to-blue-700 shadow-xl shadow-indigo-200">
                <i className="ri-check-line text-white text-6xl drop-shadow-md"></i>
              </div>

              <h2 className="text-slate-900 text-2xl font-extrabold mb-3">Payment Complete</h2>
              <p className="text-slate-500 text-sm leading-6 mb-5">
                Sale has been recorded for {receiptCustomerName}. You can print the receipt now or continue to a new sale.
              </p>

              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 mb-6 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Receipt No.</span>
                  <span className="font-mono font-bold text-indigo-600">{receiptNo}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Payment</span>
                  <span className="font-semibold text-slate-700">{paymentMethod}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-mono font-bold text-indigo-600">{settings.currencySymbol}{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleNewSale}
                  className="rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <i className="ri-printer-line text-base"></i>
                  Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && (
        <ReceiptModal
          items={items}
          subtotal={subtotal}
          tax={tax}
          discountAmt={discountAmt}
          grandTotal={grandTotal}
          discount={discount}
          receiptNo={receiptNo}
          paymentMethod={paymentMethod}
          customerName={receiptCustomerName}
          onClose={handleCloseReceipt}
          onNewSale={handleNewSale}
        />
      )}

      {creditInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <button
              type="button"
              onClick={handleCloseCreditInvoice}
              className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all cursor-pointer"
              aria-label="Close"
              title="Close"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-violet-100 text-violet-600 mb-4">
              <i className="ri-file-list-3-line text-xl"></i>
            </div>
            <h3 className="text-slate-800 font-bold text-base mb-1">Credit Invoice Created</h3>
            <p className="text-slate-500 text-sm mb-4">
              No receipt has been generated yet. A receipt will be created when this invoice is paid.
            </p>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 mb-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Invoice No.</span>
                <span className="font-mono font-bold text-indigo-600">{creditInvoice.invoiceNo}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Customer</span>
                <span className="font-semibold text-slate-700">{creditInvoice.customerName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Amount Due</span>
                <span className="font-mono font-bold text-violet-600">{settings.currencySymbol}{creditInvoice.amount.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={handleCloseCreditInvoice}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold cursor-pointer transition-all"
            >
              Start New Sale
            </button>
          </div>
        </div>
      )}
    </>
  );
}
