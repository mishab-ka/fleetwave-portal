import React, { useEffect, useState, useCallback, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { useAuth } from "@/context/AuthContext";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  DollarSign,
  Plus,
  Minus,
  Wallet,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  total_earnings: number;
  rent_paid_status: boolean;
  total_trips: number | null;
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
  other_fee: number;
  driver_phone: string;
  deposit_cutting_amount: number;
  paying_cash?: boolean;
  cash_amount?: number | null;
  cash_manager_id?: string | null;
  cash_manager?: { name: string | null } | null;
  cng_expense: number;
  km_runned: number;
  is_service_day: boolean;
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

// Helper function to calculate week start and end dates based on offset
const getWeekDates = (
  offset: number = 0
): { start: Date; end: Date; startStr: string; endStr: string } => {
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

  // Calculate Monday of the week (with offset)
  const startDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - daysToGoBack + offset * 7
  );
  const endDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - daysToGoBack + offset * 7 + 6
  );

  return {
    start: startDate,
    end: endDate,
    startStr: formatDateLocal(startDate),
    endStr: formatDateLocal(endDate),
  };
};

const AdminReports = () => {
  const {
    calculateFleetRent,
    calculateCompanyEarnings,
    calculateCompanyEarnings24hr,
  } = useAdminSettings();
  const { user } = useAuth();
  const { logActivity } = useActivityLogger();
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
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = current week, -1 = previous week, +1 = next week

  const [statusFilter, setStatusFilter] = useState<string[]>(["all"]);
  const [serviceDayFilter, setServiceDayFilter] = useState<
    "all" | "service" | "regular"
  >("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(500);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [driverPhone, setDriverPhone] = useState("");

  // Adjustment modal state
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [selectedReportForAdjustment, setSelectedReportForAdjustment] =
    useState<Report | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"income" | "expense">(
    "income"
  );
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [adjustmentDescription, setAdjustmentDescription] = useState("");
  const [vehicleTransactions, setVehicleTransactions] = useState<any[]>([]);

  // Balance transaction modal state
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [selectedReportForBalance, setSelectedReportForBalance] =
    useState<Report | null>(null);
  const [balanceDescription, setBalanceDescription] = useState("");
  const [isBalanceSubmitting, setIsBalanceSubmitting] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState<string>("");
  const [managerNames, setManagerNames] = useState<Record<string, string>>({});
  const [balanceType, setBalanceType] = useState<"due" | "refund">("due");
  const [serviceDayAdjustments, setServiceDayAdjustments] = useState<any[]>([]);
  
  // Track which report is currently being processed to prevent duplicate clicks
  const [processingReportId, setProcessingReportId] = useState<string | null>(null);


  // Statistics state - single state that responds to filters
  const [statistics, setStatistics] = useState({
    totalEarnings: 0,
    totalCashCollect: 0,
    totalRentPaid: 0,
    tollAmount: 0,
    totalTrips: 0,
    totalReports: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    leaveCount: 0,
  });

  useEffect(() => {
    fetchReports();
    fetchStatistics();
    fetchServiceDayAdjustments();
    setupRealtimeUpdates();
  }, [
    currentPage,
    statusFilter,
    dateFilter,
    dateRange,
    serviceDayFilter,
    weekOffset,
  ]);



  // Log page view
  useEffect(() => {
    logActivity({
      actionType: "view_page",
      actionCategory: "reports",
      description: "Viewed Admin Reports page",
      pageName: "Admin Reports",
    });
  }, []);

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

  // Fetch manager names for "paying cash" display
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, name")
          .in("role", ["manager", "admin", "super_admin"]);
        if (error) throw error;
        const map: Record<string, string> = {};
        (data || []).forEach((u) => {
          map[u.id] = u.name || "—";
        });
        setManagerNames(map);
      } catch (e) {
        console.warn("Could not fetch managers:", e);
      }
    };
    fetchManagers();
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
        const todayStr = formatDateLocal(today);
        query = query.eq("rent_date", todayStr);
      } else if (dateFilter === "week") {
        const weekDates = getWeekDates(weekOffset);
        query = query
          .gte("rent_date", weekDates.startStr)
          .lte("rent_date", weekDates.endStr);
      } else if (dateFilter === "custom") {
        if (dateRange.start) {
          const startDate = formatDateLocal(dateRange.start);
          console.log("Filtering from start date:", startDate);
          query = query.gte("rent_date", startDate);
        }
        if (dateRange.end) {
          const endDate = formatDateLocal(dateRange.end);
          console.log("Filtering to end date:", endDate);
          query = query.lte("rent_date", endDate);
        }
        if (!dateRange.start && !dateRange.end) {
          console.log("No date range selected, showing all reports");
        }
      }

      // Service Day filter
      if (serviceDayFilter === "service") {
        query = query.eq("is_service_day", true);
      } else if (serviceDayFilter === "regular") {
        query = query.eq("is_service_day", false);
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

  const fetchServiceDayAdjustments = async () => {
    try {
      // Fetch from new common_adjustments table (include both approved and applied)
      let query = supabase
        .from("common_adjustments")
        .select("*")
        .in("status", ["approved", "applied"]); // Include both statuses

      // Apply date filters to match the reports filter
      if (dateFilter === "today") {
        const today = new Date();
        const todayStr = formatDateLocal(today);
        query = query.eq("adjustment_date", todayStr);
      } else if (dateFilter === "week") {
        const weekDates = getWeekDates(weekOffset);
        query = query
          .gte("adjustment_date", weekDates.startStr)
          .lte("adjustment_date", weekDates.endStr);
      } else if (dateFilter === "custom") {
        if (dateRange.start) {
          const startDate = formatDateLocal(dateRange.start);
          query = query.gte("adjustment_date", startDate);
        }
        if (dateRange.end) {
          const endDate = formatDateLocal(dateRange.end);
          query = query.lte("adjustment_date", endDate);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      console.log(`AdminReports: Fetched ${data?.length || 0} adjustments (approved or applied)`);
      setServiceDayAdjustments(data || []);
    } catch (error) {
      console.error("Error fetching adjustments:", error);
      setServiceDayAdjustments([]);
    }
  };

  // Single statistics function that responds to filters
  const fetchStatistics = async () => {
    try {
      let query = supabase
        .from("fleet_reports")
        .select(
          "user_id,total_trips, total_earnings, total_cashcollect, rent_paid_amount, toll, status"
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
        const todayStr = formatDateLocal(today);
        query = query.eq("rent_date", todayStr);
      } else if (dateFilter === "week") {
        const weekDates = getWeekDates(weekOffset);
        query = query
          .gte("rent_date", weekDates.startStr)
          .lte("rent_date", weekDates.endStr);
      } else if (dateFilter === "custom") {
        if (dateRange.start) {
          const startDate = formatDateLocal(dateRange.start);
          console.log("Filtering from start date:", startDate);
          query = query.gte("rent_date", startDate);
        }
        if (dateRange.end) {
          const endDate = formatDateLocal(dateRange.end);
          console.log("Filtering to end date:", endDate);
          query = query.lte("rent_date", endDate);
        }
        if (!dateRange.start && !dateRange.end) {
          console.log("No date range selected, showing all reports");
        }
      }

      // Service Day filter
      if (serviceDayFilter === "service") {
        query = query.eq("is_service_day", true);
      } else if (serviceDayFilter === "regular") {
        query = query.eq("is_service_day", false);
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
        const totalRentPaid = data.reduce((sum, report) => {
          const amount = Number(report.rent_paid_amount) || 0;
          return amount > 0 ? sum + amount : sum;
        }, 0);
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
        // const totalEarnings = data.reduce(
        //   (sum, report) => sum + (report.total_earnings || 0),
        //   0
        // );
        const totalTrips = data.reduce(
          (sum, report) => sum + (report.total_trips || 0),
          0
        );

        setStatistics({
          totalEarnings,
          totalCashCollect,
          totalRentPaid,
          tollAmount,
          totalTrips,
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

  // Helper: compute company rent based on trips and shift (fallback if settings missing)
  const computeCompanyRent = useCallback(
    (trips: number, shift?: string): number => {
      const tripsNum = Number(trips) || 0;
      const shiftName = (shift || "morning").toLowerCase();

      try {
        if (
          shiftName === "24hr" &&
          typeof calculateCompanyEarnings24hr === "function"
        ) {
          const v = Number(calculateCompanyEarnings24hr(tripsNum));
          if (!Number.isNaN(v) && v > 0) return v;
        }
        if (typeof calculateCompanyEarnings === "function") {
          const v = Number(calculateCompanyEarnings(tripsNum));
          if (!Number.isNaN(v) && v > 0) return v;
        }
      } catch (e) {
        console.warn("computeCompanyRent fallback due to error:", e);
      }

      // Fallback slabs (same as SubmitReport)
      if (shiftName === "24hr") {
        if (tripsNum >= 24) return 1070;
        if (tripsNum >= 22) return 1170;
        if (tripsNum >= 20) return 1270;
        if (tripsNum >= 16) return 1430;
        if (tripsNum >= 10) return 1490;
        return 1590;
      }

      if (tripsNum >= 12) return 535;
      if (tripsNum >= 11) return 585;
      if (tripsNum >= 10) return 635;
      if (tripsNum >= 8) return 715;
      if (tripsNum >= 5) return 745;
      return 795;
    },
    [calculateCompanyEarnings, calculateCompanyEarnings24hr]
  );

  // Helper: recompute rent_paid_amount using earnings, toll, cashcollect, platform_fee, trips/shift, and saved deposit cutting
  const recomputeRentPaidAmount = useCallback(
    (r: Report): number => {
      const earnings = Number(r.total_earnings) || 0;
      const toll = Number(r.toll) || 0;
      const cash = Number(r.total_cashcollect) || 0;
      const otherFee = Number(r.other_fee) || 0;
      const trips = Number(r.total_trips) || 0;
      const depositCutting = Number(r.deposit_cutting_amount) || 0; // Use saved deposit cutting amount
      const rent = computeCompanyRent(trips, r.shift);
      const amount = earnings + toll - cash - rent - otherFee - depositCutting;
      // Store with same convention as SubmitReport
      return amount > 0 ? -amount : Math.abs(amount);
    },
    [computeCompanyRent]
  );

  // Update selected report field and auto-recalculate rent
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const updateSelectedReportField = useCallback(
    (field: keyof Report, value: any) => {
      setSelectedReport((prev) => {
        if (!prev) return prev;
        const updated: Report = { ...prev, [field]: value } as Report;
        // Auto recalc for these fields
        if (
          field === "total_earnings" ||
          field === "total_cashcollect" ||
          field === "toll" ||
          field === "total_trips" ||
          field === "shift" ||
          field === "other_fee"
        ) {
          const newRpa = recomputeRentPaidAmount(updated);
          updated.rent_paid_amount = newRpa;
        }
        return updated;
      });
    },
    [recomputeRentPaidAmount]
  );

  // Derived helper for UI message preview inside modal
  const getPaymentPreviewMessage = useCallback(
    (r?: Report | null) => {
      if (!r) return "";
      const earnings = Number(r.total_earnings) || 0;
      const toll = Number(r.toll) || 0;
      const cash = Number(r.total_cashcollect) || 0;
      const otherFee = Number(r.other_fee) || 0;
      const trips = Number(r.total_trips) || 0;
      const depositCutting = Number(r.deposit_cutting_amount) || 0; // Use saved deposit cutting amount
      const rent = computeCompanyRent(trips, r.shift);
      const amount = earnings + toll - cash - rent - otherFee - depositCutting;
      if (amount > 0)
        return `Tawaaq pays ₹${Math.abs(amount).toLocaleString()}`;
      if (amount < 0)
        return `Driver pays ₹${Math.abs(amount).toLocaleString()}`;
      return "No payment required";
    },
    [computeCompanyRent]
  );

  const updateReportStatus = async (id: string, newStatus: string) => {
    // Prevent duplicate clicks - if already processing this report, return early
    if (processingReportId === id) {
      return;
    }

    try {
      setProcessingReportId(id); // Mark as processing
      
      // Get the report details first
      const report = reports.find((r) => r.id === id);
      if (!report) {
        toast.error("Report not found");
        setProcessingReportId(null);
        return;
      }

      // If approving, create automatic transactions
      if (newStatus === "approved") {
        const transactions = [];

        // 1. Deposit transaction (if deposit cutting amount > 0)
        if (report.deposit_cutting_amount > 0) {
          transactions.push(
            supabase.from("driver_balance_transactions").insert({
              user_id: report.user_id,
              amount: report.deposit_cutting_amount,
              type: "deposit",
              description: `Deposit collection for report ${report.rent_date} - ${report.shift} shift`,
              created_by: user?.id,
              created_at: report.rent_date,
            })
          );
        }

        // Apply adjustments to other_fee and mark them as applied
        const { data: adjustments, error: adjError } = await supabase
          .from("common_adjustments")
          .select("*")
          .eq("user_id", report.user_id)
          .eq("adjustment_date", report.rent_date)
          .eq("status", "approved");

        if (!adjError && adjustments && adjustments.length > 0) {
          // Calculate total adjustment amount to add to vehicle_performance.other_expenses
          const totalAdjustmentAmount = adjustments.reduce((sum, adj) => {
            return sum + Math.abs(adj.amount);
          }, 0);

          // Get vehicle_number from adjustment (adjustments are vehicle-based)
          const vehicleNumber = adjustments[0].vehicle_number;
          
          if (vehicleNumber) {
            // Calculate date for vehicle_performance lookup
            const reportDate = report.rent_date;
            
            // Try to find existing vehicle_performance record
            const { data: vpData, error: vpError } = await supabase
              .from("vehicle_performance")
              .select("id, other_expenses")
              .eq("vehicle_number", vehicleNumber)
              .eq("date", reportDate)
              .single();

            if (vpData) {
              // Update existing record
              const currentOtherExpenses = Number(vpData.other_expenses) || 0;
              const newOtherExpenses = currentOtherExpenses + totalAdjustmentAmount;
              
              await supabase
                .from("vehicle_performance")
                .update({ other_expenses: newOtherExpenses })
                .eq("id", vpData.id);
              
              console.log(`Updated vehicle_performance for ${vehicleNumber} on ${reportDate}: other_expenses = ${newOtherExpenses}`);
            } else if (!vpError || vpError.code === 'PGRST116') {
              // PGRST116 = no rows returned, which is fine - we'll create a new record
              // Create new vehicle_performance record with adjustment
              const { error: insertError } = await supabase
                .from("vehicle_performance")
                .insert({
                  vehicle_number: vehicleNumber,
                  date: reportDate,
                  other_expenses: totalAdjustmentAmount,
                  // Add required fields with defaults
                  total_trips: 0,
                  total_earnings: 0,
                  total_rent: 0,
                  additional_income: 0,
                  expenses: 0,
                  profit_loss: -totalAdjustmentAmount, // Negative because it's an expense
                  worked_days: 0,
                  avg_trips_per_day: 0,
                  avg_earnings_per_day: 0,
                  rent_slab: "",
                  performance_status: "break_even",
                  working_days_multiplier: 1,
                  exact_working_days: 0,
                });
              
              if (insertError) {
                console.error(`Error creating vehicle_performance record for ${vehicleNumber}:`, insertError);
              } else {
                console.log(`Created new vehicle_performance record for ${vehicleNumber} on ${reportDate} with adjustment: ${totalAdjustmentAmount}`);
              }
            } else {
              console.error(`Error fetching vehicle_performance for ${vehicleNumber}:`, vpError);
            }

            // Create vehicle_transaction entries for each adjustment with their descriptions
            for (const adjustment of adjustments) {
              const adjustmentAmount = Math.abs(adjustment.amount);
              const description = adjustment.description || `Adjustment for ${report.driver_name}`;
              
              const { error: txError } = await supabase
                .from("vehicle_transactions")
                .insert({
                  vehicle_number: vehicleNumber,
                  transaction_type: "expense",
                  amount: adjustmentAmount,
                  description: `${description} (Applied on report verification)`,
                  transaction_date: reportDate,
                  created_by: user?.id,
                });

              if (txError) {
                console.error(`Error creating vehicle transaction for adjustment ${adjustment.id}:`, txError);
              } else {
                console.log(`Created vehicle transaction for adjustment: ${description} - ₹${adjustmentAmount}`);
              }
            }
          } else {
            console.warn("Adjustment has no vehicle_number, skipping vehicle_performance update");
          }

          // Mark adjustments as applied
          for (const adjustment of adjustments) {
            await supabase.rpc("apply_adjustment_to_report", {
              p_adjustment_id: adjustment.id,
              p_report_id: report.id,
            });
          }
        }

        // 2. ₹100 transaction
        // transactions.push(
        //   supabase.from("driver_penalty_transactions").insert({
        //     user_id: report.user_id,
        //     amount: 100,
        //     type: "refund",
        //     description: `Advanced Rent Collection report ${report.rent_date} - ${report.shift} shift`,
        //     created_by: user?.id,
        //   })
        // );

        //

        // Execute all transactions
        const results = await Promise.allSettled(transactions);

        // Check for errors
        const errors = results.filter(
          (result) =>
            result.status === "rejected" ||
            (result.status === "fulfilled" && result.value.error)
        );

        if (errors.length > 0) {
          console.error("Error creating transactions:", errors);
          toast.error("Failed to create some transactions");
        } else {
          // Update user deposit balance only if deposit transaction was successful
          if (report.deposit_cutting_amount > 0) {
            const { data: userData, error: userError } = await supabase
              .from("users")
              .select("pending_balance")
              .eq("id", report.user_id)
              .single();

            if (!userError && userData) {
              const currentDeposit = userData.pending_balance || 0;
              const newBalance = currentDeposit + report.deposit_cutting_amount;

              const { error: balanceError } = await supabase
                .from("users")
                .update({ pending_balance: newBalance })
                .eq("id", report.user_id);

              if (balanceError) {
                console.error("Error updating deposit balance:", balanceError);
                toast.error("Failed to update deposit balance");
              }
            }
          }

          // const totalRefund = 100 + (report.platform_fee || 0);
          toast.success(
            `Approved! Created transactions: ${
              report.deposit_cutting_amount > 0
                ? `Deposit: ₹${report.deposit_cutting_amount} `
                : ""
            }`
          );
        }
      } else if (newStatus === "rejected") {
        // On rejection: delete any deposit transactions for this report's rent_date and reverse deposit balance
        try {
          // Fetch matching deposit transactions first to get total amount
          const { data: txs, error: fetchErr } = await supabase
            .from("driver_balance_transactions")
            .select("id, amount, description")
            .eq("user_id", report.user_id)
            .eq("type", "deposit")
            .ilike("description", `%${report.rent_date}%`);

          if (fetchErr) throw fetchErr;

          const totalToRevert = (txs || []).reduce(
            (sum, t: any) => sum + (Number(t.amount) || 0),
            0
          );

          if ((txs || []).length > 0) {
            // Delete those transactions
            const { error: delErr } = await supabase
              .from("driver_balance_transactions")
              .delete()
              .in(
                "id",
                (txs || []).map((t: any) => t.id)
              );
            if (delErr) throw delErr;

            // Reverse user's pending_balance by the deleted amount
            const { data: userData, error: userErr } = await supabase
              .from("users")
              .select("pending_balance")
              .eq("id", report.user_id)
              .single();

            if (!userErr && userData) {
              const currentDeposit = Number(userData.pending_balance) || 0;
              const newBalance = Math.max(0, currentDeposit - totalToRevert);
              const { error: updErr } = await supabase
                .from("users")
                .update({ pending_balance: newBalance })
                .eq("id", report.user_id);
              if (updErr) {
                console.error("Error reverting deposit balance:", updErr);
                toast.error("Failed to revert deposit balance");
              }
            }
          }
          toast.success(
            `rejection! Removed transactions: ${
              report.deposit_cutting_amount > 0
                ? `Deposit: ₹${report.deposit_cutting_amount} `
                : ""
            }`
          );
        } catch (e) {
          console.error("Error handling rejection transaction cleanup:", e);
          toast.error("Failed to delete related transactions on rejection");
        }
      }

      // Update report status
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
        reports.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );

      toast.success(`Report marked as ${newStatus}`);
      
      // Log activity
      await logActivity({
        actionType: newStatus === "approved" ? "approve_report" : "reject_report",
        actionCategory: "reports",
        description: `${newStatus === "approved" ? "Approved" : "Rejected"} report for driver ${report.driver_name} (${report.vehicle_number}) on ${report.rent_date} - ${report.shift} shift - Earnings: ₹${report.total_earnings}`,
        metadata: {
          report_id: id,
          driver_name: report.driver_name,
          driver_id: report.user_id,
          vehicle_number: report.vehicle_number,
          rent_date: report.rent_date,
          shift: report.shift,
          total_earnings: report.total_earnings,
          total_trips: report.total_trips,
          status: newStatus,
        },
        pageName: "Admin Reports",
      });
    } catch (error) {
      console.error("Error updating report:", error);
      toast.error("Failed to update report status");
    } finally {
      setProcessingReportId(null); // Clear processing state
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "pending_verification":
        return <Badge variant="outline">P</Badge>;
      case "approved":
        return <Badge variant="success">A</Badge>;
      case "rejected":
        return <Badge variant="destructive">R</Badge>;
      case "leave":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            L
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
      // Step 1: First, unlink any adjustments that are applied to this report
      const { error: unlinkError } = await supabase
        .from("common_adjustments")
        .update({ 
          applied_to_report: null,
          status: 'approved', // Reset status back to approved (not applied)
          applied_at: null
        })
        .eq("applied_to_report", selectedReport.id);

      if (unlinkError) {
        console.error("Error unlinking adjustments:", unlinkError);
        throw unlinkError;
      }

      // Step 2: Delete the report
      const { error: deleteError } = await supabase
        .from("fleet_reports")
        .delete()
        .eq("id", selectedReport.id);

      if (deleteError) throw deleteError;

      // Step 3: Fetch the current vehicle's total_trips
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

      // Step 4: Update the vehicle's trip count
      const { error: updateError } = await supabase
        .from("vehicles")
        .update({ total_trips: newTripCount })
        .eq("vehicle_number", selectedReport.vehicle_number);

      if (updateError) throw updateError;

      // Step 5: Update local state
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

  const fetchVehicleTransactions = async (
    vehicleNumber: string,
    reportDate: string
  ) => {
    try {
      const { data, error } = await supabase
        .from("vehicle_transactions")
        .select("*")
        .eq("vehicle_number", vehicleNumber)
        .eq("transaction_date", reportDate)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVehicleTransactions(data || []);
    } catch (error) {
      console.error("Error fetching vehicle transactions:", error);
    }
  };

  const handleOpenAdjustmentModal = useCallback((report: Report) => {
    setSelectedReportForAdjustment(report);
    setIsAdjustmentModalOpen(true);
    fetchVehicleTransactions(report.vehicle_number, report.rent_date);
    setAdjustmentType("income");
    setAdjustmentAmount(0);
    setAdjustmentDescription("");
  }, []);

  const handleAddAdjustment = useCallback(async () => {
    if (
      !selectedReportForAdjustment ||
      adjustmentAmount === 0 ||
      !adjustmentDescription.trim()
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // Add transaction to vehicle_transactions table
      const { error: transactionError } = await supabase
        .from("vehicle_transactions")
        .insert([
          {
            vehicle_number: selectedReportForAdjustment.vehicle_number,
            transaction_type: adjustmentType,
            amount: adjustmentAmount,
            description: adjustmentDescription.trim(),
            transaction_date: selectedReportForAdjustment.rent_date,
          },
        ]);

      if (transactionError) throw transactionError;

      // Calculate new rent_paid_amount
      const adjustmentValue =
        adjustmentType === "income" ? adjustmentAmount : -adjustmentAmount;
      const newRentPaidAmount =
        selectedReportForAdjustment.rent_paid_amount + adjustmentValue;

      // Update the report's rent_paid_amount
      const { error: updateError } = await supabase
        .from("fleet_reports")
        .update({ rent_paid_amount: newRentPaidAmount })
        .eq("id", selectedReportForAdjustment.id);

      if (updateError) throw updateError;

      // Update local state
      setReports((prev) =>
        prev.map((report) =>
          report.id === selectedReportForAdjustment.id
            ? { ...report, rent_paid_amount: newRentPaidAmount }
            : report
        )
      );

      // Refresh transactions list
      await fetchVehicleTransactions(
        selectedReportForAdjustment.vehicle_number,
        selectedReportForAdjustment.rent_date
      );

      // Reset form
      setAdjustmentAmount(0);
      setAdjustmentDescription("");

      toast.success(
        `${
          adjustmentType === "income" ? "Income" : "Expense"
        } adjustment added successfully`
      );
    } catch (error) {
      console.error("Error adding adjustment:", error);
      toast.error("Failed to add adjustment");
    }
  }, [
    selectedReportForAdjustment,
    adjustmentAmount,
    adjustmentDescription,
    adjustmentType,
    fetchVehicleTransactions,
  ]);

  // Memoize the new amount calculation to prevent expensive re-calculations
  const previewNewAmount = useMemo(() => {
    if (!selectedReportForAdjustment || adjustmentAmount === 0) return null;

    return (
      (selectedReportForAdjustment.rent_paid_amount || 0) +
      (adjustmentType === "income" ? adjustmentAmount : -adjustmentAmount)
    );
  }, [
    selectedReportForAdjustment?.rent_paid_amount,
    adjustmentAmount,
    adjustmentType,
  ]);

  const handleDeleteTransaction = useCallback(
    async (transactionId: string) => {
      if (!selectedReportForAdjustment) return;

      try {
        // Get transaction details before deleting
        const { data: transactionData, error: fetchError } = await supabase
          .from("vehicle_transactions")
          .select("*")
          .eq("id", transactionId)
          .single();

        if (fetchError) throw fetchError;

        // Delete the transaction
        const { error: deleteError } = await supabase
          .from("vehicle_transactions")
          .delete()
          .eq("id", transactionId);

        if (deleteError) throw deleteError;

        // Reverse the transaction from rent_paid_amount
        const reversalValue =
          transactionData.transaction_type === "income"
            ? -transactionData.amount
            : transactionData.amount;

        const newRentPaidAmount =
          selectedReportForAdjustment.rent_paid_amount + reversalValue;

        // Update the report's rent_paid_amount
        const { error: updateError } = await supabase
          .from("fleet_reports")
          .update({ rent_paid_amount: newRentPaidAmount })
          .eq("id", selectedReportForAdjustment.id);

        if (updateError) throw updateError;

        // Update local state
        setReports((prev) =>
          prev.map((report) =>
            report.id === selectedReportForAdjustment.id
              ? { ...report, rent_paid_amount: newRentPaidAmount }
              : report
          )
        );

        // Refresh transactions list
        await fetchVehicleTransactions(
          selectedReportForAdjustment.vehicle_number,
          selectedReportForAdjustment.rent_date
        );

        toast.success("Transaction deleted successfully");
      } catch (error) {
        console.error("Error deleting transaction:", error);
        toast.error("Failed to delete transaction");
      }
    },
    [selectedReportForAdjustment, fetchVehicleTransactions]
  );

  // Memoized input handlers to prevent re-renders
  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAdjustmentAmount(Number(e.target.value));
    },
    []
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAdjustmentDescription(e.target.value);
    },
    []
  );

  const handleTypeChange = useCallback((value: "income" | "expense") => {
    setAdjustmentType(value);
  }, []);

  // Balance transaction functions
  const handleOpenBalanceModal = useCallback((report: Report) => {
    setSelectedReportForBalance(report);
    setIsBalanceModalOpen(true);
    // Set default values from report
    const defaultAmount = report.rent_paid_amount
      ? Math.abs(report.rent_paid_amount)
      : 0;
    setBalanceAmount(defaultAmount.toString());
    setBalanceType(
      report.rent_paid_amount && report.rent_paid_amount < 0 ? "refund" : "due"
    );
    setBalanceDescription("");
  }, []);

  const handleAddToBalance = useCallback(async () => {
    if (!selectedReportForBalance) {
      toast.error("No report selected");
      return;
    }

    if (!balanceAmount || parseFloat(balanceAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setIsBalanceSubmitting(true);

      const amount = parseFloat(balanceAmount);
      const transactionData = {
        user_id: selectedReportForBalance.user_id,
        amount: amount,
        type: balanceType,
        description:
          balanceDescription.trim() ||
          `Report adjustment for ${selectedReportForBalance.rent_date} - ${selectedReportForBalance.shift} shift`,
        created_by: user?.id,
        created_at: selectedReportForBalance.rent_date,
      };

      // Always insert new transaction
      const { error: txError } = await supabase
        .from("driver_penalty_transactions")
        .insert([transactionData]);

      if (txError) throw txError;

      toast.success(
        `Added ${
          balanceType === "refund" ? "refund" : "due"
        } transaction of ₹${amount.toLocaleString()} to driver penalty transactions`
      );

      setIsBalanceModalOpen(false);
      setBalanceDescription("");
      setBalanceAmount("");
      setBalanceType("due");
      setSelectedReportForBalance(null);
    } catch (error) {
      console.error("Error adding penalty transaction:", error);
      toast.error("Failed to add to driver penalty transactions");
    } finally {
      setIsBalanceSubmitting(false);
    }
  }, [
    selectedReportForBalance,
    balanceDescription,
    balanceAmount,
    balanceType,
    user?.id,
  ]);

  // Memoize button disabled state
  const isButtonDisabled = useMemo(() => {
    return adjustmentAmount === 0 || !adjustmentDescription.trim();
  }, [adjustmentAmount, adjustmentDescription]);

  // Memoize transactions list to prevent re-renders
  const memoizedTransactionsList = useMemo(() => {
    if (vehicleTransactions.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No transactions found for this vehicle on this date
        </div>
      );
    }

    return vehicleTransactions.map((transaction) => (
      <div key={transaction.id} className="border rounded-lg p-3 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {transaction.transaction_type === "income" ? (
              <Plus className="h-4 w-4 text-green-500" />
            ) : (
              <Minus className="h-4 w-4 text-red-500" />
            )}
            <span
              className={`font-medium ${
                transaction.transaction_type === "income"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {transaction.transaction_type === "income" ? "+" : "-"}₹
              {transaction.amount.toLocaleString()}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteTransaction(transaction.id)}
            className="text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm text-gray-600 mt-1">
          {transaction.description}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {format(new Date(transaction.created_at), "MMM d, yyyy 'at' h:mm a")}
        </div>
      </div>
    ));
  }, [vehicleTransactions, handleDeleteTransaction]);

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
        const todayStr = formatDateLocal(today);
        query = query.eq("rent_date", todayStr);
      } else if (dateFilter === "week") {
        const weekDates = getWeekDates(weekOffset);
        query = query
          .gte("rent_date", weekDates.startStr)
          .lte("rent_date", weekDates.endStr);
      } else if (dateFilter === "custom") {
        if (dateRange.start) {
          const startDate = formatDateLocal(dateRange.start);
          console.log("Filtering from start date:", startDate);
          query = query.gte("rent_date", startDate);
        }
        if (dateRange.end) {
          const endDate = formatDateLocal(dateRange.end);
          console.log("Filtering to end date:", endDate);
          query = query.lte("rent_date", endDate);
        }
        if (!dateRange.start && !dateRange.end) {
          console.log("No date range selected, showing all reports");
        }
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
        "Other Fee",
        "Rent Paid",
        "Service Day",
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
            ? "P"
            : report.status || "Unknown";

        return [
          date,
          report.driver_name,
          report.vehicle_number,
          report.total_trips,
          report.total_earnings,
          report.toll,
          report.total_cashcollect,
          report.other_fee || 0,
          report.rent_paid_amount,
          report.is_service_day ? "Yes" : "No",
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

  const driverActualEarnings = (user_id: string) => {
    return reports.reduce((sum, report) => {
      if (report.user_id === user_id) {
        return report.total_earnings + report.toll - report.rent_paid_amount;
      }
      return sum;
    }, 0);
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
                    ? "P"
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

        <div className="w-full lg:w-[200px]">
          <Select
            value={serviceDayFilter}
            onValueChange={(value: "all" | "service" | "regular") => {
              setServiceDayFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Service Day Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reports</SelectItem>
              <SelectItem value="service">⚙️ Service Days</SelectItem>
              <SelectItem value="regular">📊 Regular Days</SelectItem>
            </SelectContent>
          </Select>
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
          {dateFilter === "week" ? (
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setWeekOffset((prev) => prev - 1);
                  setCurrentPage(1);
                }}
                className="px-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <Button
                  variant="default"
                  onClick={() => {
                    setDateFilter("week");
                    setWeekOffset(0);
                    setCurrentPage(1);
                  }}
                  className="w-full"
                >
                  {(() => {
                    const weekDates = getWeekDates(weekOffset);
                    const isCurrentWeek = weekOffset === 0;
                    return (
                      <div className="flex flex-col items-center">
                        <span>{isCurrentWeek ? "This Week" : "Week"}</span>
                        <span className="text-xs opacity-90">
                          {format(weekDates.start, "MMM d")} -{" "}
                          {format(weekDates.end, "MMM d")}
                        </span>
                      </div>
                    );
                  })()}
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setWeekOffset((prev) => prev + 1);
                  setCurrentPage(1);
                }}
                className="px-2"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                setDateFilter("week");
                setWeekOffset(0);
                setCurrentPage(1);
              }}
              className="flex-1 sm:flex-none"
            >
              This Week
            </Button>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={dateFilter === "custom" ? "default" : "outline"}
                className="gap-2 flex-1 sm:flex-none"
              >
                <CalendarIcon className="h-4 w-4" />
                Custom
                {dateRange.start && (
                  <span className="text-xs ml-1">
                    ({formatDateLocal(dateRange.start)})
                  </span>
                )}
                {dateRange.end && (
                  <span className="text-xs ml-1">
                    - {formatDateLocal(dateRange.end)}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <div className="p-3 border-b">
                <div className="text-sm font-medium mb-2">
                  Select Date Range
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">Start Date</label>
                    <Calendar
                      mode="single"
                      selected={dateRange.start}
                      onSelect={(date) => {
                        setDateFilter("custom");
                        setDateRange((prev) => ({ ...prev, start: date }));
                        setCurrentPage(1);
                      }}
                      className="rounded-md border"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">End Date</label>
                    <Calendar
                      mode="single"
                      selected={dateRange.end}
                      onSelect={(date) => {
                        setDateFilter("custom");
                        setDateRange((prev) => ({ ...prev, end: date }));
                        setCurrentPage(1);
                      }}
                      className="rounded-md border"
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            onClick={() => {
              setDateFilter(null);
              setCustomDate(null);
              setDateRange({});
              setWeekOffset(0);
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-500">
              Rental Income
            </div>
            <div className="text-2xl font-bold text-green-500">
              ₹
              {(
                (statistics.approvedCount +
                  statistics.rejectedCount +
                  statistics.pendingCount) *
                600
              ).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* <Card className="bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-500">
              Fleet Car Expense
            </div>
            <div className="text-2xl font-bold text-red-500">
              ₹
              {(
                (statistics.approvedCount +
                  statistics.rejectedCount +
                  statistics.pendingCount) *
                700
              ).toLocaleString()}
            </div>
          </CardContent>
        </Card> */}
        {/* 
        <Card className="bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-500">Net Profit</div>
            <div className="text-2xl font-bold text-blue-500">
              ₹
              {(
                (statistics.approvedCount +
                  statistics.rejectedCount +
                  statistics.pendingCount) *
                  700 -
                (statistics.approvedCount +
                  statistics.rejectedCount +
                  statistics.pendingCount) *
                  700
              ).toLocaleString()}
            </div>
          </CardContent>
        </Card> */}

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
              Cash at Bank
            </div>
            <div className="text-2xl font-bold">
              ₹{cashInHand.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* <Card className="bg-gradient-to-br from-yellow-50 to-white">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-500">
              Total Toll Amount
            </div>
            <div className="text-2xl font-bold text-yellow-500">
              ₹{statistics.tollAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card> */}
        <Card className="bg-gradient-to-br from-gray-50 to-white border-gray-200">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-500">Total Trips</div>
            <div className="text-2xl font-bold text-gray-700">
              {statistics.totalTrips}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Status Indication Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-200">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-orange-600">
              Total Earnings
            </div>
            <div className="text-2xl font-bold text-orange-500">
              {statistics.totalEarnings}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-green-600">Total Toll</div>
            <div className="text-2xl font-bold text-green-500">
              {statistics.tollAmount}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-white border-red-200">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-red-600">
              Total Cash Collected
            </div>
            <div className="text-2xl font-bold text-red-500">
              {statistics.totalCashCollect}
            </div>
          </CardContent>
        </Card>

        {/* <Card className="bg-gradient-to-br from-yellow-50 to-white border-yellow-200">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-yellow-600">
              Total Rent Paid
            </div>
            <div className="text-2xl font-bold text-yellow-500">
              {statistics.totalRentPaid}
            </div>
          </CardContent> */}
        {/* </Card> */}
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Recent Reports
                </h2>
                <span className="text-sm text-muted-foreground hidden sm:inline-block">
                  Showing {reports.length} of {totalCount} reports
                  <button
                    className=""
                    onClick={() => {
                      fetchReports();
                      fetchStatistics();
                    }}
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </button>
                </span>
              </div>
              
              {/* Adjustment Legend */}
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-4 flex-wrap text-xs">
                  <span className="font-semibold text-gray-700">Adjustment Indicators:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-100 border-2 border-purple-500 rounded"></div>
                    <span className="text-gray-600">Pending Adjustment (Not Applied)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-100 border-2 border-blue-500 rounded"></div>
                    <span className="text-gray-600">Applied Adjustment (Verified)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-purple-500 text-white rounded-full text-[10px] font-bold">N</span>
                    <span className="text-gray-600">Number shows adjustment count & amount</span>
                  </div>
                </div>
              </div>
              <div className="min-w-full overflow-hidden">
                <div className="max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead className="w-[50px]">ID</TableHead>
                        <TableHead className="min-w-[150px]">
                          Date&time
                        </TableHead>
                        <TableHead className="min-w-[200px]">Driver</TableHead>
                        <TableHead className="min-w-[50px]">Vehicle</TableHead>
                        <TableHead className="min-w-[20px]">Trips</TableHead>
                        <TableHead className="min-w-[100px]">
                          Earnings
                        </TableHead>
                        <TableHead className="min-w-[50px]">Toll</TableHead>
                        <TableHead className="min-w-[50px]">C C</TableHead>
                        <TableHead className="min-w-[50px]">OF</TableHead>
                        <TableHead className="min-w-[50px]">RPA</TableHead>
                        <TableHead className="min-w-[90px]">Cash</TableHead>
                        <TableHead className="min-w-[50px]">DAE</TableHead>
                        <TableHead className="min-w-[50px]">S S</TableHead>
                        <TableHead className="min-w-[50px]">Status</TableHead>
                        <TableHead className="min-w-[30px]">🔧</TableHead>
                        <TableHead className="text-right min-w-[120px]">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={16} className="text-center py-8">
                            No reports found
                          </TableCell>
                        </TableRow>
                      ) : (
                        reports.map((report, index) => {
                          // Check if this report has any adjustment
                          const reportAdjustments = serviceDayAdjustments.filter(
                            (adj) =>
                              adj.user_id === report.user_id &&
                              adj.adjustment_date === report.rent_date
                          );
                          
                          const hasAdjustment = reportAdjustments.length > 0;
                          const appliedAdjustments = reportAdjustments.filter(
                            (adj) => adj.status === "applied" && adj.applied_to_report === report.id
                          );
                          const pendingAdjustments = reportAdjustments.filter(
                            (adj) => adj.status === "approved"
                          );
                          
                          const totalAdjustmentAmount = reportAdjustments.reduce(
                            (sum, adj) => sum + Math.abs(adj.amount),
                            0
                          );

                          return (
                            <TableRow
                              key={report.id}
                              className={`text-sm ${
                                hasAdjustment
                                  ? appliedAdjustments.length > 0
                                    ? "bg-blue-100 hover:bg-blue-200"
                                    : "bg-purple-100 hover:bg-purple-200"
                                  : ""
                              }`}
                            >
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
                              <TableCell className="font-bold">
                                ₹{report.total_earnings.toLocaleString()}
                              </TableCell>
                              <TableCell className="font-bold">
                                ₹{report.toll}
                              </TableCell>
                              <TableCell className="font-bold">
                                ₹{report.total_cashcollect.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                ₹{report.other_fee?.toLocaleString() || "0"}
                              </TableCell>
                              <TableCell
                                className={`whitespace-nowrap ${
                                  report.rent_paid_amount < 0
                                    ? "text-red-500 font-bold"
                                    : "text-green-500 font-bold"
                                }`}
                              >
                                ₹{report.rent_paid_amount.toLocaleString()}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm">
                                {report.paying_cash && report.cash_amount != null ? (
                                  <span className="text-green-700 font-medium">
                                    ₹{Number(report.cash_amount).toLocaleString()}
                                    {report.cash_manager_id && (
                                      <span className="text-muted-foreground font-normal">
                                        {" "}({managerNames[report.cash_manager_id] ?? "—"})
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                              <TableCell className="text-yellow-600">
                                ₹
                                {report.total_earnings - report.other_fee - 600}
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
                              <TableCell className="text-center">
                                {hasAdjustment && (
                                  <div className="flex flex-col items-center gap-1">
                                    {/* <span
                                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shadow-sm ${
                                        appliedAdjustments.length > 0
                                          ? "bg-blue-500 text-white"
                                          : "bg-purple-500 text-white"
                                      }`}
                                      title={
                                        appliedAdjustments.length > 0
                                          ? `${appliedAdjustments.length} Applied Adjustment(s) - ₹${totalAdjustmentAmount}`
                                          : `${pendingAdjustments.length} Pending Adjustment(s) - ₹${totalAdjustmentAmount}`
                                      }
                                    >
                                      {reportAdjustments.length}
                                    </span> */}
                                    <span className="text-[10px] font-semibold text-gray-700">
                                      ₹{totalAdjustmentAmount}
                                    </span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-end space-x-1">
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

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600  sm:inline-flex"
                                    onClick={() =>
                                      updateReportStatus(report.id, "approved")
                                    }
                                    disabled={report.status === "approved" || processingReportId === report.id}
                                  >
                                    {processingReportId === report.id ? (
                                      <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-green-600 animate-spin"></div>
                                    ) : (
                                      <CheckCircle className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600  sm:inline-flex"
                                    onClick={() =>
                                      updateReportStatus(report.id, "rejected")
                                    }
                                    disabled={report.status === "rejected" || processingReportId === report.id}
                                  >
                                    {processingReportId === report.id ? (
                                      <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-red-600 animate-spin"></div>
                                    ) : (
                                      <XCircle className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-purple-600 hover:text-purple-700"
                                    onClick={() =>
                                      handleOpenAdjustmentModal(report)
                                    }
                                    title="Add Adjustment"
                                  >
                                    <DollarSign className="h-4 w-4" />
                                  </Button>
                                  {(report.status === "approved" ||
                                    report.status === "pending_verification") &&
                                    report.rent_paid_amount !== undefined && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-blue-600 hover:text-blue-700"
                                        onClick={() =>
                                          handleOpenBalanceModal(report)
                                        }
                                        title="Add to Penalty Transactions"
                                      >
                                        <Wallet className="h-4 w-4" />
                                      </Button>
                                    )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`text-blue-600 sm:inline-flex`}
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
                                        `OverDue slip 🧾\nDriver: ${report.driver_name}\nVehicle: ${report.vehicle_number}\nShift: ${report.shift}\nPhone: ${driverPhone}\nRent Date: ${report.rent_date}\nOverdue Amount: ${report.rent_paid_amount}`
                                      );

                                      window.open(
                                        `https://wa.me/?text=${message}`,
                                        "_blank"
                                      );
                                    }}
                                  >
                                    <Share2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
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
        <DialogContent className="border-border/50 max-w-5xl">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-10">
            <div className="grid grid-cols-3 gap-4">
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
                <div className="space-y-2">
                  <label>Shift</label>
                  <Input
                    type="text"
                    value={selectedReport?.shift}
                    onChange={(e) =>
                      updateSelectedReportField("shift", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                <label>Other Fee / Expenses (₹)</label>
                <Input
                  type="number"
                  value={selectedReport?.other_fee}
                  onChange={(e) =>
                    updateSelectedReportField(
                      "other_fee",
                      Number(e.target.value)
                    )
                  }
                />
                <p className="text-xs text-gray-500">
                  Platform fee, fuel, maintenance, or any other expenses
                </p>
              </div>
              </div>
              <div className="space-y-2">
                <label>Total Earnings</label>
                <Input
                  type="number"
                  value={selectedReport?.total_earnings}
                  onChange={(e) =>
                    updateSelectedReportField(
                      "total_earnings",
                      Number(e.target.value)
                    )
                  }
                />
                <label>Cash Collected</label>
                <Input
                  type="number"
                  value={selectedReport?.total_cashcollect}
                  onChange={(e) =>
                    updateSelectedReportField(
                      "total_cashcollect",
                      Number(e.target.value)
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <label>Total Trips</label>
                <Input
                  type="number"
                  value={selectedReport?.total_trips}
                  onChange={(e) =>
                    updateSelectedReportField(
                      "total_trips",
                      Number(e.target.value)
                    )
                  }
                />
                <label>Toll Amount</label>
                <Input
                  type="number"
                  value={selectedReport?.toll}
                  onChange={(e) =>
                    updateSelectedReportField("toll", Number(e.target.value))
                  }
                />
              </div>
              
              <div className="space-y-2">
                <label>Rent Paid Amount (Auto)</label>
                <Input
                  type="number"
                  value={selectedReport?.rent_paid_amount}
                  disabled
                />
                <div className="text-xs text-gray-500">
                  {getPaymentPreviewMessage(selectedReport)}
                </div>
              </div>

              <div className="space-y-2">
                <label>Deposit Cutting Amount (₹)</label>
                <Input
                  type="number"
                  value={selectedReport?.deposit_cutting_amount || 0}
                  onChange={(e) =>
                    setSelectedReport((prev) => ({
                      ...prev!,
                      deposit_cutting_amount: Number(e.target.value),
                    }))
                  }
                  placeholder="Enter deposit cutting amount"
                />
                <div className="text-xs text-gray-500">
                  This amount was calculated at report submission and is fixed
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <label className="font-medium">Paying by cash</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Cash amount (₹)</label>
                    <Input
                      type="number"
                      min={0}
                      value={selectedReport?.cash_amount ?? ""}
                      onChange={(e) =>
                        setSelectedReport((prev) => ({
                          ...prev!,
                          cash_amount: e.target.value ? Number(e.target.value) : null,
                        }))
                      }
                      placeholder="Amount"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Manager</label>
                    <Select
                      value={selectedReport?.cash_manager_id ?? ""}
                      onValueChange={(value) =>
                        setSelectedReport((prev) => ({
                          ...prev!,
                          cash_manager_id: value || null,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select manager" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(managerNames).map(([id, name]) => (
                          <SelectItem key={id} value={id}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="paying-cash-edit"
                    checked={!!selectedReport?.paying_cash}
                    onChange={(e) =>
                      setSelectedReport((prev) => ({
                        ...prev!,
                        paying_cash: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="paying-cash-edit" className="text-sm">
                    Driver paying by cash
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label>Service Day</label>
                <div className="flex items-center gap-3 p-3 border rounded-md">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedReport((prev) => ({
                        ...prev!,
                        is_service_day: !prev?.is_service_day,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      selectedReport?.is_service_day
                        ? "bg-orange-600"
                        : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        selectedReport?.is_service_day
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-sm">
                    {selectedReport?.is_service_day
                      ? "⚙️ Service Day"
                      : "📊 Regular Day"}
                  </span>
                </div>
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

              {/* Adjustment Information */}
              {(() => {
                // Get adjustments for this report
                const reportAdjustments = serviceDayAdjustments.filter(
                  (adj) =>
                    adj.user_id === selectedReport?.user_id &&
                    adj.adjustment_date === selectedReport?.rent_date
                );

                const appliedAdjs = reportAdjustments.filter(
                  (adj) => adj.status === "applied" && adj.applied_to_report === selectedReport?.id
                );
                const pendingAdjs = reportAdjustments.filter(
                  (adj) => adj.status === "approved"
                );

                if (reportAdjustments.length > 0) {
                  const totalAmount = reportAdjustments.reduce(
                    (sum, adj) => sum + Math.abs(adj.amount),
                    0
                  );

                  return (
                    <div className={`space-y-2 p-4 border-2 rounded-lg ${
                      appliedAdjs.length > 0
                        ? "bg-blue-50 border-blue-300"
                        : "bg-purple-50 border-purple-300"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">💰</span>
                          <label className={`font-semibold ${
                            appliedAdjs.length > 0 ? "text-blue-900" : "text-purple-900"
                          }`}>
                            {appliedAdjs.length > 0
                              ? "Adjustments (Applied to Report)"
                              : "Adjustments (Pending Application)"}
                          </label>
                        </div>
                        {/* <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                          appliedAdjs.length > 0
                            ? "bg-blue-200 text-blue-900"
                            : "bg-purple-200 text-purple-900"
                        }`}>
                          {reportAdjustments.length} Adjustment{reportAdjustments.length > 1 ? "s" : ""}
                        </span> */}
                      </div>

                      {appliedAdjs.length > 0 && (
                        <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded-md mb-2">
                          ✓ These adjustments have been applied and added to Vehicle Performance "Other Expense"
                        </div>
                      )}

                      {pendingAdjs.length > 0 && (
                        <div className="text-xs text-purple-700 bg-purple-100 p-2 rounded-md mb-2">
                          ⏳ These adjustments will be applied when you verify this report
                        </div>
                      )}

                      <div className="space-y-2">
                        {reportAdjustments.map((adj) => (
                          <div
                            key={adj.id}
                            className={`p-3 bg-white rounded-md border-2 ${
                              adj.status === "applied"
                                ? "border-blue-200"
                                : "border-purple-200"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900 capitalize">
                                  {adj.category.replace(/_/g, " ")}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                  adj.status === "applied"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-purple-100 text-purple-700"
                                }`}>
                                  {adj.status === "applied" ? "Applied" : "Pending"}
                                </span>
                              </div>
                              <span className="text-lg font-bold text-red-600">
                                ₹{Math.abs(adj.amount).toFixed(0)}
                              </span>
                            </div>
                            {adj.description && (
                              <p className="text-sm text-gray-700 mb-1">
                                📝 {adj.description}
                              </p>
                            )}
                            {adj.vehicle_number && (
                              <p className="text-xs text-gray-500">
                                🚗 Vehicle: {adj.vehicle_number}
                              </p>
                            )}
                          </div>
                        ))}
                        <div className={`flex items-center justify-between p-3 rounded-md ${
                          appliedAdjs.length > 0
                            ? "bg-blue-100"
                            : "bg-purple-100"
                        }`}>
                          <span className={`font-semibold ${
                            appliedAdjs.length > 0 ? "text-blue-900" : "text-purple-900"
                          }`}>
                            Total Adjustment Amount:
                          </span>
                          <span className={`text-lg font-bold ${
                            appliedAdjs.length > 0 ? "text-blue-900" : "text-purple-900"
                          }`}>
                            ₹{totalAmount.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
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
                        other_fee: selectedReport?.other_fee,
                        deposit_cutting_amount:
                          selectedReport?.deposit_cutting_amount,
                        paying_cash: selectedReport?.paying_cash ?? false,
                        cash_amount: selectedReport?.cash_amount ?? null,
                        cash_manager_id: selectedReport?.cash_manager_id ?? null,
                        is_service_day: selectedReport?.is_service_day,
                        remarks: selectedReport?.remarks,
                        status: selectedReport?.status,
                      })
                      .eq("id", selectedReport?.id);

                    if (!error) {
                      setReports((prev) =>
                        prev.map((report) =>
                          report.id === selectedReport?.id
                            ? (selectedReport as Report)
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

      {/* Adjustment Modal */}
      <Dialog
        open={isAdjustmentModalOpen}
        onOpenChange={setIsAdjustmentModalOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Report Adjustments - {selectedReportForAdjustment?.driver_name} (
              {selectedReportForAdjustment?.vehicle_number})
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add New Adjustment */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold mb-4">
                  Add New Adjustment
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Type
                    </label>
                    <Select
                      value={adjustmentType}
                      onValueChange={handleTypeChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4 text-green-500" />
                            Income (Add to rent paid)
                          </div>
                        </SelectItem>
                        <SelectItem value="expense">
                          <div className="flex items-center gap-2">
                            <Minus className="h-4 w-4 text-red-500" />
                            Expense (Deduct from rent paid)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Amount (₹)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={adjustmentAmount}
                      onChange={handleAmountChange}
                      placeholder="Enter amount"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Description
                    </label>
                    <Input
                      value={adjustmentDescription}
                      onChange={handleDescriptionChange}
                      placeholder="Enter description"
                    />
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600">
                      Current Rent Paid:{" "}
                      <span className="font-medium">
                        ₹
                        {selectedReportForAdjustment?.rent_paid_amount?.toLocaleString()}
                      </span>
                    </div>
                    {previewNewAmount !== null && (
                      <div className="text-sm text-gray-600 mt-1">
                        New Amount:{" "}
                        <span
                          className={`font-medium ${
                            adjustmentType === "income"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          ₹{previewNewAmount.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleAddAdjustment}
                    className="w-full"
                    disabled={isButtonDisabled}
                  >
                    Add {adjustmentType === "income" ? "Income" : "Expense"}{" "}
                    Adjustment
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Existing Adjustments */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold mb-4">
                  Adjustment History
                </h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {memoizedTransactionsList}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsAdjustmentModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Balance Transaction Modal */}
      <Dialog open={isBalanceModalOpen} onOpenChange={setIsBalanceModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Driver Penalty Transactions</DialogTitle>
            <DialogDescription>
              Add this report's rent amount to the driver's penalty transactions
              (does not affect deposit balance)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-2">Report Details:</div>
              <div className="space-y-1 text-sm">
                <div>
                  <strong>Driver:</strong>{" "}
                  {selectedReportForBalance?.driver_name}
                </div>
                <div>
                  <strong>Date:</strong> {selectedReportForBalance?.rent_date}
                </div>
                <div>
                  <strong>Shift:</strong> {selectedReportForBalance?.shift}
                </div>
                <div>
                  <strong>Original Amount:</strong> ₹
                  {selectedReportForBalance?.rent_paid_amount?.toLocaleString()}
                </div>
                <div>
                  <strong>Original Type:</strong>
                  <span
                    className={`ml-1 px-2 py-1 rounded text-xs ${
                      selectedReportForBalance?.rent_paid_amount &&
                      selectedReportForBalance.rent_paid_amount < 0
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {selectedReportForBalance?.rent_paid_amount &&
                    selectedReportForBalance.rent_paid_amount < 0
                      ? "Refund"
                      : "Due"}
                  </span>
                </div>
              </div>
            </div>

            {/* Editable Amount Field */}
            <div className="space-y-2">
              <Label htmlFor="balance-amount">
                Amount <span className="text-red-500">*</span>
              </Label>
              <Input
                id="balance-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter amount"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                disabled={isBalanceSubmitting}
                className="w-full"
              />
            </div>

            {/* Editable Type Field */}
            <div className="space-y-2">
              <Label htmlFor="balance-type">
                Transaction Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={balanceType}
                onValueChange={(value: "due" | "refund") =>
                  setBalanceType(value)
                }
                disabled={isBalanceSubmitting}
              >
                <SelectTrigger id="balance-type" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="due">Due</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {balanceType === "due"
                  ? "Due: Amount owed by the driver"
                  : "Refund: Amount to be refunded to the driver"}
              </p>
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <Label htmlFor="balance-description">
                Description (Optional)
              </Label>
              <Textarea
                id="balance-description"
                placeholder="Enter a description for this transaction..."
                value={balanceDescription}
                onChange={(e) => setBalanceDescription(e.target.value)}
                rows={3}
                disabled={isBalanceSubmitting}
              />
              <p className="text-xs text-gray-500">
                If left empty, a default description will be generated
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsBalanceModalOpen(false);
                  setBalanceDescription("");
                  setBalanceAmount("");
                  setBalanceType("due");
                  setSelectedReportForBalance(null);
                }}
                disabled={isBalanceSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddToBalance}
                disabled={
                  isBalanceSubmitting ||
                  !balanceAmount ||
                  parseFloat(balanceAmount) <= 0
                }
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isBalanceSubmitting ? "Adding..." : "Add to Balance"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminReports;
