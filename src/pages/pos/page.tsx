import { useState } from 'react';
import Sidebar from '@/components/feature/Sidebar';
import Topbar from '@/components/feature/Topbar';
import ProductGrid from './components/ProductGrid';
import CartPanel from './components/CartPanel';

interface CartItem {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  qty: number;
  stock: number;
  image: string;
}

export default function POSPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const handleAddToCart = (item: CartItem) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => i.id === item.id ? { ...i, qty: Math.min(i.stock, i.qty + 1) } : i);
      }
      return [...prev, item];
    });
  };

  const handleUpdateQty = (id: string, qty: number) => {
    setCartItems((prev) => prev.map((i) => i.id === id ? { ...i, qty: Math.min(i.stock, Math.max(1, qty)) } : i));
  };

  const handleRemove = (id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClear = () => setCartItems([]);

  const cartCount = cartItems.reduce((sum, i) => sum + i.qty, 0);

  return (
    <div className="h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="lg:ml-64 flex flex-col h-full min-w-0">
        <Topbar />
        <div className="pt-16 flex flex-1 h-screen overflow-hidden min-w-0">
          {/* Product Browser */}
          <div className={`min-w-0 overflow-hidden flex-col border-r border-slate-100 bg-slate-50 ${showCart ? 'hidden' : 'flex'} lg:flex flex-1`}>
            <ProductGrid onAddToCart={handleAddToCart} />
          </div>
          {/* Cart Panel */}
          <div className={`${showCart ? 'flex' : 'hidden'} lg:flex w-full lg:w-80 2xl:lg:w-96 flex-shrink-0 flex-col overflow-hidden`}>
            <CartPanel
              items={cartItems}
              onUpdateQty={handleUpdateQty}
              onRemove={handleRemove}
              onClear={handleClear}
            />
          </div>
        </div>
      </div>

      {/* Mobile toggle button */}
      <button
        onClick={() => setShowCart((v) => !v)}
        className="lg:hidden fixed bottom-5 right-5 z-40 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-5 py-3 shadow-lg flex items-center gap-2 text-sm font-semibold transition-colors"
      >
        <i className={showCart ? 'ri-grid-line text-base' : 'ri-shopping-cart-2-line text-base'}></i>
        {showCart ? 'Products' : `Cart${cartCount > 0 ? ` (${cartCount})` : ''}`}
      </button>
    </div>
  );
}
