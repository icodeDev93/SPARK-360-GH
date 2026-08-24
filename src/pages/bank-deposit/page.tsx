import { useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import BulkActionBar from '@/components/ui/BulkActionBar';
import { useBankDeposits } from '@/hooks/useBankDeposits';
import { useBanks } from '@/hooks/useBanks';
import { useAuth } from '@/hooks/useAuth';
import { useFeedbackModal } from '@/hooks/useFeedbackModal';
import { writeLog } from '@/lib/activityLog';
import { sanitizeMultiline, sanitizeText } from '@/lib/sanitize';
import type { BankDepositRecord, BankRecord } from '@/types/erp';
import {
  dateRangeLabel,
  exportRowsCsv,
  exportRowsPdf,
  formatCurrency,
  isWithinDateRange,
  type ExportColumn,
} from '@/lib/exportRecords';

const today = new Date().toISOString().split('T')[0];

function fmt(n: number) {
  return `₵${n.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-0">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm text-slate-800 font-medium break-words">{value || '-'}</div>
    </div>
  );
}

export default function BankDepositPage() {
  const { deposits, loading, addDeposit, updateDeposit, deleteDeposit, totalDeposits } = useBankDeposits();
  const { banks, loading: banksLoading, addBank, updateBank, deleteBank } = useBanks();
  const { currentUser } = useAuth();
  const { showFeedback } = useFeedbackModal();
  const [activeTab, setActiveTab] = useState<'deposits' | 'banks'>('deposits');
  const [showModal, setShowModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [viewDeposit, setViewDeposit] = useState<BankDepositRecord | null>(null);
  const [editDeposit, setEditDeposit] = useState<BankDepositRecord | null>(null);
  const [deleteDepositTarget, setDeleteDepositTarget] = useState<BankDepositRecord | null>(null);
  const [viewBank, setViewBank] = useState<BankRecord | null>(null);
  const [editBank, setEditBank] = useState<BankRecord | null>(null);
  const [deleteBankTarget, setDeleteBankTarget] = useState<BankRecord | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDepositIds, setSelectedDepositIds] = useState<string[]>([]);
  const [bulkDeleteDepositsOpen, setBulkDeleteDepositsOpen] = useState(false);
  const [bulkDeletingDeposits, setBulkDeletingDeposits] = useState(false);
  const [form, setForm] = useState({
    date: today,
    bankId: '',
    accountNo: '',
    amountGHS: 0,
    remarks: '',
  });
  const [bankForm, setBankForm] = useState({
    bankName: '',
    branch: '',
    address: '',
    telephone: '',
  });

  const filteredDeposits = deposits.filter((deposit) => isWithinDateRange(deposit.date, startDate, endDate));
  const filteredTotalDeposits = filteredDeposits.reduce((sum, deposit) => sum + deposit.amountGHS, 0);
  const selectedDeposits = deposits.filter((deposit) => selectedDepositIds.includes(deposit.depositId));
  const visibleDepositIds = filteredDeposits.map((deposit) => deposit.depositId);
  const allVisibleDepositsSelected = visibleDepositIds.length > 0 && visibleDepositIds.every((id) => selectedDepositIds.includes(id));
  const depositColumns: ExportColumn<BankDepositRecord>[] = [
    { header: 'Date', value: (deposit) => formatDate(deposit.date) },
    { header: 'Bank', value: (deposit) => deposit.bank },
    { header: 'Account No.', value: (deposit) => deposit.accountNo },
    { header: 'Amount', value: (deposit) => formatCurrency(deposit.amountGHS) },
    { header: 'Remarks', value: (deposit) => deposit.remarks },
    { header: 'Created By', value: (deposit) => deposit.createdBy },
    { header: 'Created At', value: (deposit) => formatDate(deposit.createdAt) },
  ];

  const exportDeposits = (format: 'csv' | 'pdf') => {
    const options = {
      title: 'Bank Deposits Report',
      filename: `bank-deposits-${new Date().toISOString().slice(0, 10)}`,
      subtitle: dateRangeLabel(startDate, endDate),
      columns: depositColumns,
      rows: filteredDeposits,
      totals: [
        { label: 'Deposits', value: String(filteredDeposits.length) },
        { label: 'Total Amount', value: formatCurrency(filteredTotalDeposits) },
      ],
    };
    if (format === 'csv') exportRowsCsv(options);
    else exportRowsPdf(options);
  };

  const resetForm = () => {
    setForm({ date: today, bankId: '', accountNo: '', amountGHS: 0, remarks: '' });
  };

  const resetBankForm = () => {
    setBankForm({ bankName: '', branch: '', address: '', telephone: '' });
  };

  const openNewDeposit = () => {
    setEditDeposit(null);
    resetForm();
    setShowModal(true);
  };

  const openEditDeposit = (deposit: BankDepositRecord) => {
    setEditDeposit(deposit);
    setForm({
      date: deposit.date || today,
      bankId: deposit.bankId ?? '',
      accountNo: deposit.accountNo,
      amountGHS: deposit.amountGHS,
      remarks: deposit.remarks,
    });
    setShowModal(true);
  };

  const openNewBank = () => {
    setEditBank(null);
    resetBankForm();
    setShowBankModal(true);
  };

  const openEditBank = (bank: BankRecord) => {
    setEditBank(bank);
    setBankForm({
      bankName: bank.bankName,
      branch: bank.branch,
      address: bank.address,
      telephone: bank.telephone,
    });
    setShowBankModal(true);
  };

  const closeDepositModal = () => {
    setShowModal(false);
    setEditDeposit(null);
    resetForm();
  };

  const closeBankModal = () => {
    setShowBankModal(false);
    setEditBank(null);
    resetBankForm();
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const selectedBank = banks.find((bank) => bank.bankId === form.bankId);
    const bank = sanitizeText(selectedBank?.bankName ?? '');
    const accountNo = sanitizeText(form.accountNo);
    const remarks = sanitizeMultiline(form.remarks);

    if (!selectedBank || !bank || !accountNo || form.amountGHS <= 0 || saving) return;

    const payload: Omit<BankDepositRecord, 'depositId' | 'createdBy' | 'createdAt'> = {
      date: form.date || today,
      bankId: selectedBank.bankId,
      bank,
      accountNo,
      amountGHS: form.amountGHS,
      remarks,
    };

    try {
      setSaving(true);
      if (editDeposit) {
        await updateDeposit(editDeposit.depositId, payload);
      } else {
        await addDeposit(payload);
      }
      if (currentUser) {
        await writeLog(currentUser, {
          category: 'bank-deposit',
          action: editDeposit ? 'edit' : 'create',
          description: `${editDeposit ? 'Updated' : 'Recorded'} bank deposit to ${bank} (${accountNo}) for ${fmt(payload.amountGHS)}`,
        });
      }
      closeDepositModal();
      showFeedback({
        title: editDeposit ? 'Deposit Updated' : 'Deposit Recorded',
        message: `${fmt(payload.amountGHS)} has been ${editDeposit ? 'updated' : 'recorded'} for ${bank}.`,
        buttonLabel: 'Continue',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDeposit = async () => {
    if (!deleteDepositTarget || saving) return;
    const target = deleteDepositTarget;

    try {
      setSaving(true);
      await deleteDeposit(target.depositId);
      if (currentUser) {
        await writeLog(currentUser, {
          category: 'bank-deposit',
          action: 'delete',
          description: `Deleted bank deposit to ${target.bank} (${target.accountNo}) for ${fmt(target.amountGHS)}`,
        });
      }
      setDeleteDepositTarget(null);
      showFeedback({
        title: 'Deposit Deleted',
        message: `The ${fmt(target.amountGHS)} deposit for ${target.bank} has been deleted.`,
        buttonLabel: 'Continue',
        kind: 'deleted',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleSelectedDeposit = (id: string) => {
    setSelectedDepositIds((prev) => prev.includes(id) ? prev.filter((depositId) => depositId !== id) : [...prev, id]);
  };

  const toggleVisibleDeposits = () => {
    setSelectedDepositIds((prev) => {
      if (allVisibleDepositsSelected) return prev.filter((id) => !visibleDepositIds.includes(id));
      return Array.from(new Set([...prev, ...visibleDepositIds]));
    });
  };

  const handleBulkDeleteDeposits = async () => {
    if (bulkDeletingDeposits || selectedDeposits.length === 0) return;
    setBulkDeletingDeposits(true);
    for (const deposit of selectedDeposits) {
      await deleteDeposit(deposit.depositId);
    }
    if (currentUser) writeLog(currentUser, {
      category: 'bank-deposit',
      action: 'delete',
      description: `Bulk deleted ${selectedDeposits.length} bank deposit(s): ${selectedDeposits.map((deposit) => `${deposit.bank} ${fmt(deposit.amountGHS)}`).join(', ')}`,
    });
    showFeedback({
      title: 'Deposits Deleted',
      message: `${selectedDeposits.length} bank deposit${selectedDeposits.length === 1 ? '' : 's'} removed successfully.`,
      buttonLabel: 'Continue',
      kind: 'deleted',
    });
    setSelectedDepositIds([]);
    setBulkDeleteDepositsOpen(false);
    setBulkDeletingDeposits(false);
  };

  const handleAddBank = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload: Omit<BankRecord, 'bankId' | 'createdBy' | 'createdAt'> = {
      bankName: sanitizeText(bankForm.bankName),
      branch: sanitizeText(bankForm.branch),
      address: sanitizeText(bankForm.address),
      telephone: sanitizeText(bankForm.telephone),
    };

    if (!payload.bankName || !payload.branch || !payload.address || !payload.telephone || savingBank) return;

    try {
      setSavingBank(true);
      const saved = editBank
        ? await updateBank(editBank.bankId, payload)
        : await addBank(payload);
      if (saved && !editBank) {
        setForm((prev) => ({ ...prev, bankId: saved.bankId }));
      }
      if (currentUser) {
        await writeLog(currentUser, {
          category: 'bank-deposit',
          action: editBank ? 'edit' : 'create',
          description: `${editBank ? 'Updated' : 'Added'} bank "${payload.bankName}" (${payload.branch})`,
        });
      }
      closeBankModal();
      showFeedback({
        title: editBank ? 'Bank Updated' : 'Bank Added',
        message: `${payload.bankName} - ${payload.branch} has been ${editBank ? 'updated' : 'added to the system'}.`,
        buttonLabel: 'Continue',
      });
    } finally {
      setSavingBank(false);
    }
  };

  const handleDeleteBank = async () => {
    if (!deleteBankTarget || savingBank) return;
    const target = deleteBankTarget;

    try {
      setSavingBank(true);
      await deleteBank(target.bankId);
      if (form.bankId === target.bankId) {
        setForm((prev) => ({ ...prev, bankId: '' }));
      }
      if (currentUser) {
        await writeLog(currentUser, {
          category: 'bank-deposit',
          action: 'delete',
          description: `Deleted bank "${target.bankName}" (${target.branch})`,
        });
      }
      setDeleteBankTarget(null);
      showFeedback({
        title: 'Bank Deleted',
        message: `${target.bankName} - ${target.branch} has been deleted. Existing deposits keep their bank name.`,
        buttonLabel: 'Continue',
        kind: 'deleted',
      });
    } finally {
      setSavingBank(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 min-w-0">
        <div>
          <h2 className="text-slate-800 font-bold text-xl">Bank Deposit</h2>
          <p className="text-slate-400 text-sm mt-0.5">Record deposits and manage business bank accounts</p>
        </div>
        <button
          onClick={() => activeTab === 'deposits' ? openNewDeposit() : openNewBank()}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line text-base"></i>
          {activeTab === 'deposits' ? 'New Deposit' : 'Add Bank'}
        </button>
      </div>

      <div className="flex items-center gap-2 mb-5 border-b border-slate-200">
        {[
          { key: 'deposits', label: 'Bank Deposits', icon: 'ri-bank-card-line' },
          { key: 'banks', label: 'Banks', icon: 'ri-bank-line' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'deposits' | 'banks')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <i className={tab.icon}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'deposits' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-5 border border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 flex items-center justify-center bg-indigo-50 rounded-xl">
                  <i className="ri-bank-card-line text-indigo-600 text-lg"></i>
                </div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Total Deposits</p>
              </div>
              <p className="text-slate-900 text-2xl font-bold font-mono">{fmt(totalDeposits)}</p>
              <p className="text-slate-400 text-xs mt-1">{deposits.length} records</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center gap-3 mb-4 min-w-0">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-slate-200 bg-white rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none min-w-0" title="Start date" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-slate-200 bg-white rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none min-w-0" title="End date" />
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
              <button onClick={() => exportDeposits('csv')} className="flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap">
                <i className="ri-file-excel-2-line text-base"></i>
                Export to CSV
              </button>
              <button onClick={() => exportDeposits('pdf')} className="flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap">
                <i className="ri-file-pdf-2-line text-base"></i>
                Export to PDF
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="px-5 pt-4">
              <BulkActionBar
                selectedCount={selectedDepositIds.length}
                onClear={() => setSelectedDepositIds([])}
                onDelete={() => setBulkDeleteDepositsOpen(true)}
              />
            </div>
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-slate-800 font-bold text-sm">Deposit History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-400 uppercase text-xs font-bold">
                  <tr>
                    <th className="text-left px-5 py-3">
                      <input
                        type="checkbox"
                        checked={allVisibleDepositsSelected}
                        onChange={toggleVisibleDeposits}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        aria-label="Select visible deposits"
                      />
                    </th>
                    <th className="text-left px-5 py-3">Date</th>
                    <th className="text-left px-5 py-3">Bank</th>
                    <th className="text-left px-5 py-3">Account No.</th>
                    <th className="text-right px-5 py-3">Amount</th>
                    <th className="text-left px-5 py-3">Remarks</th>
                    <th className="text-left px-5 py-3">Created By</th>
                    <th className="text-right px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400">Loading deposits...</td></tr>
                  ) : filteredDeposits.length === 0 ? (
                    <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400">No bank deposits recorded yet</td></tr>
                  ) : filteredDeposits.map((deposit) => (
                    <tr key={deposit.depositId} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <input
                          type="checkbox"
                          checked={selectedDepositIds.includes(deposit.depositId)}
                          onChange={() => toggleSelectedDeposit(deposit.depositId)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          aria-label={`Select deposit ${deposit.depositId}`}
                        />
                      </td>
                      <td className="px-5 py-3 text-slate-600">{formatDate(deposit.date)}</td>
                      <td className="px-5 py-3 text-slate-800 font-semibold">{deposit.bank}</td>
                      <td className="px-5 py-3 text-slate-600 font-mono">{deposit.accountNo}</td>
                      <td className="px-5 py-3 text-right text-slate-900 font-bold font-mono">{fmt(deposit.amountGHS)}</td>
                      <td className="px-5 py-3 text-slate-500">{deposit.remarks || '-'}</td>
                      <td className="px-5 py-3 text-slate-500">{deposit.createdBy || '-'}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => setViewDeposit(deposit)} className="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all" title="View deposit">
                            <i className="ri-eye-line"></i>
                          </button>
                          <button type="button" onClick={() => openEditDeposit(deposit)} className="w-8 h-8 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-all" title="Edit deposit">
                            <i className="ri-edit-line"></i>
                          </button>
                          <button type="button" onClick={() => setDeleteDepositTarget(deposit)} className="w-8 h-8 rounded-lg text-rose-600 hover:bg-rose-50 transition-all" title="Delete deposit">
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'banks' && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-slate-800 font-bold text-sm">Banks</h3>
            <p className="text-slate-400 text-xs mt-0.5">{banks.length} banks added</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-400 uppercase text-xs font-bold">
                <tr>
                  <th className="text-left px-5 py-3">Bank Name</th>
                  <th className="text-left px-5 py-3">Branch</th>
                  <th className="text-left px-5 py-3">Address</th>
                  <th className="text-left px-5 py-3">Telephone</th>
                  <th className="text-left px-5 py-3">Created By</th>
                  <th className="text-left px-5 py-3">Created At</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {banksLoading ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">Loading banks...</td></tr>
                ) : banks.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">No banks added yet</td></tr>
                ) : banks.map((bank) => (
                  <tr key={bank.bankId} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 text-slate-800 font-semibold">{bank.bankName}</td>
                    <td className="px-5 py-3 text-slate-600">{bank.branch}</td>
                    <td className="px-5 py-3 text-slate-500">{bank.address}</td>
                    <td className="px-5 py-3 text-slate-600">{bank.telephone}</td>
                    <td className="px-5 py-3 text-slate-500">{bank.createdBy || '-'}</td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(bank.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => setViewBank(bank)} className="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all" title="View bank">
                          <i className="ri-eye-line"></i>
                        </button>
                        <button type="button" onClick={() => openEditBank(bank)} className="w-8 h-8 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-all" title="Edit bank">
                          <i className="ri-edit-line"></i>
                        </button>
                        <button type="button" onClick={() => setDeleteBankTarget(bank)} className="w-8 h-8 rounded-lg text-rose-600 hover:bg-rose-50 transition-all" title="Delete bank">
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={closeDepositModal}></div>
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h3 className="text-slate-800 font-bold text-lg">{editDeposit ? 'Edit Bank Deposit' : 'Bank Deposit'}</h3>
              <button type="button" onClick={closeDepositModal} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            <form id="bank-deposit-form" onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date *</label>
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Bank *</label>
                <div className="flex gap-2">
                  <select
                    required
                    value={form.bankId}
                    onChange={(e) => setForm((prev) => ({ ...prev, bankId: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all cursor-pointer bg-white"
                  >
                    <option value="">{banksLoading ? 'Loading banks...' : 'Select bank'}</option>
                    {banks.map((bank) => (
                      <option key={bank.bankId} value={bank.bankId}>
                        {bank.bankName} - {bank.branch}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={openNewBank}
                    className="w-11 h-11 flex-shrink-0 rounded-lg border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all cursor-pointer"
                    title="Add bank"
                  >
                    <i className="ri-add-line text-base"></i>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Account No. *</label>
                <input
                  required
                  value={form.accountNo}
                  onChange={(e) => setForm((prev) => ({ ...prev, accountNo: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all"
                  placeholder="Enter account number"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Amount (₵) *</label>
                <input
                  required
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={form.amountGHS}
                  onChange={(e) => setForm((prev) => ({ ...prev, amountGHS: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Remarks</label>
                <textarea
                  value={form.remarks}
                  onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all resize-none"
                  placeholder="Optional notes"
                />
              </div>
            </form>

            <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100">
              <button
                type="button"
                onClick={closeDepositModal}
                className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="bank-deposit-form"
                disabled={saving}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
              >
                {saving && <i className="ri-loader-4-line animate-spin text-base"></i>}
                {saving ? 'Saving...' : editDeposit ? 'Save Changes' : 'Save Details'}
              </button>
            </div>
          </div>
        </>
      )}

      {showBankModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={closeBankModal}></div>
          <div className="fixed inset-4 z-[70] flex items-start justify-center overflow-y-auto">
            <div className="my-10 w-full max-w-lg bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <h3 className="text-slate-800 font-bold text-lg">{editBank ? 'Edit Bank' : 'Add Bank'}</h3>
                <button type="button" onClick={closeBankModal} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>

              <form id="add-bank-form" onSubmit={handleAddBank} className="px-6 py-5 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Bank Name *</label>
                  <input
                    required
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm((prev) => ({ ...prev, bankName: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all"
                    placeholder="e.g. GCB Bank"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Branch *</label>
                  <input
                    required
                    value={bankForm.branch}
                    onChange={(e) => setBankForm((prev) => ({ ...prev, branch: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all"
                    placeholder="e.g. Accra Central"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Address *</label>
                  <textarea
                    required
                    rows={3}
                    value={bankForm.address}
                    onChange={(e) => setBankForm((prev) => ({ ...prev, address: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all resize-none"
                    placeholder="Branch address"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Telephone *</label>
                  <input
                    required
                    value={bankForm.telephone}
                    onChange={(e) => setBankForm((prev) => ({ ...prev, telephone: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all"
                    placeholder="Enter telephone"
                  />
                </div>
              </form>

              <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeBankModal}
                  className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="add-bank-form"
                  disabled={savingBank}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                >
                  {savingBank && <i className="ri-loader-4-line animate-spin text-base"></i>}
                  {savingBank ? 'Saving...' : editBank ? 'Save Changes' : 'Add Bank'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {viewDeposit && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setViewDeposit(null)}></div>
          <div className="fixed inset-4 z-[70] flex items-start justify-center overflow-y-auto">
            <div className="my-10 w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <h3 className="text-slate-800 font-bold text-lg">Deposit Details</h3>
                <button type="button" onClick={() => setViewDeposit(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>
              <div className="px-6 py-4">
                <DetailRow label="Date" value={formatDate(viewDeposit.date)} />
                <DetailRow label="Bank" value={viewDeposit.bank} />
                <DetailRow label="Account No." value={<span className="font-mono">{viewDeposit.accountNo}</span>} />
                <DetailRow label="Amount" value={<span className="font-mono">{fmt(viewDeposit.amountGHS)}</span>} />
                <DetailRow label="Remarks" value={viewDeposit.remarks} />
                <DetailRow label="Created By" value={viewDeposit.createdBy} />
                <DetailRow label="Created At" value={formatDate(viewDeposit.createdAt)} />
              </div>
            </div>
          </div>
        </>
      )}

      {viewBank && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setViewBank(null)}></div>
          <div className="fixed inset-4 z-[70] flex items-start justify-center overflow-y-auto">
            <div className="my-10 w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <h3 className="text-slate-800 font-bold text-lg">Bank Details</h3>
                <button type="button" onClick={() => setViewBank(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>
              <div className="px-6 py-4">
                <DetailRow label="Bank Name" value={viewBank.bankName} />
                <DetailRow label="Branch" value={viewBank.branch} />
                <DetailRow label="Address" value={viewBank.address} />
                <DetailRow label="Telephone" value={viewBank.telephone} />
                <DetailRow label="Created By" value={viewBank.createdBy} />
                <DetailRow label="Created At" value={formatDate(viewBank.createdAt)} />
              </div>
            </div>
          </div>
        </>
      )}

      {deleteDepositTarget && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setDeleteDepositTarget(null)}></div>
          <div className="fixed inset-4 z-[70] flex items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-slate-800 font-bold text-lg">Delete Deposit</h3>
                <p className="text-slate-500 text-sm mt-1">This will permanently remove the selected deposit record.</p>
              </div>
              <div className="px-6 py-5 bg-slate-50 text-sm text-slate-700">
                <p className="font-semibold">{deleteDepositTarget.bank}</p>
                <p>{formatDate(deleteDepositTarget.date)} · {fmt(deleteDepositTarget.amountGHS)}</p>
              </div>
              <div className="flex items-center gap-3 px-6 py-4">
                <button type="button" onClick={() => setDeleteDepositTarget(null)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">
                  Cancel
                </button>
                <button type="button" onClick={handleDeleteDeposit} disabled={saving} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2">
                  {saving && <i className="ri-loader-4-line animate-spin text-base"></i>}
                  {saving ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {bulkDeleteDepositsOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => !bulkDeletingDeposits && setBulkDeleteDepositsOpen(false)}></div>
          <div className="fixed inset-4 z-[70] flex items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-slate-800 font-bold text-lg">Delete Selected Deposits</h3>
                <p className="text-slate-500 text-sm mt-1">
                  {selectedDeposits.length} deposit record{selectedDeposits.length === 1 ? '' : 's'} will be permanently removed.
                </p>
              </div>
              <div className="px-6 py-5 bg-slate-50 text-sm text-slate-700">
                <p className="font-semibold">Total selected</p>
                <p className="font-mono">{fmt(selectedDeposits.reduce((sum, deposit) => sum + deposit.amountGHS, 0))}</p>
              </div>
              <div className="flex items-center gap-3 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setBulkDeleteDepositsOpen(false)}
                  disabled={bulkDeletingDeposits}
                  className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkDeleteDeposits}
                  disabled={bulkDeletingDeposits}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {bulkDeletingDeposits && <i className="ri-loader-4-line animate-spin text-base"></i>}
                  {bulkDeletingDeposits ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {deleteBankTarget && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setDeleteBankTarget(null)}></div>
          <div className="fixed inset-4 z-[70] flex items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-slate-800 font-bold text-lg">Delete Bank</h3>
                <p className="text-slate-500 text-sm mt-1">Existing deposit records will keep their saved bank name.</p>
              </div>
              <div className="px-6 py-5 bg-slate-50 text-sm text-slate-700">
                <p className="font-semibold">{deleteBankTarget.bankName}</p>
                <p>{deleteBankTarget.branch}</p>
              </div>
              <div className="flex items-center gap-3 px-6 py-4">
                <button type="button" onClick={() => setDeleteBankTarget(null)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">
                  Cancel
                </button>
                <button type="button" onClick={handleDeleteBank} disabled={savingBank} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2">
                  {savingBank && <i className="ri-loader-4-line animate-spin text-base"></i>}
                  {savingBank ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
