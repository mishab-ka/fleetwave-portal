import React, { useEffect, useState, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Search, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useAdmin } from "@/context/AdminContext";

interface AccidentReport {
  id: string;
  vehicle_number: string;
  shift: string;
  driver_name: string;
  description: string;
  place: string;
  status: string;
  penalty_amount: number;
  verification_status: string;
  submission_date: string;
  submitted_by_name: string;
  accident_date: string | null;
  accident_time: string | null;
}

const AdminAccidentReports = () => {
  const { user } = useAuth();
  const { userRole } = useAdmin();
  const [accidentReports, setAccidentReports] = useState<AccidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [shiftFilter, setShiftFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isAdmin = userRole === "admin" || userRole === "super_admin";

  useEffect(() => {
    fetchAccidentReports();
  }, []);

  const fetchAccidentReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("accident_reports")
        .select("*")
        .order("submission_date", { ascending: false });

      if (error) throw error;
      setAccidentReports(data || []);
    } catch (error) {
      console.error("Error fetching accident reports:", error);
      toast.error("Failed to load accident reports");
    } finally {
      setLoading(false);
    }
  };

  // Filter reports based on search and filters
  const filteredReports = useMemo(() => {
    return accidentReports.filter((report) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        report.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.driver_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.place.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === "all" || report.status === statusFilter;

      // Shift filter
      const matchesShift = shiftFilter === "all" || report.shift === shiftFilter;

      // Verification status filter
      const matchesVerification =
        verificationFilter === "all" ||
        report.verification_status === verificationFilter;

      return matchesSearch && matchesStatus && matchesShift && matchesVerification;
    });
  }, [
    accidentReports,
    searchQuery,
    statusFilter,
    shiftFilter,
    verificationFilter,
  ]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Running":
        return "default";
      case "Not Running Condition":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getVerificationBadgeVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "default";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const handleApprove = async (reportId: string) => {
    if (!isAdmin) {
      toast.error("Only admins can approve reports");
      return;
    }

    setProcessingId(reportId);
    try {
      const { error } = await supabase
        .from("accident_reports")
        .update({ verification_status: "approved" })
        .eq("id", reportId);

      if (error) throw error;

      toast.success("Report approved successfully");
      fetchAccidentReports();
    } catch (error: any) {
      console.error("Error approving report:", error);
      toast.error(error.message || "Failed to approve report");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (reportId: string) => {
    if (!isAdmin) {
      toast.error("Only admins can reject reports");
      return;
    }

    setProcessingId(reportId);
    try {
      const { error } = await supabase
        .from("accident_reports")
        .update({ verification_status: "rejected" })
        .eq("id", reportId);

      if (error) throw error;

      toast.success("Report rejected successfully");
      fetchAccidentReports();
    } catch (error: any) {
      console.error("Error rejecting report:", error);
      toast.error(error.message || "Failed to reject report");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <AdminLayout title="Accident Reports">
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Accident Reports
            </h2>
            <Badge variant="secondary">{filteredReports.length} reports</Badge>
          </div>

          {/* Search and Filter Section */}
          <div className="mb-6 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by vehicle, driver, place, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Running">Running</SelectItem>
                    <SelectItem value="Not Running Condition">
                      Not Running Condition
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Shift Filter */}
              <div>
                <Select
                  value={shiftFilter}
                  onValueChange={setShiftFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shifts</SelectItem>
                    <SelectItem value="Morning">Morning</SelectItem>
                    <SelectItem value="Night">Night</SelectItem>
                    <SelectItem value="24 Hours">24 Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Verification Status Filter */}
              <div>
                <Select
                  value={verificationFilter}
                  onValueChange={setVerificationFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by verification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Verification</SelectItem>
                    <SelectItem value="pending_verification">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
                    <TableHead>Vehicle Name</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Driver Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Place</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Penalty Amount</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Accident Date & Time</TableHead>
                    <TableHead>Submitted Date</TableHead>
                    <TableHead>Submitted By</TableHead>
                    {isAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isAdmin ? 12 : 11}
                        className="text-center py-8"
                      >
                        {accidentReports.length === 0
                          ? "No accident reports found"
                          : "No reports match your search criteria"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          {report.vehicle_number}
                        </TableCell>
                        <TableCell>{report.shift}</TableCell>
                        <TableCell className="font-medium">
                          {report.driver_name}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate" title={report.description}>
                            {report.description}
                          </div>
                        </TableCell>
                        <TableCell>{report.place}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(report.status)}>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          ₹{Number(report.penalty_amount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getVerificationBadgeVariant(
                              report.verification_status
                            )}
                          >
                            {report.verification_status === "pending_verification"
                              ? "Pending"
                              : report.verification_status?.charAt(0).toUpperCase() +
                                report.verification_status?.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {report.accident_date && report.accident_time ? (
                            <div>
                              <div>{format(new Date(report.accident_date), "d MMM yyyy")}</div>
                              <div className="text-xs text-gray-500">
                                {(() => {
                                  // Convert 24-hour time (HH:mm) to 12-hour format (hh:mm AM/PM)
                                  const [hours, minutes] = report.accident_time.split(':');
                                  const hour = parseInt(hours, 10);
                                  const ampm = hour >= 12 ? 'PM' : 'AM';
                                  const hour12 = hour % 12 || 12;
                                  return `${hour12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
                                })()}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(
                            new Date(report.submission_date),
                            "d MMM yyyy, hh:mm a"
                          )}
                        </TableCell>
                        <TableCell>{report.submitted_by_name}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-2">
                              {report.verification_status ===
                                "pending_verification" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleApprove(report.id)}
                                    disabled={processingId === report.id}
                                    className="h-8"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleReject(report.id)}
                                    disabled={processingId === report.id}
                                    className="h-8"
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              {report.verification_status !==
                                "pending_verification" && (
                                <span className="text-sm text-gray-500">
                                  {report.verification_status === "approved"
                                    ? "Approved"
                                    : "Rejected"}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        )}
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

export default AdminAccidentReports;

