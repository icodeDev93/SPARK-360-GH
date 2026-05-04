import { useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useSalesLog } from '@/hooks/useSalesLog';
import { useAuth } from '@/hooks/useAuth';
import { calcLineItem } from '@/services/salesService';
import type { PaymentMethod } from '@/types/erp';
import ReceiptModal from './ReceiptModal';

interface CartItem {
  id: number;
  name: string;
  price: number;
  qty: number;
  image: string;
}

interface CartPanelProps {
  items: CartItem[];
  onUpdateQty: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
}

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'Cash',          label: 'Cash',   icon: 'ri-money-dollar-circle-line' },
  { key: 'MoMo',          label: 'MoMo',   icon: 'ri-smartphone-line' },
  { key: 'Cheque',        label: 'Cheque', icon: 'ri-file-text-line' },
  { key: 'Bank Transfer', label: 'Bank',   icon: 'ri-bank-line' },
];

export default function CartPanel({ items, onUpdateQty, onRemove, onClear }: CartPanelProps) {
  const { settings } = useSettings();
  const { addInvoice } = useSalesLog();
  const { currentUser } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [discount, setDiscount] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);

  const taxRate    = settings.taxEnabled ? settings.taxRate / 100 : 0;
  const subtotal   = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tax        = subtotal * taxRate;
  const discountAmt = (subtotal * discount) / 100;
  const grandTotal = subtotal + tax - discountAmt;

  const handleCompleteSale = () => {
    if (items.length === 0) return;
    const saleItems = items.map((item) =>
      calcLineItem(String(item.id), item.name, item.qty, 0, item.price, 0)
    );
    addInvoice({
      customerId:   'walk-in',
      customerName: 'Walk-in Customer',
      items:        saleItems,
      paymentMethod,
      cashier:      currentUser.name,
    });
    setShowReceipt(true);
  };

  const handleNewSale = () => {
    setShowReceipt(false);
    onClear();
    setDiscount(0);
    setPaymentMethod('Cash');
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    onClear();
    setDiscount(0);
    setPaymentMethod('Cash');
  };

  return (
    <>
      <div className="flex flex-col h-full bg-white border-l border-slate-100">
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
              <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-white border border-slate-100">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover object-top" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 text-xs font-semibold truncate">{item.name}</p>
                  <p className="text-indigo-600 text-xs font-bold font-mono">{settings.currencySymbol}{item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => item.qty > 1 ? onUpdateQty(item.id, item.qty - 1) : onRemove(item.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                  >
                    <i className="ri-subtract-line text-xs"></i>
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-slate-800 font-mono">{item.qty}</span>
                  <button
                    onClick={() => onUpdateQty(item.id, item.qty + 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 hover:bg-indigo-100 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 transition-all cursor-pointer"
                  >
                    <i className="ri-add-line text-xs"></i>
                  </button>
                </div>
                <button
                  onClick={() => onRemove(item.id)}
                  className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 transition-all cursor-pointer ml-1"
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
          <div className="grid grid-cols-4 gap-1.5">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.key}
                onClick={() => setPaymentMethod(m.key)}
                className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  paymentMethod === m.key
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                }`}
              >
                <i className={`${m.icon} text-base`}></i>
                {m.label}
              </button>
            ))}
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
            <i className="ri-check-line text-lg"></i>
            Complete Sale
          </button>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && (
        <ReceiptModal
          items={items}
          subtotal={subtotal}
          tax={tax}
          discountAmt={discountAmt}
          grandTotal={grandTotal}
          discount={discount}
          paymentMethod={paymentMethod}
          onClose={handleCloseReceipt}
          onNewSale={handleNewSale}
        />
      )}
    </>
  );
}
