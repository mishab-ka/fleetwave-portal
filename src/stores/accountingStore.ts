
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { 
  AccountingAccount, 
  AccountingPeriod, 
  JournalEntry, 
  JournalEntryLine,
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
  getAccountById: (id: string) => AccountingAccount | undefined;
  createAccount: (account: Omit<AccountingAccount, 'id' | 'created_at'>) => Promise<string | null>;
  
  // Periods
  fetchPeriods: () => Promise<void>;
  getCurrentPeriod: () => AccountingPeriod | undefined;
  
  // Journal Entries
  fetchJournalEntries: () => Promise<void>;
  getJournalEntryById: (id: string) => Promise<JournalEntry | null>;
  createJournalEntry: (journalEntry: Omit<JournalEntry, 'id' | 'created_at'>, lines: Omit<JournalEntryLine, 'id' | 'journal_entry_id' | 'created_at'>[]) => Promise<number | null>;
  
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
      
      // Map the accounts to our expected format
      const formattedAccounts: AccountingAccount[] = data.map(account => ({
        id: account.id,
        code: account.type.substring(0, 1).toUpperCase() + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
        name: account.name,
        description: account.name,
        account_type: account.type.toLowerCase() as any,
        is_active: true,
        created_at: account.created_at || new Date().toISOString(),
        balance: account.balance
      }));
      
      set({ 
        accounts: formattedAccounts, 
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
  
  createAccount: async (account) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          name: account.name,
          type: account.account_type,
          balance: 0
        })
        .select()
        .single();
      
      if (error) throw error;
      
      await get().fetchAccounts();
      
      set({ loading: false });
      return data.id;
    } catch (error) {
      console.error('Error creating account:', error);
      set({ error: (error as Error).message, loading: false });
      return null;
    }
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
      
      // Fetch transactions and convert them to journal entries
      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      
      if (transError) throw transError;
      
      // Create mock journal entries from transactions
      const journalEntries: JournalEntry[] = transData.map((trans, index) => ({
        id: index + 1,
        entry_date: trans.date,
        description: trans.description || '',
        is_posted: true,
        created_at: trans.created_at || new Date().toISOString(),
        journal_lines: [
          {
            id: index * 2 + 1,
            journal_entry_id: index + 1,
            account_id: trans.type === 'income' ? trans.category_id || '' : trans.account_id || '',
            debit_amount: trans.type === 'income' ? 0 : trans.amount,
            credit_amount: trans.type === 'income' ? trans.amount : 0,
            created_at: trans.created_at || new Date().toISOString()
          },
          {
            id: index * 2 + 2,
            journal_entry_id: index + 1,
            account_id: trans.type === 'income' ? trans.account_id || '' : trans.category_id || '',
            debit_amount: trans.type === 'income' ? trans.amount : 0,
            credit_amount: trans.type === 'income' ? 0 : trans.amount,
            created_at: trans.created_at || new Date().toISOString()
          }
        ]
      }));
      
      set({ journalEntries, loading: false });
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },
  
  getJournalEntryById: async (id: string) => {
    const numericId = parseInt(id);
    if (isNaN(numericId)) return null;
    
    const entry = get().journalEntries.find(entry => entry.id === numericId);
    return entry || null;
  },
  
  createJournalEntry: async (journalEntry, lines) => {
    try {
      set({ loading: true, error: null });
      
      // Validate that debits = credits
      const totalDebits = lines.reduce((sum, line) => sum + line.debit_amount, 0);
      const totalCredits = lines.reduce((sum, line) => sum + line.credit_amount, 0);
      
      if (totalDebits !== totalCredits) {
        throw new Error('Debits must equal credits');
      }
      
      // For now, we'll create a mock journal entry
      const newEntryId = get().journalEntries.length + 1;
      
      const newEntry: JournalEntry = {
        id: newEntryId,
        entry_date: journalEntry.entry_date,
        reference_number: journalEntry.reference_number,
        description: journalEntry.description,
        period_id: journalEntry.period_id,
        is_posted: journalEntry.is_posted,
        created_at: new Date().toISOString(),
        journal_lines: lines.map((line, index) => ({
          id: newEntryId * 100 + index + 1,
          journal_entry_id: newEntryId,
          account_id: line.account_id,
          debit_amount: line.debit_amount,
          credit_amount: line.credit_amount,
          description: line.description,
          created_at: new Date().toISOString()
        }))
      };
      
      set(state => ({
        journalEntries: [...state.journalEntries, newEntry]
      }));
      
      set({ loading: false });
      return newEntryId;
    } catch (error) {
      console.error('Error creating journal entry:', error);
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },
  
  // Transactions
  fetchTransactions: async () => {
    try {
      set({ loading: true, error: null });
      
      // Fetch from transactions table
      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      
      if (transError) throw transError;
      
      if (transData) {
        // Convert transactions to the expected format
        const formattedTransactions = transData.map(trans => ({
          id: trans.id,
          transaction_date: trans.date,
          description: trans.description || '',
          amount: trans.amount,
          transaction_type: trans.type as 'income' | 'expense' | 'transfer',
          category: '',
          account_from_id: trans.type === 'expense' ? trans.account_id : undefined,
          account_to_id: trans.type === 'income' ? trans.account_id : undefined,
          payment_mode: 'Cash',
          created_at: trans.created_at || new Date().toISOString()
        }));
        
        set({ transactions: formattedTransactions as FinancialTransaction[], loading: false });
      } else {
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
      
      const { transaction_date, description, amount, transaction_type, account_from_id, account_to_id } = transaction;
      
      // Determine which account to use based on transaction type
      let accountId;
      let categoryId;
      
      if (transaction_type === 'income') {
        accountId = account_to_id;  // Destination account for income
        categoryId = account_from_id; // Revenue account/category
      } else if (transaction_type === 'expense') {
        accountId = account_from_id; // Source account for expense
        categoryId = account_to_id; // Expense account/category
      } else {
        // For transfers, accountId is source and categoryId is destination
        accountId = account_from_id;
        categoryId = account_to_id;
      }
      
      // Insert into the transactions table
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          date: transaction_date,
          description,
          amount,
          type: transaction_type,
          account_id: accountId,
          category_id: categoryId
        })
        .select()
        .single();
      
      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
      
      // Create double-entry journal entry
      // For a real app, this would be more sophisticated
      const journalLines = [];
      
      if (transaction_type === 'income') {
        // Debit the asset account (increase)
        journalLines.push({
          account_id: accountId || '',
          debit_amount: amount,
          credit_amount: 0
        });
        
        // Credit the revenue account (increase)
        journalLines.push({
          account_id: categoryId || '',
          debit_amount: 0,
          credit_amount: amount
        });
      } else if (transaction_type === 'expense') {
        // Debit the expense account (increase)
        journalLines.push({
          account_id: categoryId || '',
          debit_amount: amount,
          credit_amount: 0
        });
        
        // Credit the asset account (decrease)
        journalLines.push({
          account_id: accountId || '',
          debit_amount: 0,
          credit_amount: amount
        });
      } else if (transaction_type === 'transfer') {
        // Debit the destination account (increase)
        journalLines.push({
          account_id: categoryId || '',
          debit_amount: amount,
          credit_amount: 0
        });
        
        // Credit the source account (decrease)
        journalLines.push({
          account_id: accountId || '',
          debit_amount: 0,
          credit_amount: amount
        });
      }
      
      // Create journal entry
      await get().createJournalEntry({
        entry_date: transaction_date,
        description: `${transaction_type.charAt(0).toUpperCase() + transaction_type.slice(1)} - ${description}`,
        is_posted: true
      }, journalLines);
      
      // Refresh the transactions and journal entries
      await get().fetchTransactions();
      await get().fetchJournalEntries();
      
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
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;
      
      // Calculate revenues and expenses
      const revenues = data
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const expenses = data
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Create income statement items
      const incomeStatementItems: IncomeStatementItem[] = [
        {
          account_id: '1',
          account_code: '4000',
          account_name: 'Total Revenue',
          account_type: 'revenue',
          amount: revenues
        },
        {
          account_id: '2',
          account_code: '5000',
          account_name: 'Total Expenses',
          account_type: 'expense',
          amount: expenses
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
      
      // Get assets
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('*');
        
      if (assetsError) throw assetsError;
      
      // Get liabilities
      const { data: liabilities, error: liabilitiesError } = await supabase
        .from('liabilities')
        .select('*');
        
      if (liabilitiesError) throw liabilitiesError;
      
      // Calculate totals
      const totalAssets = assets.reduce((sum, asset) => sum + asset.value, 0);
      const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.value, 0);
      const equity = totalAssets - totalLiabilities;
      
      // Create balance sheet items
      const balanceSheetItems: BalanceSheetItem[] = [
        {
          account_id: '1',
          account_code: '1000',
          account_name: 'Total Assets',
          account_type: 'asset',
          balance: totalAssets
        },
        {
          account_id: '2',
          account_code: '2000',
          account_name: 'Total Liabilities',
          account_type: 'liability',
          balance: totalLiabilities
        },
        {
          account_id: '3',
          account_code: '3000',
          account_name: 'Equity',
          account_type: 'equity',
          balance: equity
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
      
      // Get operating cash flow from transactions
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;
      
      // Calculate cash flows
      const operatingCashFlow = data
        .filter(t => ['income', 'expense'].includes(t.type))
        .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
        
      // In a real app, these would be calculated based on actual data
      const investingCashFlow = 0;
      const financingCashFlow = 0;
      
      // Create cash flow items
      const cashFlowItems: CashFlowItem[] = [
        {
          account_id: '1',
          account_code: '1100',
          account_name: 'Operating Activities',
          cash_flow_type: 'Operating',
          amount: operatingCashFlow
        },
        {
          account_id: '2',
          account_code: '1200',
          account_name: 'Investing Activities',
          cash_flow_type: 'Investing',
          amount: investingCashFlow
        },
        {
          account_id: '3',
          account_code: '1300',
          account_name: 'Financing Activities',
          cash_flow_type: 'Financing',
          amount: financingCashFlow
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
