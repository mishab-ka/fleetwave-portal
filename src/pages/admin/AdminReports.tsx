
import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle, XCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

type Report = Tables<"fleet_reports">;

const AdminReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchReports();
  }, []);
  
  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('fleet_reports')
        .select('*')
        .order('submission_date', { ascending: false });
        
      if (error) throw error;
      
      setReports(data || []);
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
  
  return (
    <AdminLayout title="Reports Management">
      <div className="flex justify-end mb-6">
        <Button>
          <Download className="h-4 w-4 mr-2" /> Export Reports
        </Button>
      </div>
      
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
    </AdminLayout>
  );
};

export default AdminReports;
