
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { 
  AccountingAccount, 
  AccountingPeriod, 
  JournalEntry, 
  FinancialTransaction,
  IncomeStatementItem,
  BalanceSheetItem,
  CashFlowItem
} from '@/types/accounting';

interface AccountingState {
  accounts: AccountingAccount[];
  periods: AccountingPeriod[];
  journalEntries: JournalEntry[];
  transactions: FinancialTransaction[];
  incomeStatement: IncomeStatementItem[];
  balanceSheet: BalanceSheetItem[];
  cashFlow: CashFlowItem[];
  loading: boolean;
  error: string | null;
  
  // Accounts
  fetchAccounts: () => Promise<void>;
  getAccountById: (id: number) => AccountingAccount | undefined;
  
  // Periods
  fetchPeriods: () => Promise<void>;
  getCurrentPeriod: () => AccountingPeriod | undefined;
  
  // Journal Entries
  fetchJournalEntries: () => Promise<void>;
  getJournalEntryById: (id: number) => Promise<JournalEntry | null>;
  
  // Transactions
  fetchTransactions: () => Promise<void>;
  addTransaction: (transaction: Omit<FinancialTransaction, 'id' | 'created_at' | 'journal_entry_id'>) => Promise<number | null>;
  
  // Financial Reports
  generateIncomeStatement: (startDate: string, endDate: string) => Promise<void>;
  generateBalanceSheet: (asOfDate: string) => Promise<void>;
  generateCashFlowStatement: (startDate: string, endDate: string) => Promise<void>;
}

export const useAccountingStore = create<AccountingState>((set, get) => ({
  accounts: [],
  periods: [],
  journalEntries: [],
  transactions: [],
  incomeStatement: [],
  balanceSheet: [],
  cashFlow: [],
  loading: false,
  error: null,
  
  // Accounts
  fetchAccounts: async () => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase
        .from('accounting_accounts')
        .select('*')
        .order('code');
      
      if (error) throw error;
      set({ accounts: data as AccountingAccount[], loading: false });
    } catch (error) {
      console.error('Error fetching accounts:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },
  
  getAccountById: (id: number) => {
    return get().accounts.find(account => account.id === id);
  },
  
  // Periods
  fetchPeriods: async () => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase
        .from('accounting_periods')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      set({ periods: data as AccountingPeriod[], loading: false });
    } catch (error) {
      console.error('Error fetching periods:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },
  
  getCurrentPeriod: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().periods.find(
      period => period.start_date <= today && period.end_date >= today
    );
  },
  
  // Journal Entries
  fetchJournalEntries: async () => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase
        .from('accounting_journal_entries')
        .select('*')
        .order('entry_date', { ascending: false });
      
      if (error) throw error;
      set({ journalEntries: data as JournalEntry[], loading: false });
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },
  
  getJournalEntryById: async (id: number) => {
    try {
      set({ loading: true, error: null });
      
      // Fetch the journal entry
      const { data: entryData, error: entryError } = await supabase
        .from('accounting_journal_entries')
        .select('*')
        .eq('id', id)
        .single();
      
      if (entryError) throw entryError;
      
      // Fetch the journal entry lines with account details
      const { data: linesData, error: linesError } = await supabase
        .from('accounting_journal_lines')
        .select(`
          *,
          account:accounting_accounts(*)
        `)
        .eq('journal_entry_id', id);
      
      if (linesError) throw linesError;
      
      const journalEntry = {
        ...entryData,
        journal_lines: linesData
      } as JournalEntry;
      
      set({ loading: false });
      return journalEntry;
    } catch (error) {
      console.error('Error fetching journal entry:', error);
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },
  
  // Transactions
  fetchTransactions: async () => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase
        .from('accounting_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      set({ transactions: data as FinancialTransaction[], loading: false });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },
  
  addTransaction: async (transaction) => {
    try {
      set({ loading: true, error: null });
      
      // Call the database function to post the transaction
      const { data, error } = await supabase
        .rpc('post_financial_transaction', {
          p_transaction_date: transaction.transaction_date,
          p_description: transaction.description,
          p_amount: transaction.amount,
          p_transaction_type: transaction.transaction_type,
          p_category: transaction.category || null,
          p_account_from_id: transaction.account_from_id || null,
          p_account_to_id: transaction.account_to_id || null
        });
      
      if (error) throw error;
      
      // Refresh the transactions list
      await get().fetchTransactions();
      
      // Refresh the journal entries
      await get().fetchJournalEntries();
      
      set({ loading: false });
      return data as number;
    } catch (error) {
      console.error('Error adding transaction:', error);
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },
  
  // Financial Reports
  generateIncomeStatement: async (startDate: string, endDate: string) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .rpc('generate_income_statement', {
          start_date: startDate,
          end_date: endDate
        });
      
      if (error) throw error;
      
      set({ 
        incomeStatement: data as IncomeStatementItem[],
        loading: false 
      });
    } catch (error) {
      console.error('Error generating income statement:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },
  
  generateBalanceSheet: async (asOfDate: string) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .rpc('generate_balance_sheet', {
          as_of_date: asOfDate
        });
      
      if (error) throw error;
      
      set({ 
        balanceSheet: data as BalanceSheetItem[],
        loading: false 
      });
    } catch (error) {
      console.error('Error generating balance sheet:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },
  
  generateCashFlowStatement: async (startDate: string, endDate: string) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .rpc('generate_cash_flow_statement', {
          start_date: startDate,
          end_date: endDate
        });
      
      if (error) throw error;
      
      set({ 
        cashFlow: data as CashFlowItem[],
        loading: false 
      });
    } catch (error) {
      console.error('Error generating cash flow statement:', error);
      set({ error: (error as Error).message, loading: false });
    }
  }
}));
