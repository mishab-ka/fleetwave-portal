
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
  transaction_id?: number;
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
      // Transform the data to match the ChartOfAccount type
      const formattedAccounts = data.map(account => ({
        ...account,
        // Ensure the type is properly capitalized to match the union type
        type: account.type.charAt(0).toUpperCase() + account.type.slice(1).toLowerCase() as 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'
      }));
      
      set({ chartOfAccounts: formattedAccounts });
    }
    
    if (error) {
      console.error('Error fetching chart of accounts:', error);
    }
  },
  
  fetchJournalEntries: async () => {
    try {
      // First get all journal entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('journal_entries')
        .select('*')
        .order('entry_date', { ascending: false });
      
      if (entriesError) throw entriesError;
      if (!entriesData) {
        set({ journalEntries: [] });
        return;
      }
      
      // For each journal entry, get its lines
      const entries = await Promise.all(entriesData.map(async (entry) => {
        const { data: linesData, error: linesError } = await supabase
          .from('journal_entry_lines')
          .select(`
            *,
            account:chart_of_accounts(*)
          `)
          .eq('journal_entry_id', entry.id);
        
        if (linesError) {
          console.error('Error fetching journal entry lines:', linesError);
          return {
            ...entry,
            journal_lines: []
          };
        }
        
        const journalLines = (linesData || []).map(line => ({
          id: line.id,
          account: {
            ...line.account,
            type: line.account.type.charAt(0).toUpperCase() + line.account.type.slice(1).toLowerCase() as 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'
          },
          debit_amount: line.debit_amount,
          credit_amount: line.credit_amount,
          description: line.description
        }));
        
        return {
          ...entry,
          journal_lines: journalLines
        };
      }));
      
      set({ journalEntries: entries });
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      set({ journalEntries: [] });
    }
  },
}));
