
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
import {
  generateIncomeStatement,
  generateBalanceSheet,
  generateCashFlowStatement
} from '@/lib/finance/financialReports';

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
      // Try to use chart_of_accounts if it exists, otherwise use existing accounts table
      let query = supabase.from('chart_of_accounts');
      let { data, error } = await query.select('*').order('code');
      
      if (error || !data || data.length === 0) {
        // Fallback to using the accounts table
        const accountsResult = await supabase
          .from('accounts')
          .select('*')
          .order('name');
        
        if (accountsResult.error) throw accountsResult.error;
        
        // Transform the accounts to AccountingAccount format
        data = accountsResult.data.map(account => ({
          id: account.id,
          code: account.id.toString().padStart(4, '0'),
          name: account.name,
          description: account.name,
          account_type: account.type.toLowerCase() as 'asset' | 'liability' | 'equity' | 'revenue' | 'expense',
          is_active: true,
          created_at: account.created_at
        }));
      } else {
        // Transform chart_of_accounts data to match AccountingAccount type
        data = data.map(account => ({
          id: account.id,
          code: account.code,
          name: account.name,
          description: account.description || account.name,
          account_type: account.type.toLowerCase() as 'asset' | 'liability' | 'equity' | 'revenue' | 'expense',
          is_active: true,
          created_at: account.created_at
        }));
      }
      
      set({ 
        accounts: data as AccountingAccount[], 
        loading: false 
      });
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
      
      // Create a default period if none exist
      const currentYear = new Date().getFullYear();
      const defaultPeriods = [
        {
          id: 1,
          name: `${currentYear} Annual Period`,
          start_date: `${currentYear}-01-01`,
          end_date: `${currentYear}-12-31`,
          is_closed: false,
          created_at: new Date().toISOString()
        }
      ];
      
      set({ periods: defaultPeriods as AccountingPeriod[], loading: false });
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
      
      // Try to get data from journal_entries table first
      const { data: journalData, error: journalError } = await supabase
        .from('journal_entries')
        .select('*')
        .order('entry_date', { ascending: false });
      
      if (journalData && !journalError) {
        // Convert journal entries to the expected format
        const formattedEntries = journalData.map(entry => ({
          id: entry.id,
          entry_date: entry.entry_date,
          reference_number: entry.reference_number || undefined,
          description: entry.description,
          period_id: undefined,
          is_posted: entry.posted,
          created_at: entry.created_at
        }));
        
        set({ journalEntries: formattedEntries as JournalEntry[], loading: false });
      } else {
        // Fall back to empty array
        console.warn('Journal entries table not found, using empty array');
        set({ journalEntries: [], loading: false });
      }
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },
  
  getJournalEntryById: async (id: number) => {
    try {
      set({ loading: true, error: null });
      
      // Try to get data from journal_entries table first
      const { data: entryData, error: entryError } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('id', id)
        .single();
      
      if (entryData && !entryError) {
        // Try to get journal lines
        const { data: linesData, error: linesError } = await supabase
          .from('journal_entry_lines')
          .select('*')
          .eq('journal_entry_id', id);
        
        const formattedEntry = {
          id: entryData.id,
          entry_date: entryData.entry_date,
          reference_number: entryData.reference_number || undefined,
          description: entryData.description,
          period_id: undefined,
          is_posted: entryData.posted,
          created_at: entryData.created_at,
          journal_lines: linesData && !linesError ? linesData.map(line => ({
            id: line.id,
            journal_entry_id: line.journal_entry_id,
            account_id: line.account_id,
            debit_amount: line.debit_amount,
            credit_amount: line.credit_amount,
            description: line.description,
            created_at: line.created_at
          })) : []
        };
        
        set({ loading: false });
        return formattedEntry as JournalEntry;
      } else {
        set({ loading: false });
        return null;
      }
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
      
      // Try to get transactions from accounting_transactions first
      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      
      if (transData && !transError) {
        // Convert transactions to the expected format
        const formattedTransactions = transData.map(trans => ({
          id: trans.id,
          transaction_date: trans.date,
          description: trans.description || '',
          amount: trans.amount,
          transaction_type: trans.type as 'income' | 'expense' | 'transfer',
          category: '',
          account_from_id: trans.account_id,
          account_to_id: undefined,
          journal_entry_id: undefined,
          created_at: trans.created_at
        }));
        
        set({ transactions: formattedTransactions as FinancialTransaction[], loading: false });
      } else {
        // Fall back to empty array
        console.warn('Transactions table not found or empty, using empty array');
        set({ transactions: [], loading: false });
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },
  
  addTransaction: async (transaction) => {
    try {
      set({ loading: true, error: null });
      
      // Insert into the transactions table directly
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          date: transaction.transaction_date,
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.transaction_type,
          account_id: transaction.account_from_id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Refresh the transactions list
      await get().fetchTransactions();
      
      set({ loading: false });
      return data?.id as number;
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
      
      const result = await generateIncomeStatement(startDate, endDate);
      
      // Transform the data to match the IncomeStatementItem format
      const incomeStatementItems: IncomeStatementItem[] = [
        {
          account_id: 1,
          account_code: '4000',
          account_name: 'Revenue',
          account_type: 'revenue',
          amount: result.revenues
        },
        {
          account_id: 2,
          account_code: '5000',
          account_name: 'Expenses',
          account_type: 'expense',
          amount: result.expenses
        }
      ];
      
      set({ 
        incomeStatement: incomeStatementItems,
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
      
      const result = await generateBalanceSheet(asOfDate);
      
      // Transform the data to match the BalanceSheetItem format
      const balanceSheetItems: BalanceSheetItem[] = [
        {
          account_id: 1,
          account_code: '1000',
          account_name: 'Assets',
          account_type: 'asset',
          balance: result.assets
        },
        {
          account_id: 2,
          account_code: '2000',
          account_name: 'Liabilities',
          account_type: 'liability',
          balance: result.liabilities
        },
        {
          account_id: 3,
          account_code: '3000',
          account_name: 'Equity',
          account_type: 'equity',
          balance: result.equity
        }
      ];
      
      set({ 
        balanceSheet: balanceSheetItems,
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
      
      const result = await generateCashFlowStatement(startDate, endDate);
      
      // Transform the data to match the CashFlowItem format
      const cashFlowItems: CashFlowItem[] = [
        {
          account_id: 1,
          account_code: '1100',
          account_name: 'Operating Activities',
          cash_flow_type: 'Operating',
          amount: result.operatingCashFlow
        },
        {
          account_id: 2,
          account_code: '1200',
          account_name: 'Investing Activities',
          cash_flow_type: 'Investing',
          amount: result.investingCashFlow
        },
        {
          account_id: 3,
          account_code: '1300',
          account_name: 'Financing Activities',
          cash_flow_type: 'Financing',
          amount: result.financingCashFlow
        }
      ];
      
      set({ 
        cashFlow: cashFlowItems,
        loading: false 
      });
    } catch (error) {
      console.error('Error generating cash flow statement:', error);
      set({ error: (error as Error).message, loading: false });
    }
  }
}));
