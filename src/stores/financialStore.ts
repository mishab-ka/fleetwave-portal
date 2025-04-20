
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

// TypeScript interfaces for the store
interface ChartOfAccount {
  id: number;
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  description?: string;
  parent_id?: number;
  created_at?: string;
}

interface JournalEntry {
  id: number;
  entry_date: string;
  description: string;
  reference_number?: string;
  posted?: boolean;
  created_at?: string;
  journal_lines: JournalEntryLine[];
}

interface JournalEntryLine {
  id: number;
  account: ChartOfAccount;
  debit_amount: number;
  credit_amount: number;
  description?: string;
}

interface FinancialStore {
  chartOfAccounts: ChartOfAccount[];
  journalEntries: JournalEntry[];
  fetchChartOfAccounts: () => Promise<void>;
  fetchJournalEntries: () => Promise<void>;
}

export const useFinancialStore = create<FinancialStore>((set) => ({
  chartOfAccounts: [],
  journalEntries: [],
  
  fetchChartOfAccounts: async () => {
    const { data, error } = await supabase
      .from('driver_balance_transactions')
      .select('*');
    
    if (data && !error) {
      const formattedAccounts: ChartOfAccount[] = data.map(account => ({
        id: parseInt(account.id),
        code: account.id.toString(),
        name: account.description || '',
        type: 'Asset',
        description: account.description,
        created_at: account.created_at
      }));
      
      set({ chartOfAccounts: formattedAccounts });
    }
    
    if (error) {
      console.error('Error fetching chart of accounts:', error);
    }
  },
  
  fetchJournalEntries: async () => {
    const { data, error } = await supabase
      .from('driver_balance_transactions')
      .select('*');
    
    if (data && !error) {
      const formattedEntries: JournalEntry[] = data.map(entry => ({
        id: parseInt(entry.id),
        entry_date: entry.created_at,
        description: entry.description || '',
        reference_number: entry.id.toString(),
        created_at: entry.created_at,
        journal_lines: [{
          id: parseInt(entry.id),
          account: {
            id: parseInt(entry.id),
            code: entry.id.toString(),
            name: entry.description || '',
            type: 'Asset',
          },
          debit_amount: entry.amount > 0 ? entry.amount : 0,
          credit_amount: entry.amount < 0 ? Math.abs(entry.amount) : 0,
          description: entry.description
        }]
      }));
      
      set({ journalEntries: formattedEntries });
    }
    
    if (error) {
      console.error('Error fetching journal entries:', error);
    }
  },
}));
