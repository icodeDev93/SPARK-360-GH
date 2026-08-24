import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/contexts/BusinessContext';
import { useInventory } from '@/hooks/useInventory';
import { supabase } from '@/lib/supabase';
import { sanitizeMultiline, sanitizeText } from '@/lib/sanitize';
import { writeLog } from '@/lib/activityLog';
import { useFeedbackModal } from '@/hooks/useFeedbackModal';
import type { InventoryItem } from '@/types/erp';
import {
  dateRangeLabel,
  exportRowsCsv,
  exportRowsPdf,
  formatExportDate,
  isWithinDateRange,
  type ExportColumn,
} from '@/lib/exportRecords';

interface TransferRow {
  id: string;
  transfer_number: string;
  source_business_id: string;
  target_business_id: string;
  product_code: string;
  product_name: string;
  category_name: string | null;
  quantity: number;
  status: 'completed' | 'reversed';
  notes: string | null;
  created_at: string;
}

export default function StockTransferPage() {
  const { currentUser } = useAuth();
  const { businesses, activeBusinessId } = useBusiness();
  const { items } = useInventory();
  const { showFeedback } = useFeedbackModal();
  const [targetBusinessId, setTargetBusinessId] = useState('');
  const [productCode, setProductCode] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productListOpen, setProductListOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const availableTargets = businesses.filter((business) => business.status === 'active' && business.id !== activeBusinessId);
  const firstTargetId = availableTargets[0]?.id ?? '';
  const selectedItem = useMemo(
    () => items.find((item) => item.itemId === productCode),
    [items, productCode],
  );
  const filteredItems = useMemo(() => {
    const query = sanitizeText(productSearch).toLowerCase();
    if (!query) return items.slice(0, 8);
    return items
      .filter((item) =>
        item.itemId.toLowerCase().includes(query) ||
        item.productName.toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [items, productSearch]);
  const filteredTransfers = useMemo(
    () => transfers.filter((transfer) => isWithinDateRange(transfer.created_at, startDate, endDate)),
    [transfers, startDate, endDate],
  );
  const transferColumns: ExportColumn<TransferRow>[] = [
    { header: 'Transfer No.', value: (transfer) => transfer.transfer_number },
    { header: 'Product Code', value: (transfer) => transfer.product_code },
    { header: 'Product Name', value: (transfer) => transfer.product_name },
    { header: 'Category', value: (transfer) => transfer.category_name },
    { header: 'Quantity', value: (transfer) => transfer.quantity },
    { header: 'Source Business', value: (transfer) => businesses.find((business) => business.id === transfer.source_business_id)?.businessName ?? 'Source' },
    { header: 'Receiving Business', value: (transfer) => businesses.find((business) => business.id === transfer.target_business_id)?.businessName ?? 'Target' },
    { header: 'Status', value: (transfer) => transfer.status },
    { header: 'Notes', value: (transfer) => transfer.notes },
    { header: 'Created At', value: (transfer) => formatExportDate(transfer.created_at) },
  ];

  const exportTransfers = (format: 'csv' | 'pdf') => {
    const options = {
      title: 'Stock Transfer History',
      filename: `stock-transfer-history-${new Date().toISOString().slice(0, 10)}`,
      subtitle: dateRangeLabel(startDate, endDate),
      columns: transferColumns,
      rows: filteredTransfers,
      totals: [
        { label: 'Transfers', value: String(filteredTransfers.length) },
        { label: 'Total Quantity', value: String(filteredTransfers.reduce((sum, transfer) => sum + transfer.quantity, 0)) },
      ],
    };
    if (format === 'csv') exportRowsCsv(options);
    else exportRowsPdf(options);
  };

  useEffect(() => {
    setTargetBusinessId(firstTargetId);
  }, [firstTargetId]);

  useEffect(() => {
    if (!productCode) return;
    const item = items.find((candidate) => candidate.itemId === productCode);
    if (item) setProductSearch(`${item.itemId} - ${item.productName}`);
  }, [items, productCode]);

  const showWarning = (message: string, title = 'Transfer Warning') => {
    showFeedback({
      title,
      message,
      buttonLabel: 'OK',
      kind: 'warning',
    });
  };

  useEffect(() => {
    if (!activeBusinessId) return;
    supabase
      .from('stock_transfers')
      .select('*')
      .or(`source_business_id.eq.${activeBusinessId},target_business_id.eq.${activeBusinessId}`)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error: fetchError }) => {
        if (fetchError) console.error(fetchError);
        else setTransfers((data ?? []) as TransferRow[]);
      });
  }, [activeBusinessId]);

  const handleTransfer = async () => {
    if (!activeBusinessId || !currentUser) return;
    if (!targetBusinessId) {
      showWarning('Choose a receiving business.');
      return;
    }
    if (!availableTargets.some((business) => business.id === targetBusinessId)) {
      showFeedback({
        title: 'Invalid Receiving Business',
        message: 'Select an active receiving business before transferring stock.',
        kind: 'warning',
        buttonLabel: 'Continue',
      });
      return;
    }
    if (!productCode) {
      showWarning('Choose a product to transfer.');
      return;
    }
    if (quantity <= 0) {
      showWarning('Quantity must be greater than zero.');
      return;
    }
    if (selectedItem && quantity > selectedItem.currentStock) {
      showWarning('The source business does not have enough stock.');
      return;
    }

    setSaving(true);
    const { data, error: rpcError } = await supabase.rpc('transfer_stock', {
      source_business: activeBusinessId,
      target_business: targetBusinessId,
      source_product_code: sanitizeText(productCode).toUpperCase(),
      transfer_quantity: quantity,
      transfer_notes: sanitizeMultiline(notes),
    });
    setSaving(false);

    if (rpcError) {
      showWarning(rpcError.message);
      return;
    }

    if (data) setTransfers((prev) => [data as TransferRow, ...prev]);
    await writeLog(currentUser, {
      category: 'inventory',
      action: 'edit',
      description: `Transferred ${quantity} ${selectedItem?.productName ?? productCode} to ${businesses.find((b) => b.id === targetBusinessId)?.businessName ?? 'another business'}`,
    });
    showFeedback({
      title: 'Stock Transferred',
      message: 'The stock transfer has been completed successfully.',
      buttonLabel: 'Continue',
    });
    setProductCode('');
    setProductSearch('');
    setQuantity(1);
    setNotes('');
  };

  const reverseTransfer = async (transferId: string) => {
    if (!currentUser) return;
    const { data, error: rpcError } = await supabase.rpc('reverse_stock_transfer', { transfer_id: transferId });
    if (rpcError) {
      showWarning(rpcError.message);
      return;
    }
    if (data) {
      setTransfers((prev) => prev.map((transfer) => transfer.id === transferId ? data as TransferRow : transfer));
      await writeLog(currentUser, {
        category: 'inventory',
        action: 'edit',
        description: `Reversed stock transfer ${(data as TransferRow).transfer_number}`,
      });
      showFeedback({ title: 'Transfer Reversed', message: 'The stock transfer has been reversed.', buttonLabel: 'Continue' });
    }
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h2 className="text-slate-800 font-bold text-xl">Stock Transfer</h2>
        <p className="text-slate-400 text-sm mt-0.5">Move stock immediately between businesses under this account.</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white border border-slate-100 rounded-xl p-5 max-w-2xl">
          <h3 className="text-slate-800 font-bold text-base mb-4">New Transfer</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Receiving Business</label>
              <select value={targetBusinessId} onChange={(e) => setTargetBusinessId(e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400">
                {availableTargets.map((business) => <option key={business.id} value={business.id}>{business.businessName}</option>)}
              </select>
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Product</label>
              <input
                type="search"
                value={productSearch}
                onChange={(event) => {
                  const value = event.target.value;
                  const cleanedValue = sanitizeText(value);
                  setProductSearch(value);
                  setProductCode('');
                  setProductListOpen(true);
                  const exact = items.find((item) =>
                    item.itemId.toLowerCase() === cleanedValue.toLowerCase() ||
                    item.productName.toLowerCase() === cleanedValue.toLowerCase(),
                  );
                  if (exact) setProductCode(exact.itemId);
                }}
                onFocus={() => setProductListOpen(true)}
                onBlur={() => window.setTimeout(() => setProductListOpen(false), 140)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
                placeholder="Search by product code or name"
              />
              {productListOpen && (
                <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {filteredItems.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-400">No matching product found</p>
                  ) : filteredItems.map((item) => (
                    <button
                      key={item.itemId}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setProductCode(item.itemId);
                        setProductSearch(`${item.itemId} - ${item.productName}`);
                        setProductListOpen(false);
                      }}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-indigo-50"
                    >
                      <span>
                        <span className="block text-sm font-semibold text-slate-800">{item.productName}</span>
                        <span className="block text-xs font-mono text-slate-400">{item.itemId}</span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-slate-500">{item.currentStock} in stock</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedItem && <ProductPricePreview item={selectedItem} />}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Quantity</label>
              <input type="number" min={1} max={selectedItem?.currentStock ?? undefined} value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 0)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400 resize-none" placeholder="Optional transfer notes" />
            </div>
            <button type="button" onClick={handleTransfer} disabled={saving || !availableTargets.length} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-bold">
              {saving ? 'Transferring...' : 'Transfer Stock'}
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-slate-800 font-bold text-base">Transfer History</h3>
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-slate-200 bg-white rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none" title="Start date" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-slate-200 bg-white rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none" title="End date" />
              <div className="flex items-center gap-2">
                <button onClick={() => exportTransfers('csv')} className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap">
                  <i className="ri-file-excel-2-line text-base"></i>
                  Export to CSV
                </button>
                <button onClick={() => exportTransfers('pdf')} className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap">
                  <i className="ri-file-pdf-2-line text-base"></i>
                  Export to PDF
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  {['Transfer No.', 'Product', 'Quantity', 'Direction', 'Status', 'Actions'].map((head) => (
                    <th key={head} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">No transfers recorded</td></tr>
                ) : filteredTransfers.map((transfer) => {
                  const source = businesses.find((business) => business.id === transfer.source_business_id)?.businessName ?? 'Source';
                  const target = businesses.find((business) => business.id === transfer.target_business_id)?.businessName ?? 'Target';
                  return (
                    <tr key={transfer.id} className="border-t border-slate-50">
                      <td className="px-5 py-3 text-xs font-mono text-slate-500">{transfer.transfer_number}</td>
                      <td className="px-5 py-3">
                        <p className="text-sm font-semibold text-slate-800">{transfer.product_name}</p>
                        <p className="text-xs text-slate-400 font-mono">{transfer.product_code}</p>
                      </td>
                      <td className="px-5 py-3 text-sm font-bold text-slate-700">{transfer.quantity}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">{source} -&gt; {target}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${transfer.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{transfer.status}</span>
                      </td>
                      <td className="px-5 py-3">
                        <button type="button" onClick={() => reverseTransfer(transfer.id)} disabled={transfer.status === 'reversed'} className="text-xs font-bold text-indigo-600 disabled:text-slate-300">Reverse</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function ProductPricePreview({ item }: { item: InventoryItem }) {
  const prices = [
    ['Wholesale Cost', item.wholesaleCostPrice],
    ['Single Cost', item.singleCostPrice],
    ['Wholesale SP', item.wholesaleSellingPrice],
    ['Half SP', item.halfSellingPrice],
    ['Quarter SP', item.quarterSellingPrice],
    ['Single SP', item.singleSellingPrice],
  ];

  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-800">{item.productName}</p>
          <p className="text-xs text-slate-500">{item.category || 'No category'} - {item.currentStock} available</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-mono font-semibold text-indigo-700">{item.itemId}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {prices.map(([label, value]) => (
          <div key={label} className="rounded-md bg-white px-3 py-2">
            <p className="text-[11px] font-semibold uppercase text-slate-400">{label}</p>
            <p className="text-sm font-bold text-slate-700">₵{Number(value || 0).toFixed(2)}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">These prices will be copied to the receiving business product.</p>
    </div>
  );
}
