import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/context/AdminContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Car,
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Building2,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity,
  Target,
  Percent,
  BarChart3,
  AlertTriangle,
  Loader2,
  UserPlus,
  XCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subMonths,
  subWeeks,
  format,
  isSameDay,
  subDays,
} from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "lucide-react";
import { Label } from "@/components/ui/label";

interface FinancialMetrics {
  currentMonth: {
    revenue: number;
    expenses: number;
    profit: number;
    cashCollected: number;
    penalties: number;
    tolls: number;
  };
  lastMonth: {
    revenue: number;
    expenses: number;
    profit: number;
    cashCollected: number;
    penalties: number;
    tolls: number;
  };
  currentWeek: {
    revenue: number;
    expenses: number;
    profit: number;
  };
  lastWeek: {
    revenue: number;
    expenses: number;
    profit: number;
  };
}

interface OperationalMetrics {
  fleetUtilization: number;
  driverUtilization: number;
  reportSubmissionRate: number;
  reportApprovalRate: number;
  onTimeReportRate: number;
  complianceRate: number;
  leaveRate: number;
  driverRetention: number;
}

interface EfficiencyMetrics {
  revenuePerDriver: number;
  revenuePerVehicle: number;
  revenuePerTrip: number;
  tripsPerDriver: number;
  tripsPerVehicle: number;
  expenseRatio: number;
  profitMargin: number;
  cashCollectionRate: number;
}

