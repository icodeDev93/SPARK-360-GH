import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { BankDepositRecord } from '@/types/erp';
import { sanitizeMultiline, sanitizeText } from '@/lib/sanitize';
import { createLocalId, loadLocalCollection, queueLocalMutation, saveLocalCollection } from '@/lib/localCache';
import { useBusiness } from '@/contexts/BusinessContext';

type Row = {
  id: string;
  deposit_date: string;
  bank_id: string | null;
  bank_name: string;
  account_no: string;
  amount: number;
  remarks: string | null;
  created_by: string;
  created_at: string;
};

const toRecord = (row: Row): BankDepositRecord => ({
  depositId: row.id,
  date: row.deposit_date,
  bankId: row.bank_id,
  bank: row.bank_name,
  accountNo: row.account_no,
  amountGHS: row.amount,
  remarks: row.remarks ?? '',
  createdBy: row.created_by,
  createdAt: row.created_at,
});

const cleanDeposit = (deposit: Omit<BankDepositRecord, 'depositId' | 'createdBy' | 'createdAt'>) => ({
  ...deposit,
  date: sanitizeText(deposit.date),
  bankId: deposit.bankId ? sanitizeText(deposit.bankId) : null,
  bank: sanitizeText(deposit.bank),
  accountNo: sanitizeText(deposit.accountNo),
  remarks: sanitizeMultiline(deposit.remarks),
});

const toRow = (rawDeposit: Omit<BankDepositRecord, 'depositId' | 'createdBy' | 'createdAt'>) => {
  const deposit = cleanDeposit(rawDeposit);
  return ({
  deposit_date: deposit.date,
  bank_id: deposit.bankId,
  bank_name: deposit.bank,
  account_no: deposit.accountNo,
  amount: deposit.amountGHS,
  remarks: deposit.remarks,
})};

export function useBankDeposits() {
  const { activeBusinessId } = useBusiness();
  const [deposits, setDeposits] = useState<BankDepositRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeposits = async () => {
      if (!activeBusinessId) {
        setDeposits([]);
        setLoading(false);
        return;
      }
      const cached = await loadLocalCollection<BankDepositRecord>('bank_deposits');
      if (cached.length) setDeposits(cached);
      const { data, error } = await supabase
        .from('bank_deposits')
        .select('*')
        .eq('business_id', activeBusinessId)
        .order('deposit_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const nextDeposits = data ? data.map(toRecord) : [];
      setDeposits(nextDeposits);
      saveLocalCollection('bank_deposits', nextDeposits);
      setLoading(false);
    };

    fetchDeposits();

    const channel = supabase
      .channel('bank-deposits-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_deposits', filter: `business_id=eq.${activeBusinessId}` }, fetchDeposits)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeBusinessId]);

  const addDeposit = async (data: Omit<BankDepositRecord, 'depositId' | 'createdBy' | 'createdAt'>) => {
    if (!activeBusinessId) return;
    const temp: BankDepositRecord = {
      ...cleanDeposit(data),
      depositId: createLocalId(),
      createdBy: '',
      createdAt: new Date().toISOString(),
    };
    const nextDeposits = [temp, ...deposits];
    setDeposits(nextDeposits);
    saveLocalCollection('bank_deposits', nextDeposits);

    const { data: inserted, error } = await supabase
      .from('bank_deposits')
      .insert({ id: temp.depositId, business_id: activeBusinessId, ...toRow(data) })
      .select('*')
      .single();

    if (error) {
      console.error(error);
      queueLocalMutation('bank_deposits', temp.depositId, 'create', temp);
      return;
    }

    if (inserted) {
      const saved = toRecord(inserted);
      const syncedDeposits = nextDeposits.map((deposit) => deposit.depositId === temp.depositId ? saved : deposit);
      setDeposits(syncedDeposits);
      saveLocalCollection('bank_deposits', syncedDeposits);
    }
  };

  const updateDeposit = async (
    depositId: string,
    data: Omit<BankDepositRecord, 'depositId' | 'createdBy' | 'createdAt'>
  ) => {
    const nextDeposits = deposits.map((deposit) => (
      deposit.depositId === depositId ? { ...deposit, ...cleanDeposit(data) } : deposit
    ));
    setDeposits(nextDeposits);
    saveLocalCollection('bank_deposits', nextDeposits);

    const { data: updated, error } = await supabase
      .from('bank_deposits')
      .update(toRow(data))
      .eq('business_id', activeBusinessId).eq('id', depositId)
      .select('*')
      .single();

    if (error) {
      console.error(error);
      queueLocalMutation('bank_deposits', depositId, 'update', nextDeposits.find((deposit) => deposit.depositId === depositId));
      return nextDeposits.find((deposit) => deposit.depositId === depositId);
    }

    if (updated) {
      const saved = toRecord(updated);
      const syncedDeposits = deposits.map((deposit) => (
        deposit.depositId === depositId ? saved : deposit
      ));
      setDeposits(syncedDeposits);
      saveLocalCollection('bank_deposits', syncedDeposits);
      return saved;
    }
  };

  const deleteDeposit = async (depositId: string) => {
    const nextDeposits = deposits.filter((deposit) => deposit.depositId !== depositId);
    setDeposits(nextDeposits);
    saveLocalCollection('bank_deposits', nextDeposits);

    const { error } = await supabase
      .from('bank_deposits')
      .delete()
      .eq('business_id', activeBusinessId).eq('id', depositId);

    if (error) {
      console.error(error);
      queueLocalMutation('bank_deposits', depositId, 'delete', { depositId });
    }
  };

  return {
    deposits,
    loading,
    addDeposit,
    updateDeposit,
    deleteDeposit,
    totalDeposits: deposits.reduce((sum, deposit) => sum + deposit.amountGHS, 0),
  };
}
