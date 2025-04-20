
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
  getAccountById: (id: string) => AccountingAccount | undefined;
  
  // Periods
  fetchPeriods: () => Promise<void>;
  getCurrentPeriod: () => AccountingPeriod | undefined;
  
  // Journal Entries
  fetchJournalEntries: () => Promise<void>;
  getJournalEntryById: (id: string) => Promise<JournalEntry | null>;
  
  // Transactions
  fetchTransactions: () => Promise<void>;
  addTransaction: (transaction: Omit<FinancialTransaction, 'id' | 'created_at' | 'journal_entry_id'>) => Promise<string | null>;
  
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
      // Try to use accounts table
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      const formattedAccounts = data.map(account => ({
        id: account.id,
        code: account.id.toString().substring(0, 4).padStart(4, '0'),
        name: account.name,
        description: account.name,
        account_type: account.type,
        is_active: true,
        created_at: account.created_at || new Date().toISOString()
      }));
      
      set({ 
        accounts: formattedAccounts as AccountingAccount[], 
        loading: false 
      });
    } catch (error) {
      console.error('Error fetching accounts:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },
  
  getAccountById: (id: string) => {
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
      
      // Fallback to empty array since journal_entries table might not exist yet
      set({ journalEntries: [], loading: false });
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },
  
  getJournalEntryById: async (id: string) => {
    try {
      set({ loading: true, error: null });
      
      // Fallback to null since journal_entries table might not exist yet
      set({ loading: false });
      return null;
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
      
      // Try to get transactions from transactions table
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
      
      console.log('Adding transaction with data:', transaction);
      
      // Insert into the transactions table directly with proper UUID handling
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          date: transaction.transaction_date,
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.transaction_type,
          account_id: transaction.account_from_id, // This should now be a UUID string
          category_id: transaction.account_to_id // Using account_to_id as category_id for now
        })
        .select()
        .single();
      
      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
      
      // Refresh the transactions list
      await get().fetchTransactions();
      
      set({ loading: false });
      return data?.id;
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
          account_id: '1',
          account_code: '4000',
          account_name: 'Revenue',
          account_type: 'revenue',
          amount: result.revenues
        },
        {
          account_id: '2',
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
          account_id: '1',
          account_code: '1000',
          account_name: 'Assets',
          account_type: 'asset',
          balance: result.assets
        },
        {
          account_id: '2',
          account_code: '2000',
          account_name: 'Liabilities',
          account_type: 'liability',
          balance: result.liabilities
        },
        {
          account_id: '3',
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
          account_id: '1',
          account_code: '1100',
          account_name: 'Operating Activities',
          cash_flow_type: 'Operating',
          amount: result.operatingCashFlow
        },
        {
          account_id: '2',
          account_code: '1200',
          account_name: 'Investing Activities',
          cash_flow_type: 'Investing',
          amount: result.investingCashFlow
        },
        {
          account_id: '3',
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
