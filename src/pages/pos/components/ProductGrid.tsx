import { useState } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { useSettings } from '@/hooks/useSettings';

interface CartItem {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  qty: number;
  stock: number;
  image: string;
}

interface ProductGridProps {
  onAddToCart: (item: CartItem) => void;
}

export default function ProductGrid({ onAddToCart }: ProductGridProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const { items, categories, loading } = useInventory();
  const { settings } = useSettings();

  const posCategories = ['All', ...categories];
  const filtered = items.filter((p) => {
    const q = search.toLowerCase();
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    const matchSearch = p.productName.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
          <span className="w-5 h-5 flex items-center justify-center text-slate-400">
            <i className="ri-search-line text-base"></i>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products or SKU..."
            className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none flex-1"
          />
          {search && (
            <button onClick={() => setSearch('')} className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer">
              <i className="ri-close-line text-sm"></i>
            </button>
          )}
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          {posCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <span className="w-12 h-12 flex items-center justify-center text-3xl mb-2">
              <i className="ri-loader-4-line animate-spin"></i>
            </span>
            <p className="text-sm">Loading inventory...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <span className="w-12 h-12 flex items-center justify-center text-4xl mb-2">
              <i className="ri-search-line"></i>
            </span>
            <p className="text-sm">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((product) => (
              <div
                key={product.itemId}
                className="bg-white border border-slate-100 rounded-xl overflow-hidden hover:border-indigo-200 transition-all group"
              >
                <div className="relative">
                  <div className="w-full h-32 bg-slate-50 overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.productName}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <i className="ri-box-3-line text-4xl text-slate-300"></i>
                      </div>
                    )}
                  </div>
                  <span className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    product.currentStock === 0
                      ? 'bg-red-100 text-red-600'
                      : product.currentStock <= product.reorderLevel
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {product.currentStock} left
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-slate-800 text-sm font-semibold leading-tight line-clamp-2 mb-1">{product.productName}</p>
                  <p className="text-slate-400 text-xs font-mono mb-1">{product.sku}</p>
                  <p className="text-indigo-600 text-base font-bold font-mono">{settings.currencySymbol}{product.sellingPrice.toFixed(2)}</p>
                  <button
                    onClick={() => onAddToCart({
                      id: product.itemId,
                      name: product.productName,
                      price: product.sellingPrice,
                      costPrice: product.costPrice,
                      qty: 1,
                      stock: product.currentStock,
                      image: product.image,
                    })}
                    disabled={product.currentStock === 0}
                    className="mt-2 w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1"
                  >
                    <span className="w-3 h-3 flex items-center justify-center">
                      <i className="ri-add-line text-sm"></i>
                    </span>
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
