import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCheck } from "lucide-react";
import { useActivityLogger } from "@/hooks/useActivityLogger";

// Supabase configuration
const SUPABASE_URL = "https://upnhxshwzpbcfmumclwz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwbmh4c2h3enBiY2ZtdW1jbHd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzOTAyMzgsImV4cCI6MjA1Nzk2NjIzOH0.hVFRmd9UtrVPuufJawg6aJGcVQoxSVzKsBrz3_4lkCc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  CheckCircle,
  XCircle,
  Car,
  IndianRupee,
  Users,
  Filter,
  Search,
  WifiOff,
  Wifi,
  Download,
  AlertTriangle,
  AlertCircle,
  Key,
  ChevronDown,
  ChevronUp,
  X,
  Calendar as CalendarIcon,
  Save,
  Trash2,
  Copy,
  Check,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { DriverDetailsModal } from "@/components/admin/drivers/DriverDetailsModal";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  processReportData,
  determineOverdueStatus,
} from "@/components/admin/calendar/CalendarUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";

type DriverPenaltySummary = {
  netPenalties: number;
  totalPenalties: number;
  totalPenaltyPaid: number;
  totalRefunds: number;
  totalBonuses: number;
};

const AdminDrivers = () => {
  const { logActivity } = useActivityLogger();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [shiftFilter, setShiftFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showLowDeposit, setShowLowDeposit] = useState(false);
  const [showNegativeBalance, setShowNegativeBalance] = useState(false);
  const [showBelow7RentalDays, setShowBelow7RentalDays] = useState(false);
  const [show14AndAboveRentalDays, setShow14AndAboveRentalDays] = useState(false);

  // Advanced filter states
  const [advancedFilters, setAdvancedFilters] = useState({
    // Date filters
    joiningDateFrom: null as Date | null,
    joiningDateTo: null as Date | null,

    // Deposit range
    depositMin: "" as string,
    depositMax: "" as string,

    // R&F Balance range
    rAndFBalanceMin: "" as string,
    rAndFBalanceMax: "" as string,

    // Driver category
    driverCategory: "all" as string,

    // Driver status
    driverStatus: "all" as string, // online, offline, leave, resigning, going_to_24hr, all

    // Document status
    documentStatus: "all" as string, // complete, incomplete, all

    // Total trips range
    totalTripsMin: "" as string,
    totalTripsMax: "" as string,

    // Vehicle assignment
    vehicleAssignment: "all" as string, // assigned, unassigned, all

    // Resigning date
    resigningDateFrom: null as Date | null,
    resigningDateTo: null as Date | null,
  });
  const [rentalDays, setRentalDays] = useState<any>(null);
  const [showOverdueWarning, setShowOverdueWarning] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);
  const [overdueDriverName, setOverdueDriverName] = useState("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [canPutDriverOnline, setCanPutDriverOnline] = useState<boolean>(false);
  const [showDocumentWarning, setShowDocumentWarning] = useState(false);
  const [documentWarningDriver, setDocumentWarningDriver] = useState<any>(null);
  const [penaltySummaries, setPenaltySummaries] = useState<
    Record<string, DriverPenaltySummary>
  >({});
  const [penaltySummariesLoading, setPenaltySummariesLoading] =
    useState<boolean>(false);
  const [copiedDriverId, setCopiedDriverId] = useState<string | null>(null);

  // Password reset modal state
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [selectedDriverForReset, setSelectedDriverForReset] =
    useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Leave/Resigning modal state
  const [showLeaveResigningModal, setShowLeaveResigningModal] = useState(false);
  const [selectedDriverForStatus, setSelectedDriverForStatus] =
    useState<any>(null);

  // Resignation reason modal state
  const [showResignationReasonModal, setShowResignationReasonModal] =
    useState(false);
  const [resignationReason, setResignationReason] = useState("");

  // Leave return date modal state
  const [showLeaveReturnDateModal, setShowLeaveReturnDateModal] =
    useState(false);
  const [leaveReturnDate, setLeaveReturnDate] = useState<Date | null>(null);

  // Offline reason modal state
  const [showOfflineReasonModal, setShowOfflineReasonModal] = useState(false);
  const [offlineReason, setOfflineReason] = useState("");

  // Joining type modal state
  const [showJoiningTypeModal, setShowJoiningTypeModal] = useState(false);
  const [selectedDriverForJoining, setSelectedDriverForJoining] =
    useState<any>(null);
  const [joiningType, setJoiningType] = useState<"new_joining" | "rejoining" | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Statistics state
  const [statistics, setStatistics] = useState({
    total: 0,
    online: 0,
    offline: 0,
    totalDeposit: 0,
    totalNegBalance: 0,
    totalPenalties: 0,
    totalRefunds: 0,
    totalNetBalance: 0,
    totalLeave: 0,
    totalResigning: 0,
  });

  const isMobile = useIsMobile();
  const { user } = useAuth();

  useEffect(() => {
    checkAdminStatus();
    fetchStatistics();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setCanPutDriverOnline(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setIsAdmin(data?.role === "admin" || data?.role === "super_admin");
      setCanPutDriverOnline(
        data?.role === "admin" ||
          data?.role === "super_admin" ||
          data?.role === "manager"
      );
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
      setCanPutDriverOnline(false);
    }
  };

  const checkAllDocumentsUploaded = (
    driver: any
  ): { allUploaded: boolean; missing: string[] } => {
    const requiredDocuments = [
      { key: "license_front", name: "License Front" },
      { key: "license_back", name: "License Back" },
      { key: "aadhar_front", name: "Aadhar Front" },
      { key: "aadhar_back", name: "Aadhar Back" },
      { key: "pan_front", name: "PAN Front" },
      { key: "pan_back", name: "PAN Back" },
    ];

    const missing: string[] = [];

    requiredDocuments.forEach((doc) => {
      if (!driver || !driver[doc.key]) {
        missing.push(doc.name);
      }
    });

    return {
      allUploaded: missing.length === 0,
      missing,
    };
  };

  const fetchOverdueData = async (driver) => {
    try {
      const { data, error } = await supabase
        .from("fleet_reports")
        .select("*")
        .eq("user_id", driver.id)
        .eq("status", "approved");
      // console.log(driver.driver_id);

      console.log(data);
      // .eq("type", "due")
      // .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculate overdue amounts
      const today = new Date();
      const rentaldays = data.length;
      setRentalDays(rentaldays);
    } catch (error) {
      console.error("Error fetching overdue data:", error);
    }
  };

  const getDriverOverdueCount = async (driver: any): Promise<number> => {
    if (!driver) return 0;

    try {
      const today = new Date();

      // Determine start date: last 30 days or from joining date, whichever is later
      const baseStart = new Date();
      baseStart.setDate(baseStart.getDate() - 30);

      const joiningDate = driver.joining_date
        ? new Date(driver.joining_date)
        : null;

      let startDate = baseStart;
      if (joiningDate && joiningDate > startDate) {
        startDate = new Date(
          joiningDate.getFullYear(),
          joiningDate.getMonth(),
          joiningDate.getDate()
        );
      }

      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = today.toISOString().split("T")[0];

      const { data: reports, error } = await supabase
        .from("fleet_reports")
        .select(
          "id, user_id, driver_name, vehicle_number, submission_date, rent_date, shift, rent_paid_status, rent_paid_amount, status, remarks, created_at"
        )
        .eq("user_id", driver.id)
        .gte("rent_date", startDateStr)
        .lte("rent_date", endDateStr);

      if (error) throw error;

      // Build a map of reports by date (yyyy-MM-dd)
      const reportsByDate: Record<string, any[]> = {};
      (reports || []).forEach((report: any) => {
        if (!report.rent_date) return;
        const dateStr = report.rent_date;
        if (!reportsByDate[dateStr]) {
          reportsByDate[dateStr] = [];
        }
        // Attach minimal users info expected by calendar utils
        reportsByDate[dateStr].push({
          ...report,
          users: {
            joining_date: driver.joining_date,
            online: driver.online,
            offline_from_date: driver.offline_from_date,
            online_from_date: driver.online_from_date,
          },
        });
      });

      let overdueCount = 0;
      const cursor = new Date(startDate);

      // Iterate each day in the range and apply same logic as calendar:
      while (cursor <= today) {
        const dateStr = cursor.toISOString().split("T")[0];
        const dayReports = reportsByDate[dateStr];

        if (dayReports && dayReports.length > 0) {
          dayReports.forEach((report) => {
            const processed = processReportData(report);
            if (processed.status === "overdue") {
              overdueCount += 1;
            }
          });
        } else {
          // No report for this date – use calendar overdue rules for empty days
          const status = determineOverdueStatus(
            dateStr,
            driver.shift || "none",
            driver.joining_date || undefined,
            driver.online,
            driver.offline_from_date || undefined,
            driver.online_from_date || undefined
          );
          if (status === "overdue") {
            overdueCount += 1;
          }
        }

        cursor.setDate(cursor.getDate() + 1);
      }

      return overdueCount;
    } catch (error) {
      console.error("Error checking overdue count:", error);
      return 0;
    }
  };

  useEffect(() => {
    fetchDrivers();
    fetchStatistics();
  }, [
    currentPage,
    showOnlineOnly,
    searchQuery,
    shiftFilter,
    verificationFilter,
    showLowDeposit,
    showNegativeBalance,
    showBelow7RentalDays,
    show14AndAboveRentalDays,
    advancedFilters,
  ]);

  // Debounce search query to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchDrivers();
        fetchStatistics();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchRentalDaysByDriver = async (
    driverIds: string[]
  ): Promise<Record<string, number>> => {
    if (!driverIds.length) return {};
    try {
      const { data, error } = await supabase
        .from("fleet_reports")
        .select("user_id")
        .in("user_id", driverIds)
        .eq("status", "approved");

      if (error) throw error;

      const countByDriver: Record<string, number> = {};
      driverIds.forEach((id) => (countByDriver[id] = 0));
      (data || []).forEach((row: { user_id: string }) => {
        if (row.user_id && countByDriver[row.user_id] !== undefined) {
          countByDriver[row.user_id] += 1;
        }
      });
      return countByDriver;
    } catch (e) {
      console.error("Error fetching rental days:", e);
      return {};
    }
  };

  const fetchPenaltySummaries = async (
    driverList: any[]
  ): Promise<Record<string, DriverPenaltySummary>> => {
    if (!driverList || driverList.length === 0) {
      setPenaltySummaries({});
      setPenaltySummariesLoading(false);
      return {};
    }

    const driverIds = driverList
      .map((driver: any) => driver?.id)
      .filter((id: string | undefined): id is string => Boolean(id));

    if (driverIds.length === 0) {
      setPenaltySummaries({});
      setPenaltySummariesLoading(false);
      return {};
    }

    setPenaltySummaries({});
    setPenaltySummariesLoading(true);

    try {
      const { data, error } = await supabase
        .from("driver_penalty_transactions")
        .select("user_id, amount, type")
        .in("user_id", driverIds);

      if (error) throw error;

      const summaryMap: Record<string, DriverPenaltySummary> = {};

      driverIds.forEach((id) => {
        summaryMap[id] = {
          netPenalties: 0,
          totalPenalties: 0,
          totalPenaltyPaid: 0,
          totalRefunds: 0,
          totalBonuses: 0,
        };
      });

      (data || []).forEach((transaction: any) => {
        const userId = transaction.user_id as string;
        if (!userId || !summaryMap[userId]) return;

        const amount = Number(transaction.amount) || 0;

        switch (transaction.type) {
          case "penalty":
          case "due":
          case "extra_collection":
            summaryMap[userId].totalPenalties += amount;
            break;
          case "penalty_paid":
            summaryMap[userId].totalPenaltyPaid += amount;
            break;
          case "refund":
            summaryMap[userId].totalRefunds += amount;
            break;
          case "bonus":
            summaryMap[userId].totalBonuses += amount;
            break;
          default:
            break;
        }
      });

      Object.values(summaryMap).forEach((summary) => {
        const totalCredits =
          summary.totalPenaltyPaid +
          summary.totalRefunds +
          summary.totalBonuses;
        summary.netPenalties = totalCredits - summary.totalPenalties;
      });

      setPenaltySummaries(summaryMap);
      return summaryMap;
    } catch (error) {
      console.error("Error fetching penalty summaries:", error);
      setPenaltySummaries({});
      return {};
    } finally {
      setPenaltySummariesLoading(false);
    }
  };

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("users")
        .select("*", { count: "exact" })
        .order("name");

      // Apply server-side filters
      // Note: showOnlineOnly is handled separately, but if driverStatus is set, it takes precedence
      if (showOnlineOnly && advancedFilters.driverStatus === "all") {
        query = query.eq("online", true);
      }

      if (searchQuery.trim() !== "") {
        const searchTerm = searchQuery.toLowerCase().trim();
        query = query.or(
          `name.ilike.%${searchTerm}%,email_id.ilike.%${searchTerm}%,vehicle_number.ilike.%${searchTerm}%,driver_id.ilike.%${searchTerm}%`
        );
      }

      if (shiftFilter !== "all") {
        query = query.eq("shift", shiftFilter);
      }

      if (verificationFilter !== "all") {
        const isVerified = verificationFilter === "verified";
        query = query.eq("is_verified", isVerified);
      }

      // Apply advanced server-side filters
      if (advancedFilters.joiningDateFrom) {
        query = query.gte(
          "joining_date",
          format(advancedFilters.joiningDateFrom, "yyyy-MM-dd")
        );
      }
      if (advancedFilters.joiningDateTo) {
        query = query.lte(
          "joining_date",
          format(advancedFilters.joiningDateTo, "yyyy-MM-dd")
        );
      }

      // Deposit filters - showLowDeposit takes precedence if no advanced deposit filters
      if (
        showLowDeposit &&
        !advancedFilters.depositMin &&
        !advancedFilters.depositMax
      ) {
        query = query.lt("pending_balance", 2500);
      } else {
        if (
          advancedFilters.depositMin &&
          advancedFilters.depositMin.trim() !== ""
        ) {
          const minDeposit = parseFloat(advancedFilters.depositMin);
          if (!isNaN(minDeposit)) {
            query = query.gte("pending_balance", minDeposit);
          }
        }
        if (
          advancedFilters.depositMax &&
          advancedFilters.depositMax.trim() !== ""
        ) {
          const maxDeposit = parseFloat(advancedFilters.depositMax);
          if (!isNaN(maxDeposit)) {
            query = query.lte("pending_balance", maxDeposit);
          }
        }
      }

      if (advancedFilters.driverCategory !== "all") {
        query = query.eq("driver_category", advancedFilters.driverCategory);
      }

      if (advancedFilters.driverStatus !== "all") {
        if (advancedFilters.driverStatus === "online") {
          query = query.eq("online", true);
        } else if (advancedFilters.driverStatus === "offline") {
          query = query.eq("online", false);
        } else if (advancedFilters.driverStatus === "leave") {
          query = query.eq("driver_status", "leave");
        } else if (advancedFilters.driverStatus === "resigning") {
          query = query.or(
            "driver_status.eq.resigning,resigning_date.not.is.null"
          );
        } else if (advancedFilters.driverStatus === "going_to_24hr") {
          query = query.eq("driver_status", "going_to_24hr");
        }
      }

      if (advancedFilters.vehicleAssignment !== "all") {
        if (advancedFilters.vehicleAssignment === "assigned") {
          query = query.not("vehicle_number", "is", null);
        } else if (advancedFilters.vehicleAssignment === "unassigned") {
          query = query.is("vehicle_number", null);
        }
      }

      if (advancedFilters.resigningDateFrom) {
        query = query.gte(
          "resigning_date",
          format(advancedFilters.resigningDateFrom, "yyyy-MM-dd")
        );
      }
      if (advancedFilters.resigningDateTo) {
        query = query.lte(
          "resigning_date",
          format(advancedFilters.resigningDateTo, "yyyy-MM-dd")
        );
      }

      if (
        advancedFilters.totalTripsMin &&
        advancedFilters.totalTripsMin.trim() !== ""
      ) {
        const minTrips = parseInt(advancedFilters.totalTripsMin);
        if (!isNaN(minTrips)) {
          query = query.gte("total_trip", minTrips);
        }
      }
      if (
        advancedFilters.totalTripsMax &&
        advancedFilters.totalTripsMax.trim() !== ""
      ) {
        const maxTrips = parseInt(advancedFilters.totalTripsMax);
        if (!isNaN(maxTrips)) {
          query = query.lte("total_trip", maxTrips);
        }
      }

      // Check if we need client-side filtering (R&F balance, document status, rental days)
      // These require calculated values, so we must fetch all matching drivers first
      const needsClientSideFiltering =
        showNegativeBalance ||
        advancedFilters.rAndFBalanceMin ||
        advancedFilters.rAndFBalanceMax ||
        advancedFilters.documentStatus !== "all" ||
        showBelow7RentalDays ||
        show14AndAboveRentalDays;

      let allDrivers;
      let totalCountValue;

      if (needsClientSideFiltering) {
        // When filtering by negative R&F balance, fetch all matching drivers first
        // (without pagination) to calculate R&F balance, then filter and paginate client-side
        const { data, error, count } = await query;

        if (error) throw error;

        allDrivers = data || [];
        totalCountValue = count || 0;

        // Fetch penalty summaries for all drivers and get the returned summaries
        const summaries = await fetchPenaltySummaries(allDrivers);

        // Apply client-side filters (negative R&F balance, document status, R&F range)
        let filteredDrivers = allDrivers;

        if (showNegativeBalance) {
          filteredDrivers = filteredDrivers.filter((driver) => {
            const summary = summaries[driver.id];
            const fallbackValue = Number(driver?.total_penalties ?? 0);
            const rAndFValue =
              summary && typeof summary.netPenalties === "number"
                ? summary.netPenalties
                : fallbackValue;
            return Number.isFinite(rAndFValue) && rAndFValue < 0;
          });
        }

        // Apply R&F balance range filter
        if (
          advancedFilters.rAndFBalanceMin ||
          advancedFilters.rAndFBalanceMax
        ) {
          filteredDrivers = filteredDrivers.filter((driver) => {
            const summary = summaries[driver.id];
            const fallbackValue = Number(driver?.total_penalties ?? 0);
            const rAndFValue =
              summary && typeof summary.netPenalties === "number"
                ? summary.netPenalties
                : fallbackValue;

            if (
              advancedFilters.rAndFBalanceMin &&
              rAndFValue < parseFloat(advancedFilters.rAndFBalanceMin)
            ) {
              return false;
            }
            if (
              advancedFilters.rAndFBalanceMax &&
              rAndFValue > parseFloat(advancedFilters.rAndFBalanceMax)
            ) {
              return false;
            }
            return true;
          });
        }

        // Apply document status filter
        if (advancedFilters.documentStatus !== "all") {
          filteredDrivers = filteredDrivers.filter((driver) => {
            const docCheck = checkAllDocumentsUploaded(driver);
            if (advancedFilters.documentStatus === "complete") {
              return docCheck.allUploaded;
            } else if (advancedFilters.documentStatus === "incomplete") {
              return !docCheck.allUploaded;
            }
            return true;
          });
        }

        // Apply rental days filter (quick switches)
        if (showBelow7RentalDays || show14AndAboveRentalDays) {
          const driverIds = filteredDrivers.map((d: any) => d.id).filter(Boolean);
          const rentalDaysMap = await fetchRentalDaysByDriver(driverIds);
          filteredDrivers = filteredDrivers.filter((driver) => {
            const days = rentalDaysMap[driver.id] ?? 0;
            if (showBelow7RentalDays && show14AndAboveRentalDays) {
              return days < 7 || days >= 14;
            }
            if (showBelow7RentalDays) return days < 7;
            if (show14AndAboveRentalDays) return days >= 14;
            return true;
          });
        }

        // Apply client-side pagination
        const pagFrom = (currentPage - 1) * pageSize;
        const pagTo = pagFrom + pageSize;
        const paginatedDrivers = filteredDrivers.slice(pagFrom, pagTo);

        setDrivers(paginatedDrivers);
        setTotalCount(filteredDrivers.length);
        setTotalPages(Math.ceil(filteredDrivers.length / pageSize));
      } else {
        // Normal flow: all filters are server-side, apply pagination server-side
        const from = (currentPage - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) throw error;

        allDrivers = data || [];
        totalCountValue = count || 0;

        setDrivers(allDrivers);
        await fetchPenaltySummaries(allDrivers);

        setTotalCount(totalCountValue);
        setTotalPages(Math.ceil(totalCountValue / pageSize));
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast.error("Failed to load drivers data");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      // Get total count
      const { count: totalCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

      // Get online count
      const { count: onlineCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("online", true);

      // Get total deposit (only positive amounts) and driver status
      const { data: depositData } = await supabase
        .from("users")
        .select(
          "id, pending_balance, net_balance, total_penalties, driver_status, resigning_date"
        );

      // Calculate total deposit - ONLY sum positive pending_balance amounts
      // Filter out negative and zero values first, then sum
      const totalDeposit =
        depositData
          ?.filter((driver) => {
            const balance = Number(driver.pending_balance) || 0;
            return balance > 0; // Only include drivers with positive balance
          })
          .reduce((sum, driver) => {
            const balance = Number(driver.pending_balance) || 0;
            return sum + balance; // All values here are guaranteed to be positive
          }, 0) || 0;

      // Calculate total negative R&P balance and total R&P balance from penalty transactions
      // Using the same calculation logic as fetchPenaltySummaries
      let totalNegRAndFBalance = 0;
      let totalPenalties = 0;
      let totalRefunds = 0;
      if (depositData && depositData.length > 0) {
        const driverIds = depositData.map((d) => d.id).filter(Boolean);

        if (driverIds.length > 0) {
          const { data: penaltyData, error: penaltyError } = await supabase
            .from("driver_penalty_transactions")
            .select("user_id, amount, type")
            .in("user_id", driverIds);

          if (!penaltyError && penaltyData) {
            // Calculate R&F balance for each driver using same logic as fetchPenaltySummaries
            const driverSummaryMap: Record<
              string,
              {
                totalPenalties: number;
                totalPenaltyPaid: number;
                totalRefunds: number;
                totalBonuses: number;
              }
            > = {};

            // Initialize all drivers
            driverIds.forEach((id) => {
              driverSummaryMap[id] = {
                totalPenalties: 0,
                totalPenaltyPaid: 0,
                totalRefunds: 0,
                totalBonuses: 0,
              };
            });

            // Process transactions
            penaltyData.forEach((transaction: any) => {
              const userId = transaction.user_id as string;
              if (!userId || !driverSummaryMap[userId]) return;

              const amount = Number(transaction.amount) || 0;

              switch (transaction.type) {
                case "penalty":
                case "due":
                case "extra_collection":
                  driverSummaryMap[userId].totalPenalties += amount;
                  break;
                case "penalty_paid":
                  driverSummaryMap[userId].totalPenaltyPaid += amount;
                  break;
                case "refund":
                  driverSummaryMap[userId].totalRefunds += amount;
                  break;
                case "bonus":
                  driverSummaryMap[userId].totalBonuses += amount;
                  break;
              }
            });

            // Calculate netPenalties for each driver (same as fetchPenaltySummaries)
            const driverNetBalances = Object.values(driverSummaryMap).map(
              (summary) => {
                const totalCredits =
                  summary.totalPenaltyPaid +
                  summary.totalRefunds +
                  summary.totalBonuses;
                return totalCredits - summary.totalPenalties;
              }
            );

            // Sum only negative R&P balances (Total Penalties)
            totalNegRAndFBalance = driverNetBalances.reduce((sum, balance) => {
              return sum + (balance < 0 ? balance : 0);
            }, 0);

            // Sum all positive R&P balances (Total Refunds)
            totalRefunds = driverNetBalances.reduce((sum, balance) => {
              return sum + (balance > 0 ? balance : 0);
            }, 0);

            // Sum all R&P balances (positive and negative) for totalPenalties
            totalPenalties = driverNetBalances.reduce((sum, balance) => {
              return sum + balance;
            }, 0);
          } else if (penaltyError) {
            // If there's an error, log it and use fallback
            console.error(
              "Error fetching penalty data for statistics:",
              penaltyError
            );
            // Fallback to using total_penalties if penalty transactions not available
            totalNegRAndFBalance =
              depositData?.reduce((sum, driver) => {
                const balance = Number(driver.total_penalties ?? 0);
                return sum + (balance < 0 ? balance : 0);
              }, 0) || 0;
            totalRefunds =
              depositData?.reduce((sum, driver) => {
                const balance = Number(driver.total_penalties ?? 0);
                return sum + (balance > 0 ? balance : 0);
              }, 0) || 0;
            totalPenalties =
              depositData?.reduce((sum, driver) => {
                return sum + Number(driver.total_penalties ?? 0);
              }, 0) || 0;
          } else {
            // No penalty data available, use fallback
            totalNegRAndFBalance =
              depositData?.reduce((sum, driver) => {
                const balance = Number(driver.total_penalties ?? 0);
                return sum + (balance < 0 ? balance : 0);
              }, 0) || 0;
            totalRefunds =
              depositData?.reduce((sum, driver) => {
                const balance = Number(driver.total_penalties ?? 0);
                return sum + (balance > 0 ? balance : 0);
              }, 0) || 0;
            totalPenalties =
              depositData?.reduce((sum, driver) => {
                return sum + Number(driver.total_penalties ?? 0);
              }, 0) || 0;
          }
        }
      }

      const totalNetBalance =
        depositData?.reduce((sum, driver) => {
          return sum + (driver.net_balance || 0);
        }, 0) || 0;

      // Count leave and resigning drivers
      let leaveCount = 0;
      let resigningCount = 0;

      try {
        const { count: leave } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("driver_status", "leave");
        leaveCount = leave || 0;
      } catch (error) {
        // Column might not exist, set to 0
        console.warn("driver_status column might not exist:", error);
        leaveCount = 0;
      }

      try {
        const { count: resigning } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .or("driver_status.eq.resigning,resigning_date.not.is.null");
        resigningCount = resigning || 0;
      } catch (error) {
        // Column might not exist, try with just resigning_date
        try {
          const { count: resigning } = await supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .not("resigning_date", "is", null);
          resigningCount = resigning || 0;
        } catch (err) {
          console.warn("Error counting resigning drivers:", err);
          resigningCount = 0;
        }
      }

      setStatistics({
        total: totalCount || 0,
        online: onlineCount || 0,
        offline: (totalCount || 0) - (onlineCount || 0),
        totalDeposit,
        totalNegBalance: totalNegRAndFBalance, // Now shows total negative R&P balance
        totalPenalties: Math.abs(totalNegRAndFBalance), // Total Penalties (absolute value of negative balances)
        totalRefunds, // Total Refunds (positive balances)
        totalNetBalance,
        totalLeave: leaveCount || 0,
        totalResigning: resigningCount || 0,
      });
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const openDriverDetails = (driver) => {
    setSelectedDriver(driver);
    setIsModalOpen(true);
  };

  const openPasswordReset = (driver: any) => {
    setSelectedDriverForReset(driver);
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordReset(true);
  };

  const handlePasswordReset = async () => {
    if (!selectedDriverForReset) return;

    // Validate passwords
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setIsResettingPassword(true);

    try {
      // Get the current session to pass auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("You must be logged in to reset passwords");
      }

      // Call the edge function to reset password
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            userId: selectedDriverForReset.id,
            newPassword: newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to reset password");
      }

      toast.success(
        `Password reset successfully for ${selectedDriverForReset.name}`
      );
      setShowPasswordReset(false);
      setNewPassword("");
      setConfirmPassword("");
      setSelectedDriverForReset(null);
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Failed to reset password");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const toggleVerification = async (
    id: string,
    currentStatus: boolean | null
  ) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ is_verified: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      setDrivers(
        drivers.map((driver) =>
          driver.id === id ? { ...driver, is_verified: !currentStatus } : driver
        )
      );

      toast.success(
        `Driver ${!currentStatus ? "verified" : "unverified"} successfully`
      );
    } catch (error) {
      console.error("Error updating driver:", error);
      toast.error("Failed to update driver verification status");
    }
  };

  const handleLeaveResigningSelection = async (
    status: "leave" | "resigning" | "offline" | "going_to_24hr"
  ) => {
    if (!selectedDriverForStatus) return;

    // If resigning, show reason popup first
    if (status === "resigning") {
      setShowLeaveResigningModal(false);
      setResignationReason("");
      setShowResignationReasonModal(true);
      return;
    }

    // If leave, show return date popup first
    if (status === "leave") {
      setShowLeaveResigningModal(false);
      setLeaveReturnDate(null);
      setShowLeaveReturnDateModal(true);
      return;
    }

    // If going to 24hr, handle directly
    if (status === "going_to_24hr") {
      const id = selectedDriverForStatus.id;
      setIsUpdating(id);
      setShowLeaveResigningModal(false);

      try {
        const updateData: any = {
          online: false,
          offline_from_date: new Date().toISOString().split("T")[0],
          driver_status: "going_to_24hr",
        };

        const { error } = await supabase
          .from("users")
          .update(updateData)
          .eq("id", id);

        if (error) throw error;

        setDrivers(
          drivers.map((driver) =>
            driver.id === id
              ? {
                  ...driver,
                  online: false,
                  offline_from_date: updateData.offline_from_date,
                  driver_status: updateData.driver_status,
                }
              : driver
          )
        );

        toast.success(`Driver is now marked as Going to 24hr`);

        // Log activity
        await logActivity({
          actionType: "driver_status_update",
          actionCategory: "drivers",
          description: `Set driver ${selectedDriverForStatus.name} status to Going to 24hr`,
          metadata: {
            driverId: id,
            driverName: selectedDriverForStatus.name,
            status: "going_to_24hr",
          },
        });

        // Refresh statistics
        fetchStatistics();
      } catch (error) {
        console.error("Error updating driver status:", error);
        toast.error("Failed to update driver status");
      } finally {
        setIsUpdating(null);
        setSelectedDriverForStatus(null);
      }
      return;
    }

    // For offline, show offline reason modal
    setShowLeaveResigningModal(false);
    setOfflineReason("");
    setShowOfflineReasonModal(true);
  };

  const handleLeaveReturnDateSubmit = async () => {
    if (!selectedDriverForStatus) return;

    if (!leaveReturnDate) {
      toast.error("Please select a return date");
      return;
    }

    const id = selectedDriverForStatus.id;
    setIsUpdating(id);
    setShowLeaveReturnDateModal(false);

    try {
      const updateData: any = {
        online: false,
        offline_from_date: new Date().toISOString().split("T")[0],
        driver_status: "leave",
        leave_return_date: format(leaveReturnDate, "yyyy-MM-dd"),
      };

      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      setDrivers(
        drivers.map((driver) =>
          driver.id === id
            ? {
                ...driver,
                online: false,
                offline_from_date: updateData.offline_from_date,
                driver_status: updateData.driver_status,
                leave_return_date: updateData.leave_return_date,
              }
            : driver
        )
      );

      toast.success(
        `Driver is now on leave. Return date: ${format(
          leaveReturnDate,
          "dd MMM yyyy"
        )}`
      );

      // Refresh statistics
      fetchStatistics();
    } catch (error) {
      console.error("Error updating driver status:", error);
      toast.error("Failed to update driver status");
    } finally {
      setIsUpdating(null);
      setSelectedDriverForStatus(null);
      setLeaveReturnDate(null);
    }
  };

  const handleOfflineReasonSubmit = async () => {
    if (!selectedDriverForStatus) return;

    if (!offlineReason.trim()) {
      toast.error("Please provide an offline reason");
      return;
    }

    const id = selectedDriverForStatus.id;
    setIsUpdating(id);
    setShowOfflineReasonModal(false);

    try {
      const updateData: any = {
        online: false,
        offline_from_date: new Date().toISOString().split("T")[0],
        driver_status: null, // Just offline, no status
        vehicle_number: null, // Set vehicle to N/A
        shift: "none", // Set shift to non-shift (use "none" string, not null)
      };

      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      // Save offline reason to driver_offline_records if table exists
      try {
        await supabase.from("driver_offline_records").insert({
          user_id: id,
          offline_date: new Date().toISOString().split("T")[0],
          notes: offlineReason.trim(),
        });
      } catch (offlineRecordError) {
        // Table might not exist, continue anyway
        console.log("Could not save offline reason:", offlineRecordError);
      }

      setDrivers(
        drivers.map((driver) =>
          driver.id === id
            ? {
                ...driver,
                online: false,
                offline_from_date: updateData.offline_from_date,
                driver_status: updateData.driver_status,
                vehicle_number: null,
                shift: "none", // Use "none" string, not null
              }
            : driver
        )
      );

      toast.success(`Driver is now offline. Vehicle and shift cleared.`);

      // Log activity
      await logActivity({
        actionType: "driver_offline",
        actionCategory: "drivers",
        description: `Took driver ${selectedDriverForStatus.name} offline - Reason: ${offlineReason} - Vehicle and shift cleared`,
        metadata: {
          driver_id: id,
          driver_name: selectedDriverForStatus.name,
          offline_reason: offlineReason,
          offline_date: new Date().toISOString().split("T")[0],
          vehicle_cleared: true,
          shift_cleared: true,
        },
        pageName: "Admin Drivers",
      });

      // Refresh statistics
      fetchStatistics();
    } catch (error) {
      console.error("Error updating driver status:", error);
      toast.error("Failed to update driver status");
    } finally {
      setIsUpdating(null);
      setSelectedDriverForStatus(null);
      setOfflineReason("");
    }
  };

  const handleResignationSubmit = async () => {
    if (!selectedDriverForStatus) return;

    if (!resignationReason.trim()) {
      toast.error("Please provide a resignation reason");
      return;
    }

    const id = selectedDriverForStatus.id;
    setIsUpdating(id);
    setShowResignationReasonModal(false);

    try {
      const updateData: any = {
        online: false,
        offline_from_date: new Date().toISOString().split("T")[0],
        driver_status: "resigning",
        resigning_date: new Date().toISOString().split("T")[0],
        resignation_reason: resignationReason.trim(),
      };

      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      setDrivers(
        drivers.map((driver) =>
          driver.id === id
            ? {
                ...driver,
                online: false,
                offline_from_date: updateData.offline_from_date,
                driver_status: updateData.driver_status,
                resigning_date: updateData.resigning_date,
                resignation_reason: updateData.resignation_reason,
              }
            : driver
        )
      );

      toast.success("Driver status updated to resigning");

      // Refresh statistics
      fetchStatistics();
    } catch (error) {
      console.error("Error updating driver status:", error);
      toast.error("Failed to update driver status");
    } finally {
      setIsUpdating(null);
      setSelectedDriverForStatus(null);
      setResignationReason("");
    }
  };

  const toggleOnlineStatus = async (
    id: string,
    currentStatus: boolean | null
  ) => {
    // Check if user is admin or manager
    if (!canPutDriverOnline) {
      toast.error("Only admins and managers can change driver online status");
      return;
    }

    // Find the driver in the current list
    const driver = drivers.find((d) => d.id === id);

    // If trying to put driver online, check if all documents are uploaded
    if (!currentStatus && driver) {
      const documentCheck = checkAllDocumentsUploaded(driver);
      if (!documentCheck.allUploaded) {
        setDocumentWarningDriver(driver);
        setShowDocumentWarning(true);
        toast.error(
          `Cannot put driver online. Missing documents: ${documentCheck.missing.join(
            ", "
          )}`
        );
        return;
      }

      // Show joining type selection modal before putting driver online
      setSelectedDriverForJoining({ id, driver, currentStatus });
      setShowJoiningTypeModal(true);
      return; // Don't proceed until user selects joining type
    }

    // If going offline, proceed with existing logic
    if (currentStatus) {
      // This will be handled by the existing offline logic below
    }

    // If trying to take driver offline, first check for overdue count
    if (currentStatus) {
      const overdue = await getDriverOverdueCount(driver);
      if (overdue > 0) {
        setOverdueCount(overdue);
        setOverdueDriverName(
          driver?.name || driver?.driver_id || "Unknown Driver"
        );
        setShowOverdueWarning(true);
        return; // Block offline action when overdue exists
      }

      // Check if driver has vehicle and shift assigned
      const hasVehicle =
        driver?.vehicle_number && driver.vehicle_number !== "N/A";
      const hasShift =
        driver?.shift && driver.shift !== "none" && driver.shift !== null;

      if (hasVehicle || hasShift) {
        toast.error(
          `Cannot take driver offline. Please first set:\n- Vehicle to "N/A"\n- Shift to "None"\n\nCurrent: Vehicle = ${
            driver?.vehicle_number || "N/A"
          }, Shift = ${driver?.shift || "None"}`
        );
        return;
      }

      // No overdue and no vehicle/shift assigned, show leave/resigning/offline status modal
      setSelectedDriverForStatus(driver);
      setShowLeaveResigningModal(true);
      return; // Don't proceed with offline action yet
    }

    // This code should not be reached - online toggle shows modal, offline shows leave/resigning modal
  };

  const handleJoiningTypeConfirm = async () => {
    if (!selectedDriverForJoining || !joiningType) {
      toast.error("Please select a joining type");
      return;
    }

    const { id, driver } = selectedDriverForJoining;

    try {
      setIsUpdating(id);

      const updateData: any = {
        online: true,
        driver_status: null, // Clear status when going online
        joining_type: joiningType,
        online_from_date: new Date().toISOString().split("T")[0],
        offline_from_date: null,
      };

      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      setDrivers(
        drivers.map((d) =>
          d.id === id
            ? {
                ...d,
                online: true,
                offline_from_date: null,
                online_from_date: updateData.online_from_date,
                driver_status: null,
                joining_type: updateData.joining_type,
              }
            : d
        )
      );

      toast.success(
        `Driver is now online (${joiningType === "new_joining" ? "New Joining" : "Rejoining"})`
      );

      // Log activity
      await logActivity({
        actionType: "driver_online",
        actionCategory: "drivers",
        description: `Brought driver ${driver?.name} online - ${joiningType === "new_joining" ? "New Joining" : "Rejoining"}${
          driver?.vehicle_number ? ` - Vehicle: ${driver.vehicle_number}` : ""
        }${driver?.shift ? ` - Shift: ${driver.shift}` : ""}`,
        metadata: {
          driver_id: id,
          driver_name: driver?.name,
          vehicle_number: driver?.vehicle_number,
          shift: driver?.shift,
          joining_type: joiningType,
        },
        pageName: "Admin Drivers",
      });

      // Refresh statistics
      fetchStatistics();

      // Reset state
      setJoiningType(null);
      setShowJoiningTypeModal(false);
      setSelectedDriverForJoining(null);
    } catch (error) {
      console.error("Error updating driver status:", error);
      toast.error("Failed to update driver status");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleOnlineFilterToggle = (checked: boolean) => {
    setShowOnlineOnly(checked);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleShiftFilterChange = (value: string) => {
    setShiftFilter(value);
    setCurrentPage(1);
  };

  const handleVerificationFilterChange = (value: string) => {
    setVerificationFilter(value);
    setCurrentPage(1);
  };

  const handleLowDepositToggle = (checked: boolean) => {
    setShowLowDeposit(checked);
    setCurrentPage(1);
  };

  const handleNegativeBalanceToggle = (checked: boolean) => {
    setShowNegativeBalance(checked);
    setCurrentPage(1);
  };

  const handleBelow7RentalDaysToggle = (checked: boolean) => {
    setShowBelow7RentalDays(checked);
    if (checked) setShow14AndAboveRentalDays(false);
    setCurrentPage(1);
  };

  const handle14AndAboveRentalDaysToggle = (checked: boolean) => {
    setShow14AndAboveRentalDays(checked);
    if (checked) setShowBelow7RentalDays(false);
    setCurrentPage(1);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (searchQuery.trim() !== "") count++;
    if (shiftFilter !== "all") count++;
    if (verificationFilter !== "all") count++;
    if (showOnlineOnly) count++;
    if (showLowDeposit) count++;
    if (showNegativeBalance) count++;
    if (advancedFilters.joiningDateFrom) count++;
    if (advancedFilters.joiningDateTo) count++;
    if (advancedFilters.depositMin) count++;
    if (advancedFilters.depositMax) count++;
    if (advancedFilters.rAndFBalanceMin) count++;
    if (advancedFilters.rAndFBalanceMax) count++;
    if (advancedFilters.driverCategory !== "all") count++;
    if (advancedFilters.driverStatus !== "all") count++;
    if (advancedFilters.documentStatus !== "all") count++;
    if (advancedFilters.totalTripsMin) count++;
    if (advancedFilters.totalTripsMax) count++;
    if (advancedFilters.vehicleAssignment !== "all") count++;
    if (advancedFilters.resigningDateFrom) count++;
    if (advancedFilters.resigningDateTo) count++;
    if (showBelow7RentalDays) count++;
    if (show14AndAboveRentalDays) count++;
    return count;
  };

  const resetFilters = () => {
    setSearchQuery("");
    setShiftFilter("all");
    setVerificationFilter("all");
    setShowOnlineOnly(false);
    setShowLowDeposit(false);
    setShowNegativeBalance(false);
    setShowBelow7RentalDays(false);
    setShow14AndAboveRentalDays(false);
    setAdvancedFilters({
      joiningDateFrom: null,
      joiningDateTo: null,
      depositMin: "",
      depositMax: "",
      rAndFBalanceMin: "",
      rAndFBalanceMax: "",
      driverCategory: "all",
      driverStatus: "all",
      documentStatus: "all",
      totalTripsMin: "",
      totalTripsMax: "",
      vehicleAssignment: "all",
      resigningDateFrom: null,
      resigningDateTo: null,
    });
    setCurrentPage(1);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const downloadDriverReport = async () => {
    try {
      // Fetch all drivers with current filters for complete export
      let query = supabase.from("users").select("*").order("name");

      // Apply the same filters as current view
      if (showOnlineOnly) {
        query = query.eq("online", true);
      }

      if (searchQuery.trim() !== "") {
        const searchTerm = searchQuery.toLowerCase().trim();
        query = query.or(
          `name.ilike.%${searchTerm}%,email_id.ilike.%${searchTerm}%,vehicle_number.ilike.%${searchTerm}%,driver_id.ilike.%${searchTerm}%`
        );
      }

      if (shiftFilter !== "all") {
        query = query.eq("shift", shiftFilter);
      }

      if (verificationFilter !== "all") {
        const isVerified = verificationFilter === "verified";
        query = query.eq("is_verified", isVerified);
      }

      if (showLowDeposit) {
        query = query.lt("pending_balance", 2500);
      }

      // Note: showNegativeBalance filter is applied client-side after fetching penalty summaries
      // because R&F balance is calculated from penalty transactions

      const { data: allDrivers, error } = await query;

      if (error) throw error;

      // Fetch penalty summaries for all drivers to calculate R&F data
      const summaries = await fetchPenaltySummaries(allDrivers || []);

      // If filtering by negative R&F balance, filter drivers
      let driversToExport = allDrivers || [];
      if (showNegativeBalance) {
        driversToExport = (allDrivers || []).filter((driver) => {
          const summary = summaries[driver.id];
          const fallbackValue = Number(driver?.total_penalties ?? 0);
          const rAndFValue =
            summary && typeof summary.netPenalties === "number"
              ? summary.netPenalties
              : fallbackValue;
          return Number.isFinite(rAndFValue) && rAndFValue < 0;
        });
      }

      // If filtering by rental days, filter drivers
      if (showBelow7RentalDays || show14AndAboveRentalDays) {
        const driverIds = driversToExport.map((d: any) => d.id).filter(Boolean);
        const rentalDaysMap = await fetchRentalDaysByDriver(driverIds);
        driversToExport = driversToExport.filter((driver) => {
          const days = rentalDaysMap[driver.id] ?? 0;
          if (showBelow7RentalDays && show14AndAboveRentalDays) {
            return days < 7 || days >= 14;
          }
          if (showBelow7RentalDays) return days < 7;
          if (show14AndAboveRentalDays) return days >= 14;
          return true;
        });
      }

      // Create CSV header
      const headers = [
        "Name",
        "Email",
        "Phone Number",
        "Vehicle Number",
        "Shift",
        "Status",
        "Verified",
        "Total Trips",
        "Deposit",
        "Total Penalties",
        "Total Refunds",
        "Total R & F",
        "Joining Date",
        "Documents",
        "Document Status",
      ].join(",");

      // Create CSV rows
      const rows = driversToExport.map((driver) => {
        const documentParts = [];
        if (driver.license_front && driver.license_back) {
          documentParts.push("License (Complete)");
        } else if (driver.license_front || driver.license_back) {
          documentParts.push("License (Partial)");
        }
        if (driver.aadhar_front && driver.aadhar_back) {
          documentParts.push("Aadhar (Complete)");
        } else if (driver.aadhar_front || driver.aadhar_back) {
          documentParts.push("Aadhar (Partial)");
        }
        if (driver.pan_front && driver.pan_back) {
          documentParts.push("PAN (Complete)");
        } else if (driver.pan_front || driver.pan_back) {
          documentParts.push("PAN (Partial)");
        }
        if (driver.uber_profile) {
          documentParts.push("Uber Profile");
        }

        const documents = documentParts.join("; ") || "No Documents";
        const docCheck = checkAllDocumentsUploaded(driver);
        const docStatus = docCheck.allUploaded ? "Complete" : "Incomplete";

        // Calculate R&F values from penalty summaries
        const summary = summaries[driver.id];
        const totalPenalties = summary
          ? summary.totalPenalties
          : Number(driver?.total_penalties ?? 0);
        const totalRefunds =
          summary && typeof summary.totalRefunds === "number"
            ? summary.totalRefunds +
              summary.totalBonuses +
              summary.totalPenaltyPaid
            : 0;
        const totalRAndF =
          summary && typeof summary.netPenalties === "number"
            ? summary.netPenalties
            : Number(driver?.total_penalties ?? 0);

        return [
          `"${driver.name || ""}"`,
          `"${driver.email_id || ""}"`,
          `"${driver.phone_number || ""}"`,
          `"${driver.vehicle_number || ""}"`,
          `"${driver.shift || ""}"`,
          driver.online ? "Online" : "Offline",
          driver.is_verified ? "Yes" : "No",
          driver.total_trip || "0",
          driver.pending_balance || "0",
          totalPenalties.toFixed(2),
          totalRefunds.toFixed(2),
          totalRAndF.toFixed(2),
          driver.joining_date
            ? format(new Date(driver.joining_date), "dd MMM yyyy")
            : "Not available",
          `"${documents}"`,
          `"${docStatus}"`,
        ].join(",");
      });

      // Combine header and rows
      const csvContent = [headers, ...rows].join("\n");

      // Create and trigger download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `driver_report_${format(new Date(), "yyyy-MM-dd")}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Downloaded report with ${driversToExport.length} drivers`);
    } catch (error) {
      console.error("Error downloading report:", error);
      toast.error("Failed to download report");
    }
  };

  const getDriverPenaltyDisplay = (driver: any) => {
    const summary = penaltySummaries[driver?.id];
    const fallbackValue = Number(driver?.total_penalties ?? 0);
    const rawValue =
      summary && typeof summary.netPenalties === "number"
        ? summary.netPenalties
        : fallbackValue;
    const value = Number.isFinite(rawValue) ? rawValue : 0;
    const formattedValue = Math.abs(value).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    return {
      value,
      display: value < 0 ? `-${formattedValue}` : formattedValue,
      className:
        value > 0
          ? "text-green-500"
          : value < 0
          ? "text-red-500"
          : "text-gray-500",
      hasSummary: Boolean(summary),
    };
  };

  const getNetBalanceInfo = (driver: any) => {
    const deposit = Number(driver?.pending_balance ?? 0);
    const penaltyInfo = getDriverPenaltyDisplay(driver);
    const netValue = deposit + penaltyInfo.value;
    const formatted = netValue.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return {
      value: netValue,
      display: formatted,
      className: netValue >= 0 ? "text-green-500" : "text-red-500",
    };
  };

  const handleCopyDriverId = async (driverId: string) => {
    try {
      await navigator.clipboard.writeText(driverId);
      setCopiedDriverId(driverId);
      toast.success("Driver ID copied to clipboard");
      setTimeout(() => setCopiedDriverId(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy Driver ID");
    }
  };

  const MobileDriverCard = ({ driver }) => {
    const penaltyInfo = getDriverPenaltyDisplay(driver);
    const netInfo = getNetBalanceInfo(driver);

    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4 mb-4">
            <Avatar>
              <AvatarImage src={driver.profile_photo || undefined} />
              <AvatarFallback>{driver.name?.charAt(0) || "U"}</AvatarFallback>
              <BadgeCheck className="h-4 w-4 text-white bg-green-600 rounded-full" />
            </Avatar>
            <div>
              <h3 className="font-medium">{driver.name}</h3>
              <p className="text-sm text-muted-foreground">{driver.email_id}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Driver ID:</span>
              <div className="flex items-center gap-2">
                {driver.driver_id ? (
                  <>
                    <span className="text-sm font-mono">
                      {driver.driver_id}
                    </span>
                    <button
                      onClick={() => handleCopyDriverId(driver.driver_id)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="Copy Driver ID"
                    >
                      {copiedDriverId === driver.driver_id ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-gray-500" />
                      )}
                    </button>
                  </>
                ) : (
                  <span className="text-sm text-gray-400">N/A</span>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Vehicle:</span>
              <div className="flex items-center gap-2">
                <span>{driver.vehicle_number || "Not assigned"}</span>
                {driver.vehicle_number && (
                  <Badge variant="outline" className="text-xs">
                    {(() => {
                      // Count drivers for this vehicle
                      const vehicleDrivers =
                        drivers.filter(
                          (d) =>
                            d.vehicle_number === driver.vehicle_number &&
                            d.online &&
                            d.id !== driver.id
                        ).length + 1;
                      return `${vehicleDrivers}/2`;
                    })()}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Shift:</span>
              {driver.shift ? (
                <Badge
                  variant={driver.shift === "morning" ? "default" : "secondary"}
                >
                  {driver.shift}
                </Badge>
              ) : (
                "Not set"
              )}
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Category:</span>
              <Badge
                variant={
                  driver.driver_category === "salary_base"
                    ? "default"
                    : "outline"
                }
                className="text-xs"
              >
                {driver.driver_category === "salary_base"
                  ? "Salary Base"
                  : "Hub Base"}
              </Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status:</span>
              <div className="flex items-center gap-2">
                <Switch
                  checked={driver.online || false}
                  onCheckedChange={() =>
                    toggleOnlineStatus(driver.id, driver.online)
                  }
                  disabled={isUpdating === driver.id || !canPutDriverOnline}
                  title={!canPutDriverOnline ? "Admin/Manager only" : ""}
                />
                {!canPutDriverOnline && (
                  <span className="text-xs text-amber-600">(Admin/Manager)</span>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Verification:
              </span>
              <Badge
                variant={driver.is_verified ? "success" : "destructive"}
                className="cursor-pointer"
                onClick={() =>
                  toggleVerification(driver.id, driver.is_verified)
                }
              >
                {driver.is_verified ? "Verified" : "Unverified"}
              </Badge>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Documents:</span>
              <div className="flex space-x-1">
                {driver.license_front && driver.license_back ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                {driver.aadhar_front && driver.aadhar_back ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                {driver.pan_front && driver.pan_back ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                {(() => {
                  const docCheck = checkAllDocumentsUploaded(driver);
                  return docCheck.allUploaded ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  );
                })()}
              </div>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Total Trips:
              </span>
              <span>{driver.total_trip || "0"}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Deposit:</span>
              <span className="flex items-center">
                <IndianRupee className="h-3 w-3 mr-1" />
                {driver.pending_balance}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                R &amp; F Balance:
              </span>
              <span
                className={`flex items-center ${
                  penaltySummariesLoading && !penaltyInfo.hasSummary
                    ? "text-muted-foreground"
                    : penaltyInfo.className
                }`}
              >
                <IndianRupee className="h-3 w-3 mr-1" />
                {penaltySummariesLoading && !penaltyInfo.hasSummary
                  ? "..."
                  : penaltyInfo.display}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Net Balance:
              </span>
              <span className={`flex items-center ${netInfo.className}`}>
                <IndianRupee className="h-3 w-3 mr-1" />
                {netInfo.display}
              </span>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDriverDetails(driver)}
            >
              <Eye className="h-4 w-4 mr-1" /> View
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openPasswordReset(driver)}
              className="text-orange-600 hover:text-orange-700"
            >
              <Key className="h-4 w-4 mr-1" /> Reset Password
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const getContentHeight = () => {
    // Adjust the height calculation based on viewport and content
    return isMobile ? "calc(100vh - 300px)" : "calc(100vh - 280px)";
  };

  return (
    <AdminLayout title="Drivers Management">
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-500">
                Active Drivers
              </span>
              <span className="text-2xl font-bold text-green-500">
                {statistics.online}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-500">
                Total Leave
              </span>
              <span className="text-2xl font-bold text-orange-500">
                {statistics.totalLeave}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-500">
                Total Resigning
              </span>
              <span className="text-2xl font-bold text-purple-500">
                {statistics.totalResigning}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-500">
                Total Drivers
              </span>
              <span className="text-2xl font-bold">{statistics.total}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-500">
                Total Drivers Deposit
              </span>
              <span className="text-2xl font-bold text-blue-600">
                ₹
                {statistics.totalDeposit.toLocaleString("en-IN", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-500">
                Total Refunds
              </span>
              <span className="text-2xl font-bold text-green-500">
                ₹
                {statistics.totalRefunds.toLocaleString("en-IN", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-500">
                Total Penalties
              </span>
              <span className="text-2xl font-bold text-red-500">
                ₹
                {statistics.totalPenalties.toLocaleString("en-IN", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>

            {/* <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-500">
                Offline Drivers
              </span>
              <span className="text-2xl font-bold text-red-500">
                {statistics.offline}
              </span>
            </div> */}
            {/* <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-500">
                Total Neg R &amp; P Balance
              </span>
              <span className="text-2xl font-bold text-red-500">
                {statistics.totalNegBalance < 0 ? "-" : ""}₹
                {Math.abs(statistics.totalNegBalance).toLocaleString("en-IN", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </span>
            </div> */}

            {/* <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-500">
                Net Balance
              </span>
              <span
                className={`text-2xl font-bold ${
                  statistics.totalNetBalance >= 0
                    ? "text-blue-500"
                    : "text-red-500"
                }`}
              >
                ₹{statistics.totalNetBalance.toLocaleString()}
              </span>
            </div> */}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span>
                Showing: {drivers.length} of {totalCount}
              </span>
              <span className="text-green-500 text-sm md:text-base md:ml-2">
                Online: {statistics.online}
              </span>
              <span className="text-red-500 text-sm md:text-base md:ml-2">
                Offline: {statistics.offline}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="online-filter"
                  checked={showOnlineOnly}
                  onCheckedChange={handleOnlineFilterToggle}
                />
                <Label
                  htmlFor="online-filter"
                  className="text-sm whitespace-nowrap"
                >
                  Online only
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="low-deposit-filter"
                  checked={showLowDeposit}
                  onCheckedChange={handleLowDepositToggle}
                />
                <Label
                  htmlFor="low-deposit-filter"
                  className="text-sm whitespace-nowrap"
                >
                  Low deposit (&lt; 2500)
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="negative-balance-filter"
                  checked={showNegativeBalance}
                  onCheckedChange={handleNegativeBalanceToggle}
                />
                <Label
                  htmlFor="negative-balance-filter"
                  className="text-sm whitespace-nowrap"
                >
                  Negative R &amp; F balance
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="below-7-rental-days-filter"
                  checked={showBelow7RentalDays}
                  onCheckedChange={handleBelow7RentalDaysToggle}
                />
                <Label
                  htmlFor="below-7-rental-days-filter"
                  className="text-sm whitespace-nowrap"
                >
                  Below 7 rental days
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="14-and-above-rental-days-filter"
                  checked={show14AndAboveRentalDays}
                  onCheckedChange={handle14AndAboveRentalDaysToggle}
                />
                <Label
                  htmlFor="14-and-above-rental-days-filter"
                  className="text-sm whitespace-nowrap"
                >
                  14 days and above
                </Label>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={toggleFilters}
                className="flex items-center"
              >
                <Filter className="h-4 w-4 mr-1" />
                {showFilters ? "Hide Filters" : "Show Filters"}
                {getActiveFilterCount() > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {getActiveFilterCount()}
                  </Badge>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center"
              >
                {showAdvancedFilters ? (
                  <ChevronUp className="h-4 w-4 mr-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 mr-1" />
                )}
                Advanced Filters
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={downloadDriverReport}
                className="flex items-center"
              >
                <Download className="h-4 w-4 mr-1" />
                Download Report
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name, email, vehicle..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="shift-filter">Shift</Label>
                <Select
                  value={shiftFilter}
                  onValueChange={handleShiftFilterChange}
                >
                  <SelectTrigger id="shift-filter">
                    <SelectValue placeholder="Filter by shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shifts</SelectItem>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                    <SelectItem value="24">24 Hours</SelectItem>
                    <SelectItem value="none">No Shift</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="verification-filter">Verification</Label>
                <Select
                  value={verificationFilter}
                  onValueChange={handleVerificationFilterChange}
                >
                  <SelectTrigger id="verification-filter">
                    <SelectValue placeholder="Filter by verification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="unverified">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end col-span-full">
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Reset Filters
                </Button>
              </div>
            </div>
          )}

          {/* Advanced Filters Section */}
          {showAdvancedFilters && (
            <div className="mt-6 border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Advanced Filters</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAdvancedFilters({
                      joiningDateFrom: null,
                      joiningDateTo: null,
                      depositMin: "",
                      depositMax: "",
                      rAndFBalanceMin: "",
                      rAndFBalanceMax: "",
                      driverCategory: "all",
                      driverStatus: "all",
                      documentStatus: "all",
                      totalTripsMin: "",
                      totalTripsMax: "",
                      vehicleAssignment: "all",
                      resigningDateFrom: null,
                      resigningDateTo: null,
                    });
                    setCurrentPage(1);
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Advanced
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Joining Date Range */}
                <div className="space-y-2">
                  <Label>Joining Date Range</Label>
                  <div className="space-y-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !advancedFilters.joiningDateFrom &&
                              "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {advancedFilters.joiningDateFrom ? (
                            format(
                              advancedFilters.joiningDateFrom,
                              "dd MMM yyyy"
                            )
                          ) : (
                            <span>From date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            advancedFilters.joiningDateFrom || undefined
                          }
                          onSelect={(date) => {
                            setAdvancedFilters({
                              ...advancedFilters,
                              joiningDateFrom: date || null,
                            });
                            setCurrentPage(1);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !advancedFilters.joiningDateTo &&
                              "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {advancedFilters.joiningDateTo ? (
                            format(advancedFilters.joiningDateTo, "dd MMM yyyy")
                          ) : (
                            <span>To date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={advancedFilters.joiningDateTo || undefined}
                          onSelect={(date) => {
                            setAdvancedFilters({
                              ...advancedFilters,
                              joiningDateTo: date || null,
                            });
                            setCurrentPage(1);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Deposit Range */}
                <div className="space-y-2">
                  <Label>Deposit Range (₹)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={advancedFilters.depositMin}
                      onChange={(e) => {
                        setAdvancedFilters({
                          ...advancedFilters,
                          depositMin: e.target.value,
                        });
                        setCurrentPage(1);
                      }}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={advancedFilters.depositMax}
                      onChange={(e) => {
                        setAdvancedFilters({
                          ...advancedFilters,
                          depositMax: e.target.value,
                        });
                        setCurrentPage(1);
                      }}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* R&F Balance Range */}
                <div className="space-y-2">
                  <Label>R &amp; F Balance Range (₹)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={advancedFilters.rAndFBalanceMin}
                      onChange={(e) => {
                        setAdvancedFilters({
                          ...advancedFilters,
                          rAndFBalanceMin: e.target.value,
                        });
                        setCurrentPage(1);
                      }}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={advancedFilters.rAndFBalanceMax}
                      onChange={(e) => {
                        setAdvancedFilters({
                          ...advancedFilters,
                          rAndFBalanceMax: e.target.value,
                        });
                        setCurrentPage(1);
                      }}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Driver Category */}
                <div className="space-y-2">
                  <Label>Driver Category</Label>
                  <Select
                    value={advancedFilters.driverCategory}
                    onValueChange={(value) => {
                      setAdvancedFilters({
                        ...advancedFilters,
                        driverCategory: value,
                      });
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="hub_base">Hub Base</SelectItem>
                      <SelectItem value="salary_base">Salary Base</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Driver Status */}
                <div className="space-y-2">
                  <Label>Driver Status</Label>
                  <Select
                    value={advancedFilters.driverStatus}
                    onValueChange={(value) => {
                      setAdvancedFilters({
                        ...advancedFilters,
                        driverStatus: value,
                      });
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="leave">Leave</SelectItem>
                      <SelectItem value="resigning">Resigning</SelectItem>
                      <SelectItem value="going_to_24hr">Going to 24hr</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Document Status */}
                <div className="space-y-2">
                  <Label>Document Status</Label>
                  <Select
                    value={advancedFilters.documentStatus}
                    onValueChange={(value) => {
                      setAdvancedFilters({
                        ...advancedFilters,
                        documentStatus: value,
                      });
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                      <SelectItem value="incomplete">Incomplete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Total Trips Range */}
                <div className="space-y-2">
                  <Label>Total Trips Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={advancedFilters.totalTripsMin}
                      onChange={(e) => {
                        setAdvancedFilters({
                          ...advancedFilters,
                          totalTripsMin: e.target.value,
                        });
                        setCurrentPage(1);
                      }}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={advancedFilters.totalTripsMax}
                      onChange={(e) => {
                        setAdvancedFilters({
                          ...advancedFilters,
                          totalTripsMax: e.target.value,
                        });
                        setCurrentPage(1);
                      }}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Vehicle Assignment */}
                <div className="space-y-2">
                  <Label>Vehicle Assignment</Label>
                  <Select
                    value={advancedFilters.vehicleAssignment}
                    onValueChange={(value) => {
                      setAdvancedFilters({
                        ...advancedFilters,
                        vehicleAssignment: value,
                      });
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Resigning Date Range */}
                <div className="space-y-2">
                  <Label>Resigning Date Range</Label>
                  <div className="space-y-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !advancedFilters.resigningDateFrom &&
                              "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {advancedFilters.resigningDateFrom ? (
                            format(
                              advancedFilters.resigningDateFrom,
                              "dd MMM yyyy"
                            )
                          ) : (
                            <span>From date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            advancedFilters.resigningDateFrom || undefined
                          }
                          onSelect={(date) => {
                            setAdvancedFilters({
                              ...advancedFilters,
                              resigningDateFrom: date || null,
                            });
                            setCurrentPage(1);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !advancedFilters.resigningDateTo &&
                              "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {advancedFilters.resigningDateTo ? (
                            format(
                              advancedFilters.resigningDateTo,
                              "dd MMM yyyy"
                            )
                          ) : (
                            <span>To date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            advancedFilters.resigningDateTo || undefined
                          }
                          onSelect={(date) => {
                            setAdvancedFilters({
                              ...advancedFilters,
                              resigningDateTo: date || null,
                            });
                            setCurrentPage(1);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
            </div>
          ) : (
            <>
              <div className="md:hidden">
                {drivers.length === 0 ? (
                  <p className="text-center py-8">No drivers found</p>
                ) : (
                  <ScrollArea className="h-[calc(100vh-320px)]">
                    <div className="pr-3">
                      {drivers.map((driver) => (
                        <MobileDriverCard key={driver.id} driver={driver} />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              <div className="hidden md:block relative">
                <ScrollArea className="h-[400px] rounded-md">
                  <div className="pr-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {/* <TableHead className="w-12">Profile</TableHead> */}
                          <TableHead>Name</TableHead>
                          <TableHead>Driver ID</TableHead>
                          <TableHead>Joining Date</TableHead>
                          <TableHead>Ph No</TableHead>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>Shift</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="w-20">Status</TableHead>
                          <TableHead>Verified</TableHead>
                          <TableHead>Documents</TableHead>
                          <TableHead>Deposit</TableHead>

                          <TableHead>R & P</TableHead>
                          <TableHead>Net Balance</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drivers.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={13}
                              className="text-center py-8"
                            >
                              No drivers found
                            </TableCell>
                          </TableRow>
                        ) : (
                          drivers.map((driver) => {
                            const penaltyInfo = getDriverPenaltyDisplay(driver);
                            const netInfo = getNetBalanceInfo(driver);

                            return (
                              <TableRow key={driver.id}>
                                {/* <TableCell>
                                <Avatar className="h-8 w-8">
                                  <AvatarImage
                                    src={driver.profile_photo || undefined}
                                  />
                                  <AvatarFallback>
                                    {driver.name?.charAt(0) || "U"}
                                  </AvatarFallback>
                                </Avatar>
                              </TableCell> */}
                                <TableCell className="font-medium flex gap-1">
                                  {driver.name}
                                  <span>
                                    {driver.is_verified && (
                                      <BadgeCheck className="h-3 w-3 text-white bg-green-600 rounded-full" />
                                    )}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {driver.driver_id ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-mono">
                                        {driver.driver_id}
                                      </span>
                                      <button
                                        onClick={() =>
                                          handleCopyDriverId(driver.driver_id)
                                        }
                                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                                        title="Copy Driver ID"
                                      >
                                        {copiedDriverId === driver.driver_id ? (
                                          <Check className="h-3 w-3 text-green-600" />
                                        ) : (
                                          <Copy className="h-3 w-3 text-gray-500" />
                                        )}
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-gray-400">
                                      N/A
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {driver.joining_date
                                    ? format(
                                        new Date(driver.joining_date),
                                        "dd MMM yyyy"
                                      )
                                    : "Not available"}
                                </TableCell>
                                <TableCell>{driver.phone_number}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span>
                                      {driver.vehicle_number || "Not assigned"}
                                    </span>
                                    {driver.vehicle_number && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {(() => {
                                          // Count drivers for this vehicle
                                          const vehicleDrivers =
                                            drivers.filter(
                                              (d) =>
                                                d.vehicle_number ===
                                                  driver.vehicle_number &&
                                                d.online &&
                                                d.id !== driver.id
                                            ).length + 1;
                                          return `${vehicleDrivers}/2`;
                                        })()}
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {driver.shift ? (
                                    <Badge
                                      variant={
                                        driver.shift === "morning"
                                          ? "default"
                                          : "secondary"
                                      }
                                      className="px-2 py-1 text-xs"
                                    >
                                      {driver.shift}
                                    </Badge>
                                  ) : (
                                    "Not set"
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      driver.driver_category === "salary_base"
                                        ? "default"
                                        : "outline"
                                    }
                                    className="px-2 py-1 text-xs"
                                  >
                                    {driver.driver_category === "salary_base"
                                      ? "Salary Base"
                                      : "Hub Base"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    {isUpdating === driver.id ? (
                                      <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-blue-500 animate-spin"></div>
                                    ) : (
                                      <>
                                        {driver.online ? (
                                          <Wifi className="h-4 w-4 text-green-500" />
                                        ) : (
                                          <WifiOff className="h-4 w-4 text-red-500" />
                                        )}
                                      </>
                                    )}
                                    <Switch
                                      checked={driver.online || false}
                                      onCheckedChange={() =>
                                        toggleOnlineStatus(
                                          driver.id,
                                          driver.online
                                        )
                                      }
                                      disabled={
                                        isUpdating === driver.id || !canPutDriverOnline
                                      }
                                      className="data-[state=checked]:bg-green-500"
                                      title={!canPutDriverOnline ? "Admin/Manager only" : ""}
                                    />
                                    {!canPutDriverOnline && (
                                      <span className="text-xs text-amber-600">
                                        (Admin/Manager)
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      driver.is_verified
                                        ? "success"
                                        : "destructive"
                                    }
                                    className="cursor-pointer px-2 py-1 text-xs"
                                    onClick={() =>
                                      toggleVerification(
                                        driver.id,
                                        driver.is_verified
                                      )
                                    }
                                  >
                                    {driver.is_verified
                                      ? "Verified"
                                      : "Unverified"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex space-x-1 items-center">
                                    {driver.license_front &&
                                    driver.license_back ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-red-500" />
                                    )}
                                    {driver.aadhar_front &&
                                    driver.aadhar_back ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-red-500" />
                                    )}
                                    {driver.pan_front && driver.pan_back ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-red-500" />
                                    )}
                                    {driver.uber_profile ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-red-500" />
                                    )}
                                    {(() => {
                                      const docCheck =
                                        checkAllDocumentsUploaded(driver);
                                      if (docCheck.allUploaded) {
                                        return (
                                          <CheckCircle className="h-4 w-4 text-green-500" />
                                        );
                                      } else {
                                        return (
                                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                                        );
                                      }
                                    })()}
                                  </div>
                                </TableCell>
                                {/* <TableCell>{rentalDays}</TableCell> */}
                                <TableCell>
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {driver.pending_balance || "0"}
                                  </div>
                                </TableCell>
                                {/* <TableCell>
                                <div
                                  className={`flex items-center ${
                                    (driver.total_penalties || 0) >= 0
                                      ? "text-green-500"
                                      : "text-red-500"
                                  }`}
                                >
                                  <IndianRupee className="h-3 w-3 mr-1" />
                                  {driver.total_penalties || "0"}
                                </div>
                              </TableCell> */}
                                <TableCell>
                                  <div
                                    className={`flex items-center ${
                                      penaltySummariesLoading &&
                                      !penaltyInfo.hasSummary
                                        ? "text-muted-foreground"
                                        : penaltyInfo.className
                                    }`}
                                  >
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {penaltySummariesLoading &&
                                    !penaltyInfo.hasSummary
                                      ? "..."
                                      : penaltyInfo.display}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div
                                    className={`flex items-center ${netInfo.className}`}
                                  >
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {netInfo.display}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center gap-2 justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openDriverDetails(driver)}
                                    >
                                      <Eye className="h-4 w-4 mr-1" /> View
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openPasswordReset(driver)}
                                      className="text-orange-600 hover:text-orange-700"
                                    >
                                      <Key className="h-4 w-4 mr-1" /> Reset
                                      Password
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
                </ScrollArea>
              </div>
            </>
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
                drivers
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

      <DriverDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        driverId={selectedDriver?.id ?? ""}
        onDriverUpdate={fetchDrivers}
      />

      {/* Overdue Warning Popup */}
      <Dialog open={showOverdueWarning} onOpenChange={setShowOverdueWarning}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Overdue Reports Found
            </DialogTitle>
            <DialogDescription>
              This driver has overdue rent submissions. They must be cleared
              before the driver can be taken offline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Driver: {overdueDriverName}</span>
              </div>
              <div className="flex items-center gap-2 text-orange-800 mt-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">
                  Overdue Count: {overdueCount}
                </span>
              </div>
              <p className="text-sm text-orange-600 mt-2">
                Please ensure all overdue reports are submitted and approved
                before changing this driver to offline / leave / resigning.
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <p>
                • Driver will remain online until all overdue days are cleared
              </p>
              <p>
                • You can review their reports in the calendar or cash trip list
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowOverdueWarning(false);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Joining Type Selection Modal */}
      <Dialog
        open={showJoiningTypeModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowJoiningTypeModal(false);
            setJoiningType(null);
            setSelectedDriverForJoining(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Joining Type
            </DialogTitle>
            <DialogDescription>
              Please select whether{" "}
              <strong>{selectedDriverForJoining?.driver?.name}</strong> is a new
              joining or rejoining.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-medium">
                Joining Type <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={joiningType === "new_joining" ? "default" : "outline"}
                  className={`h-20 flex flex-col items-center justify-center gap-2 ${
                    joiningType === "new_joining"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : ""
                  }`}
                  onClick={() => setJoiningType("new_joining")}
                >
                  <Users className="h-6 w-6" />
                  <span className="font-semibold">New Joining</span>
                </Button>
                <Button
                  type="button"
                  variant={joiningType === "rejoining" ? "default" : "outline"}
                  className={`h-20 flex flex-col items-center justify-center gap-2 ${
                    joiningType === "rejoining"
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : ""
                  }`}
                  onClick={() => setJoiningType("rejoining")}
                >
                  <CheckCircle className="h-6 w-6" />
                  <span className="font-semibold">Rejoining</span>
                </Button>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This selection will be saved and used to
                track the driver's joining status. The driver will only become
                active after you confirm this selection.
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowJoiningTypeModal(false);
                setJoiningType(null);
                setSelectedDriverForJoining(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleJoiningTypeConfirm}
              disabled={!joiningType}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Confirm & Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Modal */}
      <Dialog open={showPasswordReset} onOpenChange={setShowPasswordReset}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Key className="h-5 w-5" />
              Reset Driver Password
            </DialogTitle>
            <DialogDescription>
              Reset the login password for {selectedDriverForReset?.name}. This
              will allow them to login with the new password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">
                  Driver: {selectedDriverForReset?.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-orange-800 mt-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">
                  Email: {selectedDriverForReset?.email_id}
                </span>
              </div>
              <p className="text-sm text-orange-600 mt-2">
                Only admins can reset driver passwords. The driver will be
                notified to use the new password.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <p>• Password must be at least 6 characters long</p>
              <p>• Driver will need to use this password to login</p>
              <p>• Consider notifying the driver about the password change</p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordReset(false);
                setNewPassword("");
                setConfirmPassword("");
                setSelectedDriverForReset(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePasswordReset}
              disabled={isResettingPassword}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isResettingPassword ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Warning Dialog */}
      <Dialog open={showDocumentWarning} onOpenChange={setShowDocumentWarning}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Missing Documents
            </DialogTitle>
            <DialogDescription>
              All required documents must be uploaded before a driver can be put
              online.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-800 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">
                  Driver: {documentWarningDriver?.name || "Unknown"}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  Missing Documents:
                </p>
                <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                  {documentWarningDriver &&
                    checkAllDocumentsUploaded(
                      documentWarningDriver
                    ).missing.map((doc, index) => <li key={index}>{doc}</li>)}
                </ul>
              </div>
              <p className="text-sm text-amber-600 mt-3">
                Please ensure all required documents (License Front/Back, Aadhar
                Front/Back, PAN Front/Back) are uploaded before putting the
                driver online.
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <p>• All 6 document sides must be uploaded</p>
              <p>• Documents can be uploaded in the driver details modal</p>
              <p>
                • Driver status will remain offline until documents are complete
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDocumentWarning(false);
                setDocumentWarningDriver(null);
              }}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                if (documentWarningDriver) {
                  setShowDocumentWarning(false);
                  openDriverDetails(documentWarningDriver);
                }
              }}
              className="bg-amber-500 hover:bg-amber-600"
            >
              View Driver Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave/Resigning Selection Dialog */}
      <Dialog
        open={showLeaveResigningModal}
        onOpenChange={setShowLeaveResigningModal}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Users className="h-5 w-5" />
              Set Driver Status
            </DialogTitle>
            <DialogDescription>
              Please select the reason for taking{" "}
              {selectedDriverForStatus?.name || "this driver"} offline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">
                  Driver: {selectedDriverForStatus?.name || "Unknown"}
                </span>
              </div>
              <p className="text-sm text-blue-600 mt-2">
                Select whether the driver is going on leave or resigning. This
                will help track driver status accurately.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4 text-left"
                onClick={() => handleLeaveResigningSelection("leave")}
                disabled={isUpdating === selectedDriverForStatus?.id}
              >
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-orange-600">Leave</span>
                  <span className="text-sm text-gray-500">
                    Driver is going on leave
                  </span>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4 text-left"
                onClick={() => handleLeaveResigningSelection("resigning")}
                disabled={isUpdating === selectedDriverForStatus?.id}
              >
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-purple-600">
                    Resigning
                  </span>
                  <span className="text-sm text-gray-500">
                    Driver is resigning from the company
                  </span>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4 text-left"
                onClick={() => handleLeaveResigningSelection("offline")}
                disabled={isUpdating === selectedDriverForStatus?.id}
              >
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-gray-600">
                    Just Offline
                  </span>
                  <span className="text-sm text-gray-500">
                    No specific status, just taking offline
                  </span>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4 text-left"
                onClick={() => handleLeaveResigningSelection("going_to_24hr")}
                disabled={isUpdating === selectedDriverForStatus?.id}
              >
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-blue-600">
                    Going to 24hr
                  </span>
                  <span className="text-sm text-gray-500">
                    Driver is transitioning to 24hr shift
                  </span>
                </div>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowLeaveResigningModal(false);
                setSelectedDriverForStatus(null);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Return Date Dialog */}
      <Dialog
        open={showLeaveReturnDateModal}
        onOpenChange={setShowLeaveReturnDateModal}
      >
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <CalendarIcon className="h-5 w-5" />
              Set Leave Return Date
            </DialogTitle>
            <DialogDescription>
              Please select the expected return date for{" "}
              {selectedDriverForStatus?.name || "this driver"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-800 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">
                  Driver: {selectedDriverForStatus?.name || "Unknown"}
                </span>
              </div>
              <p className="text-sm text-orange-600 mt-2">
                This return date will help you know when to call the driver to
                come back. You can view all drivers on leave with their return
                dates in the drivers list.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leave-return-date">Expected Return Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !leaveReturnDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {leaveReturnDate ? (
                      format(leaveReturnDate, "dd MMM yyyy")
                    ) : (
                      <span>Select return date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 z-[100]"
                  align="start"
                  side="top"
                  sideOffset={4}
                  collisionPadding={8}
                >
                  <Calendar
                    mode="single"
                    selected={leaveReturnDate || undefined}
                    onSelect={(date) => setLeaveReturnDate(date || null)}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-gray-500">
                Select the date when the driver is expected to return from
                leave.
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowLeaveReturnDateModal(false);
                setLeaveReturnDate(null);
                setSelectedDriverForStatus(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLeaveReturnDateSubmit}
              disabled={
                isUpdating === selectedDriverForStatus?.id || !leaveReturnDate
              }
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isUpdating === selectedDriverForStatus?.id
                ? "Saving..."
                : "Set Leave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resignation Reason Dialog */}
      <Dialog
        open={showResignationReasonModal}
        onOpenChange={setShowResignationReasonModal}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-600">
              <Users className="h-5 w-5" />
              Resignation Reason
            </DialogTitle>
            <DialogDescription>
              Please provide the reason for{" "}
              {selectedDriverForStatus?.name || "this driver"}'s resignation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-800 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">
                  Driver: {selectedDriverForStatus?.name || "Unknown"}
                </span>
              </div>
              <p className="text-sm text-purple-600 mt-2">
                This reason will be saved in the driver's record for future
                reference.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resignation-reason">Resignation Reason *</Label>
              <Textarea
                id="resignation-reason"
                placeholder="Enter the reason for resignation..."
                value={resignationReason}
                onChange={(e) => setResignationReason(e.target.value)}
                className="min-h-[120px]"
                required
              />
              <p className="text-xs text-gray-500">
                Please provide a clear reason for the driver's resignation.
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowResignationReasonModal(false);
                setResignationReason("");
                setSelectedDriverForStatus(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResignationSubmit}
              disabled={
                isUpdating === selectedDriverForStatus?.id ||
                !resignationReason.trim()
              }
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isUpdating === selectedDriverForStatus?.id
                ? "Saving..."
                : "Save Resignation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offline Reason Dialog */}
      <Dialog
        open={showOfflineReasonModal}
        onOpenChange={setShowOfflineReasonModal}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-600">
              <WifiOff className="h-5 w-5" />
              Offline Reason
            </DialogTitle>
            <DialogDescription>
              Please provide the reason for taking{" "}
              {selectedDriverForStatus?.name || "this driver"} offline. Vehicle
              and shift will be set to N/A and Non-shift.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-800 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">
                  Driver: {selectedDriverForStatus?.name || "Unknown"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-800 mt-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">
                  Vehicle: {selectedDriverForStatus?.vehicle_number || "N/A"} →
                  N/A
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-800 mt-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">
                  Shift: {selectedDriverForStatus?.shift || "None"} → Non-shift
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                When a driver goes offline, their vehicle assignment and shift
                will be automatically cleared.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="offline-reason">Offline Reason *</Label>
              <Textarea
                id="offline-reason"
                placeholder="Enter the reason for going offline..."
                value={offlineReason}
                onChange={(e) => setOfflineReason(e.target.value)}
                className="min-h-[120px]"
                required
              />
              <p className="text-xs text-gray-500">
                Please provide a clear reason for taking the driver offline.
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowOfflineReasonModal(false);
                setOfflineReason("");
                setSelectedDriverForStatus(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleOfflineReasonSubmit}
              disabled={
                isUpdating === selectedDriverForStatus?.id ||
                !offlineReason.trim()
              }
              className="bg-gray-600 hover:bg-gray-700"
            >
              {isUpdating === selectedDriverForStatus?.id
                ? "Saving..."
                : "Take Offline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminDrivers;
