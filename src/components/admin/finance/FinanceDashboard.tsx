
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import CashflowChart from './CashflowChart';
import { DollarSign, TrendingUp, TrendingDown, Wallet, CreditCard } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { formatter } from '@/lib/utils';

interface FinanceStats {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  accountBalances: number;
  recentTransactions: any[];
  cashflowData: any[];
}

const FinanceDashboard: React.FC = () => {
  const [stats, setStats] = useState<FinanceStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
    accountBalances: 0,
    recentTransactions: [],
    cashflowData: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinanceStats = async () => {
      try {
        setLoading(true);
        
        // Get current month's data
        const startDate = format(new Date(), 'yyyy-MM-01');
        const endDate = format(new Date(), 'yyyy-MM-dd');
        
        // Fetch income transactions
        const { data: incomeData, error: incomeError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('type', 'income')
          .gte('date', startDate)
          .lte('date', endDate);

        if (incomeError) throw incomeError;

        // Fetch expense transactions
        const { data: expenseData, error: expenseError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('type', 'expense')
          .gte('date', startDate)
          .lte('date', endDate);

        if (expenseError) throw expenseError;

        // Calculate totals
        const totalRevenue = incomeData?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0;
        const totalExpenses = expenseData?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0;
        
        // Fetch account balances
        const { data: accountsData, error: accountsError } = await supabase
          .from('accounts')
          .select('balance');

        if (accountsError) throw accountsError;

        const accountBalances = accountsData?.reduce((sum, account) => sum + (account.balance || 0), 0) || 0;

        // Fetch recent transactions
        const { data: recentTransactions, error: transactionsError } = await supabase
          .from('transactions')
          .select('*')
          .order('date', { ascending: false })
          .limit(5);

        if (transactionsError) throw transactionsError;

        // Generate cashflow data for the last 6 months
        const cashflowData = [];
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(new Date(), i);
          const monthStart = format(monthDate, 'yyyy-MM-01');
          const monthEnd = format(monthDate, 'yyyy-MM-dd');

          const { data: monthIncome } = await supabase
            .from('transactions')
            .select('amount')
            .eq('type', 'income')
            .gte('date', monthStart)
            .lte('date', monthEnd);

          const { data: monthExpenses } = await supabase
            .from('transactions')
            .select('amount')
            .eq('type', 'expense')
            .gte('date', monthStart)
            .lte('date', monthEnd);

          const income = monthIncome?.reduce((sum, t) => sum + t.amount, 0) || 0;
          const expenses = monthExpenses?.reduce((sum, t) => sum + t.amount, 0) || 0;

          cashflowData.push({
            name: format(monthDate, 'MMM yyyy'),
            income,
            expenses,
            balance: income - expenses
          });
        }

        setStats({
          totalRevenue,
          totalExpenses,
          netIncome: totalRevenue - totalExpenses,
          accountBalances,
          recentTransactions: recentTransactions || [],
          cashflowData
        });

      } catch (error) {
        console.error('Error fetching finance stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses
            </CardTitle>
            <CreditCard className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(stats.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Income
            </CardTitle>
            {stats.netIncome >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.netIncome >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatter.format(stats.netIncome)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Account Balances
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(stats.accountBalances)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total across all accounts
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cashflow Overview</CardTitle>
            <CardDescription>Last 6 months income vs expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <CashflowChart data={stats.cashflowData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest financial activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentTransactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{transaction.description || 'Unnamed Transaction'}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(transaction.date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className={`font-medium ${transaction.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatter.format(transaction.amount)}
                  </div>
                </div>
              ))}
              {stats.recentTransactions.length === 0 && (
                <p className="text-center text-muted-foreground">No recent transactions</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinanceDashboard;
