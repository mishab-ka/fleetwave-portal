import { useState, useEffect } from "react";
import {
  format,
  endOfWeek,
  startOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  isSameDay,
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  Search,
  Users,
  Clock,
  XCircle,
  DollarSign,
  TrendingUp,
  MapPin,
  Fuel,
  Receipt,
  Share2,
  Plus,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useAdmin } from "@/context/AdminContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type AuditStatus = "not_verified" | "pending" | "verified";

interface UberAudit {
  id: string;
  user_id: string;
  week_end_date: string;
  audit_status: AuditStatus;
  description: string;
  is_online: boolean;
  updated_at: string;
  user: {
    name: string;
    email_id: string;
    phone_number: string;
    joining_date: string;
    online: boolean;
  };
}

interface ReportSummary {
  total_reports: number;
  total_earnings: number;
  total_cashcollect: number;
  total_other_fee: number;
  total_toll: number;
  total_trips: number;
  average_earnings_per_day: number;
  reports: Array<{
    id: string;
    rent_date: string;
    total_earnings: number;
    total_cashcollect: number;
    other_fee: number;
    toll: number;
    total_trips: number;
    status: string;
    rent_paid_amount: number;
    deposit_cutting_amount: number;
    vehicle_number?: string;
  }>;
}

type PenaltyType =
  | "penalty"
  | "penalty_paid"
  | "bonus"
  | "refund"
  | "due"
  | "extra_collection";

interface PenaltyTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: PenaltyType;
  description?: string;
  created_at: string;
  created_by: string;
}

