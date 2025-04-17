
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Line, Pie } from 'recharts';
import { CircleDollarSign, TrendingUp, TrendingDown, Wallet, CreditCard, PiggyBank } from 'lucide-react';
import { formatter } from '@/lib/utils';

// Sample data for charts - in a real app, this would come from your database
const cashFlowData = [
  { name: 'Jan', income: 5000, expenses: 3000 },
  { name: 'Feb', income: 4500, expenses: 3200 },
  { name: 'Mar', income: 5500, expenses: 3700 },
  { name: 'Apr', income: 6000, expenses: 4000 },
  { name: 'May', income: 7000, expenses: 4100 },
  { name: 'Jun', income: 6500, expenses: 3800 },
];

const expenseData = [
  { name: 'Fuel', value: 30 },
  { name: 'Maintenance', value: 20 },
  { name: 'Driver Salary', value: 25 },
  { name: 'Insurance', value: 15 },
  { name: 'Other', value: 10 },
];

const incomeData = [
  { name: 'Rent Collection', value: 65 },
  { name: 'Vehicle Sales', value: 20 },
  { name: 'Other Income', value: 15 },
];

const FinanceDashboard = () => {
  const [totals, setTotals] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    bankBalance: 0
  });
  
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchTotals = async () => {
      try {
        // This would be replaced with actual database calls
        // For now using sample data
        setTotals({
          totalIncome: 183500,
          totalExpenses: 125700,
          netBalance: 57800,
          totalAssets: 1250000,
          totalLiabilities: 450000,
          bankBalance: 78500
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching finance totals:', error);
        setLoading(false);
      }
    };
    
    fetchTotals();
  }, []);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Financial Overview</h2>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Total Income</CardTitle>
            <CircleDollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(totals.totalIncome)}</div>
            <p className="text-xs text-muted-foreground">Month to date</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Total Expenses</CardTitle>
            <CreditCard className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(totals.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">Month to date</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Net Balance</CardTitle>
            <Wallet className="h-5 w-5 text-fleet-purple" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(totals.netBalance)}</div>
            <p className="text-xs text-muted-foreground">Month to date</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Second Row - Assets/Liabilities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Total Assets</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(totals.totalAssets)}</div>
            <p className="text-xs text-muted-foreground">Current valuation</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Total Liabilities</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(totals.totalLiabilities)}</div>
            <p className="text-xs text-muted-foreground">Outstanding dues</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Bank Balance</CardTitle>
            <PiggyBank className="h-5 w-5 text-fleet-purple" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(totals.bankBalance)}</div>
            <p className="text-xs text-muted-foreground">Total across all accounts</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Cash Flow</CardTitle>
            <CardDescription>Income vs Expenses over time</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <Line
              data={cashFlowData}
              width={500}
              height={300}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <Line type="monotone" dataKey="income" stroke="#0088FE" />
              <Line type="monotone" dataKey="expenses" stroke="#FF8042" />
            </Line>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>By category</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <Pie
              data={expenseData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label
              colors={COLORS}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Income Sources</CardTitle>
            <CardDescription>By category</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <Pie
              data={incomeData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label
              colors={COLORS}
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Last 5 financial transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-72">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-right p-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="p-2">2025-04-15</td>
                  <td className="p-2">Rent collection - Driver #1234</td>
                  <td className="p-2">Rent Collection</td>
                  <td className="p-2 text-right text-green-600">+₹1,500.00</td>
                </tr>
                <tr className="border-t">
                  <td className="p-2">2025-04-14</td>
                  <td className="p-2">Fuel purchase - Vehicle KA01M1234</td>
                  <td className="p-2">Fuel</td>
                  <td className="p-2 text-right text-red-600">-₹2,500.00</td>
                </tr>
                <tr className="border-t">
                  <td className="p-2">2025-04-13</td>
                  <td className="p-2">Vehicle maintenance</td>
                  <td className="p-2">Maintenance</td>
                  <td className="p-2 text-right text-red-600">-₹3,200.00</td>
                </tr>
                <tr className="border-t">
                  <td className="p-2">2025-04-12</td>
                  <td className="p-2">Rent collection - Driver #5678</td>
                  <td className="p-2">Rent Collection</td>
                  <td className="p-2 text-right text-green-600">+₹1,500.00</td>
                </tr>
                <tr className="border-t">
                  <td className="p-2">2025-04-11</td>
                  <td className="p-2">Driver Salary - John Doe</td>
                  <td className="p-2">Driver Salary</td>
                  <td className="p-2 text-right text-red-600">-₹8,000.00</td>
                </tr>
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceDashboard;
