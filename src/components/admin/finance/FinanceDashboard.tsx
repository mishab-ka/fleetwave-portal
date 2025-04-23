
import React, { useEffect } from 'react';
import { TransactionForm } from './TransactionForm';
import { JournalEntriesView } from './JournalEntriesView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FinancialOverview } from './FinancialOverview';
import { useAccountingStore } from '@/stores/accountingStore';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, ArrowDown, ArrowUp, DollarSign, Wallet, PieChart } from 'lucide-react';
import { formatter } from '@/lib/utils';

const FinanceDashboard: React.FC = () => {
  const { generateIncomeStatement, generateBalanceSheet, generateCashFlowStatement, 
          incomeStatement, balanceSheet, cashFlow } = useAccountingStore();

  // Get dates for financial reports
  const today = new Date();
  const startDate = format(startOfMonth(today), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(today), 'yyyy-MM-dd');
  const asOfDate = format(today, 'yyyy-MM-dd');
  
  useEffect(() => {
    // Generate financial statements on component mount
    generateIncomeStatement(startDate, endDate);
    generateBalanceSheet(asOfDate);
    generateCashFlowStatement(startDate, endDate);
  }, [generateIncomeStatement, generateBalanceSheet, generateCashFlowStatement, startDate, endDate, asOfDate]);
  
  // Calculate summary metrics
  const totalRevenues = incomeStatement.find(item => item.account_type === 'revenue')?.amount || 0;
  const totalExpenses = incomeStatement.find(item => item.account_type === 'expense')?.amount || 0;
  const netIncome = totalRevenues - totalExpenses;
  
  const totalAssets = balanceSheet.find(item => item.account_type === 'asset')?.balance || 0;
  const totalLiabilities = balanceSheet.find(item => item.account_type === 'liability')?.balance || 0;
  const totalEquity = balanceSheet.find(item => item.account_type === 'equity')?.balance || 0;
  
  const operatingCashFlow = cashFlow.find(item => item.cash_flow_type === 'Operating')?.amount || 0;
  
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Financial Overview</h1>
      <FinancialOverview />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card className="bg-gradient-to-br from-green-100 to-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(totalRevenues)}</div>
            <div className="text-xs text-green-600 flex items-center mt-2">
              <ArrowUp className="h-4 w-4 mr-1" />
              <span>Month-to-date</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-100 to-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Wallet className="h-4 w-4 mr-2" />
              Monthly Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(totalExpenses)}</div>
            <div className="text-xs text-red-600 flex items-center mt-2">
              <ArrowDown className="h-4 w-4 mr-1" />
              <span>Month-to-date</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-100 to-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <PieChart className="h-4 w-4 mr-2" />
              Net Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(netIncome)}</div>
            <div className="text-xs text-blue-600 flex items-center mt-2">
              <BarChart className="h-4 w-4 mr-1" />
              <span>Month-to-date</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Add Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionForm />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Journal Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <JournalEntriesView />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinanceDashboard;
