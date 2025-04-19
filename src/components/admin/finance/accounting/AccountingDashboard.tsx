
import React, { useEffect } from 'react';
import { useAccountingStore } from '@/stores/accountingStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatter } from '@/lib/finance/accountingUtils';
import { 
  BarChart as BarChartIcon, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const AccountingDashboard: React.FC = () => {
  const { 
    incomeStatement,
    balanceSheet,
    cashFlow,
    generateIncomeStatement,
    generateBalanceSheet,
    generateCashFlowStatement,
    loading
  } = useAccountingStore();

  useEffect(() => {
    // Get the current date and first day of the month
    const today = new Date();
    const startDate = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd');
    const endDate = format(today, 'yyyy-MM-dd');
    
    // Generate financial reports
    generateIncomeStatement(startDate, endDate);
    generateBalanceSheet(endDate);
    generateCashFlowStatement(startDate, endDate);
  }, [generateIncomeStatement, generateBalanceSheet, generateCashFlowStatement]);

  // Calculate summary data
  const totalRevenue = incomeStatement
    .filter(item => item.account_type === 'revenue')
    .reduce((sum, item) => sum + item.amount, 0);
    
  const totalExpenses = incomeStatement
    .filter(item => item.account_type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);
    
  const netIncome = totalRevenue - totalExpenses;
  
  const totalAssets = balanceSheet
    .filter(item => item.account_type === 'asset')
    .reduce((sum, item) => sum + item.balance, 0);
    
  const totalLiabilities = balanceSheet
    .filter(item => item.account_type === 'liability')
    .reduce((sum, item) => sum + item.balance, 0);
    
  const totalEquity = balanceSheet
    .filter(item => item.account_type === 'equity')
    .reduce((sum, item) => sum + item.balance, 0);
    
  const netCashFlow = cashFlow.reduce((sum, item) => sum + item.amount, 0);

  // Prepare data for charts
  const revenueVsExpenses = [
    {
      name: 'Revenue',
      amount: totalRevenue
    },
    {
      name: 'Expenses',
      amount: totalExpenses
    },
    {
      name: 'Net Income',
      amount: netIncome
    }
  ];

  // Prepare expenses breakdown for pie chart
  const expenseBreakdown = incomeStatement
    .filter(item => item.account_type === 'expense')
    .map(item => ({
      name: item.account_name,
      value: item.amount
    }));

  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // Custom formatter for BarChart values
  const formatYAxisTick = (value: number) => {
    return formatter.format(value).replace(/\.\d\d$/, '');
  };

  // Custom formatter for tooltip values
  const formatTooltipValue = (value: number) => {
    return formatter.format(value);
  };

  // Get bar color based on item name
  const getBarColor = (entry: { name: string }) => {
    if (entry.name === 'Revenue') return '#4CAF50';
    if (entry.name === 'Expenses') return '#F44336';
    return '#2196F3';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Accounting Dashboard</h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-green-500 mr-2" />
              <div className="text-2xl font-bold">
                {loading ? '...' : formatter.format(totalRevenue)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Current month to date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CreditCard className="h-4 w-4 text-red-500 mr-2" />
              <div className="text-2xl font-bold">
                {loading ? '...' : formatter.format(totalExpenses)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Current month to date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              {netIncome >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-2" />
              )}
              <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {loading ? '...' : formatter.format(netIncome)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Profit/Loss this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              {netCashFlow >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-2" />
              )}
              <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {loading ? '...' : formatter.format(netCashFlow)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Net change in cash
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChartIcon className="mr-2 h-5 w-5" />
              Revenue vs. Expenses
            </CardTitle>
            <CardDescription>
              Comparison of revenue, expenses, and net income
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={revenueVsExpenses}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={formatYAxisTick} />
                    <Tooltip formatter={(value) => formatTooltipValue(value as number)} />
                    <Legend />
                    <Bar 
                      dataKey="amount" 
                      name="Amount" 
                      fill="#4CAF50" 
                      maxBarSize={60}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChartIcon className="mr-2 h-5 w-5" />
              Expense Breakdown
            </CardTitle>
            <CardDescription>
              Distribution of expenses by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : expenseBreakdown.length === 0 ? (
                <div className="flex justify-center items-center h-full text-gray-500">
                  No expense data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatTooltipValue(value as number)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Balance Sheet Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChartIcon className="mr-2 h-5 w-5" />
            Balance Sheet Summary
          </CardTitle>
          <CardDescription>
            Overview of assets, liabilities, and equity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Total Assets</h3>
              <p className="text-2xl font-bold">{formatter.format(totalAssets)}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">Total Liabilities</h3>
              <p className="text-2xl font-bold">{formatter.format(totalLiabilities)}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-purple-800 mb-2">Total Equity</h3>
              <p className="text-2xl font-bold">{formatter.format(totalEquity)}</p>
            </div>
          </div>
          
          {totalAssets !== (totalLiabilities + totalEquity) && (
            <div className="mt-4 p-2 bg-yellow-100 text-yellow-800 rounded">
              <strong>Note:</strong> Assets ({formatter.format(totalAssets)}) should equal Liabilities + Equity ({formatter.format(totalLiabilities + totalEquity)}).
              Difference: {formatter.format(Math.abs(totalAssets - (totalLiabilities + totalEquity)))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
