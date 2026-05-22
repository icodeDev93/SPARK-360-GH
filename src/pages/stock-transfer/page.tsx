import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/contexts/BusinessContext';
import { useInventory } from '@/hooks/useInventory';
import { supabase } from '@/lib/supabase';
import { sanitizeMultiline, sanitizeText } from '@/lib/sanitize';
import { writeLog } from '@/lib/activityLog';
import { useFeedbackModal } from '@/hooks/useFeedbackModal';

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
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [transfers, setTransfers] = useState<TransferRow[]>([]);

  const availableTargets = businesses.filter((business) => business.id !== activeBusinessId);
  const firstTargetId = availableTargets[0]?.id ?? '';
  const selectedItem = useMemo(
    () => items.find((item) => item.itemId === productCode),
    [items, productCode],
  );

  useEffect(() => {
    setTargetBusinessId(firstTargetId);
  }, [firstTargetId]);

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
    setError('');
    if (!targetBusinessId) {
      setError('Choose a receiving business.');
      return;
    }
    if (!productCode) {
      setError('Choose a product to transfer.');
      return;
    }
    if (quantity <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }
    if (selectedItem && quantity > selectedItem.currentStock) {
      setError('The source business does not have enough stock.');
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
      setError(rpcError.message);
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
    setQuantity(1);
    setNotes('');
  };

  const reverseTransfer = async (transferId: string) => {
    if (!currentUser) return;
    const { data, error: rpcError } = await supabase.rpc('reverse_stock_transfer', { transfer_id: transferId });
    if (rpcError) {
      setError(rpcError.message);
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

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
        <div className="bg-white border border-slate-100 rounded-xl p-5">
          <h3 className="text-slate-800 font-bold text-base mb-4">New Transfer</h3>
          {error && <div className="mb-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Receiving Business</label>
              <select value={targetBusinessId} onChange={(e) => setTargetBusinessId(e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400">
                {availableTargets.map((business) => <option key={business.id} value={business.id}>{business.businessName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Product</label>
              <select value={productCode} onChange={(e) => setProductCode(e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400">
                <option value="">Select product</option>
                {items.map((item) => <option key={item.itemId} value={item.itemId}>{item.itemId} - {item.productName} ({item.currentStock})</option>)}
              </select>
            </div>
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
                {transfers.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">No transfers recorded</td></tr>
                ) : transfers.map((transfer) => {
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
                      <td className="px-5 py-3 text-xs text-slate-500">{source} → {target}</td>
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
