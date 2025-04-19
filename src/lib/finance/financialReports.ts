
import { supabase } from '@/integrations/supabase/client';

export async function generateIncomeStatement(startDate?: string, endDate?: string) {
  const { data, error } = await supabase
    .rpc('calculate_income_statement', { 
      start_date: startDate, 
      end_date: endDate 
    });

  if (error) throw error;
  return data;
}

export async function generateBalanceSheet(asOf?: string) {
  const { data, error } = await supabase
    .rpc('calculate_balance_sheet', { 
      as_of_date: asOf 
    });

  if (error) throw error;
  return data;
}

export async function generateCashFlowStatement(startDate?: string, endDate?: string) {
  const { data, error } = await supabase
    .rpc('calculate_cash_flow_statement', { 
      start_date: startDate, 
      end_date: endDate 
    });

  if (error) throw error;
  return data;
}
