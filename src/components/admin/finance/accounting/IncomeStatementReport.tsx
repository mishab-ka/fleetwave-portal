
import React, { useEffect, useState } from 'react';
import { useAccountingStore } from '@/stores/accountingStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatter } from '@/lib/finance/accountingUtils';
import { calculateIncomeStatementTotals } from '@/lib/finance/accountingUtils';
import { AlertCircle, Download, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export const IncomeStatementReport: React.FC = () => {
  const { 
    incomeStatement, 
    generateIncomeStatement, 
    loading, 
    error 
  } = useAccountingStore();
  
  const [period, setPeriod] = useState('current');
  const [customStartDate, setCustomStartDate] = useState<string>(
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  );

  useEffect(() => {
    // Initialize with current month data
    const today = new Date();
    const startDate = format(startOfMonth(today), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(today), 'yyyy-MM-dd');
    
    generateIncomeStatement(startDate, endDate);
  }, [generateIncomeStatement]);

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    
    const today = new Date();
    let startDate: string;
    let endDate: string;
    
    switch(value) {
      case 'current':
        startDate = format(startOfMonth(today), 'yyyy-MM-dd');
        endDate = format(endOfMonth(today), 'yyyy-MM-dd');
        break;
      case 'previous':
        const lastMonth = subMonths(today, 1);
        startDate = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
        endDate = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
        break;
      case 'ytd':
        startDate = `${today.getFullYear()}-01-01`;
        endDate = format(today, 'yyyy-MM-dd');
        break;
      case 'custom':
        startDate = customStartDate;
        endDate = customEndDate;
        break;
      default:
        startDate = format(startOfMonth(today), 'yyyy-MM-dd');
        endDate = format(endOfMonth(today), 'yyyy-MM-dd');
        break;
    }
    
    generateIncomeStatement(startDate, endDate);
  };

  const handleCustomDateChange = (startDate: string, endDate: string) => {
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
    
    if (period === 'custom') {
      generateIncomeStatement(startDate, endDate);
    }
  };

  const handleExport = () => {
    // In a real app, this would generate a CSV or PDF file
    alert('Export functionality would be implemented here');
  };

  const { revenues, expenses, netIncome } = calculateIncomeStatementTotals(incomeStatement);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="mr-2 h-5 w-5" />
          Income Statement
        </CardTitle>
        <CardDescription>
          Financial performance report showing revenue, expenses, and profit
        </CardDescription>
        
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <div className="flex-1 min-w-[200px]">
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current Month</SelectItem>
                <SelectItem value="previous">Previous Month</SelectItem>
                <SelectItem value="ytd">Year to Date</SelectItem>
                <SelectItem value="custom">Custom Date Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {period === 'custom' && (
            <div className="flex items-center gap-2 flex-1 min-w-[300px]">
              <input 
                type="date" 
                value={customStartDate}
                onChange={(e) => handleCustomDateChange(e.target.value, customEndDate)}
                className="p-2 border rounded flex-1"
              />
              <span>to</span>
              <input 
                type="date" 
                value={customEndDate}
                onChange={(e) => handleCustomDateChange(customStartDate, e.target.value)}
                className="p-2 border rounded flex-1"
              />
            </div>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-auto"
            onClick={handleExport}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead colSpan={2} className="text-lg font-bold">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeStatement
                  .filter(item => item.account_type === 'revenue')
                  .map(item => (
                    <TableRow key={item.account_id}>
                      <TableCell className="font-medium">
                        {item.account_code} - {item.account_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatter.format(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                <TableRow className="font-semibold bg-muted/20">
                  <TableCell>Total Revenue</TableCell>
                  <TableCell className="text-right">
                    {formatter.format(revenues)}
                  </TableCell>
                </TableRow>
              </TableBody>

              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead colSpan={2} className="text-lg font-bold">Expenses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeStatement
                  .filter(item => item.account_type === 'expense')
                  .map(item => (
                    <TableRow key={item.account_id}>
                      <TableCell className="font-medium">
                        {item.account_code} - {item.account_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatter.format(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                <TableRow className="font-semibold bg-muted/20">
                  <TableCell>Total Expenses</TableCell>
                  <TableCell className="text-right">
                    {formatter.format(expenses)}
                  </TableCell>
                </TableRow>
              </TableBody>

              <TableHeader>
                <TableRow>
                  <TableHead colSpan={2} className="text-lg font-bold bg-muted/50">
                    Summary
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="font-bold text-lg">
                  <TableCell>Net Income</TableCell>
                  <TableCell className={`text-right ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatter.format(netIncome)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            
            {incomeStatement.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No data available for the selected period.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
