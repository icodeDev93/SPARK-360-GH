import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { BankDepositRecord } from '@/types/erp';
import { sanitizeMultiline, sanitizeText } from '@/lib/sanitize';

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
  const [deposits, setDeposits] = useState<BankDepositRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeposits = async () => {
      const { data, error } = await supabase
        .from('bank_deposits')
        .select('*')
        .order('deposit_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setDeposits(data ? data.map(toRecord) : []);
      setLoading(false);
    };

    fetchDeposits();

    const channel = supabase
      .channel('bank-deposits-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_deposits' }, fetchDeposits)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const addDeposit = async (data: Omit<BankDepositRecord, 'depositId' | 'createdBy' | 'createdAt'>) => {
    const temp: BankDepositRecord = {
      ...cleanDeposit(data),
      depositId: `DEP${Date.now()}`,
      createdBy: '',
      createdAt: new Date().toISOString(),
    };
    setDeposits((prev) => [temp, ...prev]);

    const { data: inserted, error } = await supabase
      .from('bank_deposits')
      .insert(toRow(data))
      .select('*')
      .single();

    if (error) {
      console.error(error);
      setDeposits((prev) => prev.filter((deposit) => deposit.depositId !== temp.depositId));
      throw error;
    }

    if (inserted) {
      const saved = toRecord(inserted);
      setDeposits((prev) => prev.map((deposit) => deposit.depositId === temp.depositId ? saved : deposit));
    }
  };

  const updateDeposit = async (
    depositId: string,
    data: Omit<BankDepositRecord, 'depositId' | 'createdBy' | 'createdAt'>
  ) => {
    const previous = deposits;
    setDeposits((prev) => prev.map((deposit) => (
      deposit.depositId === depositId ? { ...deposit, ...cleanDeposit(data) } : deposit
    )));

    const { data: updated, error } = await supabase
      .from('bank_deposits')
      .update(toRow(data))
      .eq('id', depositId)
      .select('*')
      .single();

    if (error) {
      console.error(error);
      setDeposits(previous);
      throw error;
    }

    if (updated) {
      const saved = toRecord(updated);
      setDeposits((prev) => prev.map((deposit) => (
        deposit.depositId === depositId ? saved : deposit
      )));
      return saved;
    }
  };

  const deleteDeposit = async (depositId: string) => {
    const previous = deposits;
    setDeposits((prev) => prev.filter((deposit) => deposit.depositId !== depositId));

    const { error } = await supabase
      .from('bank_deposits')
      .delete()
      .eq('id', depositId);

    if (error) {
      console.error(error);
      setDeposits(previous);
      throw error;
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
