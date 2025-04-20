
export interface Transaction {
  id: number;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  description?: string;
  date: string;
  created_at: string;
  category_id?: number;
  account_id?: number;
}

export interface Account {
  id: number;
  name: string;
  type: 'bank' | 'cash' | 'card';
  balance: number;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  created_at: string;
}
