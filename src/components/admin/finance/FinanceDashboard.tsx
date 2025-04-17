
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, CreditCard, ArrowUpFromLine, ArrowDownToLine } from 'lucide-react';
import { formatter } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const categoryColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD'];

const FinanceDashboard = () => {
  const [timeRange, setTimeRange] = useState('month');
  const [financialData, setFinancialData] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
    cashBalance: 0,
    revenueChange: 0,
    expensesChange: 0,
    incomeChange: 0,
    balanceChange: 0,
    monthlyData: [],
    expenseCategories: [],
    incomeCategories: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialData(timeRange);
  }, [timeRange]);

  const fetchFinancialData = async (period) => {
    setLoading(true);
    try {
      // Get the date range based on selected period
      const { startDate, endDate } = getDateRange(period);
      
      // Fetch all transactions for the selected period
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts!transactions_account_id_fkey(id, name, type, balance),
          categories!transactions_category_id_fkey(id, name, type)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      // Calculate summary metrics
      const totalRevenue = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
      const netIncome = totalRevenue - totalExpenses;
      
      // Fetch account balances
      const { data: accounts } = await supabase
        .from('accounts')
        .select('*');
        
      const cashBalance = accounts
        ? accounts.reduce((sum, account) => sum + parseFloat(account.balance || 0), 0)
        : 0;

      // Get previous period data for comparison
      const { startDate: prevStartDate, endDate: prevEndDate } = getDateRange(period, true);
      
      const { data: prevTransactions } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', prevStartDate)
        .lte('date', prevEndDate);
      
      // Calculate percentage changes
      const prevRevenue = prevTransactions
        ? prevTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0)
        : 0;
        
      const prevExpenses = prevTransactions
        ? prevTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0)
        : 0;
        
      const prevIncome = prevRevenue - prevExpenses;
      
      const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
      const expensesChange = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : 0;
      const incomeChange = prevIncome > 0 ? ((netIncome - prevIncome) / prevIncome) * 100 : 0;
      
      // Placeholder for balance change as we don't have historical balance data
      const balanceChange = 5.2; // This would need a different approach to get historical balance
      
      // Prepare monthly data chart
      const monthlyData = prepareMonthlyData(transactions);
      
      // Prepare category data for pie charts
      const { expenseCategories, incomeCategories } = prepareCategoryData(transactions);
      
      setFinancialData({
        totalRevenue,
        totalExpenses,
        netIncome,
        cashBalance,
        revenueChange,
        expensesChange,
        incomeChange,
        balanceChange,
        monthlyData,
        expenseCategories,
        incomeCategories
      });
      
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = (period, previous = false) => {
    const now = new Date();
    let startDate, endDate;
    
    if (previous) {
      // For previous period comparison
      if (period === 'week') {
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
      } else if (period === 'month') {
        endDate = new Date(now.getFullYear(), now.getMonth() - 1, 0); // Last day of previous month
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1); // First day of month before previous
      } else if (period === 'quarter') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        endDate = new Date(now.getFullYear(), currentQuarter * 3 - 1, 0); // Last day of previous quarter
        startDate = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1); // First day of quarter before previous
      } else if (period === 'year') {
        endDate = new Date(now.getFullYear() - 1, 11, 31); // Last day of previous year
        startDate = new Date(now.getFullYear() - 2, 0, 1); // First day of year before previous
      }
    } else {
      // For current period
      if (period === 'week') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        endDate = now;
      } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
      } else if (period === 'quarter') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        endDate = now;
      } else if (period === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
      }
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const prepareMonthlyData = (transactions) => {
    // Group transactions by month and calculate totals
    const monthlyTotals = {};
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const monthName = date.toLocaleString('default', { month: 'short' });
      
      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = {
          name: monthName,
          income: 0,
          expenses: 0
        };
      }
      
      if (transaction.type === 'income') {
        monthlyTotals[monthKey].income += parseFloat(transaction.amount);
      } else {
        monthlyTotals[monthKey].expenses += parseFloat(transaction.amount);
      }
    });
    
    return Object.values(monthlyTotals);
  };

  const prepareCategoryData = (transactions) => {
    // Group transactions by category
    const expenseTotals = {};
    const incomeTotals = {};
    
    transactions.forEach(transaction => {
      const category = transaction.categories ? transaction.categories.name : 'Uncategorized';
      
      if (transaction.type === 'expense') {
        if (!expenseTotals[category]) {
          expenseTotals[category] = 0;
        }
        expenseTotals[category] += parseFloat(transaction.amount);
      } else {
        if (!incomeTotals[category]) {
          incomeTotals[category] = 0;
        }
        incomeTotals[category] += parseFloat(transaction.amount);
      }
    });
    
    // Calculate percentages for the pie charts
    const expenseTotal = Object.values(expenseTotals).reduce((sum, amount) => sum + parseFloat(amount), 0);
    const incomeTotal = Object.values(incomeTotals).reduce((sum, amount) => sum + parseFloat(amount), 0);
    
    const expenseCategories = Object.entries(expenseTotals).map(([name, amount]) => ({
      name,
      value: Math.round((amount / expenseTotal) * 100) || 0
    }));
    
    const incomeCategories = Object.entries(incomeTotals).map(([name, amount]) => ({
      name,
      value: Math.round((amount / incomeTotal) * 100) || 0
    }));
    
    return { expenseCategories, incomeCategories };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Financial Dashboard</h2>
        
        <Select defaultValue={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(financialData.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              <span className={`flex items-center ${financialData.revenueChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {financialData.revenueChange >= 0 ? (
                  <ArrowUpRight className="mr-1 h-4 w-4" />
                ) : (
                  <ArrowDownRight className="mr-1 h-4 w-4" />
                )}
                {Math.abs(financialData.revenueChange).toFixed(1)}%
              </span>
              compared to last {timeRange}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(financialData.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              <span className={`flex items-center ${financialData.expensesChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {financialData.expensesChange >= 0 ? (
                  <ArrowUpRight className="mr-1 h-4 w-4" />
                ) : (
                  <ArrowDownRight className="mr-1 h-4 w-4" />
                )}
                {Math.abs(financialData.expensesChange).toFixed(1)}%
              </span>
              compared to last {timeRange}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Net Income
            </CardTitle>
            <ArrowUpFromLine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(financialData.netIncome)}</div>
            <p className="text-xs text-muted-foreground">
              <span className={`flex items-center ${financialData.incomeChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {financialData.incomeChange >= 0 ? (
                  <ArrowUpRight className="mr-1 h-4 w-4" />
                ) : (
                  <ArrowDownRight className="mr-1 h-4 w-4" />
                )}
                {Math.abs(financialData.incomeChange).toFixed(1)}%
              </span>
              compared to last {timeRange}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Cash Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(financialData.cashBalance)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 flex items-center">
                <ArrowUpFromLine className="mr-1 h-4 w-4" />
                {financialData.balanceChange.toFixed(1)}%
              </span>
              compared to last {timeRange}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Income vs. Expenses</CardTitle>
            <CardDescription>Monthly financial overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={financialData.monthlyData}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatter.format(value as number)} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }} 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Breakdown</CardTitle>
            <CardDescription>Financial distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="expenses">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
                <TabsTrigger value="income">Income</TabsTrigger>
              </TabsList>
              
              <TabsContent value="expenses" className="mt-4">
                <div className="h-[250px]">
                  {financialData.expenseCategories.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={financialData.expenseCategories}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label
                        >
                          {financialData.expenseCategories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No expense data for the selected period
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="income" className="mt-4">
                <div className="h-[250px]">
                  {financialData.incomeCategories.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={financialData.incomeCategories}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#82ca9d"
                          dataKey="value"
                          nameKey="name"
                          label
                        >
                          {financialData.incomeCategories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No income data for the selected period
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinanceDashboard;
