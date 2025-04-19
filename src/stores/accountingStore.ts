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

const mapAccountTypeForDatabase = (accountType: string): string => {
  const typeMap: Record<string, string> = {
    'asset': 'bank',
    'liability': 'card',
    'equity': 'bank',
    'revenue': 'bank',
    'expense': 'cash'
  };
  
  const lowerType = accountType.toLowerCase();
  return typeMap[lowerType] || 'bank';
};

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
  
  fetchAccounts: async () => {
    try {
      set({ loading: true, error: null });
      let query = supabase.from('chart_of_accounts');
      let { data, error } = await query.select('*').order('code');
      
      if (error || !data || data.length === 0) {
        const accountsResult = await supabase
          .from('accounts')
          .select('*')
          .order('name');
        
        if (accountsResult.error) throw accountsResult.error;
        
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
  
  fetchPeriods: async () => {
    try {
      set({ loading: true, error: null });
      
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
  
  fetchJournalEntries: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data: journalData, error: journalError } = await supabase
        .from('journal_entries')
        .select('*')
        .order('entry_date', { ascending: false });
      
      if (journalData && !journalError) {
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
      
      const { data: entryData, error: entryError } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('id', id)
        .single();
      
      if (entryData && !entryError) {
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
  
  fetchTransactions: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      
      if (transData && !transError) {
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
      
      const { data: existingAccounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id, name, type')
        .in('id', [transaction.account_from_id, transaction.account_to_id].filter(Boolean));
      
      if (accountsError) throw accountsError;
      
      const accountsMap = new Map();
      
      if (!existingAccounts || existingAccounts.length < 2) {
        const neededAccountIds = [transaction.account_from_id, transaction.account_to_id].filter(Boolean);
        const existingAccountIds = existingAccounts ? existingAccounts.map(a => a.id) : [];
        const missingAccountIds = neededAccountIds.filter(id => !existingAccountIds.includes(id as number));
        
        if (missingAccountIds.length > 0) {
          const { data: chartAccounts, error: chartError } = await supabase
            .from('chart_of_accounts')
            .select('*')
            .in('id', missingAccountIds);
          
          if (chartError) throw chartError;
          
          if (chartAccounts && chartAccounts.length > 0) {
            for (const chartAccount of chartAccounts) {
              console.log('Creating account from chart account:', chartAccount);
              
              const accountType = mapAccountTypeForDatabase(chartAccount.type);
              console.log(`Mapped account type from "${chartAccount.type}" to "${accountType}"`);
              
              const { data: newAccount, error: insertError } = await supabase
                .from('accounts')
                .insert({
                  name: chartAccount.name,
                  type: accountType,
                  balance: 0
                })
                .select()
                .single();
              
              if (insertError) {
                console.error('Error creating account:', insertError);
                throw insertError;
              }
              
              if (newAccount) {
                console.log('Created new account:', newAccount);
                accountsMap.set(chartAccount.id, newAccount.id);
              }
            }
          }
        }
      }
      
      const accountId = accountsMap.get(transaction.account_from_id) || transaction.account_from_id;
      console.log('Using account ID for transaction:', accountId);
      
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          date: transaction.transaction_date,
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.transaction_type,
          account_id: accountId
        })
        .select()
        .single();
      
      if (error) throw error;
      
      await get().fetchTransactions();
      
      set({ loading: false });
      return data?.id as number;
    } catch (error) {
      console.error('Error adding transaction:', error);
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },
  
  generateIncomeStatement: async (startDate: string, endDate: string) => {
    try {
      set({ loading: true, error: null });
      
      const result = await generateIncomeStatement(startDate, endDate);
      
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
