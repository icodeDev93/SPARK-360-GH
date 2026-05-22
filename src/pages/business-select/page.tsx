import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/contexts/BusinessContext';

export default function BusinessSelectPage() {
  const { currentUser, sessionLoading } = useAuth();
  const { businesses, loading, selectBusiness, createBusiness } = useBusiness();
  const [showCreate, setShowCreate] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!sessionLoading && !currentUser) return <Navigate to="/login" replace />;

  const handleCreate = async () => {
    setError('');
    setSaving(true);
    const result = await createBusiness({ businessName });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? 'Unable to create business.');
      return;
    }
    setBusinessName('');
    setShowCreate(false);
  };

  const isOwner = currentUser?.role === 'owner';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center">
                <i className="ri-building-4-line text-white text-xl"></i>
              </div>
              <div>
                <p className="text-slate-400 text-sm font-semibold">SPark360</p>
                <h1 className="text-slate-900 text-2xl font-bold">Select a business</h1>
              </div>
            </div>
            <p className="text-slate-500 text-sm">
              Choose the business you want to manage. All operations will open inside the selected business.
            </p>
          </div>
          {isOwner && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all"
            >
              <i className="ri-add-line text-base"></i>
              Add Business
            </button>
          )}
        </div>

        {loading || sessionLoading ? (
          <div className="bg-white border border-slate-100 rounded-xl p-12 flex flex-col items-center gap-3">
            <i className="ri-loader-4-line animate-spin text-indigo-600 text-2xl"></i>
            <p className="text-slate-400 text-sm">Loading businesses...</p>
          </div>
        ) : businesses.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-xl p-12 text-center">
            <i className="ri-building-line text-4xl text-slate-300"></i>
            <h2 className="text-slate-800 font-bold mt-4">No businesses available</h2>
            <p className="text-slate-400 text-sm mt-1">
              {isOwner ? 'Create the first business to continue.' : 'Ask the owner to assign you to a business.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {businesses.map((business) => (
              <button
                key={business.id}
                type="button"
                onClick={() => selectBusiness(business.id)}
                className="bg-white border border-slate-100 hover:border-indigo-300 hover:shadow-md rounded-xl p-5 text-left transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  <i className="ri-store-2-line text-xl"></i>
                </div>
                <h2 className="text-slate-900 text-base font-bold">{business.businessName}</h2>
                <p className="text-slate-400 text-sm mt-1 line-clamp-2">{business.address || 'No address set'}</p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-indigo-600 text-sm font-bold">
                  Open business
                  <i className="ri-arrow-right-line text-base"></i>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-slate-900 font-bold text-lg">Add Business</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            {error && <div className="mb-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>}
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Business Name</label>
            <input
              autoFocus
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
              placeholder="e.g. SPARK 360 GH"
              maxLength={120}
            />
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 border border-slate-200 rounded-lg py-2.5 text-sm font-semibold text-slate-600">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving || !businessName.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-bold"
              >
                {saving ? 'Saving...' : 'Save Business'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
