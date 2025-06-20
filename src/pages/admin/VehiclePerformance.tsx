import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { useVehicleTransactions } from "@/hooks/useVehicleTransactions";
import VehicleTransactionHistory from "@/components/VehicleTransactionHistory";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Car,
  Calendar,
  Activity,
  Settings,
  History,
} from "lucide-react";
import { toast } from "sonner";
import {
  format,
  startOfWeek,
  endOfWeek,
  subDays,
  startOfDay,
  endOfDay,
} from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface VehiclePerformance {
  vehicle_number: string;
  total_trips: number;
  total_earnings: number;
  total_rent: number;
  additional_income: number;
  expenses: number;
  profit_loss: number;
  worked_days: number;
  avg_trips_per_day: number;
  avg_earnings_per_day: number;
  rent_slab: string;
  performance_status: "profit" | "loss" | "break_even";
  working_days_multiplier: number;
  id?: string;
  date?: string;
  // Detailed adjustments
  other_income?: number;
  bonus_income?: number;
  fuel_expense?: number;
  maintenance_expense?: number;
  room_rent?: number;
  other_expenses?: number;
  global_adjustments?: GlobalAdjustments;
  // Transaction history summary
  transaction_income?: number;
  transaction_expense?: number;
  transaction_net?: number;
}

interface AdjustmentCategory {
  id: string;
  name: string;
  type: "income" | "expense";
  amount: number;
  isActive: boolean;
}

interface GlobalAdjustments {
  categories: AdjustmentCategory[];
}

