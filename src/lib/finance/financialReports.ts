
import { supabase } from '@/integrations/supabase/client';

export async function generateIncomeStatement(startDate?: string, endDate?: string) {
  // Use a direct query instead of RPC since the function may not exist yet
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', startDate || '1970-01-01')
    .lte('date', endDate || new Date().toISOString().split('T')[0]);

  if (error) throw error;
  
  // Process the data to calculate income statement
  const revenues = data.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenses = data.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  
  return {
    revenues,
    expenses,
    netIncome: revenues - expenses
  };
}

export async function generateBalanceSheet(asOf?: string) {
  // Use direct queries instead of RPC
  const dateFilter = asOf || new Date().toISOString().split('T')[0];
  
  // Get all transactions up to the specified date
  const { data: transactions, error: transError } = await supabase
    .from('transactions')
    .select('*')
    .lte('date', dateFilter);
    
  if (transError) throw transError;
  
  // Get all accounts
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('*');
    
  if (accountsError) throw accountsError;
  
  // Calculate assets, liabilities and equity
  const assets = accounts
    .filter(a => a.type === 'asset')
    .reduce((sum, a) => sum + (a.balance || 0), 0);
    
  const liabilities = accounts
    .filter(a => a.type === 'liability')
    .reduce((sum, a) => sum + (a.balance || 0), 0);
  
  return {
    assets,
    liabilities,
    equity: assets - liabilities
  };
}

export async function generateCashFlowStatement(startDate?: string, endDate?: string) {
  // Use direct queries instead of RPC
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', startDate || '1970-01-01')
    .lte('date', endDate || new Date().toISOString().split('T')[0]);

  if (error) throw error;
  
  // Calculate cash flows
  const operatingCashFlow = data
    .filter(t => ['income', 'expense'].includes(t.type))
    .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
    
  // In a real app, you'd categorize transactions more specifically
  // This is a simplified version
  const investingCashFlow = 0;
  const financingCashFlow = 0;
  
  return {
    operatingCashFlow,
    investingCashFlow,
    financingCashFlow,
    netCashFlow: operatingCashFlow + investingCashFlow + financingCashFlow
  };
}
