import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { BankRecord } from '@/types/erp';
import { sanitizeText } from '@/lib/sanitize';

type Row = {
  id: string;
  bank_name: string;
  branch: string;
  address: string;
  telephone: string;
  created_by: string;
  created_at: string;
};

const toRecord = (row: Row): BankRecord => ({
  bankId: row.id,
  bankName: row.bank_name,
  branch: row.branch,
  address: row.address,
  telephone: row.telephone,
  createdBy: row.created_by,
  createdAt: row.created_at,
});

const cleanBank = (bank: Omit<BankRecord, 'bankId' | 'createdBy' | 'createdAt'>) => ({
  ...bank,
  bankName: sanitizeText(bank.bankName),
  branch: sanitizeText(bank.branch),
  address: sanitizeText(bank.address),
  telephone: sanitizeText(bank.telephone),
});

const toRow = (rawBank: Omit<BankRecord, 'bankId' | 'createdBy' | 'createdAt'>) => {
  const bank = cleanBank(rawBank);
  return ({
  bank_name: bank.bankName,
  branch: bank.branch,
  address: bank.address,
  telephone: bank.telephone,
})};

export function useBanks() {
  const [banks, setBanks] = useState<BankRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanks = async () => {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .order('bank_name', { ascending: true })
        .order('branch', { ascending: true });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setBanks(data ? data.map(toRecord) : []);
      setLoading(false);
    };

    fetchBanks();

    const channel = supabase
      .channel('banks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banks' }, fetchBanks)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const addBank = async (data: Omit<BankRecord, 'bankId' | 'createdBy' | 'createdAt'>) => {
    const temp: BankRecord = {
      ...cleanBank(data),
      bankId: `BANK${Date.now()}`,
      createdBy: '',
      createdAt: new Date().toISOString(),
    };
    setBanks((prev) => [...prev, temp].sort((a, b) => a.bankName.localeCompare(b.bankName)));

    const { data: inserted, error } = await supabase
      .from('banks')
      .insert(toRow(data))
      .select('*')
      .single();

    if (error) {
      console.error(error);
      setBanks((prev) => prev.filter((bank) => bank.bankId !== temp.bankId));
      throw error;
    }

    if (inserted) {
      const saved = toRecord(inserted);
      setBanks((prev) => prev.map((bank) => bank.bankId === temp.bankId ? saved : bank));
      return saved;
    }

    return temp;
  };

  const updateBank = async (bankId: string, data: Omit<BankRecord, 'bankId' | 'createdBy' | 'createdAt'>) => {
    const previous = banks;
    setBanks((prev) => prev
      .map((bank) => bank.bankId === bankId ? { ...bank, ...cleanBank(data) } : bank)
      .sort((a, b) => a.bankName.localeCompare(b.bankName)));

    const { data: updated, error } = await supabase
      .from('banks')
      .update(toRow(data))
      .eq('id', bankId)
      .select('*')
      .single();

    if (error) {
      console.error(error);
      setBanks(previous);
      throw error;
    }

    if (updated) {
      const saved = toRecord(updated);
      setBanks((prev) => prev
        .map((bank) => bank.bankId === bankId ? saved : bank)
        .sort((a, b) => a.bankName.localeCompare(b.bankName)));
      return saved;
    }
  };

  const deleteBank = async (bankId: string) => {
    const previous = banks;
    setBanks((prev) => prev.filter((bank) => bank.bankId !== bankId));

    const { error } = await supabase
      .from('banks')
      .delete()
      .eq('id', bankId);

    if (error) {
      console.error(error);
      setBanks(previous);
      throw error;
    }
  };

  return { banks, loading, addBank, updateBank, deleteBank };
}
