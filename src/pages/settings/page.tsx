import { useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useSettings } from '@/hooks/useSettings';
import StoreInfoSection from './components/StoreInfoSection';
import TaxSection from './components/TaxSection';
import ReceiptSection from './components/ReceiptSection';

type Tab = 'store' | 'tax' | 'receipt';

const tabs: { key: Tab; label: string; icon: string; desc: string }[] = [
  { key: 'store', label: 'Store Info', icon: 'ri-store-2-line', desc: 'Name, address, contact' },
  { key: 'tax', label: 'Tax & Rates', icon: 'ri-percent-line', desc: 'Tax rates and labels' },
  { key: 'receipt', label: 'Receipt', icon: 'ri-receipt-line', desc: 'Layout and content' },
];

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<Tab>('store');
  const [saved, setSaved] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const handleSave = () => {
    // Settings are auto-saved via localStorage in useSettings, just show feedback
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    resetSettings();
    setShowReset(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <AppLayout>
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
              <p className="text-slate-400 text-sm mt-1">Manage your store configuration and preferences</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowReset(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-100 transition-all cursor-pointer whitespace-nowrap"
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-refresh-line text-sm"></i>
                </span>
                Reset Defaults
              </button>
              <button
                onClick={handleSave}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                  saved
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className={saved ? 'ri-checkbox-circle-fill text-sm' : 'ri-save-line text-sm'}></i>
                </span>
                {saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="flex gap-6">
            {/* Sidebar Tabs */}
            <div className="w-56 flex-shrink-0">
              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                {tabs.map((tab, idx) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full flex items-start gap-3 px-4 py-4 text-left transition-all cursor-pointer ${
                      idx !== 0 ? 'border-t border-slate-100' : ''
                    } ${
                      activeTab === tab.key
                        ? 'bg-indigo-50 border-l-2 border-l-indigo-600'
                        : 'hover:bg-slate-50 border-l-2 border-l-transparent'
                    }`}
                  >
                    <span className={`w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 mt-0.5 ${
                      activeTab === tab.key ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <i className={`${tab.icon} text-base`}></i>
                    </span>
                    <div>
                      <p className={`text-sm font-semibold ${activeTab === tab.key ? 'text-indigo-700' : 'text-slate-700'}`}>
                        {tab.label}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{tab.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Quick Info Card */}
              <div className="mt-4 bg-indigo-600 rounded-xl p-4 text-white">
                <div className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-lg mb-3">
                  <i className="ri-information-line text-white text-base"></i>
                </div>
                <p className="text-sm font-bold mb-1">Auto-saved</p>
                <p className="text-xs text-indigo-200 leading-relaxed">
                  Settings are saved locally. Click &quot;Save Changes&quot; to confirm your updates.
                </p>
              </div>
            </div>

            {/* Content Panel */}
            <div className="flex-1 bg-white rounded-xl border border-slate-100 p-6 lg:p-8">
              {activeTab === 'store' && (
                <StoreInfoSection settings={settings} onChange={updateSettings} />
              )}
              {activeTab === 'tax' && (
                <TaxSection settings={settings} onChange={updateSettings} />
              )}
              {activeTab === 'receipt' && (
                <ReceiptSection settings={settings} onChange={updateSettings} />
              )}
            </div>
          </div>
      {/* Reset Confirmation Modal */}
      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
            <div className="w-12 h-12 flex items-center justify-center bg-amber-100 rounded-xl mb-4">
              <i className="ri-alert-line text-amber-600 text-xl"></i>
            </div>
            <h3 className="text-slate-800 font-bold text-base mb-2">Reset to Defaults?</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              This will reset all settings back to their default values. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowReset(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
