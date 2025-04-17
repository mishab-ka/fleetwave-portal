
import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle, XCircle, Download, IndianRupee, TrendingUp, TrendingDown, Wallet, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

type Report = Tables<"fleet_reports">;

const AdminReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [financialSummary, setFinancialSummary] = useState({
    totalRentCollected: 0,
    fleetExpenses: 0,
    netProfit: 0,
    cashInUber: 0,
    cashInHand: 0
  });
  
  useEffect(() => {
    fetchReports();
  }, []);
  
  const fetchReports = async () => {
    try {
      const { data: reportsData, error } = await supabase
        .from('fleet_reports')
        .select('*')
        .order('submission_date', { ascending: false });
        
      if (error) throw error;
      
      setReports(reportsData || []);

      // Calculate financial summary
      const summary = (reportsData || []).reduce((acc, report) => {
        const rentPaid = report.rent_paid_amount || 0;
        const totalEarnings = report.total_earnings || 0;
        const cashCollected = report.total_cashcollect || 0;

        acc.totalRentCollected += rentPaid;
        // Simple fleet expense calculation (can be enhanced based on business logic)
        acc.fleetExpenses += (report.total_trips || 0) * 50; // Assuming ₹50 per trip as expense
        acc.netProfit = acc.totalRentCollected - acc.fleetExpenses;
        
        // If rent is positive, add to cash in hand/bank
        // If negative (dues), add to cash in uber
        if (rentPaid >= 0) {
          acc.cashInHand += rentPaid;
        } else {
          acc.cashInUber += Math.abs(rentPaid);
        }

        return acc;
      }, {
        totalRentCollected: 0,
        fleetExpenses: 0,
        netProfit: 0,
        cashInUber: 0,
        cashInHand: 0
      });

      setFinancialSummary(summary);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };
  
  const updateReportStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('fleet_reports')
        .update({ status: newStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      setReports(reports.map(report => 
        report.id === id ? { ...report, status: newStatus } : report
      ));
      
      toast.success(`Report marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating report:', error);
      toast.error('Failed to update report status');
    }
  };
  
  const getStatusBadge = (status: string | null) => {
    switch(status) {
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };
  
  const renderMobileCard = (report: Report) => (
    <Card key={report.id} className="mb-4">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">{report.driver_name}</p>
              <p className="text-sm text-gray-500">
                {new Date(report.submission_date).toLocaleDateString()}
              </p>
            </div>
            {getStatusBadge(report.status)}
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-gray-500">Vehicle</p>
              <p>{report.vehicle_number}</p>
            </div>
            <div>
              <p className="text-gray-500">Trips</p>
              <p>{report.total_trips}</p>
            </div>
            <div>
              <p className="text-gray-500">Earnings</p>
              <p>₹{report.total_earnings?.toLocaleString() || '0'}</p>
            </div>
            <div>
              <p className="text-gray-500">Cash Collected</p>
              <p>₹{report.total_cashcollect?.toLocaleString() || '0'}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <div className="flex space-x-1">
              {report.uber_screenshot ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
              {report.payment_screenshot ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
            </div>
            <div className="flex space-x-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-green-600"
                onClick={() => updateReportStatus(report.id, 'approved')}
                disabled={report.status === 'approved'}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-red-600"
                onClick={() => updateReportStatus(report.id, 'rejected')}
                disabled={report.status === 'rejected'}
              >
                <XCircle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout title="Reports Management">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-emerald-100 to-emerald-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800">Total Rent Collected</CardTitle>
            <IndianRupee className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">
              ₹{financialSummary.totalRentCollected.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-emerald-600 mt-2">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>From all reports</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-100 to-amber-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-amber-800">Fleet Expenses</CardTitle>
            <CreditCard className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900">
              ₹{financialSummary.fleetExpenses.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-amber-600 mt-2">
              <span>Based on trip counts</span>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${
          financialSummary.netProfit >= 0 
            ? 'from-green-100 to-green-50' 
            : 'from-red-100 to-red-50'
        }`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className={`text-sm font-medium ${
              financialSummary.netProfit >= 0 
                ? 'text-green-800' 
                : 'text-red-800'
            }`}>Net Profit</CardTitle>
            {financialSummary.netProfit >= 0 ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              financialSummary.netProfit >= 0 
                ? 'text-green-900' 
                : 'text-red-900'
            }`}>
              ₹{Math.abs(financialSummary.netProfit).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-100 to-blue-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Cash Status</CardTitle>
            <Wallet className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-600">In Hand/Bank:</span>
              <span className="text-green-600 font-semibold">
                ₹{financialSummary.cashInHand.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-600">In Uber:</span>
              <span className="text-red-600 font-semibold">
                ₹{financialSummary.cashInUber.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end mb-6">
        <Button>
          <Download className="h-4 w-4 mr-2" /> Export Reports
        </Button>
      </div>
      
      <div className="md:hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
          </div>
        ) : (
          <div>
            {reports.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  No reports found
                </CardContent>
              </Card>
            ) : (
              reports.map(renderMobileCard)
            )}
          </div>
        )}
      </div>

      <div className="hidden md:block">
        <Card>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Trips</TableHead>
                      <TableHead>Earnings</TableHead>
                      <TableHead>Cash Collected</TableHead>
                      <TableHead>Rent Paid</TableHead>
                      <TableHead>Screenshots</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8">
                          No reports found
                        </TableCell>
                      </TableRow>
                    ) : (
                      reports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>
                            {new Date(report.submission_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">{report.driver_name}</TableCell>
                          <TableCell>{report.vehicle_number}</TableCell>
                          <TableCell>{report.total_trips}</TableCell>
                          <TableCell>₹{report.total_earnings?.toLocaleString() || '0'}</TableCell>
                          <TableCell>₹{report.total_cashcollect?.toLocaleString() || '0'}</TableCell>
                          <TableCell>₹{report.rent_paid_amount?.toLocaleString() || '0'}</TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              {report.uber_screenshot ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                              {report.payment_screenshot ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(report.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-green-600"
                                onClick={() => updateReportStatus(report.id, 'approved')}
                                disabled={report.status === 'approved'}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600"
                                onClick={() => updateReportStatus(report.id, 'rejected')}
                                disabled={report.status === 'rejected'}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
