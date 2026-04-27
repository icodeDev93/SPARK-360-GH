import { useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useSuppliers } from '@/hooks/useSuppliers';
import { Supplier, PurchaseOrder } from '@/mocks/suppliers';
import SupplierForm from './components/SupplierForm';
import PurchaseOrderForm from './components/PurchaseOrderForm';

type Tab = 'orders' | 'suppliers';

const ORDER_STATUS_STYLE: Record<string, string> = {
  Received: 'bg-emerald-100 text-emerald-700',
  Pending: 'bg-amber-100 text-amber-700',
  Cancelled: 'bg-red-100 text-red-600',
  Partial: 'bg-indigo-100 text-indigo-700',
};

const PAY_STATUS_STYLE: Record<string, string> = {
  Paid: 'bg-emerald-100 text-emerald-700',
  Unpaid: 'bg-red-100 text-red-600',
  Partial: 'bg-amber-100 text-amber-700',
  Refunded: 'bg-slate-100 text-slate-600',
};

export default function SuppliersPage() {
  const { suppliers, orders, addSupplier, updateSupplier, deleteSupplier, addOrder, updateOrderStatus, getSupplierOrders } = useSuppliers();
  const [tab, setTab] = useState<Tab>('suppliers');
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [orderDetailTarget, setOrderDetailTarget] = useState<PurchaseOrder | null>(null);
  const [defaultSupplierId, setDefaultSupplierId] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = orders.filter((o) => {
    const matchStatus = filterStatus === 'All' || o.status === filterStatus;
    const matchSearch = o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalSpent = orders.filter((o) => o.status !== 'Cancelled').reduce((s, o) => s + o.total, 0);
  const pendingCount = orders.filter((o) => o.status === 'Pending').length;
  const unpaidTotal = orders.filter((o) => o.paymentStatus === 'Unpaid').reduce((s, o) => s + o.total, 0);

  const handleNewOrderForSupplier = (supplierId: string) => {
    setDefaultSupplierId(supplierId);
    setShowOrderForm(true);
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-slate-800 font-bold text-xl">Suppliers & Purchase Orders</h2>
          <p className="text-slate-400 text-sm mt-0.5">Manage your supplier relationships and track orders</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setDefaultSupplierId(undefined); setShowOrderForm(true); }}
            className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
          >
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-file-add-line text-base"></i></span>
            New Order
          </button>
          <button
            onClick={() => { setEditSupplier(null); setShowSupplierForm(true); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer whitespace-nowrap"
          >
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-add-line text-base"></i></span>
            Add Supplier
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Suppliers', value: String(suppliers.filter((s) => s.status === 'active').length), sub: `${suppliers.filter((s) => s.status === 'inactive').length} inactive`, icon: 'ri-store-3-line', color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Total Orders', value: String(orders.length), sub: `${pendingCount} pending`, icon: 'ri-file-list-3-line', color: 'bg-amber-50 text-amber-600' },
          { label: 'Total Spent', value: `₵${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 0 })}`, sub: 'All time', icon: 'ri-money-dollar-circle-line', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Unpaid Balance', value: `₵${unpaidTotal.toLocaleString('en-US', { minimumFractionDigits: 0 })}`, sub: `${orders.filter((o) => o.paymentStatus === 'Unpaid').length} orders`, icon: 'ri-bank-card-line', color: 'bg-red-50 text-red-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
            <div className={`w-11 h-11 flex items-center justify-center rounded-xl flex-shrink-0 ${s.color}`}>
              <i className={`${s.icon} text-xl`}></i>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{s.label}</p>
              <p className="text-slate-900 text-xl font-bold mt-0.5 font-mono">{s.value}</p>
              <p className="text-slate-400 text-xs">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit mb-6">
        {(['suppliers', 'orders'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              tab === t ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'suppliers' ? `Suppliers (${suppliers.length})` : `Purchase Orders (${orders.length})`}
          </button>
        ))}
      </div>

      {/* Suppliers Grid */}
      {tab === 'suppliers' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s) => {
            const supplierOrders = getSupplierOrders(s.id);
            const pendingOrders = supplierOrders.filter((o) => o.status === 'Pending').length;
            return (
              <div key={s.id} className="bg-white rounded-xl border border-slate-100 hover:border-indigo-200 transition-all overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 flex items-center justify-center bg-indigo-100 rounded-xl text-indigo-700 font-bold text-lg flex-shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-slate-800 font-bold text-sm truncate">{s.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-slate-400 text-xs">{s.category}</span>
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {s.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditSupplier(s); setShowSupplierForm(true); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                      >
                        <i className="ri-edit-line text-sm"></i>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(s.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                      >
                        <i className="ri-delete-bin-line text-sm"></i>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      <span className="w-4 h-4 flex items-center justify-center text-slate-400"><i className="ri-user-line text-sm"></i></span>
                      <span>{s.contact}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      <span className="w-4 h-4 flex items-center justify-center text-slate-400"><i className="ri-phone-line text-sm"></i></span>
                      <span>{s.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      <span className="w-4 h-4 flex items-center justify-center text-slate-400"><i className="ri-mail-line text-sm"></i></span>
                      <span className="truncate">{s.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      <span className="w-4 h-4 flex items-center justify-center text-slate-400"><i className="ri-map-pin-line text-sm"></i></span>
                      <span>{s.address}</span>
                    </div>
                  </div>

                  {s.notes && (
                    <p className="text-slate-400 text-xs italic border-t border-slate-100 pt-3 mb-3 line-clamp-2">{s.notes}</p>
                  )}

                  <div className="flex gap-3 pt-3 border-t border-slate-100">
                    <div className="flex-1 text-center">
                      <p className="text-slate-800 font-bold text-base">{s.totalOrders}</p>
                      <p className="text-slate-400 text-xs">Orders</p>
                    </div>
                    <div className="w-px bg-slate-100"></div>
                    <div className="flex-1 text-center">
                      <p className="text-slate-800 font-bold text-base">₵{(s.totalSpent / 1000).toFixed(1)}k</p>
                      <p className="text-slate-400 text-xs">Total Spent</p>
                    </div>
                    <div className="w-px bg-slate-100"></div>
                    <div className="flex-1 text-center">
                      <p className={`font-bold text-base ${pendingOrders > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{pendingOrders}</p>
                      <p className="text-slate-400 text-xs">Pending</p>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-4">
                  <button
                    onClick={() => { setSelectedSupplier(s); setTab('orders'); }}
                    className="w-full py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 transition-all cursor-pointer whitespace-nowrap"
                  >
                    View Orders
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Purchase Orders Table */}
      {tab === 'orders' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 max-w-xs">
              <span className="w-4 h-4 flex items-center justify-center text-slate-400"><i className="ri-search-line text-sm"></i></span>
              <input
                type="text"
                placeholder="Search order ID or supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none flex-1"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {['All', 'Pending', 'Received', 'Partial', 'Cancelled'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'
                  }`}
                >
                  {s}
                </button>
              ))}
              {selectedSupplier && (
                <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
                  <i className="ri-filter-line text-xs"></i>
                  {selectedSupplier.name}
                  <button onClick={() => setSelectedSupplier(null)} className="ml-1 cursor-pointer hover:text-indigo-900">
                    <i className="ri-close-line text-xs"></i>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Order ID', 'Supplier', 'Date', 'Expected', 'Items', 'Total', 'Status', 'Payment', 'Actions'].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(selectedSupplier ? filteredOrders.filter((o) => o.supplierId === selectedSupplier.id) : filteredOrders).map((o, i) => (
                    <tr key={o.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                      <td className="px-5 py-3.5"><span className="text-indigo-600 text-sm font-bold font-mono">{o.id}</span></td>
                      <td className="px-5 py-3.5"><span className="text-slate-700 text-sm font-medium">{o.supplierName}</span></td>
                      <td className="px-5 py-3.5"><span className="text-slate-500 text-sm">{o.date}</span></td>
                      <td className="px-5 py-3.5"><span className="text-slate-500 text-sm">{o.expectedDate}</span></td>
                      <td className="px-5 py-3.5"><span className="text-slate-600 text-sm">{o.items}</span></td>
                      <td className="px-5 py-3.5"><span className="text-slate-800 text-sm font-bold font-mono">₵{o.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ORDER_STATUS_STYLE[o.status] || 'bg-slate-100 text-slate-600'}`}>{o.status}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PAY_STATUS_STYLE[o.paymentStatus] || 'bg-slate-100 text-slate-600'}`}>{o.paymentStatus}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setOrderDetailTarget(o)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                          >
                            <i className="ri-eye-line text-sm"></i>
                          </button>
                          {o.status === 'Pending' && (
                            <button
                              onClick={() => updateOrderStatus(o.id, 'Received', 'Paid')}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-all cursor-pointer"
                              title="Mark as Received"
                            >
                              <i className="ri-checkbox-circle-line text-sm"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-5 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="w-10 h-10 flex items-center justify-center text-3xl text-slate-300"><i className="ri-file-list-3-line"></i></span>
                          <p className="text-slate-400 text-sm font-medium">No orders found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Supplier Form */}
      {showSupplierForm && (
        <SupplierForm
          initial={editSupplier ?? undefined}
          onSave={(data) => editSupplier ? updateSupplier(editSupplier.id, data) : addSupplier(data)}
          onClose={() => { setShowSupplierForm(false); setEditSupplier(null); }}
        />
      )}

      {/* Purchase Order Form */}
      {showOrderForm && (
        <PurchaseOrderForm
          suppliers={suppliers}
          defaultSupplierId={defaultSupplierId}
          onSave={addOrder}
          onClose={() => { setShowOrderForm(false); setDefaultSupplierId(undefined); }}
        />
      )}

      {/* Order Detail Modal */}
      {orderDetailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-slate-800 font-bold text-base">Order Details</h2>
                <p className="text-indigo-600 text-xs font-bold font-mono mt-0.5">{orderDetailTarget.id}</p>
              </div>
              <button onClick={() => setOrderDetailTarget(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Supplier', value: orderDetailTarget.supplierName },
                  { label: 'Order Date', value: orderDetailTarget.date },
                  { label: 'Expected', value: orderDetailTarget.expectedDate },
                  { label: 'Items', value: String(orderDetailTarget.items) },
                ].map((f) => (
                  <div key={f.label}>
                    <p className="text-slate-400 text-xs">{f.label}</p>
                    <p className="text-slate-700 font-semibold">{f.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 rounded-xl p-4 flex justify-between items-center">
                <span className="text-slate-600 font-semibold text-sm">Total Amount</span>
                <span className="text-indigo-600 font-bold text-xl font-mono">₵{orderDetailTarget.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 text-center p-3 bg-slate-50 rounded-xl">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ORDER_STATUS_STYLE[orderDetailTarget.status]}`}>{orderDetailTarget.status}</span>
                  <p className="text-slate-400 text-xs mt-1">Order Status</p>
                </div>
                <div className="flex-1 text-center p-3 bg-slate-50 rounded-xl">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PAY_STATUS_STYLE[orderDetailTarget.paymentStatus]}`}>{orderDetailTarget.paymentStatus}</span>
                  <p className="text-slate-400 text-xs mt-1">Payment</p>
                </div>
              </div>
              {orderDetailTarget.notes && (
                <div className="bg-indigo-50 rounded-xl p-3">
                  <p className="text-indigo-600 text-xs font-semibold mb-1">Notes</p>
                  <p className="text-slate-600 text-sm">{orderDetailTarget.notes}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100">
              <button onClick={() => setOrderDetailTarget(null)} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold cursor-pointer whitespace-nowrap transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Supplier Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
            <div className="w-12 h-12 flex items-center justify-center bg-red-100 rounded-xl mb-4">
              <i className="ri-delete-bin-line text-red-600 text-xl"></i>
            </div>
            <h3 className="text-slate-800 font-bold text-base mb-2">Delete Supplier?</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">This supplier and their data will be permanently removed. Purchase orders will remain in history.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 cursor-pointer whitespace-nowrap transition-all">Cancel</button>
              <button onClick={() => { deleteSupplier(deleteTarget); setDeleteTarget(null); }} className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-bold cursor-pointer whitespace-nowrap transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
