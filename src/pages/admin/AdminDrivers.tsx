import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
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
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { DriverDetailsModal } from "@/components/admin/drivers/DriverDetailsModal";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [shiftFilter, setShiftFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showLowDeposit, setShowLowDeposit] = useState(false);
  const [showNegativeBalance, setShowNegativeBalance] = useState(false);
  const [rentalDays, setRentalDays] = useState<any>(null);
  const [showOverdueWarning, setShowOverdueWarning] = useState(false);
  const [overdueAmount, setOverdueAmount] = useState(0);
  const [overdueDriverName, setOverdueDriverName] = useState("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showDocumentWarning, setShowDocumentWarning] = useState(false);
  const [documentWarningDriver, setDocumentWarningDriver] = useState<any>(null);
  const [penaltySummaries, setPenaltySummaries] = useState<
    Record<string, DriverPenaltySummary>
  >({});
  const [penaltySummariesLoading, setPenaltySummariesLoading] =
    useState<boolean>(false);

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
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
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

  const checkOverduePayments = async (
    driverId: string
  ): Promise<{ amount: number; driverName: string }> => {
    try {
      // Get driver details and check for overdue payments
      const { data: driverData, error: driverError } = await supabase
        .from("users")
        .select(
          "pending_balance, net_balance, name, driver_id, total_penalties"
        )
        .eq("id", driverId)
        .single();

      if (driverError) throw driverError;

      // Calculate R&F balance from penalty transactions
      const { data: penaltyData, error: penaltyError } = await supabase
        .from("driver_penalty_transactions")
        .select("amount, type")
        .eq("user_id", driverId);

      let rAndFBalance = 0;
      if (!penaltyError && penaltyData) {
        let totalPenalties = 0;
        let totalPenaltyPaid = 0;
        let totalRefunds = 0;
        let totalBonuses = 0;

        penaltyData.forEach((transaction: any) => {
          const amount = Number(transaction.amount) || 0;
          switch (transaction.type) {
            case "penalty":
            case "due":
            case "extra_collection":
              totalPenalties += amount;
              break;
            case "penalty_paid":
              totalPenaltyPaid += amount;
              break;
            case "refund":
              totalRefunds += amount;
              break;
            case "bonus":
              totalBonuses += amount;
              break;
          }
        });

        const totalCredits = totalPenaltyPaid + totalRefunds + totalBonuses;
        rAndFBalance = totalCredits - totalPenalties;
      } else {
        // Fallback to total_penalties if penalty transactions not available
        rAndFBalance = Number(driverData?.total_penalties ?? 0);
      }

      // Only show warning if R&F balance is negative (driver owes money)
      if (rAndFBalance < 0) {
        const overdueAmount = Math.abs(rAndFBalance);
        return {
          amount: overdueAmount,
          driverName:
            driverData?.name || driverData?.driver_id || "Unknown Driver",
        };
      }

      // If R&F balance is positive or zero, no warning needed
      return { amount: 0, driverName: "" };
    } catch (error) {
      console.error("Error checking overdue payments:", error);
      return { amount: 0, driverName: "" };
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

      let allDrivers;
      let totalCountValue;

      if (showNegativeBalance) {
        // When filtering by negative R&F balance, fetch all matching drivers first
        // (without pagination) to calculate R&F balance, then filter and paginate client-side
        const { data, error, count } = await query;

        if (error) throw error;

        allDrivers = data || [];
        totalCountValue = count || 0;

        // Fetch penalty summaries for all drivers and get the returned summaries
        const summaries = await fetchPenaltySummaries(allDrivers);

        // Filter by negative R&F balance client-side
        const filteredDrivers = allDrivers.filter((driver) => {
          const summary = summaries[driver.id];
          const fallbackValue = Number(driver?.total_penalties ?? 0);
          const rAndFValue =
            summary && typeof summary.netPenalties === "number"
              ? summary.netPenalties
              : fallbackValue;
          return Number.isFinite(rAndFValue) && rAndFValue < 0;
        });

        // Apply client-side pagination
        const from = (currentPage - 1) * pageSize;
        const to = from + pageSize;
        const paginatedDrivers = filteredDrivers.slice(from, to);

        setDrivers(paginatedDrivers);
        setTotalCount(filteredDrivers.length);
        setTotalPages(Math.ceil(filteredDrivers.length / pageSize));
      } else {
        // Normal flow: apply pagination server-side
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
      // Reset password using Supabase Admin API
      const { error } = await supabase.auth.admin.updateUserById(
        selectedDriverForReset.id,
        { password: newPassword }
      );

      if (error) {
        throw error;
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
    status: "leave" | "resigning" | "offline"
  ) => {
    if (!selectedDriverForStatus) return;

    const id = selectedDriverForStatus.id;
    setIsUpdating(id);
    setShowLeaveResigningModal(false);

    try {
      const updateData: any = {
        online: false,
        offline_from_date: new Date().toISOString().split("T")[0],
      };

      if (status === "leave") {
        updateData.driver_status = "leave";
      } else if (status === "resigning") {
        updateData.driver_status = "resigning";
        updateData.resigning_date = new Date().toISOString().split("T")[0];
      } else {
        // Just offline, no status
        updateData.driver_status = null;
      }

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
                resigning_date:
                  updateData.resigning_date || driver.resigning_date,
              }
            : driver
        )
      );

      toast.success(
        `Driver is now ${
          status === "leave"
            ? "on leave"
            : status === "resigning"
            ? "resigning"
            : "offline"
        }`
      );

      // Refresh statistics
      fetchStatistics();
    } catch (error) {
      console.error("Error updating driver status:", error);
      toast.error("Failed to update driver status");
    } finally {
      setIsUpdating(null);
      setSelectedDriverForStatus(null);
    }
  };

  const toggleOnlineStatus = async (
    id: string,
    currentStatus: boolean | null
  ) => {
    // Check if user is admin
    if (!isAdmin) {
      toast.error("Only admins can change driver online status");
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
    }

    // If trying to take driver offline, show leave/resigning modal
    if (currentStatus) {
      setSelectedDriverForStatus(driver);
      setShowLeaveResigningModal(true);
      return; // Don't proceed with offline action yet
    }

    try {
      setIsUpdating(id);

      const updateData: any = {
        online: !currentStatus,
        driver_status: null, // Clear status when going online
      };

      if (currentStatus) {
        // Going offline
        updateData.offline_from_date = new Date().toISOString().split("T")[0];
      } else {
        // Going online
        updateData.online_from_date = new Date().toISOString().split("T")[0];
        updateData.offline_from_date = null;
      }

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
                online: !currentStatus,
                offline_from_date: updateData.offline_from_date,
                online_from_date: updateData.online_from_date,
                driver_status: updateData.driver_status,
              }
            : driver
        )
      );

      toast.success(`Driver is now ${!currentStatus ? "online" : "offline"}`);

      // Refresh statistics
      fetchStatistics();
    } catch (error) {
      console.error("Error updating driver status:", error);
      toast.error("Failed to update driver online status");
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

  const resetFilters = () => {
    setSearchQuery("");
    setShiftFilter("all");
    setVerificationFilter("all");
    setShowOnlineOnly(false);
    setShowLowDeposit(false);
    setShowNegativeBalance(false);
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
            </Avatar>
            <div>
              <h3 className="font-medium">{driver.name}</h3>
              <p className="text-sm text-muted-foreground">{driver.email_id}</p>
            </div>
          </div>

          <div className="space-y-2">
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
                  disabled={isUpdating === driver.id || !isAdmin}
                  title={!isAdmin ? "Admin only" : ""}
                />
                {!isAdmin && (
                  <span className="text-xs text-amber-600">(Admin)</span>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-4">
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-500">
                Total Drivers
              </span>
              <span className="text-2xl font-bold">{statistics.total}</span>
            </div>
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
                Offline Drivers
              </span>
              <span className="text-2xl font-bold text-red-500">
                {statistics.offline}
              </span>
            </div>
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

              <Button
                variant="outline"
                size="sm"
                onClick={toggleFilters}
                className="flex items-center"
              >
                <Filter className="h-4 w-4 mr-1" />
                {showFilters ? "Hide Filters" : "Show Filters"}
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
                              colSpan={12}
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
                                <TableCell className="font-medium">
                                  {driver.name}
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
                                        isUpdating === driver.id || !isAdmin
                                      }
                                      className="data-[state=checked]:bg-green-500"
                                      title={!isAdmin ? "Admin only" : ""}
                                    />
                                    {!isAdmin && (
                                      <span className="text-xs text-amber-600">
                                        (Admin)
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
              Pending Balance Warning
            </DialogTitle>
            <DialogDescription>
              This driver has a pending balance. You can still make them
              offline.
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
                  Pending Amount: ₹{overdueAmount.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-orange-600 mt-2">
                This driver has a pending balance. You can still make them
                offline if needed.
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <p>• The pending balance will remain on their account</p>
              <p>• They can be made online again later</p>
              <p>• Balance will be settled when they come back online</p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowOverdueWarning(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setShowOverdueWarning(false);
                // Find the driver and proceed with offline action
                const driverToUpdate = drivers.find(
                  (driver) =>
                    driver.name === overdueDriverName ||
                    driver.id === overdueDriverName
                );
                if (driverToUpdate) {
                  await toggleOnlineStatus(driverToUpdate.id, true);
                }
              }}
            >
              Offline Anyway
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
    </AdminLayout>
  );
};

export default AdminDrivers;
