import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { BankRecord } from '@/types/erp';
import { sanitizeText } from '@/lib/sanitize';
import { createLocalId, loadLocalCollection, queueLocalMutation, saveLocalCollection } from '@/lib/localCache';

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
      const cached = await loadLocalCollection<BankRecord>('banks');
      if (cached.length) setBanks(cached);
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

      const nextBanks = data ? data.map(toRecord) : [];
      setBanks(nextBanks);
      saveLocalCollection('banks', nextBanks);
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
      bankId: createLocalId(),
      createdBy: '',
      createdAt: new Date().toISOString(),
    };
    const nextBanks = [...banks, temp].sort((a, b) => a.bankName.localeCompare(b.bankName));
    setBanks(nextBanks);
    saveLocalCollection('banks', nextBanks);

    const { data: inserted, error } = await supabase
      .from('banks')
      .insert({ id: temp.bankId, ...toRow(data) })
      .select('*')
      .single();

    if (error) {
      console.error(error);
      queueLocalMutation('banks', temp.bankId, 'create', temp);
      return temp;
    }

    if (inserted) {
      const saved = toRecord(inserted);
      const syncedBanks = nextBanks.map((bank) => bank.bankId === temp.bankId ? saved : bank);
      setBanks(syncedBanks);
      saveLocalCollection('banks', syncedBanks);
      return saved;
    }

    return temp;
  };

  const updateBank = async (bankId: string, data: Omit<BankRecord, 'bankId' | 'createdBy' | 'createdAt'>) => {
    const nextBanks = banks
      .map((bank) => bank.bankId === bankId ? { ...bank, ...cleanBank(data) } : bank)
      .sort((a, b) => a.bankName.localeCompare(b.bankName));
    setBanks(nextBanks);
    saveLocalCollection('banks', nextBanks);

    const { data: updated, error } = await supabase
      .from('banks')
      .update(toRow(data))
      .eq('id', bankId)
      .select('*')
      .single();

    if (error) {
      console.error(error);
      queueLocalMutation('banks', bankId, 'update', nextBanks.find((bank) => bank.bankId === bankId));
      return nextBanks.find((bank) => bank.bankId === bankId);
    }

    if (updated) {
      const saved = toRecord(updated);
      const syncedBanks = banks
        .map((bank) => bank.bankId === bankId ? saved : bank)
        .sort((a, b) => a.bankName.localeCompare(b.bankName));
      setBanks(syncedBanks);
      saveLocalCollection('banks', syncedBanks);
      return saved;
    }
  };

  const deleteBank = async (bankId: string) => {
    const nextBanks = banks.filter((bank) => bank.bankId !== bankId);
    setBanks(nextBanks);
    saveLocalCollection('banks', nextBanks);

    const { error } = await supabase
      .from('banks')
      .delete()
      .eq('id', bankId);

    if (error) {
      console.error(error);
      queueLocalMutation('banks', bankId, 'delete', { bankId });
    }
  };

  return { banks, loading, addBank, updateBank, deleteBank };
}
