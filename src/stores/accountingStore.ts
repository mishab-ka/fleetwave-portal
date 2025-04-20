
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { AccountType } from '@/types/accounting';

// Define the store interfaces
interface Account {
  id: number;
  code: string;
  name: string;
  type: AccountType;
  description: string;
  parent_id: number | null;
  is_active: boolean;
  created_at: string;
}

interface AccountWithBalance extends Account {
  balance: number;
}

interface JournalEntry {
  id: number;
  entry_date: string;
  description: string;
  transaction_id?: number;
  reference_number?: string;
  posted: boolean;
  created_at: string;
}

interface JournalEntryLine {
  id: number;
  journal_entry_id: number;
  account_id: number;
  account: Account;
  debit_amount: number;
  credit_amount: number;
  description: string;
}

interface JournalEntryWithLines extends JournalEntry {
  lines: JournalEntryLine[];
}

interface FinancialTransaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  account_id: number;
  account: { name: string };
}

interface AccountingStore {
  accounts: AccountWithBalance[];
  journalEntries: JournalEntryWithLines[];
  transactions: FinancialTransaction[];
  loading: {
    accounts: boolean;
    journalEntries: boolean;
    transactions: boolean;
  };
  fetchAccounts: () => Promise<void>;
  fetchJournalEntries: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  calculateAccountBalance: (accountId: number) => number;
}

export const useAccountingStore = create<AccountingStore>((set, get) => ({
  accounts: [],
  journalEntries: [],
  transactions: [],
  loading: {
    accounts: false,
    journalEntries: false,
    transactions: false,
  },
  
  fetchAccounts: async () => {
    set(state => ({ loading: { ...state.loading, accounts: true } }));
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .order('code', { ascending: true });
      
      if (error) throw error;
      
      if (data) {
        const accountsWithBalance = await Promise.all(data.map(async (account) => {
          const balance = await get().calculateAccountBalance(account.id);
          return {
            ...account,
            balance
          } as AccountWithBalance;
        }));
        
        set({ accounts: accountsWithBalance });
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      set(state => ({ loading: { ...state.loading, accounts: false } }));
    }
  },
  
  fetchJournalEntries: async () => {
    set(state => ({ loading: { ...state.loading, journalEntries: true } }));
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
      const entriesWithLines = await Promise.all(entriesData.map(async (entry) => {
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
            lines: []
          };
        }
        
        return {
          ...entry,
          lines: linesData || []
        };
      }));
      
      set({ journalEntries: entriesWithLines });
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      set({ journalEntries: [] });
    } finally {
      set(state => ({ loading: { ...state.loading, journalEntries: false } }));
    }
  },
  
  fetchTransactions: async () => {
    set(state => ({ loading: { ...state.loading, transactions: true } }));
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          account:account_id (name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      set({ transactions: data || [] });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      set({ transactions: [] });
    } finally {
      set(state => ({ loading: { ...state.loading, transactions: false } }));
    }
  },
  
  calculateAccountBalance: async (accountId: number) => {
    try {
      // Get all journal entry lines for this account
      const { data, error } = await supabase
        .from('journal_entry_lines')
        .select(`
          debit_amount,
          credit_amount,
          journal_entries!inner(posted)
        `)
        .eq('account_id', accountId)
        .eq('journal_entries.posted', true);
        
      if (error) throw error;
      
      if (!data || data.length === 0) return 0;
      
      // Calculate the balance based on account type
      const { data: accountData, error: accountError } = await supabase
        .from('chart_of_accounts')
        .select('type')
        .eq('id', accountId)
        .single();
        
      if (accountError) throw accountError;
      
      const accountType = accountData.type.toLowerCase();
      
      // Calculate total debits and credits
      const totalDebits = data.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
      const totalCredits = data.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
      
      // For asset and expense accounts, debit increases and credit decreases
      // For liability, equity, and revenue accounts, credit increases and debit decreases
      if (['asset', 'expense'].includes(accountType)) {
        return totalDebits - totalCredits;
      } else {
        return totalCredits - totalDebits;
      }
    } catch (error) {
      console.error(`Error calculating balance for account ${accountId}:`, error);
      return 0;
    }
  }
}));