export function UberAuditManager() {
  const { logActivity } = useActivityLogger();
  const [audits, setAudits] = useState<UberAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(
    format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<AuditStatus[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<UberAudit | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempStatus, setTempStatus] = useState<AuditStatus>("not_verified");
  const [tempDescription, setTempDescription] = useState("");
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(
    null
  );
  const [loadingReports, setLoadingReports] = useState(false);
  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [userAccountDetails, setUserAccountDetails] = useState<any>(null);
  const [calendarData, setCalendarData] = useState<any[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [penaltyTransactions, setPenaltyTransactions] = useState<
    PenaltyTransaction[]
  >([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionType, setTransactionType] =
    useState<PenaltyType>("penalty");
  const [transactionDescription, setTransactionDescription] = useState("");
  const [currentDriverPenalties, setCurrentDriverPenalties] = useState(0);
  const [serviceDayAdjustments, setServiceDayAdjustments] = useState<any[]>([]);
  const [reportServiceDayAdjustments, setReportServiceDayAdjustments] =
    useState<any[]>([]);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You do not have admin privileges",
        variant: "destructive",
      });
      return;
    }
    fetchAudits();
  }, [selectedWeek, isAdmin, adminLoading]);

  const fetchAudits = async () => {
    if (!isAdmin) return;

    try {
      setLoading(true);
      console.log("Fetching audits for week:", selectedWeek);

      // Calculate week start and end dates
      const weekEndDate = new Date(selectedWeek);
      const weekStartDate = new Date(weekEndDate);
      weekStartDate.setDate(weekEndDate.getDate() - 6); // 7 days total (start to end)

      console.log(
        "Week range:",
        weekStartDate.toISOString().split("T")[0],
        "to",
        weekEndDate.toISOString().split("T")[0]
      );

      // Get drivers who submitted reports during this week
      const { data: reportsData, error: reportsError } = await supabase
        .from("fleet_reports")
        .select(
          `
          user_id,
          rent_date,
<<<<<<< Updated upstream
          users!fleet_reports_user_id_fkey!inner(
=======
          users!user_id!inner(
>>>>>>> Stashed changes
            id,
            name,
            email_id,
            phone_number,
            online,
            joining_date
          )
        `
        )
        // .eq(status, "approved")
        .gte("rent_date", weekStartDate.toISOString().split("T")[0])
        .lte("rent_date", weekEndDate.toISOString().split("T")[0]);

      if (reportsError) {
        console.error("Error fetching reports:", reportsError);
        throw reportsError;
      }

      if (!reportsData || reportsData.length === 0) {
        console.log("No reports found for this week");
        setAudits([]);
        return;
      }

      // Get unique users who submitted reports
      const uniqueUsers = new Map();
      reportsData.forEach((report) => {
        if (report.users && !uniqueUsers.has(report.user_id)) {
          uniqueUsers.set(report.user_id, report.users);
        }
      });

      const users = Array.from(uniqueUsers.values());
      console.log("Found users with reports:", users.length);

      // Get existing audits for the selected week
      const { data: existingAudits, error: auditsError } = await supabase
        .from("uber_weekly_audits")
        .select("*")
        .eq("week_end_date", selectedWeek);

      if (auditsError) {
        console.error("Error fetching existing audits:", auditsError);
        throw auditsError;
      }

      // Create a map of existing audits by user_id
      const auditMap = new Map(
        existingAudits?.map((audit) => [audit.user_id, audit]) || []
      );

      // Create audit records for drivers who submitted reports, using existing data if available
      const allAudits = users
        .filter((user) => user && user.id) // Filter out any invalid users
        .map((user) => {
          const existingAudit = auditMap.get(user.id);
          return {
            id: existingAudit?.id || null,
            user_id: user.id,
            week_end_date: selectedWeek,
            audit_status: existingAudit?.audit_status || "not_verified",
            description: existingAudit?.description || "",
            is_online: user.online || false,
            updated_at: existingAudit?.updated_at || "",
            user: {
              name: user.name || "Unknown",
              email_id: user.email_id || "No email",
              phone_number: user.phone_number || "No phone",
              joining_date: user.joining_date || "",
              online: user.online || false,
            },
          };
        });

      console.log("Processed audits:", allAudits);
      setAudits(allAudits);
    } catch (error) {
      console.error("Error in fetchAudits:", error);
      toast({
        title: "Error",
        description: "Failed to fetch audit records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAuditStatus = async (
    userId: string,
    status: AuditStatus,
    description: string
  ) => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "You do not have admin privileges",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the current user's ID
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to update audit status",
          variant: "destructive",
        });
        return;
      }

      // First, check if an audit record already exists for this user and week
      const { data: existingAudit, error: checkError } = await supabase
        .from("uber_weekly_audits")
        .select("id")
        .eq("user_id", userId)
        .eq("week_end_date", selectedWeek)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 is "no rows returned" error
        throw checkError;
      }

      if (existingAudit) {
        // Update existing audit
        const { error } = await supabase
          .from("uber_weekly_audits")
          .update({
            audit_status: status,
            description: description,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingAudit.id);

        if (error) throw error;
      } else {
        // Create new audit
        const { error } = await supabase.from("uber_weekly_audits").insert({
          user_id: userId,
          week_end_date: selectedWeek,
          audit_status: status,
          description: description,
          is_online: true,
          created_by: user.id,
        });

        if (error) {
          console.error("Error creating audit:", error);
          throw error;
        }
      }

      // Update local state
      setAudits(
        audits.map((audit) =>
          audit.user_id === userId
            ? { ...audit, audit_status: status, description: description }
            : audit
        )
      );

      toast({
        title: "Success",
        description: "Audit status updated successfully",
      });
    } catch (error) {
      console.error("Error updating audit status:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update audit status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: AuditStatus) => {
    const variants = {
      not_verified: {
        bg: "bg-red-50",
        text: "text-red-700",
        icon: <XCircle className="h-4 w-4 text-red-500" />,
      },
      pending: {
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        icon: <Clock className="h-4 w-4 text-yellow-500" />,
      },
      verified: {
        bg: "bg-green-50",
        text: "text-green-700",
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      },
    };

    const { bg, text, icon } = variants[status];

    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium",
          bg,
          text
        )}
      >
        {icon}
        {status
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")}
      </div>
    );
  };

  const getReportStatusBadge = (status: string) => {
    const variants = {
      approved: {
        bg: "bg-green-50",
        text: "text-green-700",
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        label: "A",
      },
      pending_verification: {
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        icon: <Clock className="h-4 w-4 text-yellow-500" />,
        label: "P",
      },
      rejected: {
        bg: "bg-red-50",
        text: "text-red-700",
        icon: <XCircle className="h-4 w-4 text-red-500" />,
        label: "R",
      },
      leave: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        icon: <Clock className="h-4 w-4 text-blue-500" />,
        label: "L",
      },
    };

    const variant =
      variants[status as keyof typeof variants] ||
      variants.pending_verification;
    const { bg, text, icon, label } = variant;

    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold",
          bg,
          text
        )}
      >
        {icon}
        {label}
      </div>
    );
  };

  const getCalendarStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending_verification":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "leave":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCalendarRowColor = (status: string, hasAdjustment?: boolean) => {
    // Only apply purple color if ANY adjustment exists AND status is approved
    if (hasAdjustment && (status === "approved" || status === "paid")) {
      return "bg-purple-400 hover:bg-purple-500 border-2 border-purple-600";
    }

    // Regular status colors (for all other cases, including pending/rejected with adjustment)
    switch (status) {
      case "approved":
      case "paid":
        return "bg-green-400 hover:bg-green-500";
      case "pending_verification":
        return "bg-yellow-400 hover:bg-yellow-500";
      case "rejected":
        return "bg-red-400 hover:bg-red-500";
      case "leave":
        return "bg-blue-400 hover:bg-blue-500";
      default:
        return "bg-gray-400 hover:bg-gray-500";
    }
  };

  const getCalendarStatusLabel = (status: string) => {
    switch (status) {
      case "approved":
        return "A";
      case "pending_verification":
        return "P";
      case "rejected":
        return "R";
      case "leave":
        return "L";
      default:
        return "N/A";
    }
  };

  const getStatusForDay = (date: Date) => {
    return calendarData.find(
      (data) => data.rent_date === format(date, "yyyy-MM-dd")
    );
  };

  const getFilteredAudits = () => {
    return audits.filter((audit) => {
      const matchesSearch =
        searchQuery === "" ||
        audit.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        audit.user.email_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        audit.user.phone_number.includes(searchQuery);

      const matchesStatus =
        statusFilter.length === 0 || statusFilter.includes(audit.audit_status);

      return matchesSearch && matchesStatus;
    });
  };

  const getSummary = () => {
    const summary = {
      total: audits.length,
      verified: 0,
      pending: 0,
      notVerified: 0,
    };

    audits.forEach((audit) => {
      switch (audit.audit_status) {
        case "verified":
          summary.verified++;
          break;
        case "pending":
          summary.pending++;
          break;
        case "not_verified":
          summary.notVerified++;
          break;
      }
    });

    return summary;
  };

  const filteredAudits = getFilteredAudits();
  const summary = getSummary();

  const navigateWeek = (direction: "next" | "prev") => {
    const currentDate = new Date(selectedWeek);
    const newDate =
      direction === "next"
        ? addWeeks(currentDate, 1)
        : subWeeks(currentDate, 1);
    setSelectedWeek(
      format(endOfWeek(newDate, { weekStartsOn: 1 }), "yyyy-MM-dd")
    );
  };

  const fetchReportSummary = async (userId: string) => {
    try {
      setLoadingReports(true);

      // Calculate week range
      const weekEndDate = new Date(selectedWeek);
      const weekStartDate = new Date(weekEndDate);
      weekStartDate.setDate(weekEndDate.getDate() - 6);

      const weekStartStr = weekStartDate.toISOString().split("T")[0];
      const weekEndStr = weekEndDate.toISOString().split("T")[0];

      // Fetch all reports for this user in the selected week
      const { data: reports, error } = await supabase
        .from("fleet_reports")
        .select(
          `
          id,
          rent_date,
          total_earnings,
          total_cashcollect,
          other_fee,
          toll,
          total_trips,
          status,
          rent_paid_amount,
          deposit_cutting_amount,
          vehicle_number
        `
        )
        .eq("user_id", userId)
        .not("status", "eq", "offline")
        .not("status", "eq", "leave")
        // .eq("status", "approved")
        // .eq("status", "rejected")
        .gte("rent_date", weekStartStr)
        .lte("rent_date", weekEndStr)
        .order("rent_date", { ascending: true });

      if (error) throw error;

      // Fetch all adjustments for this week (both approved and applied)
      const { data: adjustments, error: adjError } = await supabase
        .from("common_adjustments")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["approved", "applied"]) // Include both statuses
        .gte("adjustment_date", weekStartStr)
        .lte("adjustment_date", weekEndStr);

      if (adjError) {
        console.error("Error fetching adjustments:", adjError);
      }

      console.log(
        `UberAudit ReportSummary: Fetched ${
          adjustments?.length || 0
        } adjustments (approved or applied)`
      );
      setReportServiceDayAdjustments(adjustments || []);

      if (!reports || reports.length === 0) {
        setReportSummary({
          total_reports: 0,
          total_earnings: 0,
          total_cashcollect: 0,
          total_other_fee: 0,
          total_toll: 0,
          total_trips: 0,
          average_earnings_per_day: 0,
          reports: [],
        });
        return;
      }

      // Calculate totals
      const totals = reports.reduce(
        (acc, report) => ({
          total_earnings: acc.total_earnings + (report.total_earnings || 0),
          total_cashcollect:
            acc.total_cashcollect + (report.total_cashcollect || 0),
          total_other_fee: acc.total_other_fee + (report.other_fee || 0),
          total_toll: acc.total_toll + (report.toll || 0),
          total_trips: acc.total_trips + (report.total_trips || 0),
        }),
        {
          total_earnings: 0,
          total_cashcollect: 0,
          total_other_fee: 0,
          total_toll: 0,
          total_trips: 0,
        }
      );

      const summary: ReportSummary = {
        total_reports: reports.length,
        ...totals,
        average_earnings_per_day: totals.total_earnings / reports.length,
        reports: reports.map((report) => ({
          id: report.id,
          rent_date: report.rent_date,
          total_earnings: report.total_earnings || 0,
          total_cashcollect: report.total_cashcollect || 0,
          other_fee: report.other_fee || 0,
          toll: report.toll || 0,
          total_trips: report.total_trips || 0,
          status: report.status,
          rent_paid_amount: report.rent_paid_amount || 0,
          deposit_cutting_amount: report.deposit_cutting_amount || 0,
          vehicle_number: report.vehicle_number,
        })),
      };

      setReportSummary(summary);
    } catch (error) {
      console.error("Error fetching report summary:", error);
      toast({
        title: "Error",
        description: "Failed to fetch report summary",
        variant: "destructive",
      });
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchUserAccountDetails = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("name, phone_number, account_number, bank_name, ifsc_code")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setUserAccountDetails(data);
    } catch (error) {
      console.error("Error fetching user account details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch account details",
        variant: "destructive",
      });
    }
  };

  const handleShareAccountDetails = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("name, phone_number, account_number, bank_name, ifsc_code")
        .eq("id", userId)
        .single();

      if (error) throw error;

      if (data) {
        const message = `Refund Slip\nName: ${data.name}\nMobile Number: ${
          data.phone_number
        }\nAmount: [To be filled]\nBank Account Details:\nAccount Number: ${
          data.account_number || "Not provided"
        }\nBank Name: ${data.bank_name || "Not provided"}\nIFSC Code: ${
          data.ifsc_code || "Not provided"
        }`;

        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
      }
    } catch (error) {
      console.error("Error sharing account details:", error);
      toast({
        title: "Error",
        description: "Failed to share account details",
        variant: "destructive",
      });
    }
  };

  const fetchCalendarData = async (userId: string) => {
    try {
      setLoadingCalendar(true);

      // Calculate week range
      const weekEndDate = new Date(selectedWeek);
      const weekStartDate = new Date(weekEndDate);
      weekStartDate.setDate(weekEndDate.getDate() - 6);

      const weekStartStr = weekStartDate.toISOString().split("T")[0];
      const weekEndStr = weekEndDate.toISOString().split("T")[0];

      // Fetch reports for the week
      const { data: reports, error } = await supabase
        .from("fleet_reports")
        .select(
          `
          user_id,
          driver_name,
          vehicle_number,
          shift,
          rent_date,
          status,
          rent_paid_amount,
          total_earnings,
          total_trips,
          other_fee,
          toll
        `
        )
        .eq("user_id", userId)
        .gte("rent_date", weekStartStr)
        .lte("rent_date", weekEndStr)
        .order("rent_date", { ascending: true });

      if (error) throw error;

      // Fetch all adjustments for this week (both approved and applied)
      const { data: adjustments, error: adjError } = await supabase
        .from("common_adjustments")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["approved", "applied"]) // Include both statuses
        .gte("adjustment_date", weekStartStr)
        .lte("adjustment_date", weekEndStr);

      if (adjError) {
        console.error("Error fetching adjustments:", adjError);
      }

      console.log(
        `UberAudit: Fetched ${
          adjustments?.length || 0
        } adjustments for ${userId} (approved or applied)`
      );
      setServiceDayAdjustments(adjustments || []);

      // Add hasAdjustment flag to each report
      const reportsWithAdjustments = (reports || []).map((report) => {
        const hasAdjustment = (adjustments || []).some(
          (adj) => adj.adjustment_date === report.rent_date
        );
        if (hasAdjustment) {
          console.log(
            `UberAudit: Report has adjustment on ${report.rent_date}`
          );
        }
        return {
          ...report,
          hasServiceDayAdjustment: hasAdjustment, // Keep old name for compatibility
          hasAdjustment, // Add new flag too
        };
      });

      setCalendarData(reportsWithAdjustments);
    } catch (error) {
      console.error("Error fetching calendar data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch calendar data",
        variant: "destructive",
      });
    } finally {
      setLoadingCalendar(false);
    }
  };

  const fetchPenaltyTransactions = async (userId: string) => {
    try {
      setLoadingTransactions(true);

      // Fetch ALL penalty transactions for this driver (not limited to 10)
      const { data: allTransactions, error: allTxError } = await supabase
        .from("driver_penalty_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (allTxError) throw allTxError;

      // Calculate balance from all transactions (same logic as PenaltyManagement)
      let totalPenalties = 0;
      let totalPenaltyPaid = 0;
      let totalRefunds = 0;
      let totalBonuses = 0;

      (allTransactions || []).forEach((transaction) => {
        const amount = transaction.amount;

        switch (transaction.type) {
          case "penalty":
            totalPenalties += amount;
            break;
          case "penalty_paid":
            totalPenaltyPaid += amount;
            break;
          case "bonus":
            totalBonuses += amount;
            break;
          case "refund":
            totalRefunds += amount;
            break;
          case "due":
            totalPenalties += amount; // Due amounts are treated as penalties
            break;
          case "extra_collection":
            totalPenalties += amount; // Extra collection amounts are treated as penalties
            break;
        }
      });

      // Calculate net amount: totalCredits - totalPenalties
      const totalCredits = totalPenaltyPaid + totalRefunds + totalBonuses;
      const netAmount = totalCredits - totalPenalties;

      setCurrentDriverPenalties(netAmount);

      // Set last 10 transactions for display
      setPenaltyTransactions(allTransactions?.slice(0, 10) || []);
    } catch (error) {
      console.error("Error fetching penalty transactions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch penalty transactions",
        variant: "destructive",
      });
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleAddPenaltyTransaction = async () => {
    if (
      !selectedAudit ||
      !transactionAmount ||
      parseFloat(transactionAmount) <= 0
    ) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const numericAmount = parseFloat(transactionAmount);

      // Get the current user's ID
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;

      // Insert transaction
      const { error: txError } = await supabase
        .from("driver_penalty_transactions")
        .insert({
          user_id: selectedAudit.user_id,
          amount: numericAmount,
          type: transactionType,
          description: transactionDescription || undefined,
          created_by: user?.id,
        });

      if (txError) throw txError;

      toast({
        title: "Success",
        description: "Transaction added successfully",
      });

      // Reset form
      setTransactionAmount("");
      setTransactionDescription("");
      setTransactionType("penalty");
      setIsAddingTransaction(false);

      // Refresh transactions (this will recalculate the balance from all transactions)
      await fetchPenaltyTransactions(selectedAudit.user_id);
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast({
        title: "Error",
        description: "Failed to add transaction",
        variant: "destructive",
      });
    }
  };

  const handleVerifyClick = async (audit: UberAudit) => {
    setSelectedAudit(audit);
    setTempStatus(audit.audit_status);
    setTempDescription(audit.description);
    setIsModalOpen(true);

    // Reset transaction form
    setIsAddingTransaction(false);
    setTransactionAmount("");
    setTransactionDescription("");
    setTransactionType("penalty");

    // Fetch report summary for this driver
    await fetchReportSummary(audit.user_id);
    // Fetch user account details
    await fetchUserAccountDetails(audit.user_id);
    // Fetch calendar data
    await fetchCalendarData(audit.user_id);
    // Fetch penalty transactions
    await fetchPenaltyTransactions(audit.user_id);
  };

  const getTransactionIcon = (type: PenaltyType) => {
    switch (type) {
      case "penalty":
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      case "penalty_paid":
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case "bonus":
        return <TrendingUp className="h-3 w-3 text-blue-500" />;
      case "refund":
        return <DollarSign className="h-3 w-3 text-green-500" />;
      case "due":
        return <AlertCircle className="h-3 w-3 text-orange-500" />;
      case "extra_collection":
        return <DollarSign className="h-3 w-3 text-purple-500" />;
      default:
        return <AlertCircle className="h-3 w-3 text-gray-500" />;
    }
  };

  const getTransactionLabel = (type: PenaltyType) => {
    switch (type) {
      case "penalty":
        return "Penalty";
      case "penalty_paid":
        return "Penalty Paid";
      case "bonus":
        return "Bonus";
      case "refund":
        return "Refund";
      case "due":
        return "Due";
      case "extra_collection":
        return "Extra Collection";
      default:
        return type;
    }
  };

  const handleSubmit = async () => {
    if (!selectedAudit) return;

    // Check for pending or rejected reports
    if (reportSummary && reportSummary.reports) {
      const hasPendingOrRejected = reportSummary.reports.some((report) => {
        const status = report.status?.toLowerCase();
        return status === "pending_verification" || status === "rejected";
      });

      if (hasPendingOrRejected) {
        toast({
          title: "Cannot Submit Audit",
          description:
            "Please clear all pending or rejected reports before submitting the audit.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      await updateAuditStatus(
        selectedAudit.user_id,
        tempStatus,
        tempDescription
      );

      // Log activity
      const driverData = audits.find(
        (a) => a.user_id === selectedAudit.user_id
      );
      await logActivity({
        actionType: "submit_audit",
        actionCategory: "audit",
        description: `Submitted weekly audit for driver ${
          driverData?.user?.name || "Unknown"
        } - Week ending ${selectedWeek} - Status: ${tempStatus}`,
        metadata: {
          user_id: selectedAudit.user_id,
          driver_name: driverData?.user?.name,
          week_ending: selectedWeek,
          audit_status: tempStatus,
          description: tempDescription,
        },
        pageName: "Uber Audit Manager",
      });

      setIsModalOpen(false);
      setSelectedAudit(null);
    } catch (error) {
      console.error("Error updating audit:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg p-4 shadow-sm border">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">Drivers with Reports</h3>
          </div>
          <p className="text-2xl font-bold mt-2">{summary.total}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm border">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <h3 className="font-medium">Verified</h3>
          </div>
          <p className="text-2xl font-bold mt-2">{summary.verified}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm border">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            <h3 className="font-medium">Pending</h3>
          </div>
          <p className="text-2xl font-bold mt-2">{summary.pending}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm border">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <h3 className="font-medium">Not Verified</h3>
          </div>
          <p className="text-2xl font-bold mt-2">{summary.notVerified}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filter Status
                {statusFilter.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {statusFilter.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes("not_verified")}
                onCheckedChange={(checked) => {
                  setStatusFilter((prev) =>
                    checked
                      ? [...prev, "not_verified"]
                      : prev.filter((s) => s !== "not_verified")
                  );
                }}
              >
                Not Verified
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes("pending")}
                onCheckedChange={(checked) => {
                  setStatusFilter((prev) =>
                    checked
                      ? [...prev, "pending"]
                      : prev.filter((s) => s !== "pending")
                  );
                }}
              >
                Pending
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes("verified")}
                onCheckedChange={(checked) => {
                  setStatusFilter((prev) =>
                    checked
                      ? [...prev, "verified"]
                      : prev.filter((s) => s !== "verified")
                  );
                }}
              >
                Verified
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek("prev")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !selectedWeek && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedWeek
                  ? `${format(
                      startOfWeek(new Date(selectedWeek), {
                        weekStartsOn: 1,
                      }),
                      "MMM dd"
                    )} - ${format(
                      endOfWeek(new Date(selectedWeek), {
                        weekStartsOn: 1,
                      }),
                      "MMM dd"
                    )}`
                  : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={new Date(selectedWeek)}
                onSelect={(date) => {
                  if (date) {
                    setSelectedWeek(
                      format(endOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd")
                    );
                    setCalendarOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek("next")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredAudits.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <XCircle className="h-8 w-8 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No drivers found</p>
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? "Try adjusting your search or filters"
              : "No drivers submitted reports for this week"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-slate-50">
                  <TableHead className="py-4 font-semibold text-slate-900">
                    Driver Name
                  </TableHead>
                  <TableHead className="py-4 font-semibold text-slate-900">
                    Joining Date
                  </TableHead>
                  <TableHead className="py-4 font-semibold text-slate-900">
                    Phone
                  </TableHead>
                  <TableHead className="py-4 font-semibold text-slate-900">
                    Status
                  </TableHead>
                  <TableHead className="py-4 font-semibold text-slate-900">
                    Last Verified
                  </TableHead>
                  <TableHead className="py-4 font-semibold text-slate-900 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAudits.map((audit, index) => (
                  <TableRow
                    key={audit.user_id}
                    className={cn(
                      "border-b border-border transition-colors",
                      "hover:bg-slate-50/50",
                      index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    )}
                  >
                    <TableCell className="py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                          <span className="text-sm font-semibold text-slate-600">
                            {audit.user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {audit.user.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {audit.user.email_id}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {audit.user.joining_date
                            ? format(
                                new Date(audit.user.joining_date),
                                "MMM dd, yyyy"
                              )
                            : "Not available"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="text-sm text-slate-600">
                        {audit.user.phone_number}
                      </p>
                    </TableCell>
                    <TableCell className="py-3">
                      {getStatusBadge(audit.audit_status)}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {audit.updated_at
                            ? format(
                                new Date(audit.updated_at),
                                "MMM dd, yyyy HH:mm"
                              )
                            : "Never"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerifyClick(audit)}
                        className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:bg-slate-100"
                      >
                        <Check className="h-4 w-4" />
                        Verify
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Driver Audit & Report Summary</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Driver Information */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Driver Information
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium">{selectedAudit?.user.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{selectedAudit?.user.email_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">
                    {selectedAudit?.user.phone_number}
                  </p>
                </div>
              </div>
            </div>

            {/* Report Summary */}
            {loadingReports ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading report data...</span>
              </div>
            ) : reportSummary ? (
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Weekly Report Summary
                </Label>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Detailed Breakdown */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="h-4 w-4 text-gray-600" />
                        <h4 className="font-semibold">Financial Summary</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        {/* Weekly Rent: 700 * number of approved reports */}
                        <div className="flex justify-between">
                          <span>Weekly Rent (700 × approved reports)</span>
                          <span className="font-medium">
                            ₹
                            {(() => {
                              // Count only approved reports
                              const approvedReports =
                                reportSummary.reports.filter(
                                  (report) =>
                                    report.status?.toLowerCase() === "approved"
                                );
                              return approvedReports.length * 700;
                            })()}
                          </span>
                        </div>

                        {/* Deposit Cutting */}
                        <div className="flex justify-between">
                          <span>Deposit Cutting:</span>
                          <span className="font-medium">
                            ₹
                            {reportSummary.reports.reduce((acc, report) => {
                              const amount =
                                Number(report.deposit_cutting_amount) || 0;
                              return acc + (amount > 0 ? amount : 0);
                            }, 0)}
                          </span>
                        </div>

                        {/* Total Adjustments */}
                        <div className="flex justify-between">
                          <span>Total Adjustments:</span>
                          <span className="font-semibold text-purple-600">
                            ₹
                            {(() => {
                              // Sum of all adjustment amounts
                              return reportServiceDayAdjustments.reduce(
                                (sum, adj) => {
                                  return sum + Math.abs(adj.amount || 0);
                                },
                                0
                              );
                            })()}
                          </span>
                        </div>

                        {/* Final Pay: Weekly Rent + Deposit Cutting - Total Adjustments */}
                        <div className="flex justify-between border-t pt-2">
                          <span className="font-semibold">Final Pay:</span>
                          <span className="font-semibold text-blue-600">
                            ₹
                            {(() => {
                              // 1. Weekly Rent (700 * approved reports)
                              const approvedReports =
                                reportSummary.reports.filter(
                                  (report) =>
                                    report.status?.toLowerCase() === "approved"
                                );
                              const weeklyRent = approvedReports.length * 700;

                              // 2. Deposit Cutting
                              const depositCutting =
                                reportSummary.reports.reduce((acc, report) => {
                                  const amount =
                                    Number(report.deposit_cutting_amount) || 0;
                                  return acc + (amount > 0 ? amount : 0);
                                }, 0);

                              // 3. Total Adjustments
                              const totalAdjustments =
                                reportServiceDayAdjustments.reduce(
                                  (sum, adj) => {
                                    return sum + Math.abs(adj.amount || 0);
                                  },
                                  0
                                );

                              // Formula: Weekly Rent + Deposit Cutting - Total Adjustments
                              return (
                                weeklyRent + depositCutting - totalAdjustments
                              );
                            })()}
                          </span>
                        </div>

                        {/* Cash at Bank */}
                        <div className="flex justify-between">
                          <span>Cash at Bank:</span>
                          <span className="font-bold text-green-600">
                            ₹
                            {reportSummary.reports.reduce((acc, report) => {
                              const amount =
                                Number(report.rent_paid_amount) || 0;
                              return acc + (amount > 0 ? amount : 0);
                            }, 0)}
                          </span>
                        </div>

                        {/* Difference: Final Pay - Cash at Bank */}
                        <div className="flex justify-between border-t pt-2">
                          <span className="font-semibold">Difference:</span>
                          <span
                            className={`font-bold text-lg ${(() => {
                              // Calculate Final Pay
                              const approvedReports =
                                reportSummary.reports.filter(
                                  (report) =>
                                    report.status?.toLowerCase() === "approved"
                                );
                              const weeklyRent = approvedReports.length * 700;
                              const depositCutting =
                                reportSummary.reports.reduce((acc, report) => {
                                  const amount =
                                    Number(report.deposit_cutting_amount) || 0;
                                  return acc + (amount > 0 ? amount : 0);
                                }, 0);
                              const totalAdjustments =
                                reportServiceDayAdjustments.reduce(
                                  (sum, adj) => {
                                    return sum + Math.abs(adj.amount || 0);
                                  },
                                  0
                                );
                              const finalPay =
                                weeklyRent + depositCutting - totalAdjustments;

                              // Calculate Cash at Bank
                              const cashAtBank = reportSummary.reports.reduce(
                                (acc, report) => {
                                  const amount =
                                    Number(report.rent_paid_amount) || 0;
                                  return acc + (amount > 0 ? amount : 0);
                                },
                                0
                              );

                              // Calculate Difference
                              const difference = finalPay - cashAtBank;

                              // REVERSED: Negative (company owes) = RED, Positive (driver owes) = GREEN
                              return difference < 0
                                ? "text-red-600"
                                : difference > 0
                                ? "text-green-600"
                                : "text-gray-600";
                            })()}`}
                          >
                            {(() => {
                              // Calculate Final Pay
                              const approvedReports =
                                reportSummary.reports.filter(
                                  (report) =>
                                    report.status?.toLowerCase() === "approved"
                                );
                              const weeklyRent = approvedReports.length * 700;
                              const depositCutting =
                                reportSummary.reports.reduce((acc, report) => {
                                  const amount =
                                    Number(report.deposit_cutting_amount) || 0;
                                  return acc + (amount > 0 ? amount : 0);
                                }, 0);
                              const totalAdjustments =
                                reportServiceDayAdjustments.reduce(
                                  (sum, adj) => {
                                    return sum + Math.abs(adj.amount || 0);
                                  },
                                  0
                                );
                              const finalPay =
                                weeklyRent + depositCutting - totalAdjustments;

                              // Calculate Cash at Bank
                              const cashAtBank = reportSummary.reports.reduce(
                                (acc, report) => {
                                  const amount =
                                    Number(report.rent_paid_amount) || 0;
                                  return acc + (amount > 0 ? amount : 0);
                                },
                                0
                              );

                              // Calculate Difference
                              const difference = finalPay - cashAtBank;

                              // Format with sign
                              if (difference > 0) {
                                return `+₹${difference.toLocaleString()}`;
                              } else if (difference < 0) {
                                return `-₹${Math.abs(
                                  difference
                                ).toLocaleString()}`;
                              } else {
                                return "₹0";
                              }
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-4 w-4 text-gray-600" />
                      <h4 className="font-semibold">Performance Summary</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Distance:</span>
                        <span className="font-medium">
                          {reportSummary.total_distance.toLocaleString()} km
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Distance/Day:</span>
                        <span className="font-medium">
                          {Math.round(
                            reportSummary.total_distance /
                              reportSummary.total_reports
                          ).toLocaleString()}{" "}
                          km
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Trips/Day:</span>
                        <span className="font-medium">
                          {Math.round(
                            reportSummary.total_trips /
                              reportSummary.total_reports
                          )}
                        </span>
                      </div>
                    </div>
                  </div> */}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <Receipt className="h-4 w-4 text-blue-600" />
                          <p className="text-sm text-blue-600 font-medium">
                            Total WorkingDays
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">
                          {reportSummary.total_reports}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <p className="text-sm text-green-600 font-medium">
                            Total Earnings
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-green-900">
                          ₹{reportSummary.total_earnings.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="p-4 bg-purple-50 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-purple-600" />
                          <p className="text-sm text-purple-600 font-medium">
                            Total Trips
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-purple-900">
                          {reportSummary.total_trips}
                        </p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <CalendarIcon className="h-4 w-4 text-orange-600" />
                          <p className="text-sm text-orange-600 font-medium">
                            Avg/Day
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-orange-900">
                          ₹
                          {Math.round(
                            reportSummary.average_earnings_per_day
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Daily Reports Table */}
                {reportSummary.reports.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Daily Reports</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleShareAccountDetails(
                            selectedAudit?.user_id || ""
                          )
                        }
                        className="flex items-center gap-2"
                      >
                        <Share2 className="h-4 w-4" />
                        Share Account Details
                      </Button>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto  overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-3 py-2 text-left">Date</th>
                              <th className="px-3 py-2 text-right">Earnings</th>
                              <th className="px-3 py-2 text-right">
                                Cash Collected
                              </th>
                              <th className="px-3 py-2 text-right">Trips</th>
                              <th className="px-3 py-2 text-right">
                                Other Fee / Expenses
                              </th>
                              <th className="px-3 py-2 text-right">Status</th>
                              <th className="px-3 py-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportSummary.reports.map((report) => (
                              <tr key={report.id} className="border-t">
                                <td className="px-3 py-2">
                                  {new Date(
                                    report.rent_date
                                  ).toLocaleDateString()}
                                </td>
                                <td className="px-3 py-2 text-right font-medium">
                                  ₹{report.total_earnings}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  ₹{report.total_cashcollect}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {report.total_trips}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  ₹{report.other_fee}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {getReportStatusBadge(report.status)}
                                </td>
                                <td className="px-3 py-2 text-right font-medium">
                                  <span
                                    className={
                                      report.rent_paid_amount < 0
                                        ? "text-red-600"
                                        : "text-green-600"
                                    }
                                  >
                                    ₹{report.rent_paid_amount}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No report data available for this week</p>
              </div>
            )}

            {/* Weekly Calendar Grid */}
            {loadingCalendar ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2 text-sm">Loading calendar...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Weekly Calendar View
                </Label>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto ">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">
                            Mon
                          </th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">
                            Tue
                          </th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">
                            Wed
                          </th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">
                            Thu
                          </th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">
                            Fri
                          </th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">
                            Sat
                          </th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">
                            Sun
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {Array.from({ length: 7 }, (_, i) => {
                            const weekStart = startOfWeek(
                              new Date(selectedWeek),
                              { weekStartsOn: 1 }
                            );
                            const day = addDays(weekStart, i);
                            const dayData = getStatusForDay(day);
                            const isToday = isSameDay(day, new Date());
                            const rowColor = dayData
                              ? getCalendarRowColor(
                                  dayData.status,
                                  dayData.hasAdjustment ||
                                    dayData.hasServiceDayAdjustment
                                )
                              : "bg-gray-50 hover:bg-gray-100";

                            return (
                              <td
                                key={i}
                                className={cn(
                                  "p-2 text-center border-r last:border-r-0 transition-colors",
                                  rowColor,
                                  isToday && "ring-2 ring-blue-400"
                                )}
                              >
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-gray-600">
                                    {format(day, "d")}
                                  </div>
                                  {dayData ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="space-y-1">
                                            {/* <div
                                              className={cn(
                                                "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold cursor-pointer",
                                                getCalendarStatusColor(
                                                  dayData.status
                                                )
                                              )}
                                            >
                                              {getCalendarStatusLabel(
                                                dayData.status
                                              )}
                                            </div> */}
                                            {dayData.rent_paid_amount !==
                                              undefined && (
                                              <div className="text-xs">
                                                <span className="font-bold">
                                                  ₹{dayData.rent_paid_amount}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <div className="space-y-1">
                                            <div className="font-bold">
                                              {format(day, "MMM dd, yyyy")}
                                            </div>
                                            <div>
                                              Status:{" "}
                                              {getCalendarStatusLabel(
                                                dayData.status
                                              )}
                                            </div>
                                            {dayData.rent_paid_amount !==
                                              undefined && (
                                              <div>
                                                Amount: ₹
                                                {dayData.rent_paid_amount.toLocaleString()}
                                              </div>
                                            )}
                                            {dayData.total_earnings && (
                                              <div>
                                                Earnings: ₹
                                                {dayData.total_earnings.toLocaleString()}
                                              </div>
                                            )}
                                            {dayData.total_trips && (
                                              <div>
                                                Trips: {dayData.total_trips}
                                              </div>
                                            )}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                                      -
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Penalties & Refunds Section */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  Penalties & Refunds
                </Label>
                {loadingTransactions && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
              </div>

              {/* Current Balance Display */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Current Balance</p>
                    <p
                      className={`text-2xl font-bold ${
                        currentDriverPenalties < 0
                          ? "text-red-600"
                          : currentDriverPenalties > 0
                          ? "text-green-600"
                          : "text-gray-600"
                      }`}
                    >
                      {currentDriverPenalties < 0
                        ? `-₹${Math.abs(
                            currentDriverPenalties
                          ).toLocaleString()}`
                        : `₹${currentDriverPenalties.toLocaleString()}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {currentDriverPenalties < 0
                        ? "Driver owes penalties"
                        : currentDriverPenalties > 0
                        ? "Refund balance"
                        : "No balance"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingTransaction(!isAddingTransaction)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Transaction
                  </Button>
                </div>
              </div>

              {/* Add Transaction Form */}
              {isAddingTransaction && (
                <div className="p-4 border rounded-lg space-y-3 bg-white">
                  <h4 className="font-medium text-sm">New Transaction</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="transaction-amount" className="text-xs">
                        Amount
                      </Label>
                      <Input
                        id="transaction-amount"
                        type="number"
                        placeholder="Enter amount"
                        value={transactionAmount}
                        onChange={(e) => setTransactionAmount(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="transaction-type" className="text-xs">
                        Type
                      </Label>
                      <Select
                        value={transactionType}
                        onValueChange={(value) =>
                          setTransactionType(value as PenaltyType)
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="penalty">Penalty</SelectItem>
                          <SelectItem value="penalty_paid">
                            Penalty Paid
                          </SelectItem>
                          <SelectItem value="bonus">Bonus</SelectItem>
                          <SelectItem value="refund">Refund</SelectItem>
                          <SelectItem value="due">Due</SelectItem>
                          <SelectItem value="extra_collection">
                            Extra Collection
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="transaction-description"
                      className="text-xs"
                    >
                      Description (Optional)
                    </Label>
                    <Input
                      id="transaction-description"
                      placeholder="Enter description"
                      value={transactionDescription}
                      onChange={(e) =>
                        setTransactionDescription(e.target.value)
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsAddingTransaction(false);
                        setTransactionAmount("");
                        setTransactionDescription("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddPenaltyTransaction}
                      className="bg-fleet-purple hover:bg-purple-700"
                    >
                      Add Transaction
                    </Button>
                  </div>
                </div>
              )}

              {/* Weekly Audit / Refund Buttons */}
              {(() => {
                // Check if reportSummary exists
                if (!reportSummary || !reportSummary.reports) {
                  return null;
                }

                // Calculate working days and total trips
                const approvedReports = reportSummary.reports.filter(
                  (report) => report.status?.toLowerCase() === "approved"
                );
                const workingDays = approvedReports.length;
                const totalTrips = approvedReports.reduce(
                  (sum, report) => sum + (Number(report.total_trips) || 0),
                  0
                );
                const requiredTrips = workingDays * 10;
                const tripsShortfall = requiredTrips - totalTrips;

                // Find reports with less than 10 trips (for display)
                const incompleteDays = approvedReports.filter((report) => {
                  const trips = Number(report.total_trips) || 0;
                  return trips < 10;
                });

                // Case 1: Trips less than required - Show Weekly Audit (Refund + Penalty)
                if (totalTrips < requiredTrips && workingDays > 0) {
                  const penaltyAmount = workingDays * 100;
                  const refundAmount = workingDays * 100; // Same as penalty amount

                  return (
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            <span className="text-sm font-semibold text-orange-900">
                              Weekly Audit - Trips Shortfall
                            </span>
                          </div>
                          <div className="text-xs text-orange-700 space-y-1 mb-2">
                            <div className="flex justify-between">
                              <span>Working Days:</span>
                              <span className="font-medium">
                                {workingDays} days
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Required Trips:</span>
                              <span className="font-medium">
                                {requiredTrips} trips
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Completed Trips:</span>
                              <span className="font-medium">
                                {totalTrips} trips
                              </span>
                            </div>
                            <div className="flex justify-between border-t border-orange-300 pt-1">
                              <span className="font-semibold">Shortfall:</span>
                              <span className="font-semibold text-red-600">
                                {tripsShortfall} trips
                              </span>
                            </div>
                          </div>
                          {incompleteDays.length > 0 && (
                            <div className="text-xs text-orange-600 space-y-1 mb-2">
                              <p className="font-medium">
                                {incompleteDays.length} day(s) with &lt;10
                                trips:
                              </p>
                              {incompleteDays.slice(0, 3).map((report) => (
                                <div
                                  key={report.id}
                                  className="flex justify-between"
                                >
                                  <span>
                                    {format(
                                      new Date(report.rent_date),
                                      "MMM dd"
                                    )}
                                  </span>
                                  <span className="font-medium">
                                    {report.total_trips} trips
                                  </span>
                                </div>
                              ))}
                              {incompleteDays.length > 3 && (
                                <div className="text-orange-500 italic">
                                  +{incompleteDays.length - 3} more day(s)
                                </div>
                              )}
                            </div>
                          )}
                          <div className="border-t border-orange-300 pt-2 mt-2 text-xs text-orange-800">
                            <p className="font-semibold mb-1">
                              Transactions to be added:
                            </p>
                            <div className="flex justify-between">
                              <span>• Refund to Driver:</span>
                              <span className="text-green-600 font-medium">
                                +₹{refundAmount}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>• Penalty from Driver:</span>
                              <span className="text-red-600 font-medium">
                                -₹{penaltyAmount}
                              </span>
                            </div>
                            <div className="flex justify-between border-t border-orange-300 pt-1 mt-1">
                              <span className="font-semibold">
                                Net to Driver:
                              </span>
                              <span
                                className={`font-semibold ${
                                  refundAmount - penaltyAmount > 0
                                    ? "text-green-600"
                                    : refundAmount - penaltyAmount < 0
                                    ? "text-red-600"
                                    : "text-gray-600"
                                }`}
                              >
                                {refundAmount - penaltyAmount > 0 ? "+" : ""}₹
                                {refundAmount - penaltyAmount}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="default"
                          className="shrink-0 bg-orange-600 hover:bg-orange-700"
                          onClick={async () => {
                            if (!selectedAudit) return;

                            try {
                              // Get current user
                              const {
                                data: { user },
                                error: userError,
                              } = await supabase.auth.getUser();
                              if (userError || !user) {
                                toast({
                                  title: "Error",
                                  description: "Failed to get user information",
                                  variant: "destructive",
                                });
                                return;
                              }

                              // Calculate week range
                              const weekEndDate = new Date(selectedWeek);
                              const weekStartDate = new Date(weekEndDate);
                              weekStartDate.setDate(weekEndDate.getDate() - 6);
                              const weekStartStr = weekStartDate
                                .toISOString()
                                .split("T")[0];
                              const weekEndStr = weekEndDate
                                .toISOString()
                                .split("T")[0];
                              const weekRangeStr = `${format(
                                weekStartDate,
                                "dd MMM"
                              )} - ${format(weekEndDate, "dd MMM yyyy")}`;

                              // 1. Add REFUND transaction
                              const { data: refundTx, error: refundError } =
                                await supabase
                                  .from("driver_penalty_transactions")
                                  .insert({
                                    user_id: selectedAudit.user_id,
                                    amount: refundAmount,
                                    type: "refund",
                                    description: `Weekly Audit - Refund (${weekRangeStr}, ${totalTrips} trips completed, ${workingDays} working days)`,
                                    created_by: user.id,
                                  })
                                  .select("id")
                                  .single();

                              if (refundError) throw refundError;

                              const refundTxId = refundTx?.id;

                              // 2. Add PENALTY transaction
                              const { data: penaltyTx, error: penaltyError } =
                                await supabase
                                  .from("driver_penalty_transactions")
                                  .insert({
                                    user_id: selectedAudit.user_id,
                                    amount: penaltyAmount,
                                    type: "penalty",
                                    description: `Weekly Audit - Missing Trips Completed (${weekRangeStr}, ${workingDays} working days, ${totalTrips}/${requiredTrips} trips)`,
                                    created_by: user.id,
                                  })
                                  .select("id")
                                  .single();

                              if (penaltyError) throw penaltyError;

                              const penaltyTxId = penaltyTx?.id;

                              // 3. Get all approved reports for this week with vehicle numbers
                              const { data: reports, error: reportsError } =
                                await supabase
                                  .from("fleet_reports")
                                  .select("vehicle_number, rent_date")
                                  .eq("user_id", selectedAudit.user_id)
                                  .eq("status", "approved")
                                  .gte("rent_date", weekStartStr)
                                  .lte("rent_date", weekEndStr);

                              if (reportsError) throw reportsError;

                              if (!reports || reports.length === 0) {
                                console.log(
                                  "No approved reports found for transaction distribution"
                                );
                                toast({
                                  title: "Transactions Added to R/F",
                                  description:
                                    "Refund and penalty added but not distributed to vehicles (no approved reports)",
                                });
                                await fetchPenaltyTransactions(
                                  selectedAudit.user_id
                                );
                                return;
                              }

                              // 4. Count days per vehicle
                              const vehicleDaysMap = new Map<string, number>();
                              reports.forEach((report) => {
                                if (report.vehicle_number) {
                                  const currentCount =
                                    vehicleDaysMap.get(report.vehicle_number) ||
                                    0;
                                  vehicleDaysMap.set(
                                    report.vehicle_number,
                                    currentCount + 1
                                  );
                                }
                              });

                              const totalDays = Array.from(
                                vehicleDaysMap.values()
                              ).reduce((sum, days) => sum + days, 0);

                              if (totalDays === 0) {
                                console.log(
                                  "Total days is 0, cannot distribute transactions"
                                );
                                toast({
                                  title: "Transactions Added to R/F",
                                  description:
                                    "Refund and penalty added but not distributed to vehicles",
                                });
                                await fetchPenaltyTransactions(
                                  selectedAudit.user_id
                                );
                                return;
                              }

                              // 5. Get driver name
                              const driverName = selectedAudit.user.name;

                              // 6. Distribute ONLY penalty to vehicle_transactions (Penalty Income only, no refund expense)
                              const transactionsToInsert: any[] = [];

                              // Add penalty transactions (income for vehicles - they receive from driver)
                              Array.from(vehicleDaysMap.entries()).forEach(
                                ([vehicleNumber, days]) => {
                                  const proportionalPenalty =
                                    (days / totalDays) * penaltyAmount;
                                  const roundedPenalty =
                                    Math.round(proportionalPenalty * 100) / 100;

                                  transactionsToInsert.push({
                                    vehicle_number: vehicleNumber,
                                    transaction_type: "income",
                                    amount: roundedPenalty,
                                    description: `Driver Penalty: ${driverName} - Missing Trips Penalty (${days} day${
                                      days > 1 ? "s" : ""
                                    }) [PENALTY_TX_ID:${penaltyTxId}]`,
                                    transaction_date: weekStartStr,
                                    created_by: user.id,
                                  });
                                }
                              );

                              const { error: vehicleTxError } = await supabase
                                .from("vehicle_transactions")
                                .insert(transactionsToInsert);

                              if (vehicleTxError) {
                                console.error(
                                  "Error creating vehicle transactions:",
                                  vehicleTxError
                                );
                                throw vehicleTxError;
                              }

                              // Success!
                              const netAmount = refundAmount - penaltyAmount;
                              toast({
                                title: "Weekly Audit Completed",
                                description: `R/F: Refund +₹${refundAmount}, Penalty -₹${penaltyAmount} (Net: ₹${netAmount}). Penalty distributed to vehicles.`,
                              });

                              // Refresh penalty transactions to update balance
                              await fetchPenaltyTransactions(
                                selectedAudit.user_id
                              );
                            } catch (error) {
                              console.error("Error adding penalty:", error);
                              toast({
                                title: "Error",
                                description: "Failed to add penalty",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <div className="text-center leading-tight">
                            <div className="flex items-center gap-1 justify-center mb-1">
                              <AlertCircle className="h-3 w-3" />
                              <span className="text-xs font-semibold">
                                Process Weekly Audit
                              </span>
                            </div>
                            <div className="text-[10px] space-y-0.5">
                              <div className="text-green-200">
                                Refund: +₹{refundAmount}
                              </div>
                              <div className="text-red-200">
                                Penalty: -₹{penaltyAmount}
                              </div>
                            </div>
                          </div>
                        </Button>
                      </div>
                    </div>
                  );
                }

                // Case 2: Trips >= required - Show Refund Only Button
                if (totalTrips >= requiredTrips && workingDays > 0) {
                  const refundAmount = workingDays * 100;

                  return (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-semibold text-green-900">
                              Target Achieved - Refund Available
                            </span>
                          </div>
                          <div className="text-xs text-green-700 space-y-1 mb-2">
                            <div className="flex justify-between">
                              <span>Working Days:</span>
                              <span className="font-medium">
                                {workingDays} days
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Required Trips:</span>
                              <span className="font-medium">
                                {requiredTrips} trips
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Completed Trips:</span>
                              <span className="font-medium text-green-600">
                                {totalTrips} trips
                              </span>
                            </div>
                            <div className="flex justify-between border-t border-green-300 pt-1">
                              <span className="font-semibold">Excess:</span>
                              <span className="font-semibold text-green-600">
                                +{totalTrips - requiredTrips} trips
                              </span>
                            </div>
                          </div>
                          <div className="border-t border-green-300 pt-2 mt-2 text-xs text-green-800">
                            <p className="font-semibold mb-1">
                              Refund to be added:
                            </p>
                            <div className="flex justify-between">
                              <span>• Refund Amount:</span>
                              <span className="text-green-600 font-medium">
                                +₹{refundAmount}
                              </span>
                            </div>
                            <p className="text-[10px] text-green-600 mt-1">
                              (₹100 × {workingDays} working days)
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="default"
                          className="shrink-0 bg-green-600 hover:bg-green-700"
                          onClick={async () => {
                            if (!selectedAudit) return;

                            try {
                              // Get current user
                              const {
                                data: { user },
                                error: userError,
                              } = await supabase.auth.getUser();
                              if (userError || !user) {
                                toast({
                                  title: "Error",
                                  description: "Failed to get user information",
                                  variant: "destructive",
                                });
                                return;
                              }

                              // Calculate week range
                              const weekEndDate = new Date(selectedWeek);
                              const weekStartDate = new Date(weekEndDate);
                              weekStartDate.setDate(weekEndDate.getDate() - 6);
                              const weekStartStr = weekStartDate
                                .toISOString()
                                .split("T")[0];
                              const weekEndStr = weekEndDate
                                .toISOString()
                                .split("T")[0];
                              const weekRangeStr = `${format(
                                weekStartDate,
                                "dd MMM"
                              )} - ${format(weekEndDate, "dd MMM yyyy")}`;

                              // Add REFUND transaction only (no penalty for completed target)
                              const { data: refundTx, error: refundError } =
                                await supabase
                                  .from("driver_penalty_transactions")
                                  .insert({
                                    user_id: selectedAudit.user_id,
                                    amount: refundAmount,
                                    type: "refund",
                                    description: `Target Achieved - Refund (${weekRangeStr}, ${totalTrips} trips completed, ${workingDays} working days, ${
                                      totalTrips - requiredTrips
                                    } excess trips)`,
                                    created_by: user.id,
                                  })
                                  .select("id")
                                  .single();

                              if (refundError) throw refundError;

                              // Success! (No vehicle transactions for target achievement refund)
                              toast({
                                title: "Refund Added",
                                description: `₹${refundAmount} refund added for target achievement`,
                              });

                              // Refresh penalty transactions to update balance
                              await fetchPenaltyTransactions(
                                selectedAudit.user_id
                              );
                            } catch (error) {
                              console.error("Error adding refund:", error);
                              toast({
                                title: "Error",
                                description: "Failed to add refund",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <div className="text-center leading-tight">
                            <div className="flex items-center gap-1 justify-center mb-1">
                              <Gift className="h-3 w-3" />
                              <span className="text-xs font-semibold">
                                Add Refund
                              </span>
                            </div>
                            <div className="text-[10px]">₹{refundAmount}</div>
                          </div>
                        </Button>
                      </div>
                    </div>
                  );
                }

                return null;
              })()}

              {/* Transaction History */}
              {penaltyTransactions.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Recent Transactions
                  </Label>
                  <ScrollArea className="h-[200px] border rounded-lg">
                    <div className="p-2 space-y-2">
                      {penaltyTransactions.map((transaction) => {
                        const isPositive = [
                          "bonus",
                          "penalty_paid",
                          "refund",
                        ].includes(transaction.type);
                        return (
                          <div
                            key={transaction.id}
                            className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-start gap-2 flex-1">
                              {getTransactionIcon(transaction.type)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                      transaction.type === "penalty"
                                        ? "bg-red-100 text-red-800"
                                        : transaction.type === "penalty_paid"
                                        ? "bg-green-100 text-green-800"
                                        : transaction.type === "bonus"
                                        ? "bg-blue-100 text-blue-800"
                                        : transaction.type === "refund"
                                        ? "bg-green-100 text-green-800"
                                        : transaction.type === "due"
                                        ? "bg-orange-100 text-orange-800"
                                        : "bg-purple-100 text-purple-800"
                                    }`}
                                  >
                                    {getTransactionLabel(transaction.type)}
                                  </span>
                                  <span
                                    className={`text-sm font-semibold ${
                                      isPositive
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {isPositive ? "+" : "-"}₹
                                    {transaction.amount.toLocaleString()}
                                  </span>
                                </div>
                                {transaction.description && (
                                  <p className="text-xs text-gray-600 mt-1 truncate">
                                    {transaction.description}
                                  </p>
                                )}
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(
                                    transaction.created_at
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>

            {/* Audit Controls */}
            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <Label>Audit Status</Label>
                <Select
                  value={tempStatus}
                  onValueChange={(value: AuditStatus) => setTempStatus(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_verified">Not Verified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Audit Notes</Label>
                <Textarea
                  value={tempDescription}
                  onChange={(e) => setTempDescription(e.target.value)}
                  placeholder="Add notes about the audit..."
                  className="h-24"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Submit Audit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
