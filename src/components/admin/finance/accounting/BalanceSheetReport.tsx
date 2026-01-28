
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
import { calculateBalanceSheetTotals } from '@/lib/finance/accountingUtils';
import { AlertCircle, Download, BarChart } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export const BalanceSheetReport: React.FC = () => {
  const { 
    balanceSheet, 
    generateBalanceSheet, 
    loading, 
    error 
  } = useAccountingStore();
  
  const [asOfDate, setAsOfDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );

  useEffect(() => {
    // Initialize with current date
    const today = format(new Date(), 'yyyy-MM-dd');
    generateBalanceSheet(today);
  }, [generateBalanceSheet]);

  const handleDateChange = (date: string) => {
    setAsOfDate(date);
    generateBalanceSheet(date);
  };

  const handleExport = () => {
    // In a real app, this would generate a CSV or PDF file
    alert('Export functionality would be implemented here');
  };

  const { assets, liabilities, equity } = calculateBalanceSheetTotals(balanceSheet);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart className="mr-2 h-5 w-5" />
          Balance Sheet
        </CardTitle>
        <CardDescription>
          Financial position report showing assets, liabilities, and equity
        </CardDescription>
        
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <div className="flex items-center gap-2">
            <span>As of:</span>
            <input 
              type="date" 
              value={asOfDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="p-2 border rounded"
            />
          </div>
          
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
                  <TableHead colSpan={2} className="text-lg font-bold">Assets</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balanceSheet
                  .filter(item => item.account_type === 'asset')
                  .map(item => (
                    <TableRow key={item.account_id}>
                      <TableCell className="font-medium">
                        {item.account_code} - {item.account_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatter.format(item.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                <TableRow className="font-semibold bg-muted/20">
                  <TableCell>Total Assets</TableCell>
                  <TableCell className="text-right">
                    {formatter.format(assets)}
                  </TableCell>
                </TableRow>
              </TableBody>

              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead colSpan={2} className="text-lg font-bold">Liabilities</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balanceSheet
                  .filter(item => item.account_type === 'liability')
                  .map(item => (
                    <TableRow key={item.account_id}>
                      <TableCell className="font-medium">
                        {item.account_code} - {item.account_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatter.format(item.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                <TableRow className="font-semibold bg-muted/20">
                  <TableCell>Total Liabilities</TableCell>
                  <TableCell className="text-right">
                    {formatter.format(liabilities)}
                  </TableCell>
                </TableRow>
              </TableBody>

              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead colSpan={2} className="text-lg font-bold">Equity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balanceSheet
                  .filter(item => item.account_type === 'equity')
                  .map(item => (
                    <TableRow key={item.account_id}>
                      <TableCell className="font-medium">
                        {item.account_code} - {item.account_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatter.format(item.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                <TableRow className="font-semibold bg-muted/20">
                  <TableCell>Total Equity</TableCell>
                  <TableCell className="text-right">
                    {formatter.format(equity)}
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
                  <TableCell>Total Liabilities & Equity</TableCell>
                  <TableCell className="text-right">
                    {formatter.format(liabilities + equity)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            
            {balanceSheet.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No data available for the selected date.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
