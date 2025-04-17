
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CalendarIcon, Download, FileText, Printer } from 'lucide-react';
import { formatter } from '@/lib/utils';

const ReportsSection = () => {
  const [reportType, setReportType] = useState('income-expense');
  const [dateRange, setDateRange] = useState('current-month');
  const [fromDate, setFromDate] = useState(startOfMonth(new Date()));
  const [toDate, setToDate] = useState(endOfMonth(new Date()));
  const [account, setAccount] = useState('all');
  const [category, setCategory] = useState('all');
  const [exportFormat, setExportFormat] = useState('csv');
  const [loading, setLoading] = useState(false);
  
  const handleDateRangeChange = (value) => {
    setDateRange(value);
    
    const today = new Date();
    
    switch (value) {
      case 'current-month':
        setFromDate(startOfMonth(today));
        setToDate(endOfMonth(today));
        break;
      case 'previous-month':
        const lastMonth = subMonths(today, 1);
        setFromDate(startOfMonth(lastMonth));
        setToDate(endOfMonth(lastMonth));
        break;
      case 'current-year':
        setFromDate(startOfYear(today));
        setToDate(endOfYear(today));
        break;
      case 'custom':
        // Keep the dates as they are for custom range
        break;
      default:
        setFromDate(startOfMonth(today));
        setToDate(endOfMonth(today));
    }
  };
  
  const handleFromDateSelect = (date) => {
    setFromDate(date);
    setDateRange('custom');
  };
  
  const handleToDateSelect = (date) => {
    setToDate(date);
    setDateRange('custom');
  };
  
  const generateReport = async () => {
    try {
      setLoading(true);
      
      // In a real application, this would call a function to generate and download the report
      // For now, we'll simulate this with a delay
      
      setTimeout(() => {
        toast.success(`${reportType.replace('-', ' & ')} report generated successfully`);
        setLoading(false);
      }, 1500);
      
      // The real implementation would look something like:
      /*
      const { data, error } = await supabase
        .rpc('generate_financial_report', {
          report_type: reportType,
          from_date: fromDate.toISOString(),
          to_date: toDate.toISOString(),
          account_id: account === 'all' ? null : account,
          category_id: category === 'all' ? null : category,
          format_type: exportFormat
        });
        
      if (error) throw error;
      
      // Download the generated report
      */
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
      setLoading(false);
    }
  };
  
  const printReport = () => {
    toast.info('Printing functionality would be implemented here');
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Financial Reports</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Generate Reports</CardTitle>
          <CardDescription>Export financial data for accounting and tax purposes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="report-type">Report Type</Label>
                <Select 
                  value={reportType} 
                  onValueChange={setReportType}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income-expense">Income & Expense Report</SelectItem>
                    <SelectItem value="balance-sheet">Balance Sheet</SelectItem>
                    <SelectItem value="cash-flow">Cash Flow Statement</SelectItem>
                    <SelectItem value="account-statement">Account Statement</SelectItem>
                    <SelectItem value="tax-report">Tax Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="date-range">Date Range</Label>
                <Select 
                  value={dateRange} 
                  onValueChange={handleDateRangeChange}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current-month">Current Month</SelectItem>
                    <SelectItem value="previous-month">Previous Month</SelectItem>
                    <SelectItem value="current-year">Year to Date</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {dateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="from-date">From Date</Label>
                    <div className="mt-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {fromDate ? format(fromDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={fromDate}
                            onSelect={handleFromDateSelect}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="to-date">To Date</Label>
                    <div className="mt-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {toDate ? format(toDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={toDate}
                            onSelect={handleToDateSelect}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="account">Account</Label>
                <Select 
                  value={account} 
                  onValueChange={setAccount}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    <SelectItem value="account1">HDFC Bank</SelectItem>
                    <SelectItem value="account2">ICICI Bank</SelectItem>
                    <SelectItem value="account3">Cash Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={category} 
                  onValueChange={setCategory}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="cat1">Rent Collection</SelectItem>
                    <SelectItem value="cat2">Driver Salary</SelectItem>
                    <SelectItem value="cat3">Fuel</SelectItem>
                    <SelectItem value="cat4">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="format">Format</Label>
                <Select 
                  value={exportFormat} 
                  onValueChange={setExportFormat}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex space-x-4 pt-8">
                <Button 
                  onClick={generateReport} 
                  className="bg-fleet-purple hover:bg-fleet-purple-dark flex-1"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {loading ? 'Generating...' : 'Generate & Download'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={printReport}
                  className="flex-1"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-fleet-purple" />
              Income Summary
            </CardTitle>
            <CardDescription>Monthly income breakdown by category</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Detailed analysis of all income sources</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-fleet-purple" />
              Expense Analysis
            </CardTitle>
            <CardDescription>Detailed expense reports by category</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Track where your money is going</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-fleet-purple" />
              Tax Reports
            </CardTitle>
            <CardDescription>GST and income tax reports</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Simplify your tax filing process</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsSection;
