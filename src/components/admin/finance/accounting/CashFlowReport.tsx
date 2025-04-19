
import React, { useEffect, useState } from 'react';
import { useAccountingStore } from '@/stores/accountingStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatter } from '@/lib/finance/accountingUtils';
import { calculateCashFlowTotals, getCashFlowTypeLabel } from '@/lib/finance/accountingUtils';
import { AlertCircle, Download, TrendingDown, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export const CashFlowReport: React.FC = () => {
  const { 
    cashFlow, 
    generateCashFlowStatement, 
    loading, 
    error 
  } = useAccountingStore();
  
  const [startDate, setStartDate] = useState<string>(
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState<string>(
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  );

  useEffect(() => {
    // Initialize with current month data
    const today = new Date();
    const start = format(startOfMonth(today), 'yyyy-MM-dd');
    const end = format(endOfMonth(today), 'yyyy-MM-dd');
    
    generateCashFlowStatement(start, end);
  }, [generateCashFlowStatement]);

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    generateCashFlowStatement(start, end);
  };

  const handleExport = () => {
    // In a real app, this would generate a CSV or PDF file
    alert('Export functionality would be implemented here');
  };

  const { operating, investing, financing, netCashFlow } = calculateCashFlowTotals(cashFlow);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <div className="flex">
            <TrendingUp className="mr-1 h-5 w-5 text-green-600" />
            <TrendingDown className="mr-2 h-5 w-5 text-red-600" />
          </div>
          Cash Flow Statement
        </CardTitle>
        <CardDescription>
          Report showing how changes in balance sheet accounts and income affect cash and cash equivalents
        </CardDescription>
        
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <div className="flex items-center gap-2 flex-1 min-w-[300px]">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => handleDateChange(e.target.value, endDate)}
              className="p-2 border rounded flex-1"
            />
            <span>to</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => handleDateChange(startDate, e.target.value)}
              className="p-2 border rounded flex-1"
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
              {/* Group by cash flow type */}
              {['Operating', 'Investing', 'Financing'].map(flowType => {
                const typeItems = cashFlow.filter(item => item.cash_flow_type === flowType);
                if (typeItems.length === 0) return null;
                
                return (
                  <React.Fragment key={flowType}>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead colSpan={2} className="text-lg font-bold">
                          {getCashFlowTypeLabel(flowType)}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {typeItems.map(item => (
                        <TableRow key={item.account_id}>
                          <TableCell className="font-medium">
                            {item.account_code} - {item.account_name}
                          </TableCell>
                          <TableCell className={`text-right ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatter.format(item.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold bg-muted/20">
                        <TableCell>
                          Total {getCashFlowTypeLabel(flowType)}
                        </TableCell>
                        <TableCell className={`text-right ${
                          flowType === 'Operating' ? (operating >= 0 ? 'text-green-600' : 'text-red-600') :
                          flowType === 'Investing' ? (investing >= 0 ? 'text-green-600' : 'text-red-600') :
                          (financing >= 0 ? 'text-green-600' : 'text-red-600')
                        }`}>
                          {formatter.format(
                            flowType === 'Operating' ? operating :
                            flowType === 'Investing' ? investing :
                            financing
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </React.Fragment>
                );
              })}

              <TableHeader>
                <TableRow>
                  <TableHead colSpan={2} className="text-lg font-bold bg-muted/50">
                    Summary
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="font-bold text-lg">
                  <TableCell>Net Change in Cash</TableCell>
                  <TableCell className={`text-right ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatter.format(netCashFlow)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            
            {cashFlow.length === 0 && !loading && (
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