interface CEOInsight {
  priority: "high" | "medium" | "low";
  title: string;
  message: string;
  metric?: string;
  value?: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, isManager, userRole, loading: adminLoading } = useAdmin();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && isManager && !isAdmin && userRole === "manager") {
      navigate("/admin/drivers", { replace: true });
    }
  }, [adminLoading, isAdmin, isManager, userRole, navigate]);
  const [financialMetrics, setFinancialMetrics] =
    useState<FinancialMetrics | null>(null);
  const [operationalMetrics, setOperationalMetrics] =
    useState<OperationalMetrics | null>(null);
  const [efficiencyMetrics, setEfficiencyMetrics] =
    useState<EfficiencyMetrics | null>(null);
  const [ceoInsights, setCeoInsights] = useState<CEOInsight[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalDrivers: 0,
    activeDrivers: 0,
    totalVehicles: 0,
    activeVehicles: 0,
    totalReports: 0,
    approvedReports: 0,
    pendingReports: 0,
    rejectedReports: 0,
    outstandingDeposits: 0,
    totalTrips: 0,
    totalJoinedDrivers: 0,
    totalLeaveDrivers: 0,
    totalResignedDrivers: 0,
  });

  const [driverUpdatesFilter, setDriverUpdatesFilter] = useState<
    "today" | "yesterday" | "weekly" | "monthly" | "custom"
  >("today");
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [driverUpdates, setDriverUpdates] = useState({
    totalDrivers: 0,
    leaveDrivers: 0,
    resignedDrivers: 0,
  });

  useEffect(() => {
    fetchAllMetrics();
  }, []);

  useEffect(() => {
    fetchDriverUpdates();
  }, [driverUpdatesFilter, customStartDate, customEndDate]);

  const fetchAllMetrics = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));
      const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

      // Fetch all data in parallel
      const today = format(now, "yyyy-MM-dd");
      const [
        driversData,
        vehiclesData,
        reportsCurrentMonth,
        reportsLastMonth,
        reportsCurrentWeek,
        reportsLastWeek,
        penaltyData,
        leaveData,
        depositsData,
        allReports,
        trendReports,
        leaveReportsToday,
        approvedLeaveApplications,
      ] = await Promise.all([
        supabase
          .from("users")
          .select("id, online, role, resigning_date, created_at"),
        supabase.from("vehicles").select("id, online"),
        supabase
          .from("fleet_reports")
          .select("*")
          .gte("rent_date", format(currentMonthStart, "yyyy-MM-dd"))
          .lte("rent_date", format(currentMonthEnd, "yyyy-MM-dd")),
        supabase
          .from("fleet_reports")
          .select("*")
          .gte("rent_date", format(lastMonthStart, "yyyy-MM-dd"))
          .lte("rent_date", format(lastMonthEnd, "yyyy-MM-dd")),
        supabase
          .from("fleet_reports")
          .select("*")
          .gte("rent_date", format(currentWeekStart, "yyyy-MM-dd"))
          .lte("rent_date", format(currentWeekEnd, "yyyy-MM-dd")),
        supabase
          .from("fleet_reports")
          .select("*")
          .gte("rent_date", format(lastWeekStart, "yyyy-MM-dd"))
          .lte("rent_date", format(lastWeekEnd, "yyyy-MM-dd")),
        supabase
          .from("driver_penalty_transactions")
          .select("*")
          .gte("created_at", format(currentMonthStart, "yyyy-MM-dd")),
        supabase
          .from("leave_applications")
          .select("*")
          .gte("start_date", format(currentMonthStart, "yyyy-MM-dd")),
        supabase.from("users").select("pending_balance").eq("online", true),
        supabase
          .from("fleet_reports")
          .select("*")
          .order("rent_date", { ascending: false })
          .limit(1000),
        supabase
          .from("fleet_reports")
          .select("rent_date, total_earnings, rent_paid_amount, toll, status")
          .gte("rent_date", format(subDays(now, 30), "yyyy-MM-dd"))
          .order("rent_date", { ascending: true }),
        supabase
          .from("fleet_reports")
          .select("user_id")
          .eq("rent_date", today)
          .eq("status", "leave"),
        supabase
          .from("leave_applications")
          .select("user_id, start_date, end_date")
          .eq("status", "approved")
          .lte("start_date", today)
          .gte("end_date", today),
      ]);

      // Calculate basic stats
      const drivers = driversData.data || [];
      const vehicles = vehiclesData.data || [];
      const allReportsData = allReports.data || [];
      const activeDrivers = drivers.filter(
        (d) => d.online && !d.resigning_date && d.role === "driver"
      ).length;
      const activeVehicles = vehicles.filter((v) => v.online).length;
      const approvedReports = allReportsData.filter(
        (r) => r.status === "approved"
      ).length;
      const pendingReports = allReportsData.filter(
        (r) => r.status === "pending_verification"
      ).length;
      const rejectedReports = allReportsData.filter(
        (r) => r.status === "rejected"
      ).length;
      const totalTrips = allReportsData.reduce(
        (sum, r) => sum + (r.total_trips || 0),
        0
      );
      const outstandingDeposits = (depositsData.data || []).reduce(
        (sum, d) => sum + (Number(d.pending_balance) || 0),
        0
      );

      // Calculate driver statistics
      const totalJoinedDrivers = drivers.filter(
        (d) => d.role === "driver"
      ).length;
      const totalResignedDrivers = drivers.filter(
        (d) => d.resigning_date && d.role === "driver"
      ).length;

      // Calculate leave drivers: from fleet_reports with status='leave' for today
      const leaveReportsTodayData = leaveReportsToday.data || [];
      const leaveDriverIdsFromReports = new Set(
        leaveReportsTodayData.map((r) => r.user_id)
      );

      // Also check approved leave applications that cover today
      const approvedLeaveApps = approvedLeaveApplications.data || [];
      const leaveDriverIdsFromApps = new Set(
        approvedLeaveApps.map((app) => app.user_id)
      );

      // Combine both sources and get unique driver IDs
      const allLeaveDriverIds = new Set([
        ...leaveDriverIdsFromReports,
        ...leaveDriverIdsFromApps,
      ]);
      const totalLeaveDrivers = allLeaveDriverIds.size;

      setStats({
        totalDrivers: totalJoinedDrivers,
        activeDrivers,
        totalVehicles: vehicles.length,
        activeVehicles,
        totalReports: allReportsData.length,
        approvedReports,
        pendingReports,
        rejectedReports,
        outstandingDeposits,
        totalTrips,
        totalJoinedDrivers,
        totalLeaveDrivers,
        totalResignedDrivers,
      });

      // Calculate financial metrics
      const calcFinancials = (reports: any[]) => {
        const revenue = reports.reduce(
          (sum, r) => sum + (Number(r.total_earnings) || 0),
          0
        );
        const rentExpenses = reports.reduce(
          (sum, r) => sum + (Number(r.rent_paid_amount) || 0),
          0
        );
        const tolls = reports.reduce(
          (sum, r) => sum + (Number(r.toll) || 0),
          0
        );
        const cashCollected = reports.reduce(
          (sum, r) => sum + (Number(r.total_cashcollect) || 0),
          0
        );
        const expenses = rentExpenses + tolls;
        const profit = revenue - expenses;
        return {
          revenue,
          expenses,
          profit,
          cashCollected,
          penalties: 0,
          tolls,
        };
      };

      const currentMonthFinancials = calcFinancials(
        reportsCurrentMonth.data || []
      );
      const lastMonthFinancials = calcFinancials(reportsLastMonth.data || []);
      const currentWeekFinancials = calcFinancials(
        reportsCurrentWeek.data || []
      );
      const lastWeekFinancials = calcFinancials(reportsLastWeek.data || []);

      // Add penalties
      const currentMonthPenalties = (penaltyData.data || [])
        .filter((p) => p.type === "penalty" || p.type === "due")
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      currentMonthFinancials.penalties = currentMonthPenalties;
      currentMonthFinancials.expenses += currentMonthPenalties;

      setFinancialMetrics({
        currentMonth: currentMonthFinancials,
        lastMonth: lastMonthFinancials,
        currentWeek: currentWeekFinancials,
        lastWeek: lastWeekFinancials,
      });

      // Calculate operational metrics
      const expectedReports = activeDrivers * 30; // Assuming 30 working days
      const submittedReports = allReportsData.length;
      const onTimeReports = allReportsData.filter((r) => {
        const rentDate = new Date(r.rent_date);
        const submissionDate = new Date(r.submission_date || r.created_at);
        return isSameDay(rentDate, submissionDate);
      }).length;

      const fleetUtilization =
        vehicles.length > 0 ? (activeVehicles / vehicles.length) * 100 : 0;
      const driverUtilization =
        stats.totalDrivers > 0 ? (activeDrivers / stats.totalDrivers) * 100 : 0;
      const reportSubmissionRate =
        expectedReports > 0 ? (submittedReports / expectedReports) * 100 : 0;
      const reportApprovalRate =
        submittedReports > 0 ? (approvedReports / submittedReports) * 100 : 0;
      const onTimeReportRate =
        submittedReports > 0 ? (onTimeReports / submittedReports) * 100 : 0;
      const complianceRate =
        submittedReports > 0 ? (approvedReports / submittedReports) * 100 : 0;

      const leaveDays = (leaveData.data || []).reduce((sum, l) => {
        const start = new Date(l.start_date);
        const end = new Date(l.end_date);
        const days =
          Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
          1;
        return sum + days;
      }, 0);
      const leaveRate = (leaveDays / (activeDrivers * 30)) * 100;

      const resignedDrivers = drivers.filter((d) => d.resigning_date).length;
      const driverRetention =
        stats.totalDrivers + resignedDrivers > 0
          ? (activeDrivers / (stats.totalDrivers + resignedDrivers)) * 100
          : 100;

      setOperationalMetrics({
        fleetUtilization,
        driverUtilization,
        reportSubmissionRate,
        reportApprovalRate,
        onTimeReportRate,
        complianceRate,
        leaveRate,
        driverRetention,
      });

      // Calculate efficiency metrics
      const revenuePerDriver =
        activeDrivers > 0 ? currentMonthFinancials.revenue / activeDrivers : 0;
      const revenuePerVehicle =
        activeVehicles > 0
          ? currentMonthFinancials.revenue / activeVehicles
          : 0;
      const revenuePerTrip =
        totalTrips > 0 ? currentMonthFinancials.revenue / totalTrips : 0;
      const tripsPerDriver = activeDrivers > 0 ? totalTrips / activeDrivers : 0;
      const tripsPerVehicle =
        activeVehicles > 0 ? totalTrips / activeVehicles : 0;
      const expenseRatio =
        currentMonthFinancials.revenue > 0
          ? (currentMonthFinancials.expenses / currentMonthFinancials.revenue) *
            100
          : 0;
      const profitMargin =
        currentMonthFinancials.revenue > 0
          ? (currentMonthFinancials.profit / currentMonthFinancials.revenue) *
            100
          : 0;
      const cashCollectionRate =
        currentMonthFinancials.revenue > 0
          ? (currentMonthFinancials.cashCollected /
              currentMonthFinancials.revenue) *
            100
          : 0;

      setEfficiencyMetrics({
        revenuePerDriver,
        revenuePerVehicle,
        revenuePerTrip,
        tripsPerDriver,
        tripsPerVehicle,
        expenseRatio,
        profitMargin,
        cashCollectionRate,
      });

      // Generate CEO insights
      const insights: CEOInsight[] = [];
      const revenueMoMChange =
        lastMonthFinancials.revenue > 0
          ? ((currentMonthFinancials.revenue - lastMonthFinancials.revenue) /
              lastMonthFinancials.revenue) *
            100
          : 0;

      if (revenueMoMChange < -10) {
        insights.push({
          priority: "high",
          title: "Revenue Decline Alert",
          message: `Revenue decreased by ${Math.abs(revenueMoMChange).toFixed(
            1
          )}% compared to last month. Immediate review recommended.`,
          metric: "Revenue MoM",
          value: revenueMoMChange,
        });
      } else if (revenueMoMChange < -5) {
        insights.push({
          priority: "medium",
          title: "Revenue Decline Warning",
          message: `Revenue decreased by ${Math.abs(revenueMoMChange).toFixed(
            1
          )}% compared to last month. Monitor closely.`,
          metric: "Revenue MoM",
          value: revenueMoMChange,
        });
      }

      if (fleetUtilization < 60) {
        insights.push({
          priority: "high",
          title: "Low Fleet Utilization",
          message: `Fleet utilization is ${fleetUtilization.toFixed(
            1
          )}%. Consider optimizing vehicle assignments or reducing fleet size.`,
          metric: "Fleet Utilization",
          value: fleetUtilization,
        });
      } else if (fleetUtilization < 75) {
        insights.push({
          priority: "medium",
          title: "Fleet Utilization Opportunity",
          message: `Fleet utilization is ${fleetUtilization.toFixed(
            1
          )}%. There's room for improvement.`,
          metric: "Fleet Utilization",
          value: fleetUtilization,
        });
      }

      if (reportSubmissionRate < 80) {
        insights.push({
          priority: "high",
          title: "Low Report Submission Rate",
          message: `Only ${reportSubmissionRate.toFixed(
            1
          )}% of expected reports submitted. Follow up with drivers required.`,
          metric: "Submission Rate",
          value: reportSubmissionRate,
        });
      }

      if (driverRetention < 85) {
        insights.push({
          priority: "high",
          title: "Driver Retention Concern",
          message: `Driver retention rate is ${driverRetention.toFixed(
            1
          )}%. Review retention strategies.`,
          metric: "Retention Rate",
          value: driverRetention,
        });
      }

      if (outstandingDeposits > 100000) {
        insights.push({
          priority: "medium",
          title: "High Outstanding Deposits",
          message: `Outstanding deposits total ₹${(
            outstandingDeposits / 1000
          ).toFixed(0)}K. Consider collection strategy.`,
          metric: "Outstanding Deposits",
          value: outstandingDeposits,
        });
      }

      if (reportApprovalRate < 90) {
        insights.push({
          priority: "medium",
          title: "Report Approval Rate",
          message: `Approval rate is ${reportApprovalRate.toFixed(
            1
          )}%. Review rejection reasons and improve compliance.`,
          metric: "Approval Rate",
          value: reportApprovalRate,
        });
      }

      if (insights.length === 0) {
        insights.push({
          priority: "low",
          title: "All Systems Operational",
          message:
            "All key metrics are within healthy ranges. Company is performing well.",
        });
      }

      setCeoInsights(insights);

      // Prepare trend data for charts
      const trendReportsData = trendReports.data || [];
      const trendMap = new Map<
        string,
        { revenue: number; expenses: number; profit: number }
      >();

      trendReportsData.forEach((report) => {
        const date = format(new Date(report.rent_date), "MMM dd");
        const revenue = Number(report.total_earnings) || 0;
        const expenses =
          (Number(report.rent_paid_amount) || 0) + (Number(report.toll) || 0);
        const profit = revenue - expenses;

        if (trendMap.has(date)) {
          const existing = trendMap.get(date)!;
          existing.revenue += revenue;
          existing.expenses += expenses;
          existing.profit += profit;
        } else {
          trendMap.set(date, { revenue, expenses, profit });
        }
      });

      const chartData = Array.from(trendMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort(
          (a, b) =>
            new Date(a.date + " 2024").getTime() -
            new Date(b.date + " 2024").getTime()
        );

      setTrendData(chartData);
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDriverUpdates = async () => {
    try {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      if (driverUpdatesFilter === "custom") {
        if (!customStartDate || !customEndDate) {
          // Don't fetch if custom dates are not set
          return;
        }
        startDate = customStartDate;
        endDate = customEndDate;
      } else {
        switch (driverUpdatesFilter) {
          case "today":
            startDate = now;
            endDate = now;
            break;
          case "yesterday":
            startDate = subDays(now, 1);
            endDate = subDays(now, 1);
            break;
          case "weekly":
            startDate = startOfWeek(now, { weekStartsOn: 1 });
            endDate = endOfWeek(now, { weekStartsOn: 1 });
            break;
          case "monthly":
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
            break;
          default:
            startDate = now;
            endDate = now;
        }
      }

      const startDateStr = format(startDate, "yyyy-MM-dd");
      const endDateStr = format(endDate, "yyyy-MM-dd");

      // Fetch drivers joined in the period
      const { data: joinedDrivers } = await supabase
        .from("users")
        .select("id")
        .eq("role", "driver")
        .gte("created_at", startDateStr + "T00:00:00")
        .lte("created_at", endDateStr + "T23:59:59");

      // Fetch drivers resigned in the period
      const { data: resignedDrivers } = await supabase
        .from("users")
        .select("id")
        .eq("role", "driver")
        .not("resigning_date", "is", null)
        .gte("resigning_date", startDateStr)
        .lte("resigning_date", endDateStr);

      // Fetch leave reports in the period
      const { data: leaveReports } = await supabase
        .from("fleet_reports")
        .select("user_id, rent_date")
        .eq("status", "leave")
        .gte("rent_date", startDateStr)
        .lte("rent_date", endDateStr);

      // Fetch approved leave applications that overlap with the period
      const { data: leaveApplications } = await supabase
        .from("leave_applications")
        .select("user_id, start_date, end_date")
        .eq("status", "approved")
        .lte("start_date", endDateStr)
        .gte("end_date", startDateStr);

      // Calculate unique leave drivers
      const leaveDriverIds = new Set<string>();

      // Add drivers from leave reports
      if (leaveReports) {
        leaveReports.forEach((report) => {
          leaveDriverIds.add(report.user_id);
        });
      }

      // Add drivers from leave applications
      if (leaveApplications) {
        leaveApplications.forEach((app) => {
          leaveDriverIds.add(app.user_id);
        });
      }

      setDriverUpdates({
        totalDrivers: joinedDrivers?.length || 0,
        leaveDrivers: leaveDriverIds.size,
        resignedDrivers: resignedDrivers?.length || 0,
      });
    } catch (error) {
      console.error("Error fetching driver updates:", error);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `₹${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toFixed(0)}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const getInsightColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-500 bg-red-50 text-red-900";
      case "medium":
        return "border-yellow-500 bg-yellow-50 text-yellow-900";
      default:
        return "border-green-500 bg-green-50 text-green-900";
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Company Overview">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
        </div>
      </AdminLayout>
    );
  }

  const revenueMoMChange =
    financialMetrics && financialMetrics.lastMonth.revenue > 0
      ? calculateChange(
          financialMetrics.currentMonth.revenue,
          financialMetrics.lastMonth.revenue
        )
      : 0;

  const profitMoMChange =
    financialMetrics && financialMetrics.lastMonth.profit > 0
      ? calculateChange(
          financialMetrics.currentMonth.profit,
          financialMetrics.lastMonth.profit
        )
      : financialMetrics?.currentMonth.profit || 0 > 0
      ? 100
      : 0;

  const getPerformanceBadge = (status: string) => {
    if (status === "profit") return "bg-green-500 text-white";
    if (status === "loss") return "bg-red-500 text-white";
    return "bg-gray-500 text-white";
  };

  return (
    <AdminLayout title="Company Overview">
      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-violet-100 to-violet-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-violet-800">
              Total Revenue (MoM)
            </CardTitle>
            <DollarSign className="h-5 w-5 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-900">
              {financialMetrics
                ? formatCurrency(financialMetrics.currentMonth.revenue)
                : "₹0"}
            </div>
            <div
              className={cn(
                "flex items-center text-xs mt-2",
                revenueMoMChange >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {revenueMoMChange >= 0 ? (
                <ArrowUpRight className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDownRight className="h-4 w-4 mr-1" />
              )}
              <span>
                {Math.abs(revenueMoMChange).toFixed(1)}% from last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-100 to-rose-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-rose-800">
              Net Profit (Margin)
            </CardTitle>
            <Wallet className="h-5 w-5 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-900">
              {financialMetrics
                ? formatCurrency(financialMetrics.currentMonth.profit)
                : "₹0"}
            </div>
            <div className="flex items-center gap-2 text-xs text-rose-600 mt-2">
              <span>
                Margin:{" "}
                {efficiencyMetrics
                  ? formatPercentage(efficiencyMetrics.profitMargin)
                  : "0%"}
              </span>
              {profitMoMChange !== 0 && (
                <span
                  className={cn(
                    profitMoMChange >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  ({profitMoMChange >= 0 ? "+" : ""}
                  {profitMoMChange.toFixed(1)}%)
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-sky-100 to-sky-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-sky-800">
              Active Fleet ({stats.activeVehicles}/{stats.totalVehicles})
            </CardTitle>
            <Car className="h-5 w-5 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-900">
              {stats.activeVehicles}
            </div>
            <div className="flex items-center text-xs text-sky-600 mt-2">
              <Activity className="h-4 w-4 mr-1" />
              <span>
                Utilization:{" "}
                {operationalMetrics
                  ? formatPercentage(operationalMetrics.fleetUtilization)
                  : "0%"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-100 to-emerald-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800">
              Active Drivers ({stats.activeDrivers}/{stats.totalDrivers})
            </CardTitle>
            <Users className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">
              {stats.activeDrivers}
            </div>
            <div className="flex items-center text-xs text-emerald-600 mt-2">
              <Percent className="h-4 w-4 mr-1" />
              <span>
                Utilization:{" "}
                {operationalMetrics
                  ? formatPercentage(operationalMetrics.driverUtilization)
                  : "0%"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Driver Updates Section with Filters */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Driver Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={driverUpdatesFilter === "today" ? "default" : "outline"}
              size="sm"
              onClick={() => setDriverUpdatesFilter("today")}
              className={cn(
                driverUpdatesFilter === "today" &&
                  "bg-fleet-purple text-white hover:bg-fleet-purple/90"
              )}
            >
              Today
            </Button>
            <Button
              variant={
                driverUpdatesFilter === "yesterday" ? "default" : "outline"
              }
              size="sm"
              onClick={() => setDriverUpdatesFilter("yesterday")}
              className={cn(
                driverUpdatesFilter === "yesterday" &&
                  "bg-fleet-purple text-white hover:bg-fleet-purple/90"
              )}
            >
              Yesterday
            </Button>
            <Button
              variant={driverUpdatesFilter === "weekly" ? "default" : "outline"}
              size="sm"
              onClick={() => setDriverUpdatesFilter("weekly")}
              className={cn(
                driverUpdatesFilter === "weekly" &&
                  "bg-fleet-purple text-white hover:bg-fleet-purple/90"
              )}
            >
              Weekly
            </Button>
            <Button
              variant={
                driverUpdatesFilter === "monthly" ? "default" : "outline"
              }
              size="sm"
              onClick={() => setDriverUpdatesFilter("monthly")}
              className={cn(
                driverUpdatesFilter === "monthly" &&
                  "bg-fleet-purple text-white hover:bg-fleet-purple/90"
              )}
            >
              Monthly
            </Button>
            <Button
              variant={driverUpdatesFilter === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setDriverUpdatesFilter("custom")}
              className={cn(
                driverUpdatesFilter === "custom" &&
                  "bg-fleet-purple text-white hover:bg-fleet-purple/90"
              )}
            >
              Custom Date Range
            </Button>
          </div>

          {/* Custom Date Range Pickers */}
          {driverUpdatesFilter === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !customStartDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {customStartDate ? (
                        format(customStartDate, "dd MMM yyyy")
                      ) : (
                        <span>Pick a start date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={customStartDate || undefined}
                      onSelect={(date) => setCustomStartDate(date || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !customEndDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {customEndDate ? (
                        format(customEndDate, "dd MMM yyyy")
                      ) : (
                        <span>Pick an end date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={customEndDate || undefined}
                      onSelect={(date) => setCustomEndDate(date || null)}
                      initialFocus
                      disabled={(date) =>
                        customStartDate ? date < customStartDate : false
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Driver Update Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-indigo-100 to-indigo-50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-indigo-800">
                  Total Drivers
                </CardTitle>
                <UserPlus className="h-5 w-5 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-900">
                  {driverUpdates.totalDrivers}
                </div>
                <div className="flex items-center text-xs text-indigo-600 mt-2">
                  <Users className="h-4 w-4 mr-1" />
                  <span>
                    {driverUpdatesFilter === "custom" &&
                    customStartDate &&
                    customEndDate
                      ? `Joined from ${format(
                          customStartDate,
                          "dd MMM"
                        )} to ${format(customEndDate, "dd MMM yyyy")}`
                      : driverUpdatesFilter === "today"
                      ? "Joined today"
                      : driverUpdatesFilter === "yesterday"
                      ? "Joined yesterday"
                      : driverUpdatesFilter === "weekly"
                      ? "Joined this week"
                      : "Joined this month"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-100 to-amber-50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-amber-800">
                  Drivers on Leave
                </CardTitle>
                <Clock className="h-5 w-5 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-900">
                  {driverUpdates.leaveDrivers}
                </div>
                <div className="flex items-center text-xs text-amber-600 mt-2">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>
                    {driverUpdatesFilter === "custom" &&
                    customStartDate &&
                    customEndDate
                      ? `On leave from ${format(
                          customStartDate,
                          "dd MMM"
                        )} to ${format(customEndDate, "dd MMM yyyy")}`
                      : driverUpdatesFilter === "today"
                      ? "On leave today"
                      : driverUpdatesFilter === "yesterday"
                      ? "On leave yesterday"
                      : driverUpdatesFilter === "weekly"
                      ? "On leave this week"
                      : "On leave this month"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-rose-100 to-rose-50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-rose-800">
                  Resigned Drivers
                </CardTitle>
                <XCircle className="h-5 w-5 text-rose-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-900">
                  {driverUpdates.resignedDrivers}
                </div>
                <div className="flex items-center text-xs text-rose-600 mt-2">
                  <TrendingDown className="h-4 w-4 mr-1" />
                  <span>
                    {driverUpdatesFilter === "custom" &&
                    customStartDate &&
                    customEndDate
                      ? `Resigned from ${format(
                          customStartDate,
                          "dd MMM"
                        )} to ${format(customEndDate, "dd MMM yyyy")}`
                      : driverUpdatesFilter === "today"
                      ? "Resigned today"
                      : driverUpdatesFilter === "yesterday"
                      ? "Resigned yesterday"
                      : driverUpdatesFilter === "weekly"
                      ? "Resigned this week"
                      : "Resigned this month"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Financial KPIs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Revenue Growth</span>
              <span
                className={cn(
                  "font-semibold",
                  revenueMoMChange >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {revenueMoMChange >= 0 ? "+" : ""}
                {formatPercentage(revenueMoMChange)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Profit Margin</span>
              <span className="font-semibold">
                {efficiencyMetrics
                  ? formatPercentage(efficiencyMetrics.profitMargin)
                  : "0%"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Expense Ratio</span>
              <span className="font-semibold">
                {efficiencyMetrics
                  ? formatPercentage(efficiencyMetrics.expenseRatio)
                  : "0%"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Cash Collection Rate
              </span>
              <span className="font-semibold">
                {efficiencyMetrics
                  ? formatPercentage(efficiencyMetrics.cashCollectionRate)
                  : "0%"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Operational KPIs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Fleet Utilization</span>
              <span className="font-semibold">
                {operationalMetrics
                  ? formatPercentage(operationalMetrics.fleetUtilization)
                  : "0%"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Submission Rate</span>
              <span className="font-semibold">
                {operationalMetrics
                  ? formatPercentage(operationalMetrics.reportSubmissionRate)
                  : "0%"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Approval Rate</span>
              <span className="font-semibold">
                {operationalMetrics
                  ? formatPercentage(operationalMetrics.reportApprovalRate)
                  : "0%"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">On-Time Report Rate</span>
              <span className="font-semibold">
                {operationalMetrics
                  ? formatPercentage(operationalMetrics.onTimeReportRate)
                  : "0%"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Efficiency Ratios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Revenue per Driver</span>
              <span className="font-semibold">
                {efficiencyMetrics
                  ? formatCurrency(efficiencyMetrics.revenuePerDriver)
                  : "₹0"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Revenue per Vehicle</span>
              <span className="font-semibold">
                {efficiencyMetrics
                  ? formatCurrency(efficiencyMetrics.revenuePerVehicle)
                  : "₹0"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Revenue per Trip</span>
              <span className="font-semibold">
                {efficiencyMetrics
                  ? formatCurrency(efficiencyMetrics.revenuePerTrip)
                  : "₹0"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Trips per Driver</span>
              <span className="font-semibold">
                {efficiencyMetrics
                  ? efficiencyMetrics.tripsPerDriver.toFixed(1)
                  : "0"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Analysis Charts */}
      {trendData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient
                        id="colorRevenue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#8B5CF6"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#8B5CF6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#8B5CF6"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profit & Loss Trend (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke="#22c55e"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="#ef4444"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CEO Insights Panel */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            CEO Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ceoInsights.map((insight, index) => (
              <div
                key={index}
                className={cn(
                  "p-4 rounded-lg border-2",
                  getInsightColor(insight.priority)
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={
                          insight.priority === "high"
                            ? "destructive"
                            : insight.priority === "medium"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {insight.priority.toUpperCase()}
                      </Badge>
                      <h4 className="font-semibold">{insight.title}</h4>
                    </div>
                    <p className="text-sm mt-1">{insight.message}</p>
                    {insight.metric && insight.value !== undefined && (
                      <p className="text-xs mt-2 opacity-75">
                        {insight.metric}:{" "}
                        {typeof insight.value === "number"
                          ? insight.value.toFixed(1)
                          : insight.value}
                      </p>
                    )}
                  </div>
                  {insight.priority === "high" && (
                    <AlertTriangle className="h-5 w-5 text-red-600 ml-4" />
                  )}
                  {insight.priority === "low" && (
                    <CheckCircle2 className="h-5 w-5 text-green-600 ml-4" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-indigo-100 to-indigo-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-indigo-800">
              Monthly Expenses
            </CardTitle>
            <CreditCard className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-900">
              {financialMetrics
                ? formatCurrency(financialMetrics.currentMonth.expenses)
                : "₹0"}
            </div>
            <div className="text-xs text-indigo-600 mt-2 space-y-1">
              <div>
                Rent:{" "}
                {financialMetrics
                  ? formatCurrency(
                      financialMetrics.currentMonth.expenses -
                        financialMetrics.currentMonth.tolls -
                        financialMetrics.currentMonth.penalties
                    )
                  : "₹0"}
              </div>
              <div>
                Tolls:{" "}
                {financialMetrics
                  ? formatCurrency(financialMetrics.currentMonth.tolls)
                  : "₹0"}
              </div>
              <div>
                Penalties:{" "}
                {financialMetrics
                  ? formatCurrency(financialMetrics.currentMonth.penalties)
                  : "₹0"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-100 to-purple-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">
              Reports Status
            </CardTitle>
            <FileText className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {stats.totalReports}
            </div>
            <div className="text-xs text-purple-600 mt-2 space-y-1">
              <div className="flex justify-between">
                <span>Approved:</span>
                <span className="font-semibold text-green-600">
                  {stats.approvedReports}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pending:</span>
                <span className="font-semibold text-yellow-600">
                  {stats.pendingReports}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Rejected:</span>
                <span className="font-semibold text-red-600">
                  {stats.rejectedReports}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-100 to-teal-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-teal-800">
              Outstanding Deposits
            </CardTitle>
            <Building2 className="h-5 w-5 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-900">
              {formatCurrency(stats.outstandingDeposits)}
            </div>
            <div className="flex items-center text-xs text-teal-600 mt-2">
              <Clock className="h-4 w-4 mr-1" />
              <span>Pending collection from drivers</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
