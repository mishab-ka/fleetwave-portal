
import { 
  IncomeStatementItem, 
  BalanceSheetItem, 
  CashFlowItem, 
  AccountingAccount 
} from '@/types/accounting';

export const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2
});

export const calculateIncomeStatementTotals = (items: IncomeStatementItem[]) => {
  const revenues = items
    .filter(item => item.account_type === 'revenue')
    .reduce((sum, item) => sum + item.amount, 0);
    
  const expenses = items
    .filter(item => item.account_type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);
    
  const netIncome = revenues - expenses;
  
  return { revenues, expenses, netIncome };
};

export const calculateBalanceSheetTotals = (items: BalanceSheetItem[]) => {
  const assets = items
    .filter(item => item.account_type === 'asset')
    .reduce((sum, item) => sum + item.balance, 0);
    
  const liabilities = items
    .filter(item => item.account_type === 'liability')
    .reduce((sum, item) => sum + item.balance, 0);
    
  const equity = items
    .filter(item => item.account_type === 'equity')
    .reduce((sum, item) => sum + item.balance, 0);
    
  return { assets, liabilities, equity };
};

export const calculateCashFlowTotals = (items: CashFlowItem[]) => {
  const operating = items
    .filter(item => item.cash_flow_type === 'Operating')
    .reduce((sum, item) => sum + item.amount, 0);
    
  const investing = items
    .filter(item => item.cash_flow_type === 'Investing')
    .reduce((sum, item) => sum + item.amount, 0);
    
  const financing = items
    .filter(item => item.cash_flow_type === 'Financing')
    .reduce((sum, item) => sum + item.amount, 0);
    
  const netCashFlow = operating + investing + financing;
  
  return { operating, investing, financing, netCashFlow };
};

export const groupAccountsByType = (accounts: AccountingAccount[]) => {
  return accounts.reduce((grouped, account) => {
    if (!grouped[account.account_type]) {
      grouped[account.account_type] = [];
    }
    grouped[account.account_type].push(account);
    return grouped;
  }, {} as Record<string, AccountingAccount[]>);
};

export const findParentAccounts = (accounts: AccountingAccount[]) => {
  return accounts.filter(account => !account.parent_id);
};

export const findChildAccounts = (accounts: AccountingAccount[], parentId: number) => {
  return accounts.filter(account => account.parent_id === parentId);
};

export const getAccountName = (accounts: AccountingAccount[], id?: number) => {
  if (!id) return 'N/A';
  const account = accounts.find(acc => acc.id === id);
  return account ? `${account.code} - ${account.name}` : 'N/A';
};

export const getAccountTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'asset': 'Asset',
    'liability': 'Liability',
    'equity': 'Equity',
    'revenue': 'Revenue',
    'expense': 'Expense'
  };
  
  return labels[type] || type;
};

export const getCashFlowTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'Operating': 'Operating Activities',
    'Investing': 'Investing Activities',
    'Financing': 'Financing Activities'
  };
  
  return labels[type] || type;
};
