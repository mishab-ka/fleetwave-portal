import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { toast } from "sonner";

const AdminHRReports = () => {
  const [hrReports, setHrReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHRReports();
  }, []);

  const fetchHRReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("hr_reports")
        .select(`
          *,
          users!user_id(
            id,
            name,
            email_id
          )
        `)
        .order("report_date", { ascending: false })
        .order("submission_date", { ascending: false });

      if (error) throw error;
      setHrReports(data || []);
    } catch (error) {
      console.error("Error fetching HR reports:", error);
      toast.error("Failed to load HR reports");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="HR Reports">
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Users className="h-5 w-5" />
              HR Reports
            </h2>
            <Badge variant="secondary">{hrReports.length} reports</Badge>
          </div>
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
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Calls Made</TableHead>
                    <TableHead>Confirmations</TableHead>
                    <TableHead>Joining</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>Submission Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hrReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No HR reports found
                      </TableCell>
                    </TableRow>
                  ) : (
                    hrReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          {format(new Date(report.report_date), "d MMM yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {report.submitted_by_name}
                        </TableCell>
                        <TableCell>{report.total_calls_made}</TableCell>
                        <TableCell>{report.total_confirmations}</TableCell>
                        <TableCell>{report.total_joining}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              report.status === "approved"
                                ? "default"
                                : report.status === "rejected"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {report.status === "pending_verification"
                              ? "Pending"
                              : report.status?.charAt(0).toUpperCase() +
                                report.status?.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {report.remarks || "—"}
                        </TableCell>
                        <TableCell>
                          {format(
                            new Date(report.submission_date),
                            "d MMM yyyy, hh:mm a"
                          )}
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

export default AdminHRReports;



