import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import {
  Eye,
  CheckCircle,
  XCircle,
  Download,
  CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Select,
} from "@/components/ui/select";

interface Report {
  id: string;
  driver_name: string;
  vehicle_number: string;
  total_trips: number;
  total_earnings: number;
  rent_paid_status: boolean;
  total_cashcollect: number;
  rent_paid_amount: number;
  rent_verified: boolean;
  submission_date: string;
  rent_date: string;
  shift: string;
  uber_screenshot: string | null;
  payment_screenshot: string | null;
  status: string | null;
  remarks: string | null;
}

interface VehicleInfo {
  id: string;
  vehicle_number: string;
  total_trips: number;
}

const AdminReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleInfo[]>([]);
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});

  const [dateFilter, setDateFilter] = useState<
    "today" | "week" | "custom" | null
  >(null);
  const [customDate, setCustomDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchReports();
    setupRealtimeUpdates();
  }, []);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const { data, error } = await supabase
          .from("vehicles")
          .select("*")
          .eq("online", true);

        if (error) {
          console.error("Error fetching vehicles:", error);
          return;
        }

        if (data) {
          setVehicles(
            data.map((v) => ({
              id: v.id || "",
              vehicle_number: v.vehicle_number,
              total_trips: v.total_trips || 0,
            }))
          );
        }
      } catch (error) {
        console.error("Unexpected error fetching vehicles:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("fleet_reports")
        .select("*")
        .order("rent_date", { ascending: false });

      if (error) throw error;

      if (data) {
        setReports(data as Report[]);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports data");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeUpdates = () => {
    const subscription = supabase
      .channel("realtime-reports")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fleet_reports" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setReports((prev) => [payload.new as Report, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setReports((prev) =>
              prev.map((report) =>
                report.id === payload.new.id ? (payload.new as Report) : report
              )
            );
          } else if (payload.eventType === "DELETE") {
            setReports((prev) =>
              prev.filter((report) => report.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const updateReportStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("fleet_reports")
        .update({
          status: newStatus,
          rent_paid_status: true,
          rent_verified: true,
        })
        .eq("id", id);

      if (error) throw error;

      setReports(
        reports.map((report) =>
          report.id === id ? { ...report, status: newStatus } : report
        )
      );

      toast.success(`Report marked as ${newStatus}`);
    } catch (error) {
      console.error("Error updating report:", error);
      toast.error("Failed to update report status");
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return <Badge variant="success">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "leave":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Leave</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending_verification" | "approved" | "leave"
  >("all");

  const calculateFleetRent = (tripCount: number): number => {
    if (tripCount < 64) return 980;
    if (tripCount >= 64 && tripCount < 80) return 830;
    if (tripCount >= 80 && tripCount < 110) return 740;
    if (tripCount >= 110 && tripCount < 125) return 560;
    if (tripCount >= 125 && tripCount < 140) return 410;
    return 290; // 140 or more trips
  };

  const totalRent = vehicles.reduce(
    (sum, vehicle) => sum + calculateFleetRent(vehicle.total_trips),
    0
  );

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.driver_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.vehicle_number?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending_verification" &&
        report.status === "pending_verification") ||
      (statusFilter === "approved" && report.status === "approved") ||
      (statusFilter === "leave" && report.status === "leave");

    const reportDate = new Date(report.rent_date);
    const today = new Date();
    const startOfWeek = new Date(today);

    const dayOfWeek = today.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(today.getDate() - daysToSubtract);

    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    if (dateFilter === "today") {
      return (
        matchesSearch &&
        matchesStatus &&
        reportDate.toDateString() === today.toDateString()
      );
    } else if (dateFilter === "week") {
      return (
        matchesSearch &&
        matchesStatus &&
        reportDate >= startOfWeek &&
        reportDate <= endOfWeek
      );
    } else if (dateFilter === "custom" && dateRange.start && dateRange.end) {
      return (
        matchesSearch &&
        matchesStatus &&
        reportDate >= dateRange.start &&
        reportDate <= dateRange.end
      );
    } else {
      return matchesSearch && matchesStatus;
    }
  });

  const totalEarnings = filteredReports.reduce(
    (sum, report) => sum + report.total_earnings,
    0
  );
  const totalCashCollect = filteredReports.reduce(
    (sum, report) => sum + report.total_cashcollect,
    0
  );
  const totalRentPaid = filteredReports.reduce(
    (sum, report) => sum + report.rent_paid_amount,
    0
  );
  function calculateRent(trips) {
    if (trips >= 11) {
      return 485;
    } else if (trips >= 10) {
      return 585;
    } else if (trips >= 8) {
      return 665;
    } else if (trips >= 5) {
      return 695;
    } else {
      return 765;
    }
  }

  const earnings = filteredReports.reduce((total, report) => {
    return (
      total + (report.total_trips === 0 ? 0 : calculateRent(report.total_trips))
    );
  }, 0);

  const cashInUber = totalEarnings - totalCashCollect;
  const cashInHand = totalRentPaid;

  const earningsPerRow = 600;
  const verifyRent = async (reportId: string) => {
    const { error } = await supabase
      .from("fleet_reports")
      .update({ rent_verified: true })
      .eq("id", reportId);

    if (error) {
      toast.error("Failed to verify rent!");
      console.error("Error verifying rent:", error);
    } else {
      toast.success("Rent verified successfully!");
    }
  };

  return (
    <AdminLayout title="Reports Management">
      <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:justify-between mb-6">
        <div className="w-full lg:w-[300px]">
          <Input
            placeholder="Search by driver or vehicle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="w-full lg:w-[200px]">
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(
                value as "all" | "pending_verification" | "approved" | "leave"
              )
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending_verification">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="leave">Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={dateFilter === "today" ? "default" : "outline"}
            onClick={() => setDateFilter("today")}
            className="flex-1 sm:flex-none"
          >
            Today
          </Button>
          <Button
            variant={dateFilter === "week" ? "default" : "outline"}
            onClick={() => setDateFilter("week")}
            className="flex-1 sm:flex-none"
          >
            This Week
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={dateFilter === "custom" ? "default" : "outline"}
                className="gap-2 flex-1 sm:flex-none"
              >
                <CalendarIcon className="h-4 w-4" />
                Custom
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="range"
                selected={{ from: dateRange.start, to: dateRange.end }}
                onSelect={(range) => {
                  setDateFilter("custom");
                  setDateRange({
                    start: range?.from,
                    end: range?.to,
                  });
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            onClick={() => {
              setDateFilter(null);
              setCustomDate(null);
            }}
            className="flex-1 sm:flex-none"
          >
            Clear
          </Button>
          <Button className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-500">
              Fleet Earnings
            </div>
            <div className="text-2xl font-bold text-green-500">
              ₹{earnings.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-500">
              Fleet Car Expense
            </div>
            <div className="text-2xl font-bold text-red-500">
              ₹{totalRent * 7}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-500">Net Profit</div>
            <div className="text-2xl font-bold text-blue-500">
              ₹{earnings - totalRent * 7}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-500">
              Cash in Uber
            </div>
            <div className="text-2xl font-bold">
              ₹{cashInUber.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-500">
              Cash in Hand
            </div>
            <div className="text-2xl font-bold">
              ₹{cashInHand.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">
                  Recent Reports
                </h2>
                <span className="text-sm text-muted-foreground hidden sm:inline-block">
                  {reports.length} total reports
                </span>
              </div>
              <div className="min-w-full overflow-hidden">
                <div className="max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead className="w-[50px]">ID</TableHead>
                        <TableHead className="min-w-[150px]">Date&time</TableHead>
                        <TableHead className="min-w-[120px]">Driver</TableHead>
                        <TableHead className="min-w-[120px]">Vehicle</TableHead>
                        <TableHead className="min-w-[80px]">Trips</TableHead>
                        <TableHead className="min-w-[100px]">Earnings</TableHead>
                        <TableHead className="min-w-[120px]">Cash Collected</TableHead>
                        <TableHead className="min-w-[100px]">Rent Paid</TableHead>
                        <TableHead className="min-w-[100px]">Screenshots</TableHead>
                        <TableHead className="min-w-[100px]">Status</TableHead>
                        <TableHead className="text-right min-w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-8">
                            No reports found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredReports.map((report, index) => (
                          <TableRow key={report.id} className="text-sm">
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(report.submission_date), "d MMM yyyy, hh:mm a")}
                            </TableCell>
                            <TableCell className="font-medium">
                              {report.driver_name}
                            </TableCell>
                            <TableCell>{report.vehicle_number}</TableCell>
                            <TableCell>{report.total_trips}</TableCell>
                            <TableCell>₹{report.total_earnings.toLocaleString()}</TableCell>
                            <TableCell>₹{report.total_cashcollect.toLocaleString()}</TableCell>
                            <TableCell
                              className={`whitespace-nowrap ${
                                report.rent_paid_amount < 0
                                  ? "text-red-500"
                                  : "text-green-500"
                              }`}
                            >
                              ₹{report.rent_paid_amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-1">
                                {report.uber_screenshot ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                                {report.payment_screenshot ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(report.status)}</TableCell>
                            <TableCell>
                              <div className="flex justify-end space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hidden sm:inline-flex"
                                  onClick={() =>
                                    updateReportStatus(report.id, "approved")
                                  }
                                  disabled={report.status === "approved"}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hidden sm:inline-flex"
                                  onClick={() =>
                                    updateReportStatus(report.id, "rejected")
                                  }
                                  disabled={report.status === "rejected"}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedReport(report);
                                    setIsModalOpen(true);
                                  }}
                                >
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
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="border-border/50 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label>Vehicle Number</label>
                <Select
                  value={selectedReport?.vehicle_number}
                  onValueChange={(value) =>
                    setSelectedReport((prev) => ({
                      ...prev!,
                      vehicle_number: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <>
                      <SelectItem key="none" value="Not Assined">
                        No vehicle
                      </SelectItem>
                      {vehicles.map((vehicle) => (
                        <SelectItem
                          key={vehicle.vehicle_number}
                          value={vehicle.vehicle_number}
                        >
                          {vehicle.vehicle_number}
                        </SelectItem>
                      ))}
                    </>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label>Driver Name</label>
                <Input
                  value={selectedReport?.driver_name}
                  onChange={(e) =>
                    setSelectedReport((prev) => ({
                      ...prev!,
                      driver_name: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label>Rent Date</label>
                <Input
                  type="date"
                  value={selectedReport?.rent_date?.split("T")[0] || ""}
                  onChange={(e) =>
                    setSelectedReport((prev) => ({
                      ...prev!,
                      rent_date: new Date(e.target.value).toISOString(),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label>Total Earnings</label>
                <Input
                  type="number"
                  value={selectedReport?.total_earnings}
                  onChange={(e) =>
                    setSelectedReport((prev) => ({
                      ...prev!,
                      total_earnings: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label>Cash Collected</label>
                <Input
                  type="number"
                  value={selectedReport?.total_cashcollect}
                  onChange={(e) =>
                    setSelectedReport((prev) => ({
                      ...prev!,
                      total_cashcollect: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label>Total Trips</label>
                <Input
                  type="number"
                  value={selectedReport?.total_trips}
                  onChange={(e) =>
                    setSelectedReport((prev) => ({
                      ...prev!,
                      total_trips: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label>Rent Paid Amount</label>
                <Input
                  type="number"
                  value={selectedReport?.rent_paid_amount}
                  onChange={(e) =>
                    setSelectedReport((prev) => ({
                      ...prev!,
                      rent_paid_amount: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex space-x-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Uber Screenshot
                </h3>
                <a
                  href={`https://upnhxshwzpbcfmumclwz.supabase.co/storage/v1/object/public/uploads/${selectedReport?.uber_screenshot}`}
                  className="text-blue-600"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Image
                </a>
              </div>
              <div className="flex space-x-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Rent Screenshot
                </h3>
                <a
                  href={`https://upnhxshwzpbcfmumclwz.supabase.co/storage/v1/object/public/uploads/${selectedReport?.payment_screenshot}`}
                  className="text-blue-600"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  view Image
                </a>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex gap-4">
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await supabase
                      .from("fleet_reports")
                      .delete()
                      .eq("id", selectedReport?.id);
                    setIsModalOpen(false);
                    setReports((prev) =>
                      prev.filter(
                        (report) => report.id !== selectedReport?.id
                      )
                    );
                  }}
                >
                  Delete Report
                </Button>

                <Select
                  value={selectedReport?.status || ""}
                  onValueChange={(value) =>
                    setSelectedReport((prev) => ({
                      ...prev!,
                      status: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Verification Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="leave">Leave</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={async () => {
                    const { error } = await supabase
                      .from("fleet_reports")
                      .update({
                        driver_name: selectedReport?.driver_name,
                        vehicle_number: selectedReport?.vehicle_number,
                        total_trips: selectedReport?.total_trips,
                        total_earnings: selectedReport?.total_earnings,
                        rent_paid_amount: selectedReport?.rent_paid_amount,
                        total_cashcollect: selectedReport?.total_cashcollect,
                        rent_date: selectedReport?.rent_date,
                        status: selectedReport?.status,
                      })
                      .eq("id", selectedReport?.id);

                    if (!error) {
                      setReports((prev) =>
                        prev.map((report) =>
                          report.id === selectedReport?.id
                            ? selectedReport
                            : report
                        )
                      );
                      setIsModalOpen(false);
                    }
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminReports;
