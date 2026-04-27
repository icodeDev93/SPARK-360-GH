import { useState } from 'react';
import Sidebar from '@/components/feature/Sidebar';
import Topbar from '@/components/feature/Topbar';
import ProductGrid from './components/ProductGrid';
import CartPanel from './components/CartPanel';

interface CartItem {
  id: number;
  name: string;
  price: number;
  qty: number;
  image: string;
}

export default function POSPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const handleAddToCart = (item: CartItem) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, item];
    });
  };

  const handleUpdateQty = (id: number, qty: number) => {
    setCartItems((prev) => prev.map((i) => i.id === id ? { ...i, qty } : i));
  };

  const handleRemove = (id: number) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClear = () => setCartItems([]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="ml-64 flex flex-col flex-1">
        <Topbar />
        <div className="pt-16 flex flex-1 h-screen overflow-hidden">
          {/* Product Browser */}
          <div className="flex-1 overflow-hidden flex flex-col border-r border-slate-100 bg-slate-50">
            <ProductGrid onAddToCart={handleAddToCart} />
          </div>
          {/* Cart Panel */}
          <div className="w-80 xl:w-96 flex-shrink-0 flex flex-col overflow-hidden">
            <CartPanel
              items={cartItems}
              onUpdateQty={handleUpdateQty}
              onRemove={handleRemove}
              onClear={handleClear}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
