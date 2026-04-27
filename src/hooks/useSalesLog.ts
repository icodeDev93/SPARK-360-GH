import { useState } from 'react';

export interface SaleLineItem {
  id: number;
  name: string;
  price: number;
  qty: number;
  image: string;
}

export interface SaleRecord {
  id: string;
  receiptNo: string;
  date: string;
  time: string;
  items: SaleLineItem[];
  subtotal: number;
  tax: number;
  discountAmt: number;
  discount: number;
  grandTotal: number;
  paymentMethod: 'cash' | 'mobile' | 'card';
  cashier: string;
  status: 'completed' | 'refunded';
}

const SALES_KEY = 'spark360_sales_log';

const SEED_SALES: SaleRecord[] = [
  {
    id: 's001',
    receiptNo: 'RCP-001',
    date: 'Apr 20, 2026',
    time: '09:14 AM',
    items: [
      { id: 1, name: 'Samsung Galaxy A15', price: 189.99, qty: 1, image: '' },
      { id: 7, name: 'Screen Protector', price: 8.50, qty: 2, image: '' },
    ],
    subtotal: 206.99,
    tax: 20.70,
    discountAmt: 0,
    discount: 0,
    grandTotal: 227.69,
    paymentMethod: 'cash',
    cashier: 'Ama Owusu',
    status: 'completed',
  },
  {
    id: 's002',
    receiptNo: 'RCP-002',
    date: 'Apr 21, 2026',
    time: '11:32 AM',
    items: [
      { id: 2, name: 'Wireless Earbuds Pro', price: 45.00, qty: 1, image: '' },
      { id: 5, name: 'iPhone 15 Case', price: 12.99, qty: 1, image: '' },
    ],
    subtotal: 57.99,
    tax: 5.80,
    discountAmt: 5.80,
    discount: 10,
    grandTotal: 57.99,
    paymentMethod: 'card',
    cashier: 'Ama Owusu',
    status: 'completed',
  },
  {
    id: 's003',
    receiptNo: 'RCP-003',
    date: 'Apr 22, 2026',
    time: '02:05 PM',
    items: [
      { id: 9, name: 'Mechanical Keyboard', price: 75.00, qty: 1, image: '' },
      { id: 10, name: 'Mouse Wireless', price: 28.00, qty: 1, image: '' },
      { id: 3, name: 'USB-C Cable 2m', price: 8.50, qty: 2, image: '' },
    ],
    subtotal: 120.00,
    tax: 12.00,
    discountAmt: 0,
    discount: 0,
    grandTotal: 132.00,
    paymentMethod: 'mobile',
    cashier: 'Kwame Mensah',
    status: 'completed',
  },
  {
    id: 's004',
    receiptNo: 'RCP-004',
    date: 'Apr 23, 2026',
    time: '04:48 PM',
    items: [
      { id: 6, name: 'Bluetooth Speaker', price: 49.99, qty: 2, image: '' },
    ],
    subtotal: 99.98,
    tax: 10.00,
    discountAmt: 10.00,
    discount: 10,
    grandTotal: 99.98,
    paymentMethod: 'cash',
    cashier: 'Ama Owusu',
    status: 'refunded',
  },
  {
    id: 's005',
    receiptNo: 'RCP-005',
    date: 'Apr 24, 2026',
    time: '10:20 AM',
    items: [
      { id: 8, name: 'Power Bank 20000mAh', price: 35.00, qty: 3, image: '' },
      { id: 4, name: 'Laptop Stand Aluminum', price: 32.00, qty: 1, image: '' },
    ],
    subtotal: 137.00,
    tax: 13.70,
    discountAmt: 0,
    discount: 0,
    grandTotal: 150.70,
    paymentMethod: 'card',
    cashier: 'Kwame Mensah',
    status: 'completed',
  },
  {
    id: 's006',
    receiptNo: 'RCP-006',
    date: 'Apr 25, 2026',
    time: '03:15 PM',
    items: [
      { id: 12, name: 'Polo Shirt (M)', price: 22.00, qty: 2, image: '' },
      { id: 11, name: 'Notebook A5', price: 4.50, qty: 4, image: '' },
    ],
    subtotal: 62.00,
    tax: 6.20,
    discountAmt: 0,
    discount: 0,
    grandTotal: 68.20,
    paymentMethod: 'mobile',
    cashier: 'Ama Owusu',
    status: 'completed',
  },
];

function loadSales(): SaleRecord[] {
  try {
    const stored = localStorage.getItem(SALES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SaleRecord[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  localStorage.setItem(SALES_KEY, JSON.stringify(SEED_SALES));
  return SEED_SALES;
}

export function useSalesLog() {
  const [sales, setSales] = useState<SaleRecord[]>(loadSales);

  const addSale = (sale: Omit<SaleRecord, 'id' | 'receiptNo' | 'date' | 'time' | 'status'>) => {
    const now = new Date();
    const newSale: SaleRecord = {
      ...sale,
      id: `s${Date.now()}`,
      receiptNo: `RCP-${String(Date.now()).slice(-6)}`,
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      status: 'completed',
    };
    setSales((prev) => {
      const next = [newSale, ...prev];
      localStorage.setItem(SALES_KEY, JSON.stringify(next));
      return next;
    });
    return newSale;
  };

  const refundSale = (id: string) => {
    setSales((prev) => {
      const next = prev.map((s) => s.id === id ? { ...s, status: 'refunded' as const } : s);
      localStorage.setItem(SALES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const totalRevenue = sales
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + s.grandTotal, 0);

  const todaySales = sales.filter((s) => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return s.date === today && s.status === 'completed';
  });

  return { sales, addSale, refundSale, totalRevenue, todaySales };
}
