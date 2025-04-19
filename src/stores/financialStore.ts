
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

// TypeScript interfaces for the store
interface ChartOfAccount {
  id: number;
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
}

interface JournalEntry {
  id: number;
  entry_date: string;
  description: string;
  transaction_id: number;
  journal_lines: JournalEntryLine[];
}

interface JournalEntryLine {
  id: number;
  account: ChartOfAccount;
  debit_amount: number;
  credit_amount: number;
}

// Define the store interface
interface FinancialStore {
  chartOfAccounts: ChartOfAccount[];
  journalEntries: JournalEntry[];
  fetchChartOfAccounts: () => Promise<void>;
  fetchJournalEntries: () => Promise<void>;
}

// Create the Zustand store
export const useFinancialStore = create<FinancialStore>((set) => ({
  chartOfAccounts: [],
  journalEntries: [],
  
  fetchChartOfAccounts: async () => {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*');
    
    if (data) {
      set({ chartOfAccounts: data });
    }
    
    if (error) {
      console.error('Error fetching chart of accounts:', error);
    }
  },
  
  fetchJournalEntries: async () => {
    const { data, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        journal_entry_lines (
          *,
          account:chart_of_accounts(*)
        )
      `);
    
    if (data) {
      set({ journalEntries: data });
    }
    
    if (error) {
      console.error('Error fetching journal entries:', error);
    }
  },
}));
