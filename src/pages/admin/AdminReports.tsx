import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAdminSettings } from "@/hooks/useAdminSettings";
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
  X,
  Share,
  Share2,
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
  user_id: string;
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
  toll: number;
  driver_phone: string;
}

interface VehicleInfo {
  id: string;
  vehicle_number: string;
  total_trips: number;
}

// Helper function to format date as YYYY-MM-DD without timezone issues
const formatDateLocal = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
};

const AdminReports = () => {
  const { calculateFleetRent, calculateCompanyEarnings } = useAdminSettings();
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

  const [statusFilter, setStatusFilter] = useState<string[]>(["all"]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [driverPhone, setDriverPhone] = useState("");

  // Statistics state - single state that responds to filters
  const [statistics, setStatistics] = useState({
    totalEarnings: 0,
    totalCashCollect: 0,
    totalRentPaid: 0,
    tollAmount: 0,
    totalReports: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    leaveCount: 0,
  });

  useEffect(() => {
    fetchReports();
    fetchStatistics();
    setupRealtimeUpdates();
  }, [currentPage, statusFilter, dateFilter, dateRange]);

  // Debounce search query to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchReports();
        fetchStatistics();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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
    setLoading(true);
    try {
      let query = supabase
        .from("fleet_reports")
        .select("*", { count: "exact" })
        .order("submission_date", { ascending: false });

      // Apply server-side filters
      if (searchQuery.trim() !== "") {
        const searchTerm = searchQuery.toLowerCase().trim();
        query = query.or(
          `driver_name.ilike.%${searchTerm}%,vehicle_number.ilike.%${searchTerm}%`
        );
      }

      // Status filter
      if (!statusFilter.includes("all") && statusFilter.length > 0) {
        if (statusFilter.length === 1) {
          query = query.eq("status", statusFilter[0]);
        } else {
          // Multiple status filters
          const orConditions = statusFilter
            .filter((status) => status !== "all") // Extra safety
            .map((status) => `status.eq.${status}`);

          if (orConditions.length > 0) {
            const orCondition = orConditions.join(",");
            query = query.or(orCondition);
          }
        }
      }

      // Date filters
      if (dateFilter === "today") {
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        query = query.eq("rent_date", todayStr);
      } else if (dateFilter === "week") {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

        // Calculate start of current week (Monday to Sunday) using local dates
        let daysToGoBack;
        if (dayOfWeek === 0) {
          // If today is Sunday, go back 6 days to Monday
          daysToGoBack = 6;
        } else {
          // For Monday to Saturday, go back to Monday
          daysToGoBack = dayOfWeek - 1;
        }

        // Calculate Monday of current week
        const startDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - daysToGoBack
        );
        const endDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - daysToGoBack + 6
        );

        // Format as YYYY-MM-DD
        const startOfWeek = formatDateLocal(startDate);
        const endOfWeek = formatDateLocal(endDate);

        query = query.gte("rent_date", startOfWeek).lte("rent_date", endOfWeek);
      } else if (dateFilter === "custom" && dateRange.start && dateRange.end) {
        query = query
          .gte("rent_date", dateRange.start.toISOString().split("T")[0])
          .lte("rent_date", dateRange.end.toISOString().split("T")[0]);
      }

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      if (data) {
        setReports(data as Report[]);
        setTotalCount(count || 0);
        setTotalPages(Math.ceil((count || 0) / pageSize));
        // setDriverPhone(data[0].user_id);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports data");
    } finally {
      setLoading(false);
    }
  };

  // Single statistics function that responds to filters
  const fetchStatistics = async () => {
    try {
      let query = supabase
        .from("fleet_reports")
        .select(
          "user_id, total_earnings, total_cashcollect, rent_paid_amount, toll, status"
        );

      // Apply the same filters as reports for statistics
      if (searchQuery.trim() !== "") {
        const searchTerm = searchQuery.toLowerCase().trim();
        query = query.or(
          `driver_name.ilike.%${searchTerm}%,vehicle_number.ilike.%${searchTerm}%`
        );
      }

      if (!statusFilter.includes("all") && statusFilter.length > 0) {
        if (statusFilter.length === 1) {
          query = query.eq("status", statusFilter[0]);
        } else {
          const orConditions = statusFilter
            .filter((status) => status !== "all") // Extra safety
            .map((status) => `status.eq.${status}`);

          if (orConditions.length > 0) {
            const orCondition = orConditions.join(",");
            query = query.or(orCondition);
          }
        }
      }

      // Apply date filters
      if (dateFilter === "today") {
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        query = query.eq("rent_date", todayStr);
      } else if (dateFilter === "week") {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

        // Calculate start of current week (Monday to Sunday) using local dates
        let daysToGoBack;
        if (dayOfWeek === 0) {
          // If today is Sunday, go back 6 days to Monday
          daysToGoBack = 6;
        } else {
          // For Monday to Saturday, go back to Monday
          daysToGoBack = dayOfWeek - 1;
        }

        // Calculate Monday of current week
        const startDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - daysToGoBack
        );
        const endDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - daysToGoBack + 6
        );

        // Format as YYYY-MM-DD
        const startOfWeek = formatDateLocal(startDate);
        const endOfWeek = formatDateLocal(endDate);

        query = query.gte("rent_date", startOfWeek).lte("rent_date", endOfWeek);
      } else if (dateFilter === "custom" && dateRange.start && dateRange.end) {
        query = query
          .gte("rent_date", dateRange.start.toISOString().split("T")[0])
          .lte("rent_date", dateRange.end.toISOString().split("T")[0]);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const totalEarnings = data.reduce(
          (sum, report) => sum + (report.total_earnings || 0),
          0
        );
        const totalCashCollect = data.reduce(
          (sum, report) => sum + (report.total_cashcollect || 0),
          0
        );
        const totalRentPaid = data.reduce(
          (sum, report) => sum + (report.rent_paid_amount || 0),
          0
        );
        const tollAmount = data.reduce(
          (sum, report) => sum + (report.toll || 0),
          0
        );

        // Count statuses
        const pendingCount = data.filter(
          (report) => report.status === "pending_verification"
        ).length;
        const approvedCount = data.filter(
          (report) => report.status === "approved"
        ).length;
        const rejectedCount = data.filter(
          (report) => report.status === "rejected"
        ).length;
        const leaveCount = data.filter(
          (report) => report.status === "leave"
        ).length;

        setStatistics({
          totalEarnings,
          totalCashCollect,
          totalRentPaid,
          tollAmount,
          totalReports: data.length,
          pendingCount,
          approvedCount,
          rejectedCount,
          leaveCount,
        });
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
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
      case "pending_verification":
        return <Badge variant="outline">Pending</Badge>;
      case "approved":
        return <Badge variant="success">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "leave":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            Leave
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const totalRent = vehicles.reduce(
    (sum, vehicle) => sum + calculateFleetRent(vehicle.total_trips),
    0
  );

  // Calculate earnings based on current statistics
  const earnings = reports.reduce((total, report) => {
    return (
      total +
      (report.total_trips === 0
        ? 0
        : calculateCompanyEarnings(report.total_trips))
    );
  }, 0);

  const cashInUber = statistics.totalEarnings - statistics.totalCashCollect;
  const cashInHand = statistics.totalRentPaid;
  const totalToll = statistics.tollAmount * 7;

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

  const handleDeleteReport = async () => {
    if (!selectedReport) return;

    try {
      // Step 1: Delete the report
      const { error: deleteError } = await supabase
        .from("fleet_reports")
        .delete()
        .eq("id", selectedReport.id);

      if (deleteError) throw deleteError;

      // Step 2: Fetch the current vehicle's total_trips
      const { data: vehicleData, error: vehicleError } = await supabase
        .from("vehicles")
        .select("total_trips")
        .eq("vehicle_number", selectedReport.vehicle_number)
        .single();

      if (vehicleError) throw vehicleError;

      const currentTrips = vehicleData?.total_trips || 0;
      const newTripCount = Math.max(
        currentTrips - (selectedReport.total_trips || 0),
        0
      );

      // Step 3: Update the vehicle's trip count
      const { error: updateError } = await supabase
        .from("vehicles")
        .update({ total_trips: newTripCount })
        .eq("vehicle_number", selectedReport.vehicle_number);

      if (updateError) throw updateError;

      // Step 4: Update local state
      setReports((prev) =>
        prev.filter((report) => report.id !== selectedReport.id)
      );
      setIsModalOpen(false);

      toast.success("Report deleted and vehicle trips updated.");
    } catch (error) {
      console.error("Error deleting report:", error);
      toast.error("Failed to delete report.");
    }
  };

  const handleExportReports = async () => {
    try {
      // Fetch all reports with current filters for complete export
      let query = supabase
        .from("fleet_reports")
        .select("*")
        .order("submission_date", { ascending: false });

      // Apply the same filters as current view
      if (searchQuery.trim() !== "") {
        const searchTerm = searchQuery.toLowerCase().trim();
        query = query.or(
          `driver_name.ilike.%${searchTerm}%,vehicle_number.ilike.%${searchTerm}%`
        );
      }

      if (!statusFilter.includes("all") && statusFilter.length > 0) {
        if (statusFilter.length === 1) {
          query = query.eq("status", statusFilter[0]);
        } else {
          const orConditions = statusFilter
            .filter((status) => status !== "all") // Extra safety
            .map((status) => `status.eq.${status}`);

          if (orConditions.length > 0) {
            const orCondition = orConditions.join(",");
            query = query.or(orCondition);
          }
        }
      }

      // Apply date filters
      if (dateFilter === "today") {
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        query = query.eq("rent_date", todayStr);
      } else if (dateFilter === "week") {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

        // Calculate start of current week (Monday to Sunday) using local dates
        let daysToGoBack;
        if (dayOfWeek === 0) {
          // If today is Sunday, go back 6 days to Monday
          daysToGoBack = 6;
        } else {
          // For Monday to Saturday, go back to Monday
          daysToGoBack = dayOfWeek - 1;
        }

        // Calculate Monday of current week
        const startDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - daysToGoBack
        );
        const endDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - daysToGoBack + 6
        );

        // Format as YYYY-MM-DD
        const startOfWeek = formatDateLocal(startDate);
        const endOfWeek = formatDateLocal(endDate);

        query = query.gte("rent_date", startOfWeek).lte("rent_date", endOfWeek);
      } else if (dateFilter === "custom" && dateRange.start && dateRange.end) {
        query = query
          .gte("rent_date", dateRange.start.toISOString().split("T")[0])
          .lte("rent_date", dateRange.end.toISOString().split("T")[0]);
      }

      const { data: allReports, error } = await query;

      if (error) throw error;

      // Create CSV header
      const headers = [
        "Date",
        "Driver Name",
        "Vehicle Number",
        "Total Trips",
        "Total Earnings",
        "Toll",
        "Cash Collected",
        "Rent Paid",
        "Status",
      ];

      // Create CSV rows
      const rows = (allReports || []).map((report) => {
        const date = format(
          new Date(report.submission_date),
          "d MMM yyyy, hh:mm a"
        );
        const status =
          report.status === "pending_verification"
            ? "Pending"
            : report.status || "Unknown";

        return [
          date,
          report.driver_name,
          report.vehicle_number,
          report.total_trips,
          report.total_earnings,
          report.toll,
          report.total_cashcollect,
          report.rent_paid_amount,
          status,
        ];
      });

      // Combine header and rows
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `reports_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(
        `Downloaded report with ${allReports?.length || 0} reports`
      );
    } catch (error) {
      console.error("Error downloading report:", error);
      toast.error("Failed to download report");
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

        <div className="w-full lg:w-[300px]">
          <Select
            value={statusFilter[0]}
            onValueChange={(value) => {
              if (value === "all") {
                setStatusFilter(["all"]);
              } else {
                setStatusFilter((prev) => {
                  const newFilter = prev.filter((f) => f !== "all");
                  if (newFilter.includes(value)) {
                    return newFilter.filter((f) => f !== value);
                  }
                  return [...newFilter, value];
                });
              }
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending_verification">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="leave">Leave</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2 mt-2">
            {statusFilter
              .filter((status) => status !== "all")
              .map((status) => (
                <Badge
                  key={status}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {status === "pending_verification"
                    ? "Pending"
                    : status.charAt(0).toUpperCase() + status.slice(1)}
                  <button
                    onClick={() => {
                      setStatusFilter((prev) =>
                        prev.filter((s) => s !== status)
                      );
                      setCurrentPage(1);
                    }}
                    className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={dateFilter === "today" ? "default" : "outline"}
            onClick={() => {
              setDateFilter("today");
              setCurrentPage(1);
            }}
            className="flex-1 sm:flex-none"
          >
            Today
          </Button>
          <Button
            variant={dateFilter === "week" ? "default" : "outline"}
            onClick={() => {
              setDateFilter("week");
              setCurrentPage(1);
            }}
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
                  setCurrentPage(1);
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
              setDateRange({});
              setCurrentPage(1);
            }}
            className="flex-1 sm:flex-none"
          >
            Clear
          </Button>
          <Button className="flex-1 sm:flex-none" onClick={handleExportReports}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
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

        <Card className="bg-gradient-to-br from-yellow-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-500">
              Total Toll Amount
            </div>
            <div className="text-2xl font-bold text-yellow-500">
              ₹{statistics.tollAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Indication Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-gray-50 to-white border-gray-200">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-500">
              Total Reports
            </div>
            <div className="text-2xl font-bold text-gray-700">
              {statistics.totalReports}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-200">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-orange-600">
              Pending Reports
            </div>
            <div className="text-2xl font-bold text-orange-500">
              {statistics.pendingCount}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-green-600">
              Approved Reports
            </div>
            <div className="text-2xl font-bold text-green-500">
              {statistics.approvedCount}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-white border-red-200">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-red-600">
              Rejected Reports
            </div>
            <div className="text-2xl font-bold text-red-500">
              {statistics.rejectedCount}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-white border-yellow-200">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-yellow-600">
              Leave Reports
            </div>
            <div className="text-2xl font-bold text-yellow-500">
              {statistics.leaveCount}
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
                  Showing {reports.length} of {totalCount} reports
                </span>
              </div>
              <div className="min-w-full overflow-hidden">
                <div className="max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead className="w-[50px]">ID</TableHead>
                        <TableHead className="min-w-[150px]">
                          Date&time
                        </TableHead>
                        <TableHead className="min-w-[120px]">Driver</TableHead>
                        <TableHead className="min-w-[120px]">Vehicle</TableHead>
                        <TableHead className="min-w-[80px]">Trips</TableHead>
                        <TableHead className="min-w-[100px]">
                          Earnings
                        </TableHead>
                        <TableHead className="min-w-[100px]">Toll</TableHead>
                        <TableHead className="min-w-[120px]">
                          Cash Collected
                        </TableHead>
                        <TableHead className="min-w-[100px]">
                          Rent Paid
                        </TableHead>
                        <TableHead className="min-w-[100px]">
                          Screenshots
                        </TableHead>
                        <TableHead className="min-w-[100px]">Status</TableHead>
                        <TableHead className="text-right min-w-[120px]">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-8">
                            No reports found
                          </TableCell>
                        </TableRow>
                      ) : (
                        reports.map((report, index) => (
                          <TableRow key={report.id} className="text-sm">
                            <TableCell className="font-medium">
                              {index + 1}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {format(
                                new Date(report.submission_date),
                                "d MMM yyyy, hh:mm a"
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {report.driver_name}
                            </TableCell>
                            <TableCell>{report.vehicle_number}</TableCell>
                            <TableCell>{report.total_trips}</TableCell>
                            <TableCell>
                              ₹{report.total_earnings.toLocaleString()}
                            </TableCell>
                            <TableCell>₹{report.toll}</TableCell>
                            <TableCell>
                              ₹{report.total_cashcollect.toLocaleString()}
                            </TableCell>
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
                            <TableCell>
                              {getStatusBadge(report.status)}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`text-blue-600 sm:inline-flex ${
                                    report.rent_paid_amount > -1
                                      ? "lg:hidden"
                                      : "flex"
                                  }`}
                                  onClick={async () => {
                                    const { data, error } = await supabase
                                      .from("users")
                                      .select("phone_number")
                                      .eq("id", report.user_id)
                                      .single();

                                    if (error || !data?.phone_number) {
                                      console.error(
                                        "Failed to get driver phone"
                                      );
                                      return;
                                    }

                                    const driverPhone = data.phone_number;

                                    const message = encodeURIComponent(
                                      `Refund slip 🧾\nDriver: ${report.driver_name}\nVehicle: ${report.vehicle_number}\nShift: ${report.shift}\nPhone: ${driverPhone}\nRent Date: ${report.rent_date}\nRefund Amount: ${report.rent_paid_amount}`
                                    );

                                    window.open(
                                      `https://wa.me/?text=${message}`,
                                      "_blank"
                                    );
                                  }}
                                >
                                  <Share2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600  sm:inline-flex"
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
                                  className="text-red-600  sm:inline-flex"
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
                reports
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={
                          currentPage === pageNum ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={loading}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              <div className="space-y-2">
                <label>Toll Amount</label>
                <Input
                  type="number"
                  value={selectedReport?.toll}
                  onChange={(e) =>
                    setSelectedReport((prev) => ({
                      ...prev!,
                      toll: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label>Remarks</label>
                <Input
                  value={selectedReport?.remarks}
                  onChange={(e) =>
                    setSelectedReport((prev) => ({
                      ...prev!,
                      remarks: String(e.target.value),
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
                <Button variant="destructive" onClick={handleDeleteReport}>
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
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
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
                        toll: selectedReport?.toll,
                        remarks: selectedReport?.remarks,
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
