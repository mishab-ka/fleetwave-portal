export interface Transaction {
  id: number;
  amount: number;
  type: string;
  description?: string;
  date: string;
  created_at: string;
  category_id?: number;
  account_id?: number;
}

export interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  type: string;
  created_at: string;
}

export interface AccountingAccount {
  id: number;
  code: string;
  name: string;
  description: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  is_active: boolean;
  created_at: string;
}

export interface AccountingPeriod {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  created_at: string;
}

export interface JournalEntryLine {
  id: number;
  journal_entry_id: number;
  account_id: number;
  debit_amount: number;
  credit_amount: number;
  description?: string;
  created_at: string;
  account?: AccountingAccount;
}

export interface JournalEntry {
  id: number;
  entry_date: string;
  reference_number?: string;
  description: string;
  period_id?: number;
  is_posted: boolean;
  created_at: string;
  journal_lines?: JournalEntryLine[];
}

export interface FinancialTransaction {
  id: number;
  transaction_date: string;
  description: string;
  amount: number;
  transaction_type: 'income' | 'expense' | 'transfer';
  category: string;
  account_from_id?: number;
  account_to_id?: number;
  journal_entry_id?: number;
  created_at: string;
}

export interface IncomeStatementItem {
  account_id: number;
  account_code: string;
  account_name: string;
  account_type: 'revenue' | 'expense';
  amount: number;
}

export interface BalanceSheetItem {
  account_id: number;
  account_code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity';
  balance: number;
}

export interface CashFlowItem {
  account_id: number;
  account_code: string;
  account_name: string;
  cash_flow_type: 'Operating' | 'Investing' | 'Financing';
  amount: number;
}

export interface BalanceItem {
  category: string;
  amount: number;
  type: 'asset' | 'liability';
}