const VehiclePerformance = () => {
  const {
    calculateFleetRent,
    calculateCompanyEarnings,
    loading: settingsLoading,
    fleetRentSlabs,
    companyEarningsSlabs,
  } = useAdminSettings();

  const { getTransactionSummary } = useVehicleTransactions();

  // Debug: Log settings data
  console.log("Settings loaded:", {
    settingsLoading,
    hasFleetRentFunction: !!calculateFleetRent,
    hasEarningsFunction: !!calculateCompanyEarnings,
    fleetRentSlabsCount: fleetRentSlabs?.length || 0,
    companyEarningsSlabsCount: companyEarningsSlabs?.length || 0,
    fleetRentSlabs,
    companyEarningsSlabs,
  });

  const [vehicles, setVehicles] = useState<VehiclePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("week");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("profit");
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null);
  const [tempWorkingDays, setTempWorkingDays] = useState(1);
  const [savingWorkingDays, setSavingWorkingDays] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isIncomeExpenseOpen, setIsIncomeExpenseOpen] = useState(false);
  const [tempIncome, setTempIncome] = useState(0);
  const [tempExpense, setTempExpense] = useState(0);
  const [editingIncomeExpenseVehicle, setEditingIncomeExpenseVehicle] =
    useState<string | null>(null);

  // Transaction history states
  const [isTransactionHistoryOpen, setIsTransactionHistoryOpen] =
    useState(false);
  const [selectedVehicleForHistory, setSelectedVehicleForHistory] =
    useState<string>("");

  // Global adjustment system states
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [adjustmentCategories, setAdjustmentCategories] = useState<
    AdjustmentCategory[]
  >([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"income" | "expense">(
    "income"
  );
  const [newCategoryAmount, setNewCategoryAmount] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [statistics, setStatistics] = useState({
    totalVehicles: 0,
    profitableVehicles: 0,
    totalProfit: 0,
    totalLoss: 0,
    totalTrips: 0,
    totalEarnings: 0,
    totalRent: 0,
  });

  // Fallback functions in case settings haven't loaded
  const fallbackCalculateFleetRent = (tripCount: number): number => {
    if (tripCount < 64) return 980;
    if (tripCount >= 64 && tripCount < 80) return 830;
    if (tripCount >= 80 && tripCount < 110) return 740;
    if (tripCount >= 110 && tripCount < 125) return 560;
    if (tripCount >= 125 && tripCount < 140) return 410;
    return 290; // 140 or more trips
  };

  const fallbackCalculateCompanyEarnings = (trips: number): number => {
    if (trips >= 12) {
      return 535;
    } else if (trips >= 11) {
      return 585;
    } else if (trips >= 10) {
      return 635;
    } else if (trips >= 8) {
      return 715;
    } else if (trips >= 5) {
      return 745;
    } else {
      return 795;
    }
  };

  // Use settings functions if available, otherwise fallback
  const getFleetRent = (tripCount: number): number => {
    return calculateFleetRent
      ? calculateFleetRent(tripCount)
      : fallbackCalculateFleetRent(tripCount);
  };

  const getCompanyEarnings = (tripCount: number): number => {
    try {
      // Check if settings function is available
      if (calculateCompanyEarnings) {
        const result = calculateCompanyEarnings(tripCount);
        console.log(`Settings-based earnings for ${tripCount} trips:`, result);
        if (result > 0) {
          return result;
        } else {
          console.warn(
            `Settings returned 0 for ${tripCount} trips, using fallback`
          );
          return fallbackCalculateCompanyEarnings(tripCount);
        }
      } else {
        console.log(`Using fallback earnings for ${tripCount} trips`);
        return fallbackCalculateCompanyEarnings(tripCount);
      }
    } catch (error) {
      console.error("Error calculating company earnings:", error);
      return fallbackCalculateCompanyEarnings(tripCount);
    }
  };

  const getRentSlab = (tripCount: number): string => {
    const amount = getFleetRent(tripCount);
    if (tripCount < 64) return `< 64 trips (₹${amount})`;
    if (tripCount >= 64 && tripCount < 80) return `64-79 trips (₹${amount})`;
    if (tripCount >= 80 && tripCount < 110) return `80-109 trips (₹${amount})`;
    if (tripCount >= 110 && tripCount < 125)
      return `110-124 trips (₹${amount})`;
    if (tripCount >= 125 && tripCount < 140)
      return `125-139 trips (₹${amount})`;
    return `140+ trips (₹${amount})`;
  };

  useEffect(() => {
    // Only fetch data when settings are loaded
    if (!settingsLoading) {
      fetchVehiclePerformance();
    }
  }, [filterType, customStart, customEnd, activeTab, settingsLoading]);

  const fetchVehiclePerformance = async () => {
    try {
      setLoading(true);

      // Check if settings functions are available
      if (!calculateFleetRent || !calculateCompanyEarnings) {
        console.log("Settings not yet loaded, using fallback functions");
      } else {
        console.log("Settings functions are available");
      }
      let startDate: Date;
      let endDate: Date = new Date();

      // Set date range based on filter type
      switch (filterType) {
        case "daily":
          const today = new Date();
          startDate = startOfDay(today);
          endDate = endOfDay(today);
          break;
        case "week":
          startDate = startOfWeek(new Date(), { weekStartsOn: 2 });
          endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
          break;
        case "month":
          startDate = subDays(new Date(), 30);
          break;
        case "custom":
          if (!customStart || !customEnd) {
            toast.error("Please select both start and end dates");
            return;
          }
          startDate = customStart;
          endDate = customEnd;
          break;
        default:
          startDate = startOfWeek(new Date(), { weekStartsOn: 2 });
          endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
      }

      console.log("Date range:", {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      });

      // Load saved adjustments and working days for this date range first
      let savedAdjustmentCategories: AdjustmentCategory[] = [];
      const savedWorkingDaysMap = new Map<string, number>();

      try {
        const dateRange = getCurrentDateRange();
        if (dateRange) {
          // Load saved adjustments and working days from vehicle_performance table
          const { data: savedData } = await supabase
            .from("vehicle_performance")
            .select(
              "vehicle_number, global_adjustments, working_days_multiplier"
            )
            .gte("date", dateRange.startDate)
            .lte("date", dateRange.endDate);

          if (savedData && savedData.length > 0) {
            // Load working days for each vehicle
            savedData.forEach((record) => {
              if (record.vehicle_number && record.working_days_multiplier) {
                savedWorkingDaysMap.set(
                  record.vehicle_number,
                  record.working_days_multiplier
                );
              }
            });

            // Load global adjustments (take the most recent one based on savedAt timestamp)
            let mostRecentAdjustments = null;
            let mostRecentTimestamp = new Date(0); // Start with epoch time

            savedData.forEach((record) => {
              if (record.global_adjustments) {
                try {
                  const parsed = JSON.parse(record.global_adjustments);
                  if (
                    parsed.categories &&
                    Array.isArray(parsed.categories) &&
                    parsed.savedAt
                  ) {
                    const timestamp = new Date(parsed.savedAt);
                    if (timestamp > mostRecentTimestamp) {
                      mostRecentTimestamp = timestamp;
                      mostRecentAdjustments = parsed;
                    }
                  }
                } catch (parseError) {
                  console.error(
                    "Error parsing global adjustments for record:",
                    parseError
                  );
                }
              }
            });

            if (mostRecentAdjustments) {
              savedAdjustmentCategories = mostRecentAdjustments.categories;
              // Update current state with saved categories
              setAdjustmentCategories(mostRecentAdjustments.categories);
              console.log(
                `Loaded ${
                  mostRecentAdjustments.categories.length
                } adjustment categories from most recent record (saved at: ${mostRecentTimestamp.toISOString()})`
              );
            } else {
              console.log("No valid global adjustments found in saved data");
            }

            console.log(
              `Loaded working days for ${savedWorkingDaysMap.size} vehicles`
            );
          }
        }
      } catch (error) {
        console.error("Error loading saved data:", error);
      }

      // Fetch fleet reports for the date range
      let query = supabase
        .from("fleet_reports")
        .select("*")
        .eq("status", "approved");

      if (filterType === "daily") {
        const todayString = new Date().toISOString().split("T")[0];
        query = query.eq("rent_date", todayString);
      } else {
        query = query
          .gte("rent_date", startDate.toISOString().split("T")[0])
          .lte("rent_date", endDate.toISOString().split("T")[0]);
      }

      const { data: reports, error: reportsError } = await query;

      if (reportsError) {
        console.error("Error fetching reports:", reportsError);
        throw reportsError;
      }

      // Group by vehicle number and aggregate data
      const vehicleStats = new Map<string, VehiclePerformance>();

      reports?.forEach((report) => {
        const vehicleNumber = report.vehicle_number;
        if (!vehicleNumber) return;

        if (!vehicleStats.has(vehicleNumber)) {
          // Use saved working days if available, otherwise use default
          const workingDaysMultiplier =
            savedWorkingDaysMap.get(vehicleNumber) || getDefaultWorkingDays();

          vehicleStats.set(vehicleNumber, {
            vehicle_number: vehicleNumber,
            total_trips: 0,
            total_earnings: 0,
            total_rent: 0,
            additional_income: 0,
            expenses: 0,
            profit_loss: 0,
            worked_days: 0,
            avg_trips_per_day: 0,
            avg_earnings_per_day: 0,
            rent_slab: "",
            performance_status: "break_even",
            working_days_multiplier: workingDaysMultiplier,
            // Detailed adjustments
            other_income: 0,
            bonus_income: 0,
            fuel_expense: 0,
            maintenance_expense: 0,
            room_rent: 0,
            other_expenses: 0,
          });
        }

        const stats = vehicleStats.get(vehicleNumber)!;
        stats.total_trips += report.total_trips || 0;

        // Calculate earnings for this specific report/day based on its trip count
        const dailyEarnings = getCompanyEarnings(report.total_trips || 0);
        stats.total_earnings += dailyEarnings;

        // Store daily rent separately - we'll calculate total rent later with working_days_multiplier
        // For now, just track the trips to calculate rent later

        // Debug log for daily calculations
        console.log(
          `${vehicleNumber} - Date: ${report.rent_date}, Trips: ${report.total_trips}, Daily Earnings: ${dailyEarnings}`
        );

        if (report.status === "approved") {
          stats.worked_days += 1;
        }
      });

      // Calculate earnings, rent, profit/loss, and averages
      const vehicleArray = await Promise.all(
        Array.from(vehicleStats.values()).map(async (vehicle) => {
          // Calculate average trips per day first
          const avgTripsPerDay =
            vehicle.worked_days > 0
              ? vehicle.total_trips / vehicle.worked_days
              : 0;

          // Total earnings are already calculated during aggregation (sum of daily earnings)
          // No need to recalculate here

          // Debug logging for earnings calculation
          console.log(`Vehicle ${vehicle.vehicle_number}:`, {
            total_trips: vehicle.total_trips,
            worked_days: vehicle.worked_days,
            avgTripsPerDay: avgTripsPerDay,
            total_earnings: vehicle.total_earnings,
          });

          // Calculate total rent: Daily rent based on total trips * working_days_multiplier
          const dailyRent = getFleetRent(vehicle.total_trips);
          vehicle.total_rent = dailyRent * vehicle.working_days_multiplier;

          // Debug logging for rent calculation
          console.log(
            `${vehicle.vehicle_number} - Total Trips: ${vehicle.total_trips}, Daily Rent: ${dailyRent}, Working Days: ${vehicle.working_days_multiplier}, Total Rent: ${vehicle.total_rent}`
          );

          // Calculate global adjustments from current state (prioritizes unsaved changes)
          const currentCategories =
            adjustmentCategories.length > 0
              ? adjustmentCategories
              : savedAdjustmentCategories;
          const globalIncome = currentCategories
            .filter((cat) => cat.type === "income" && cat.isActive)
            .reduce((sum, cat) => sum + cat.amount, 0);

          const globalExpenses = currentCategories
            .filter((cat) => cat.type === "expense" && cat.isActive)
            .reduce((sum, cat) => sum + cat.amount, 0);

          // Calculate total adjustments (including manual additional_income/expenses and global adjustments)
          // Note: Transaction history will be loaded separately and added to the UI display
          const totalIncome = vehicle.additional_income + globalIncome;
          const totalExpenses = vehicle.expenses + globalExpenses;

          vehicle.profit_loss =
            vehicle.total_earnings +
            totalIncome -
            vehicle.total_rent -
            totalExpenses;

          // Calculate averages
          if (vehicle.worked_days > 0) {
            vehicle.avg_trips_per_day = avgTripsPerDay;
            vehicle.avg_earnings_per_day =
              vehicle.total_earnings / vehicle.worked_days;
          }

          // Load transaction history summary for this vehicle
          try {
            if (getTransactionSummary) {
              const transactionSummary = await getTransactionSummary(
                vehicle.vehicle_number,
                startDate.toISOString().split("T")[0],
                endDate.toISOString().split("T")[0]
              );

              vehicle.transaction_income = transactionSummary.totalIncome;
              vehicle.transaction_expense = transactionSummary.totalExpense;
              vehicle.transaction_net = transactionSummary.netAmount;

              // Update profit/loss calculation to include transaction history
              vehicle.profit_loss =
                vehicle.total_earnings +
                totalIncome +
                transactionSummary.netAmount -
                vehicle.total_rent -
                totalExpenses;
            }
          } catch (error) {
            console.error(
              `Error loading transaction summary for ${vehicle.vehicle_number}:`,
              error
            );
            // Set default values if transaction loading fails
            vehicle.transaction_income = 0;
            vehicle.transaction_expense = 0;
            vehicle.transaction_net = 0;
          }

          // Set rent slab and performance status
          vehicle.rent_slab = getRentSlab(vehicle.total_trips);
          vehicle.performance_status =
            vehicle.profit_loss > 0
              ? "profit"
              : vehicle.profit_loss < 0
              ? "loss"
              : "break_even";

          return vehicle;
        })
      );

      // Sort based on active tab
      let sortedVehicles = [...vehicleArray];
      switch (activeTab) {
        case "profit":
          sortedVehicles.sort((a, b) => b.profit_loss - a.profit_loss);
          break;
        case "loss":
          sortedVehicles.sort((a, b) => a.profit_loss - b.profit_loss);
          break;
        case "trips":
          sortedVehicles.sort((a, b) => b.total_trips - a.total_trips);
          break;
        case "earnings":
          sortedVehicles.sort((a, b) => b.total_earnings - a.total_earnings);
          break;
      }

      // Calculate statistics
      const totalVehicles = vehicleArray.length;
      const profitableVehicles = vehicleArray.filter(
        (v) => v.profit_loss > 0
      ).length;
      const totalProfit = vehicleArray
        .filter((v) => v.profit_loss > 0)
        .reduce((sum, v) => sum + v.profit_loss, 0);
      const totalLoss = Math.abs(
        vehicleArray
          .filter((v) => v.profit_loss < 0)
          .reduce((sum, v) => sum + v.profit_loss, 0)
      );
      const totalTrips = vehicleArray.reduce(
        (sum, v) => sum + v.total_trips,
        0
      );
      const totalEarnings = vehicleArray.reduce(
        (sum, v) => sum + v.total_earnings,
        0
      );

      const totalRent = vehicleArray.reduce((sum, v) => sum + v.total_rent, 0);

      setStatistics({
        totalVehicles,
        profitableVehicles,
        totalProfit,
        totalLoss,
        totalTrips,
        totalEarnings,
        totalRent,
      });

      setVehicles(sortedVehicles);
    } catch (error) {
      console.error("Error fetching vehicle performance:", error);
      toast.error("Failed to load vehicle performance data");
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter((vehicle) =>
    vehicle.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPerformanceBadge = (status: string, profitLoss: number) => {
    if (status === "profit") return "bg-green-500 text-white";
    if (status === "loss") return "bg-red-500 text-white";
    return "bg-gray-500 text-white";
  };

  const getPerformanceIcon = (status: string) => {
    if (status === "profit") return <TrendingUp className="h-4 w-4" />;
    if (status === "loss") return <TrendingDown className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const updateVehicleWorkingDays = (vehicleNumber: string, newDays: number) => {
    setVehicles((prevVehicles) =>
      prevVehicles.map((vehicle) => {
        if (vehicle.vehicle_number === vehicleNumber) {
          // Calculate new total rent: Daily rent based on total trips * new working days
          const dailyRent = getFleetRent(vehicle.total_trips);
          const newTotalRent = dailyRent * newDays;
          const newProfitLoss = vehicle.total_earnings - newTotalRent;

          return {
            ...vehicle,
            working_days_multiplier: newDays,
            total_rent: newTotalRent,
            profit_loss: newProfitLoss,
            performance_status:
              newProfitLoss > 0
                ? "profit"
                : newProfitLoss < 0
                ? "loss"
                : ("break_even" as const),
          };
        }
        return vehicle;
      })
    );
  };

  // Calculate days from start of week (Tuesday) to today
  const getDefaultWorkingDays = () => {
    const today = new Date();
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Tuesday start
    const daysDifference =
      Math.floor(
        (today.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
    return Math.max(1, daysDifference); // Ensure at least 1 day
  };

  const openVehicleSettings = (vehicleNumber: string, currentDays: number) => {
    setEditingVehicle(vehicleNumber);
    setTempWorkingDays(currentDays);
    setIsSettingsOpen(true);
  };

  const openIncomeExpenseDialog = (
    vehicleNumber: string,
    currentIncome: number,
    currentExpense: number
  ) => {
    setEditingIncomeExpenseVehicle(vehicleNumber);
    setTempIncome(currentIncome);
    setTempExpense(currentExpense);
    setIsIncomeExpenseOpen(true);
  };

  const openTransactionHistory = (vehicleNumber: string) => {
    setSelectedVehicleForHistory(vehicleNumber);
    setIsTransactionHistoryOpen(true);
  };

  const handleTransactionHistoryClose = (shouldRefresh: boolean = false) => {
    setIsTransactionHistoryOpen(false);
    setSelectedVehicleForHistory("");

    // Refresh vehicle performance data if transactions were modified
    if (shouldRefresh) {
      fetchVehiclePerformance();
    }
  };

  const updateVehicleIncomeExpense = (
    vehicleNumber: string,
    newIncome: number,
    newExpense: number
  ) => {
    setVehicles((prevVehicles) =>
      prevVehicles.map((vehicle) => {
        if (vehicle.vehicle_number === vehicleNumber) {
          const newProfitLoss =
            vehicle.total_earnings +
            newIncome -
            vehicle.total_rent -
            newExpense;

          return {
            ...vehicle,
            additional_income: newIncome,
            expenses: newExpense,
            profit_loss: newProfitLoss,
            performance_status:
              newProfitLoss > 0
                ? "profit"
                : newProfitLoss < 0
                ? "loss"
                : ("break_even" as const),
          };
        }
        return vehicle;
      })
    );
  };

  const saveVehiclePerformance = async (vehicleData: VehiclePerformance) => {
    try {
      const dateRange = getCurrentDateRange();
      if (!dateRange) {
        toast.error("Invalid date range");
        return;
      }

      // Use the start date of the current period as the save date
      const saveDate = dateRange.startDate;

      const performanceData = {
        vehicle_number: vehicleData.vehicle_number,
        date: saveDate,
        total_trips: vehicleData.total_trips,
        total_earnings: vehicleData.total_earnings,
        total_rent: vehicleData.total_rent,
        additional_income: vehicleData.additional_income,
        expenses: vehicleData.expenses,
        profit_loss: vehicleData.profit_loss,
        worked_days: vehicleData.worked_days,
        working_days_multiplier: vehicleData.working_days_multiplier,
        avg_trips_per_day: vehicleData.avg_trips_per_day,
        avg_earnings_per_day: vehicleData.avg_earnings_per_day,
        rent_slab: vehicleData.rent_slab,
        performance_status: vehicleData.performance_status,
        // Detailed adjustments
        other_income: vehicleData.other_income || 0,
        bonus_income: vehicleData.bonus_income || 0,
        fuel_expense: vehicleData.fuel_expense || 0,
        maintenance_expense: vehicleData.maintenance_expense || 0,
        room_rent: vehicleData.room_rent || 0,
        other_expenses: vehicleData.other_expenses || 0,
        // Global adjustments (stored as JSON with date-specific data)
        global_adjustments: JSON.stringify({
          categories: adjustmentCategories,
          dateRange: dateRange,
          savedAt: new Date().toISOString(),
        }),
      };

      // Try to update first, if not exists then insert
      const { data: existingData, error: selectError } = await supabase
        .from("vehicle_performance")
        .select("id")
        .eq("vehicle_number", vehicleData.vehicle_number)
        .eq("date", saveDate)
        .single();

      if (existingData) {
        // Update existing record
        const { error: updateError } = await supabase
          .from("vehicle_performance")
          .update(performanceData)
          .eq("id", existingData.id);

        if (updateError) throw updateError;
        toast.success(
          `Updated performance data for ${vehicleData.vehicle_number}`
        );
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from("vehicle_performance")
          .insert([performanceData]);

        if (insertError) throw insertError;
        toast.success(
          `Saved performance data for ${vehicleData.vehicle_number}`
        );
      }
    } catch (error) {
      console.error("Error saving vehicle performance:", error);
      toast.error("Failed to save performance data");
    }
  };

  const addAdjustmentCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    const newCategory: AdjustmentCategory = {
      id: Date.now().toString(),
      name: newCategoryName.trim(),
      type: newCategoryType,
      amount: newCategoryAmount,
      isActive: true,
    };

    setAdjustmentCategories((prev) => [...prev, newCategory]);
    setNewCategoryName("");
    setNewCategoryAmount(0);
    toast.success(`${newCategoryType} category "${newCategory.name}" added`);
  };

  const toggleCategoryStatus = async (categoryId: string) => {
    try {
      // Update local state first
      const updatedCategories = adjustmentCategories.map((cat) =>
        cat.id === categoryId ? { ...cat, isActive: !cat.isActive } : cat
      );
      setAdjustmentCategories(updatedCategories);

      // Immediately save to database
      const dateRange = getCurrentDateRange();
      if (dateRange) {
        const updatePromises = vehicles.map(async (vehicle) => {
          const { error } = await supabase
            .from("vehicle_performance")
            .update({
              global_adjustments: JSON.stringify({
                categories: updatedCategories,
                dateRange: dateRange,
                savedAt: new Date().toISOString(),
              }),
            })
            .eq("vehicle_number", vehicle.vehicle_number)
            .eq("date", dateRange.startDate);

          if (error) {
            console.error(
              `Error updating vehicle ${vehicle.vehicle_number}:`,
              error
            );
          }
        });

        await Promise.all(updatePromises);
      }

      // Immediately recalculate vehicle performance with updated categories
      setTimeout(() => {
        recalculateVehiclePerformance();
      }, 100);

      toast.success("Category status updated and saved to database");
    } catch (error) {
      console.error("Error updating category status:", error);
      toast.error("Failed to update category status in database");
      // Revert the local state change
      fetchVehiclePerformance();
    }
  };

  const updateCategoryAmount = async (categoryId: string, amount: number) => {
    try {
      // Update local state first
      const updatedCategories = adjustmentCategories.map((cat) =>
        cat.id === categoryId ? { ...cat, amount } : cat
      );
      setAdjustmentCategories(updatedCategories);

      // Immediately save to database
      const dateRange = getCurrentDateRange();
      if (dateRange) {
        const updatePromises = vehicles.map(async (vehicle) => {
          const { error } = await supabase
            .from("vehicle_performance")
            .update({
              global_adjustments: JSON.stringify({
                categories: updatedCategories,
                dateRange: dateRange,
                savedAt: new Date().toISOString(),
              }),
            })
            .eq("vehicle_number", vehicle.vehicle_number)
            .eq("date", dateRange.startDate);

          if (error) {
            console.error(
              `Error updating vehicle ${vehicle.vehicle_number}:`,
              error
            );
          }
        });

        await Promise.all(updatePromises);
      }

      // Immediately recalculate vehicle performance with updated categories
      setTimeout(() => {
        recalculateVehiclePerformance();
      }, 100);

      toast.success("Category amount updated and saved to database");
    } catch (error) {
      console.error("Error updating category amount:", error);
      toast.error("Failed to update category amount in database");
      // Revert the local state change
      fetchVehiclePerformance();
    }
  };

  const deleteCategoryItem = async (categoryId: string) => {
    try {
      // Find the category to be deleted for logging
      const categoryToDelete = adjustmentCategories.find(
        (cat) => cat.id === categoryId
      );
      const categoryName = categoryToDelete?.name || "Unknown";

      // Update local state first
      const updatedCategories = adjustmentCategories.filter(
        (cat) => cat.id !== categoryId
      );
      setAdjustmentCategories(updatedCategories);

      // Immediately save to database
      const dateRange = getCurrentDateRange();
      if (dateRange && vehicles.length > 0) {
        console.log(
          `Deleting category "${categoryName}" from database for ${vehicles.length} vehicles`
        );

        // Check if vehicle performance records exist for this date range
        const { data: existingRecords } = await supabase
          .from("vehicle_performance")
          .select("vehicle_number, id")
          .gte("date", dateRange.startDate)
          .lte("date", dateRange.endDate);

        console.log(
          `Found ${
            existingRecords?.length || 0
          } existing vehicle performance records`
        );

        if (!existingRecords || existingRecords.length === 0) {
          // No records exist yet, create them for each vehicle with updated categories
          console.log(
            "No existing records found, creating new records for all vehicles"
          );

          const insertPromises = vehicles.map(async (vehicle) => {
            const performanceData = {
              vehicle_number: vehicle.vehicle_number,
              date: dateRange.startDate,
              total_trips: vehicle.total_trips,
              total_earnings: vehicle.total_earnings,
              total_rent: vehicle.total_rent,
              additional_income: vehicle.additional_income || 0,
              expenses: vehicle.expenses || 0,
              profit_loss: vehicle.profit_loss,
              worked_days: vehicle.worked_days,
              working_days_multiplier: vehicle.working_days_multiplier,
              avg_trips_per_day: vehicle.avg_trips_per_day,
              avg_earnings_per_day: vehicle.avg_earnings_per_day,
              rent_slab: vehicle.rent_slab,
              performance_status: vehicle.performance_status,
              other_income: vehicle.other_income || 0,
              bonus_income: vehicle.bonus_income || 0,
              fuel_expense: vehicle.fuel_expense || 0,
              maintenance_expense: vehicle.maintenance_expense || 0,
              room_rent: vehicle.room_rent || 0,
              other_expenses: vehicle.other_expenses || 0,
              global_adjustments: JSON.stringify({
                categories: updatedCategories,
                dateRange: dateRange,
                savedAt: new Date().toISOString(),
              }),
            };

            const { error } = await supabase
              .from("vehicle_performance")
              .insert([performanceData]);

            if (error) {
              console.error(
                `Error creating record for vehicle ${vehicle.vehicle_number}:`,
                error
              );
              throw error;
            } else {
              console.log(
                `Created new record for vehicle ${vehicle.vehicle_number} without deleted category`
              );
            }
          });

          await Promise.all(insertPromises);
        } else {
          // Update existing records
          const updatePromises = vehicles.map(async (vehicle) => {
            try {
              const { error } = await supabase
                .from("vehicle_performance")
                .update({
                  global_adjustments: JSON.stringify({
                    categories: updatedCategories,
                    dateRange: dateRange,
                    savedAt: new Date().toISOString(),
                  }),
                })
                .eq("vehicle_number", vehicle.vehicle_number)
                .eq("date", dateRange.startDate);

              if (error) {
                console.error(
                  `Error updating vehicle ${vehicle.vehicle_number}:`,
                  error
                );
                throw error;
              } else {
                console.log(
                  `Successfully updated vehicle ${vehicle.vehicle_number} - removed category "${categoryName}"`
                );
              }
            } catch (vehicleError) {
              console.error(
                `Failed to update vehicle ${vehicle.vehicle_number}:`,
                vehicleError
              );
              throw vehicleError;
            }
          });

          await Promise.all(updatePromises);
        }

        // Verify the deletion by checking if any records still have the old categories
        const { data: verifyData } = await supabase
          .from("vehicle_performance")
          .select("vehicle_number, global_adjustments")
          .gte("date", dateRange.startDate)
          .lte("date", dateRange.endDate);

        if (verifyData) {
          const recordsWithOldCategory = verifyData.filter((record) => {
            if (record.global_adjustments) {
              try {
                const parsed = JSON.parse(record.global_adjustments);
                return parsed.categories?.some(
                  (cat: any) => cat.id === categoryId
                );
              } catch (e) {
                return false;
              }
            }
            return false;
          });

          if (recordsWithOldCategory.length > 0) {
            console.warn(
              `Found ${recordsWithOldCategory.length} records still containing deleted category`
            );
          } else {
            console.log(
              `✅ Category "${categoryName}" successfully deleted from all vehicle records`
            );
          }
        }
      } else {
        console.log("No date range or vehicles available for deletion");
      }

      // Immediately recalculate vehicle performance with updated categories
      setTimeout(() => {
        recalculateVehiclePerformance();
      }, 100);

      toast.success(`Category "${categoryName}" deleted and saved to database`);
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category from database");
      // Revert the local state change
      fetchVehiclePerformance();
    }
  };

  const getCurrentDateRange = () => {
    let startDate: Date;
    let endDate: Date = new Date();

    switch (filterType) {
      case "daily":
        const today = new Date();
        startDate = startOfDay(today);
        endDate = endOfDay(today);
        break;
      case "week":
        startDate = startOfWeek(new Date(), { weekStartsOn: 2 });
        endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
        break;
      case "month":
        startDate = subDays(new Date(), 30);
        break;
      case "custom":
        if (!customStart || !customEnd) return null;
        startDate = customStart;
        endDate = customEnd;
        break;
      default:
        startDate = startOfWeek(new Date(), { weekStartsOn: 2 });
        endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
    }

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  };

  const recalculateVehiclePerformance = () => {
    // Recalculate all vehicles using current adjustment categories (without reloading from DB)
    setVehicles((prevVehicles) =>
      prevVehicles.map((vehicle) => {
        // Calculate global adjustments from current state
        const globalIncome = adjustmentCategories
          .filter((cat) => cat.type === "income" && cat.isActive)
          .reduce((sum, cat) => sum + cat.amount, 0);

        const globalExpenses = adjustmentCategories
          .filter((cat) => cat.type === "expense" && cat.isActive)
          .reduce((sum, cat) => sum + cat.amount, 0);

        // Calculate total adjustments
        const totalIncome = vehicle.additional_income + globalIncome;
        const totalExpenses = vehicle.expenses + globalExpenses;

        const newProfitLoss =
          vehicle.total_earnings +
          totalIncome -
          vehicle.total_rent -
          totalExpenses;

        return {
          ...vehicle,
          profit_loss: newProfitLoss,
          performance_status:
            newProfitLoss > 0
              ? "profit"
              : newProfitLoss < 0
              ? "loss"
              : ("break_even" as const),
        };
      })
    );
  };

  const applyAdjustments = async () => {
    try {
      // Immediately save current categories to database
      const dateRange = getCurrentDateRange();
      if (dateRange) {
        const updatePromises = vehicles.map(async (vehicle) => {
          const { error } = await supabase
            .from("vehicle_performance")
            .update({
              global_adjustments: JSON.stringify({
                categories: adjustmentCategories,
                dateRange: dateRange,
                savedAt: new Date().toISOString(),
              }),
            })
            .eq("vehicle_number", vehicle.vehicle_number)
            .eq("date", dateRange.startDate);

          if (error) {
            console.error(
              `Error updating vehicle ${vehicle.vehicle_number}:`,
              error
            );
          }
        });

        await Promise.all(updatePromises);
      }

      // This will trigger a re-render and recalculate all vehicle profit/loss
      fetchVehiclePerformance();
      setHasUnsavedChanges(false); // Clear unsaved changes since we just saved
      setIsAdjustmentDialogOpen(false);
      toast.success("Adjustments applied and saved to all vehicles");
    } catch (error) {
      console.error("Error applying adjustments:", error);
      toast.error("Failed to save adjustments to database");
    }
  };

  const saveAllVehiclePerformance = async () => {
    try {
      setLoading(true);
      const savePromises = vehicles.map((vehicle) =>
        saveVehiclePerformance(vehicle)
      );
      await Promise.all(savePromises);
      setHasUnsavedChanges(false);
      toast.success("All vehicle performance data saved successfully!");
    } catch (error) {
      console.error("Error saving all vehicle performance:", error);
      toast.error("Failed to save some vehicle data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Vehicle Performance">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vehicles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            onClick={() => setIsAdjustmentDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Global Adjustments
            {adjustmentCategories.length > 0 && (
              <Badge className="ml-2 bg-green-100 text-green-800">
                {adjustmentCategories.filter((cat) => cat.isActive).length}{" "}
                Active
              </Badge>
            )}
          </Button>
          <select
            className="border px-3 py-2 rounded-md text-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="daily">Today</option>
            <option value="week">This Week</option>
            <option value="month">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
          {filterType === "custom" && (
            <div className="flex gap-2">
              <input
                type="date"
                onChange={(e) => setCustomStart(new Date(e.target.value))}
                className="border px-2 py-1 rounded text-sm"
              />
              <input
                type="date"
                onChange={(e) => setCustomEnd(new Date(e.target.value))}
                className="border px-2 py-1 rounded text-sm"
              />
            </div>
          )}
        </div>
        {/* Working Days Info
        <div className="mb-4">
          <div className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-3">
            <strong>Default Working Days:</strong> {getDefaultWorkingDays()}{" "}
            days (from Tuesday to today)
          </div>
        </div> */}

        {/* Global Adjustment Button */}
        {/* <div className="flex justify-between items-center">
          <div>
            
          </div>
        </div> */}

        {/* Adjustment Status Info */}
        {/* {adjustmentCategories.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="text-blue-800 font-medium">
                📊 Global Adjustments Active
              </div>
              <div className="text-blue-600 text-sm">
                {adjustmentCategories.filter((cat) => cat.isActive).length} of{" "}
                {adjustmentCategories.length} categories are active for this
                date range
              </div>
            </div>
          </div>
        )} */}

        {/* Global Save Button */}
        {hasUnsavedChanges && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-yellow-800 font-medium">
                  You have unsaved changes
                </div>
                <div className="text-yellow-600 text-sm">
                  Save all vehicle performance data to the database
                </div>
              </div>
              <Button
                onClick={saveAllVehiclePerformance}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save All Changes"}
              </Button>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Vehicles
              </CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.totalVehicles}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Profitable Vehicles
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statistics.profitableVehicles}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Profit
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ₹{statistics.totalProfit.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Loss</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ₹{statistics.totalLoss.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Performance Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profit">Most Profitable</TabsTrigger>
            <TabsTrigger value="loss">Highest Loss</TabsTrigger>
            <TabsTrigger value="trips">Most Trips</TabsTrigger>
            <TabsTrigger value="earnings">Highest Earnings</TabsTrigger>
          </TabsList>

          {/* Profit Tab */}
          <TabsContent value="profit" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Most Profitable Vehicles</CardTitle>
              </CardHeader>
              <CardContent>
                {loading || settingsLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
                    <span className="ml-2 text-sm text-gray-600">
                      {settingsLoading
                        ? "Loading settings..."
                        : "Loading data..."}
                    </span>
                  </div>
                ) : (
                  <div className="overflow-x-auto h-[500px]">
                    <Table>
                      <TableHeader className="">
                        <TableRow className="">
                          <TableHead>ID</TableHead>
                          <TableHead>Vehicle Number</TableHead>
                          <TableHead>Total Trips</TableHead>
                          <TableHead>Total Earnings</TableHead>
                          <TableHead>Total Rent</TableHead>
                          <TableHead>Income</TableHead>
                          <TableHead>Expense</TableHead>
                          <TableHead>Profit/Loss</TableHead>
                          {/* <TableHead>Worked Days</TableHead> */}
                          <TableHead>Working Days</TableHead>
                          <TableHead>Rent Slab</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVehicles.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={12}
                              className="text-center py-8"
                            >
                              No vehicles found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredVehicles.map((vehicle, index) => (
                            <TableRow key={vehicle.vehicle_number}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell className="font-medium">
                                {vehicle.vehicle_number}
                              </TableCell>
                              <TableCell>{vehicle.total_trips}</TableCell>
                              <TableCell>
                                ₹{vehicle.total_earnings.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                ₹{vehicle.total_rent.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-green-600">
                                    ₹
                                    {(
                                      vehicle.additional_income +
                                      (vehicle.transaction_income || 0)
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-red-600">
                                    ₹
                                    {(
                                      vehicle.expenses +
                                      (vehicle.transaction_expense || 0)
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`font-semibold ${
                                    vehicle.profit_loss > 0
                                      ? "text-green-600"
                                      : vehicle.profit_loss < 0
                                      ? "text-red-600"
                                      : "text-gray-600"
                                  }`}
                                >
                                  ₹{vehicle.profit_loss.toLocaleString()}
                                </span>
                              </TableCell>
                              {/* <TableCell>{vehicle.worked_days}</TableCell> */}
                              <TableCell>
                                <span className="font-medium text-blue-600">
                                  {vehicle.working_days_multiplier}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm">
                                {vehicle.rent_slab}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`${getPerformanceBadge(
                                    vehicle.performance_status,
                                    vehicle.profit_loss
                                  )} px-2 py-1 rounded-full flex items-center gap-1 w-fit`}
                                >
                                  {getPerformanceIcon(
                                    vehicle.performance_status
                                  )}
                                  {vehicle.performance_status.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell className="space-x-1">
                                <div className="flex flex-col gap-1">
                                  <div className="flex flex-row gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        openVehicleSettings(
                                          vehicle.vehicle_number,
                                          vehicle.working_days_multiplier
                                        )
                                      }
                                      className="flex items-center gap-1"
                                    >
                                      <Settings className="h-3 w-3" />
                                      Edit
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() =>
                                        openTransactionHistory(
                                          vehicle.vehicle_number
                                        )
                                      }
                                      className="flex items-center gap-1"
                                    >
                                      <History className="h-3 w-3" />
                                      History
                                    </Button>
                                  </div>
                                </div>
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
          </TabsContent>

          {/* Loss Tab */}
          <TabsContent value="loss" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Vehicles with Highest Loss</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Vehicle Number</TableHead>
                          <TableHead>Total Trips</TableHead>
                          <TableHead>Total Earnings</TableHead>
                          <TableHead>Total Rent</TableHead>
                          <TableHead>Income</TableHead>
                          <TableHead>Expense</TableHead>
                          <TableHead>Profit/Loss</TableHead>
                          <TableHead>Working Days</TableHead>
                          <TableHead>Rent Slab</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVehicles.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={12}
                              className="text-center py-8"
                            >
                              No vehicles found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredVehicles.map((vehicle, index) => (
                            <TableRow key={vehicle.vehicle_number}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell className="font-medium">
                                {vehicle.vehicle_number}
                              </TableCell>
                              <TableCell>{vehicle.total_trips}</TableCell>
                              <TableCell>
                                ₹{vehicle.total_earnings.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                ₹{vehicle.total_rent.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-green-600">
                                    ₹
                                    {(
                                      vehicle.additional_income +
                                      (vehicle.transaction_income || 0)
                                    ).toLocaleString()}
                                  </span>
                                  {vehicle.transaction_income &&
                                    vehicle.transaction_income > 0 && (
                                      <span className="text-xs text-green-500">
                                        (hist: ₹
                                        {vehicle.transaction_income.toLocaleString()}
                                        )
                                      </span>
                                    )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-red-600">
                                    ₹
                                    {(
                                      vehicle.expenses +
                                      (vehicle.transaction_expense || 0)
                                    ).toLocaleString()}
                                  </span>
                                  {vehicle.transaction_expense &&
                                    vehicle.transaction_expense > 0 && (
                                      <span className="text-xs text-red-500">
                                        (hist: ₹
                                        {vehicle.transaction_expense.toLocaleString()}
                                        )
                                      </span>
                                    )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`font-semibold ${
                                    vehicle.profit_loss > 0
                                      ? "text-green-600"
                                      : vehicle.profit_loss < 0
                                      ? "text-red-600"
                                      : "text-gray-600"
                                  }`}
                                >
                                  ₹{vehicle.profit_loss.toLocaleString()}
                                </span>
                              </TableCell>
                              {/* <TableCell>{vehicle.worked_days}</TableCell> */}
                              <TableCell>
                                <span className="font-medium text-blue-600">
                                  {vehicle.working_days_multiplier}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm">
                                {vehicle.rent_slab}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`${getPerformanceBadge(
                                    vehicle.performance_status,
                                    vehicle.profit_loss
                                  )} px-2 py-1 rounded-full flex items-center gap-1 w-fit`}
                                >
                                  {getPerformanceIcon(
                                    vehicle.performance_status
                                  )}
                                  {vehicle.performance_status.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      openVehicleSettings(
                                        vehicle.vehicle_number,
                                        vehicle.working_days_multiplier
                                      )
                                    }
                                    className="flex items-center gap-1"
                                  >
                                    <Settings className="h-3 w-3" />
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() =>
                                      openIncomeExpenseDialog(
                                        vehicle.vehicle_number,
                                        vehicle.additional_income,
                                        vehicle.expenses
                                      )
                                    }
                                    className="flex items-center gap-1"
                                  >
                                    <DollarSign className="h-3 w-3" />
                                    I/E
                                  </Button>
                                </div>
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
          </TabsContent>

          {/* Trips Tab */}
          <TabsContent value="trips" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Vehicles with Most Trips</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Vehicle Number</TableHead>
                          <TableHead>Total Trips</TableHead>
                          <TableHead>Total Earnings</TableHead>
                          <TableHead>Total Rent</TableHead>
                          <TableHead>Income</TableHead>
                          <TableHead>Expense</TableHead>
                          <TableHead>Profit/Loss</TableHead>
                          {/* <TableHead>Worked Days</TableHead> */}
                          <TableHead>Working Days</TableHead>
                          <TableHead>Avg Trips/Day</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVehicles.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={12}
                              className="text-center py-8"
                            >
                              No vehicles found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredVehicles.map((vehicle, index) => (
                            <TableRow key={vehicle.vehicle_number}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell className="font-medium">
                                {vehicle.vehicle_number}
                              </TableCell>
                              <TableCell className="font-semibold text-blue-600">
                                {vehicle.total_trips}
                              </TableCell>
                              <TableCell>
                                ₹{vehicle.total_earnings.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                ₹{vehicle.total_rent.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-green-600">
                                    ₹
                                    {(
                                      vehicle.additional_income +
                                      (vehicle.transaction_income || 0)
                                    ).toLocaleString()}
                                  </span>
                                  {vehicle.transaction_income &&
                                    vehicle.transaction_income > 0 && (
                                      <span className="text-xs text-green-500">
                                        (hist: ₹
                                        {vehicle.transaction_income.toLocaleString()}
                                        )
                                      </span>
                                    )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-red-600">
                                    ₹
                                    {(
                                      vehicle.expenses +
                                      (vehicle.transaction_expense || 0)
                                    ).toLocaleString()}
                                  </span>
                                  {vehicle.transaction_expense &&
                                    vehicle.transaction_expense > 0 && (
                                      <span className="text-xs text-red-500">
                                        (hist: ₹
                                        {vehicle.transaction_expense.toLocaleString()}
                                        )
                                      </span>
                                    )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`font-semibold ${
                                    vehicle.profit_loss > 0
                                      ? "text-green-600"
                                      : vehicle.profit_loss < 0
                                      ? "text-red-600"
                                      : "text-gray-600"
                                  }`}
                                >
                                  ₹{vehicle.profit_loss.toLocaleString()}
                                </span>
                              </TableCell>
                              {/* <TableCell>{vehicle.worked_days}</TableCell> */}
                              <TableCell>
                                <span className="font-medium text-blue-600">
                                  {vehicle.working_days_multiplier}
                                </span>
                              </TableCell>
                              <TableCell>
                                {vehicle.avg_trips_per_day.toFixed(1)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`${getPerformanceBadge(
                                    vehicle.performance_status,
                                    vehicle.profit_loss
                                  )} px-2 py-1 rounded-full flex items-center gap-1 w-fit`}
                                >
                                  {getPerformanceIcon(
                                    vehicle.performance_status
                                  )}
                                  {vehicle.performance_status.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      openVehicleSettings(
                                        vehicle.vehicle_number,
                                        vehicle.working_days_multiplier
                                      )
                                    }
                                    className="flex items-center gap-1"
                                  >
                                    <Settings className="h-3 w-3" />
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() =>
                                      openIncomeExpenseDialog(
                                        vehicle.vehicle_number,
                                        vehicle.additional_income,
                                        vehicle.expenses
                                      )
                                    }
                                    className="flex items-center gap-1"
                                  >
                                    <DollarSign className="h-3 w-3" />
                                    I/E
                                  </Button>
                                </div>
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
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Vehicles with Highest Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Vehicle Number</TableHead>
                          <TableHead>Total Trips</TableHead>
                          <TableHead>Total Earnings</TableHead>
                          <TableHead>Total Rent</TableHead>
                          <TableHead>Income</TableHead>
                          <TableHead>Expense</TableHead>
                          <TableHead>Profit/Loss</TableHead>
                          {/* <TableHead>Worked Days</TableHead> */}
                          <TableHead>Working Days</TableHead>
                          <TableHead>Avg Earnings/Day</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVehicles.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={12}
                              className="text-center py-8"
                            >
                              No vehicles found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredVehicles.map((vehicle, index) => (
                            <TableRow key={vehicle.vehicle_number}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell className="font-medium">
                                {vehicle.vehicle_number}
                              </TableCell>
                              <TableCell>{vehicle.total_trips}</TableCell>
                              <TableCell className="font-semibold text-green-600">
                                ₹{vehicle.total_earnings.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                ₹{vehicle.total_rent.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-green-600">
                                    ₹
                                    {(
                                      vehicle.additional_income +
                                      (vehicle.transaction_income || 0)
                                    ).toLocaleString()}
                                  </span>
                                  {vehicle.transaction_income &&
                                    vehicle.transaction_income > 0 && (
                                      <span className="text-xs text-green-500">
                                        (hist: ₹
                                        {vehicle.transaction_income.toLocaleString()}
                                        )
                                      </span>
                                    )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-red-600">
                                    ₹
                                    {(
                                      vehicle.expenses +
                                      (vehicle.transaction_expense || 0)
                                    ).toLocaleString()}
                                  </span>
                                  {vehicle.transaction_expense &&
                                    vehicle.transaction_expense > 0 && (
                                      <span className="text-xs text-red-500">
                                        (hist: ₹
                                        {vehicle.transaction_expense.toLocaleString()}
                                        )
                                      </span>
                                    )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`font-semibold ${
                                    vehicle.profit_loss > 0
                                      ? "text-green-600"
                                      : vehicle.profit_loss < 0
                                      ? "text-red-600"
                                      : "text-gray-600"
                                  }`}
                                >
                                  ₹{vehicle.profit_loss.toLocaleString()}
                                </span>
                              </TableCell>
                              {/* <TableCell>{vehicle.worked_days}</TableCell> */}
                              <TableCell>
                                <span className="font-medium text-blue-600">
                                  {vehicle.working_days_multiplier}
                                </span>
                              </TableCell>
                              <TableCell>
                                ₹{vehicle.avg_earnings_per_day.toFixed(0)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`${getPerformanceBadge(
                                    vehicle.performance_status,
                                    vehicle.profit_loss
                                  )} px-2 py-1 rounded-full flex items-center gap-1 w-fit`}
                                >
                                  {getPerformanceIcon(
                                    vehicle.performance_status
                                  )}
                                  {vehicle.performance_status.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      openVehicleSettings(
                                        vehicle.vehicle_number,
                                        vehicle.working_days_multiplier
                                      )
                                    }
                                    className="flex items-center gap-1"
                                  >
                                    <Settings className="h-3 w-3" />
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() =>
                                      openIncomeExpenseDialog(
                                        vehicle.vehicle_number,
                                        vehicle.additional_income,
                                        vehicle.expenses
                                      )
                                    }
                                    className="flex items-center gap-1"
                                  >
                                    <DollarSign className="h-3 w-3" />
                                    I/E
                                  </Button>
                                </div>
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
          </TabsContent>
        </Tabs>
        {/* Individual Vehicle Settings Dialog */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Adjust Working Days</DialogTitle>
              <DialogDescription>
                Adjust working days multiplier for vehicle: {editingVehicle}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="workingDays" className="text-right">
                  Working Days
                </Label>
                <Input
                  id="workingDays"
                  type="number"
                  min="1"
                  max="30"
                  value={tempWorkingDays}
                  onChange={(e) => setTempWorkingDays(Number(e.target.value))}
                  className="col-span-3"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Formula: Daily Rent (based on total trips) × {tempWorkingDays}{" "}
                days = Total Rent
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsSettingsOpen(false);
                  setEditingVehicle(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (editingVehicle) {
                    try {
                      setSavingWorkingDays(true);

                      // Update the vehicle working days in state
                      updateVehicleWorkingDays(editingVehicle, tempWorkingDays);

                      // Automatically save to database
                      const vehicleToSave = vehicles.find(
                        (v) => v.vehicle_number === editingVehicle
                      );
                      if (vehicleToSave) {
                        const updatedVehicle = {
                          ...vehicleToSave,
                          working_days_multiplier: tempWorkingDays,
                          // Recalculate total rent with new working days
                          total_rent:
                            getFleetRent(vehicleToSave.total_trips) *
                            tempWorkingDays,
                        };

                        // Recalculate profit/loss
                        updatedVehicle.profit_loss =
                          updatedVehicle.total_earnings +
                          updatedVehicle.additional_income +
                          (updatedVehicle.transaction_income || 0) -
                          updatedVehicle.total_rent -
                          updatedVehicle.expenses -
                          (updatedVehicle.transaction_expense || 0);

                        // Save to database
                        await saveVehiclePerformance(updatedVehicle);
                      }

                      toast.success(
                        `Working days updated and saved: ${tempWorkingDays} for ${editingVehicle}`
                      );

                      setIsSettingsOpen(false);
                      setEditingVehicle(null);
                    } catch (error) {
                      console.error("Error saving working days:", error);
                      toast.error("Failed to save working days");
                    } finally {
                      setSavingWorkingDays(false);
                    }
                  }
                }}
                disabled={savingWorkingDays}
              >
                {savingWorkingDays ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Income/Expense Dialog */}
        <Dialog
          open={isIncomeExpenseOpen}
          onOpenChange={setIsIncomeExpenseOpen}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Manage Income & Expenses</DialogTitle>
              <DialogDescription>
                Add additional income and expenses for vehicle:{" "}
                {editingIncomeExpenseVehicle}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="income" className="text-right">
                  Additional Income
                </Label>
                <Input
                  id="income"
                  type="number"
                  min="0"
                  step="0.01"
                  value={tempIncome}
                  onChange={(e) => setTempIncome(Number(e.target.value))}
                  className="col-span-3"
                  placeholder="0.00"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="expense" className="text-right">
                  Expenses
                </Label>
                <Input
                  id="expense"
                  type="number"
                  min="0"
                  step="0.01"
                  value={tempExpense}
                  onChange={(e) => setTempExpense(Number(e.target.value))}
                  className="col-span-3"
                  placeholder="0.00"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                New Profit/Loss = Total Earnings + Income - Total Rent -
                Expenses
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsIncomeExpenseOpen(false);
                  setEditingIncomeExpenseVehicle(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (editingIncomeExpenseVehicle) {
                    updateVehicleIncomeExpense(
                      editingIncomeExpenseVehicle,
                      tempIncome,
                      tempExpense
                    );
                    toast.success(
                      `Income/Expense updated for ${editingIncomeExpenseVehicle}`
                    );
                  }
                  setIsIncomeExpenseOpen(false);
                  setEditingIncomeExpenseVehicle(null);
                }}
              >
                Apply Changes
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  if (editingIncomeExpenseVehicle) {
                    updateVehicleIncomeExpense(
                      editingIncomeExpenseVehicle,
                      tempIncome,
                      tempExpense
                    );
                    const vehicleToSave = vehicles.find(
                      (v) => v.vehicle_number === editingIncomeExpenseVehicle
                    );
                    if (vehicleToSave) {
                      const updatedVehicle = {
                        ...vehicleToSave,
                        additional_income: tempIncome,
                        expenses: tempExpense,
                        profit_loss:
                          vehicleToSave.total_earnings +
                          tempIncome -
                          vehicleToSave.total_rent -
                          tempExpense,
                      };
                      saveVehiclePerformance(updatedVehicle);
                    }
                  }
                  setIsIncomeExpenseOpen(false);
                  setEditingIncomeExpenseVehicle(null);
                }}
              >
                Save to Database
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Global Adjustment Dialog */}
        <Dialog
          open={isAdjustmentDialogOpen}
          onOpenChange={setIsAdjustmentDialogOpen}
        >
          <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Global Income & Expense Adjustments</DialogTitle>
              <DialogDescription>
                Create and manage income/expense categories that apply to all
                vehicles
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              {/* Add New Category */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-lg font-semibold mb-3">Add New Category</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="categoryName">Category Name</Label>
                    <Input
                      id="categoryName"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g., Fuel Bonus, Maintenance Fund"
                    />
                  </div>
                  <div>
                    <Label htmlFor="categoryType">Type</Label>
                    <select
                      id="categoryType"
                      value={newCategoryType}
                      onChange={(e) =>
                        setNewCategoryType(
                          e.target.value as "income" | "expense"
                        )
                      }
                      className="w-full border rounded-md px-3 py-2"
                    >
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="categoryAmount">Amount (₹)</Label>
                    <Input
                      id="categoryAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newCategoryAmount}
                      onChange={(e) =>
                        setNewCategoryAmount(Number(e.target.value))
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addAdjustmentCategory} className="w-full">
                      Add Category
                    </Button>
                  </div>
                </div>
              </div>

              {/* Existing Categories */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Current Categories</h3>

                {/* Income Categories */}
                <div className="space-y-2">
                  <h4 className="font-medium text-green-700">
                    Income Categories
                  </h4>
                  {adjustmentCategories.filter((cat) => cat.type === "income")
                    .length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      No income categories added yet
                    </p>
                  ) : (
                    adjustmentCategories
                      .filter((cat) => cat.type === "income")
                      .map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={category.isActive}
                              onChange={() => toggleCategoryStatus(category.id)}
                              className="h-4 w-4"
                            />
                            <span
                              className={`font-medium ${
                                category.isActive
                                  ? "text-green-700"
                                  : "text-gray-400"
                              }`}
                            >
                              {category.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">₹</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={category.amount}
                              onChange={(e) =>
                                updateCategoryAmount(
                                  category.id,
                                  Number(e.target.value)
                                )
                              }
                              className="w-24"
                              disabled={!category.isActive}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteCategoryItem(category.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))
                  )}
                </div>

                {/* Expense Categories */}
                <div className="space-y-2">
                  <h4 className="font-medium text-red-700">
                    Expense Categories
                  </h4>
                  {adjustmentCategories.filter((cat) => cat.type === "expense")
                    .length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      No expense categories added yet
                    </p>
                  ) : (
                    adjustmentCategories
                      .filter((cat) => cat.type === "expense")
                      .map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-3"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={category.isActive}
                              onChange={() => toggleCategoryStatus(category.id)}
                              className="h-4 w-4"
                            />
                            <span
                              className={`font-medium ${
                                category.isActive
                                  ? "text-red-700"
                                  : "text-gray-400"
                              }`}
                            >
                              {category.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">₹</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={category.amount}
                              onChange={(e) =>
                                updateCategoryAmount(
                                  category.id,
                                  Number(e.target.value)
                                )
                              }
                              className="w-24"
                              disabled={!category.isActive}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteCategoryItem(category.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">
                  Summary (Applied to All Vehicles)
                </h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Total Income Addition:</span>
                    <span className="text-green-600 font-medium">
                      ₹
                      {adjustmentCategories
                        .filter((cat) => cat.type === "income" && cat.isActive)
                        .reduce((sum, cat) => sum + cat.amount, 0)
                        .toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Expense Deduction:</span>
                    <span className="text-red-600 font-medium">
                      ₹
                      {adjustmentCategories
                        .filter((cat) => cat.type === "expense" && cat.isActive)
                        .reduce((sum, cat) => sum + cat.amount, 0)
                        .toLocaleString()}
                    </span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>Net Impact per Vehicle:</span>
                    <span
                      className={
                        adjustmentCategories
                          .filter(
                            (cat) => cat.type === "income" && cat.isActive
                          )
                          .reduce((sum, cat) => sum + cat.amount, 0) -
                          adjustmentCategories
                            .filter(
                              (cat) => cat.type === "expense" && cat.isActive
                            )
                            .reduce((sum, cat) => sum + cat.amount, 0) >=
                        0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      ₹
                      {(
                        adjustmentCategories
                          .filter(
                            (cat) => cat.type === "income" && cat.isActive
                          )
                          .reduce((sum, cat) => sum + cat.amount, 0) -
                        adjustmentCategories
                          .filter(
                            (cat) => cat.type === "expense" && cat.isActive
                          )
                          .reduce((sum, cat) => sum + cat.amount, 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAdjustmentDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={applyAdjustments}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Apply to All Vehicles
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Vehicle Transaction History Dialog */}
        <VehicleTransactionHistory
          open={isTransactionHistoryOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleTransactionHistoryClose(true); // Refresh data when closing
            } else {
              setIsTransactionHistoryOpen(true);
            }
          }}
          vehicleNumber={selectedVehicleForHistory}
          dateRange={getCurrentDateRange() || undefined}
        />
      </div>
    </AdminLayout>
  );
};

export default VehiclePerformance;
