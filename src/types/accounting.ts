export interface AccountingAccount {
  id: string;
  code: string;
  name: string;
  description?: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_id?: string;
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

export interface JournalEntryLine {
  id: number;
  journal_entry_id: number;
  account_id: string;
  account?: AccountingAccount;
  debit_amount: number;
  credit_amount: number;
  description?: string;
  created_at: string;
}

export interface FinancialTransaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  transaction_type: 'income' | 'expense' | 'transfer';
  category?: string;
  account_from_id?: string;
  account_to_id?: string;
  journal_entry_id?: string;
  created_at: string;
}

export interface IncomeStatementItem {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: 'revenue' | 'expense';
  amount: number;
}

export interface BalanceSheetItem {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity';
  balance: number;
}

export interface CashFlowItem {
  account_id: string;
  account_code: string;
  account_name: string;
  cash_flow_type: 'Operating' | 'Investing' | 'Financing';
  amount: number;
}

export interface Asset {
  id: string;
  name: string;
  value: number;
  created_at: string;
  updated_at?: string;
}

export interface Liability {
  id: string;
  name: string;
  value: number;
  created_at: string;
  updated_at?: string;
}
