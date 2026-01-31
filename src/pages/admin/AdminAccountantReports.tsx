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
import { Calculator } from "lucide-react";
import { toast } from "sonner";

const AdminAccountantReports = () => {
  const [accountantReports, setAccountantReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccountantReports();
  }, []);

  const fetchAccountantReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("accountant_reports")
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
      setAccountantReports(data || []);
    } catch (error) {
      console.error("Error fetching Accountant reports:", error);
      toast.error("Failed to load Accountant reports");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Accountant Reports">
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Accountant Reports
            </h2>
            <Badge variant="secondary">{accountantReports.length} reports</Badge>
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
                    <TableHead>Income</TableHead>
                    <TableHead>Expenses</TableHead>
                    <TableHead>Net Profit</TableHead>
                    <TableHead>Cash Flow</TableHead>
                    <TableHead>Accounts Receivable</TableHead>
                    <TableHead>Accounts Payable</TableHead>
                    <TableHead>Bank Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>Submission Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountantReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8">
                        No Accountant reports found
                      </TableCell>
                    </TableRow>
                  ) : (
                    accountantReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          {format(new Date(report.report_date), "d MMM yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {report.submitted_by_name}
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">
                          ₹{Number(report.total_income).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-red-600 font-medium">
                          ₹{Number(report.total_expenses).toLocaleString()}
                        </TableCell>
                        <TableCell
                          className={`font-bold ${
                            Number(report.net_profit) >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          ₹{Number(report.net_profit).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          ₹{Number(report.cash_flow).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          ₹{Number(report.accounts_receivable).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          ₹{Number(report.accounts_payable).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          ₹{Number(report.bank_balance).toLocaleString()}
                        </TableCell>
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

export default AdminAccountantReports;



