import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Car,
  TrendingUp,
  TrendingDown,
  Activity,
  Percent,
  Loader2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { useVehicleTransactions } from "@/hooks/useVehicleTransactions";

interface VehiclePerformanceStats {
  totalActiveVehicles: number;
  profitableVehicles: number;
  lossVehicles: number;
}

interface VehiclePerformanceItem {
  vehicle_number: string;
  total_trips: number;
  total_earnings: number;
  total_rent: number;
  transaction_income: number;
  transaction_expense: number;
  profit_loss: number;
  status: "profit" | "loss" | "break_even";
  exact_working_days: number;
  uses_actual_rent: boolean;
  working_days_multiplier?: number;
  approved_report_count?: number;
  other_expense?: number;
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

const VehiclePerformanceOverview = () => {
  const {
    calculateFleetRent,
    calculateCompanyEarnings,
    loading: settingsLoading,
    fleetRentSlabs,
    companyEarningsSlabs,
    vehiclePerformanceRentalIncome,
  } = useAdminSettings();

  const { getTransactionSummary } = useVehicleTransactions();

  const [vehiclePerformanceLoading, setVehiclePerformanceLoading] =
    useState(false);
  const [vehicleStats, setVehicleStats] = useState<VehiclePerformanceStats>({
    totalActiveVehicles: 0,
    profitableVehicles: 0,
    lossVehicles: 0,
  });
  const [vehiclesList, setVehiclesList] = useState<VehiclePerformanceItem[]>(
    []
  );
  const [weekOffset, setWeekOffset] = useState(0);

  const getFleetRent = (tripCount: number): number => {
    if (calculateFleetRent) {
      return calculateFleetRent(tripCount);
    }

    if (fleetRentSlabs && fleetRentSlabs.length > 0) {
      const applicableSlab = fleetRentSlabs.find((slab) => {
        const minTrips = slab.min_trips || 0;
        const maxTrips = slab.max_trips || Infinity;
        return tripCount >= minTrips && tripCount <= maxTrips;
      });

      if (applicableSlab) {
        return applicableSlab.amount || 0;
      }

      const maxAmount = Math.max(
        ...fleetRentSlabs.map((slab) => slab.amount || 0)
      );
      return maxAmount;
    }

    // Final fallback to hardcoded values
    if (tripCount < 64) return 980;
    if (tripCount >= 64 && tripCount < 80) return 830;
    if (tripCount >= 80 && tripCount < 110) return 740;
    if (tripCount >= 110 && tripCount < 125) return 560;
    if (tripCount >= 125 && tripCount < 140) return 410;
    return 290; // 140 or more trips
  };

  const getCompanyEarnings = (tripCount: number): number => {
    try {
      if (vehiclePerformanceRentalIncome > 0) {
        return vehiclePerformanceRentalIncome;
      }

      if (calculateCompanyEarnings) {
        const result = calculateCompanyEarnings(tripCount);
        if (result > 0) {
          return result;
        }
      }

      if (companyEarningsSlabs && companyEarningsSlabs.length > 0) {
        const applicableSlab = companyEarningsSlabs.find((slab) => {
          const minTrips = slab.min_trips || 0;
          const maxTrips = slab.max_trips || Infinity;
          return tripCount >= minTrips && tripCount <= maxTrips;
        });

        if (applicableSlab) {
          return applicableSlab.amount || 0;
        }

        const maxAmount = Math.max(
          ...companyEarningsSlabs.map((slab) => slab.amount || 0)
        );
        return maxAmount;
      }

      return 700;
    } catch (error) {
      console.error("Error calculating company earnings:", error);
      return 700;
    }
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  useEffect(() => {
    if (!settingsLoading) {
      fetchVehiclePerformance();
    }
  }, [settingsLoading, weekOffset]);

  const fetchVehiclePerformance = async () => {
    try {
      setVehiclePerformanceLoading(true);

      // Calculate week dates based on weekOffset (Monday to Sunday)
      const weekDates = getWeekDates(weekOffset);
      const startDate = weekDates.startStr;
      const endDate = weekDates.endStr;

      console.log("Vehicle Performance Overview - Date range:", {
        startDate: weekDates.startStr,
        endDate: weekDates.endStr,
        weekOffset,
      });

      // Fetch vehicles with actual_rent if available
      const vehicleActualRents = new Map<string, number>();
      try {
        const { data: vehiclesData } = await supabase
          .from("vehicles")
          .select("vehicle_number, actual_rent")
          .eq("online", true);

        if (vehiclesData) {
          vehiclesData.forEach((v) => {
            if (v.actual_rent && v.actual_rent > 0) {
              vehicleActualRents.set(v.vehicle_number, v.actual_rent);
            }
          });
        }
      } catch (error: any) {
        if (error?.code !== "42703") {
          console.error("Error fetching vehicle actual rents:", error);
        }
      }

      // Fetch approved reports for current week
      const { data: reports, error: reportsError } = await supabase
        .from("fleet_reports")
        .select("*")
        .eq("status", "approved")
        .gte("rent_date", weekDates.startStr)
        .lte("rent_date", weekDates.endStr);

      if (reportsError) {
        console.error("Error fetching reports:", reportsError);
        throw reportsError;
      }

      // Group reports by vehicle number
      const vehicleStatsMap = new Map<string, VehiclePerformanceItem>();
      const vehicleApprovedReportCount = new Map<string, number>();

      reports?.forEach((report) => {
        const vehicleNumber = report.vehicle_number;
        if (!vehicleNumber) return;

        if (!vehicleStatsMap.has(vehicleNumber)) {
          vehicleStatsMap.set(vehicleNumber, {
            vehicle_number: vehicleNumber,
            total_trips: 0,
            total_earnings: 0,
            total_rent: 0,
            transaction_income: 0,
            transaction_expense: 0,
            profit_loss: 0,
            status: "break_even",
            exact_working_days: 7,
            uses_actual_rent: false,
            working_days_multiplier: 0,
            approved_report_count: 0,
            other_expense: 0,
          });
          vehicleApprovedReportCount.set(vehicleNumber, 0);
        }

        const vehicle = vehicleStatsMap.get(vehicleNumber)!;
        vehicle.total_trips += report.total_trips || 0;

        // Count approved reports
        const currentCount = vehicleApprovedReportCount.get(vehicleNumber) || 0;
        vehicleApprovedReportCount.set(vehicleNumber, currentCount + 1);

        // Calculate earnings per report (if not using vehiclePerformanceRentalIncome)
        if (vehiclePerformanceRentalIncome <= 0) {
          const dailyEarnings = getCompanyEarnings(report.total_trips || 0);
          vehicle.total_earnings += dailyEarnings;
        }
      });

      // Calculate working_days_multiplier for each vehicle (1 report = 0.5 days)
      vehicleApprovedReportCount.forEach((reportCount, vehicleNumber) => {
        const vehicle = vehicleStatsMap.get(vehicleNumber);
        if (vehicle) {
          const calculatedWorkingDays = reportCount / 2;
          vehicle.working_days_multiplier = calculatedWorkingDays;
          vehicle.approved_report_count = reportCount;
        }
      });

      // Calculate earnings and rent for each vehicle
      const vehiclesArray = await Promise.all(
        Array.from(vehicleStatsMap.values()).map(async (vehicle) => {
          const approvedReportCount =
            vehicleApprovedReportCount.get(vehicle.vehicle_number) || 0;

          // Calculate total earnings
          if (vehiclePerformanceRentalIncome > 0) {
            vehicle.total_earnings =
              vehiclePerformanceRentalIncome * approvedReportCount;
          } else {
            const vehicleReports =
              reports?.filter(
                (r) => r.vehicle_number === vehicle.vehicle_number
              ) || [];
            vehicle.total_earnings = vehicleReports.reduce((sum, report) => {
              const dailyEarnings = getCompanyEarnings(report.total_trips || 0);
              return sum + dailyEarnings;
            }, 0);
          }

          // Calculate total rent
          const actualRent = vehicleActualRents.get(vehicle.vehicle_number);
          if (actualRent && actualRent > 0) {
            vehicle.total_rent = actualRent;
            vehicle.uses_actual_rent = true;
          } else {
            const dailyRent = getFleetRent(vehicle.total_trips);
            const exactWorkingDays = vehicle.exact_working_days || 7;
            vehicle.total_rent = dailyRent * exactWorkingDays;
          }

          // Fetch transaction summary
          try {
            if (getTransactionSummary) {
              const transactionSummary = await getTransactionSummary(
                vehicle.vehicle_number,
                startDate,
                endDate
              );
              vehicle.transaction_income = transactionSummary.totalIncome;
              vehicle.transaction_expense = transactionSummary.totalExpense;
              // Other expense includes transaction expense
              vehicle.other_expense = transactionSummary.totalExpense;
            }
          } catch (error) {
            console.error(
              `Error loading transaction summary for ${vehicle.vehicle_number}:`,
              error
            );
            vehicle.other_expense = 0;
          }

          // If transaction expense is 0, set other_expense to 0
          if (!vehicle.other_expense) {
            vehicle.other_expense = 0;
          }

          // Calculate profit/loss
          vehicle.profit_loss =
            vehicle.total_earnings +
            vehicle.transaction_income -
            vehicle.total_rent -
            vehicle.transaction_expense;

          // Determine status
          vehicle.status =
            vehicle.profit_loss > 0
              ? "profit"
              : vehicle.profit_loss < 0
              ? "loss"
              : "break_even";

          return vehicle;
        })
      );

      // Calculate summary statistics
      const totalActiveVehicles = vehiclesArray.length;
      const profitableVehicles = vehiclesArray.filter(
        (v) => v.profit_loss > 0
      ).length;
      const lossVehicles = vehiclesArray.filter(
        (v) => v.profit_loss < 0
      ).length;

      setVehicleStats({
        totalActiveVehicles,
        profitableVehicles,
        lossVehicles,
      });

      // Sort by profit/loss descending
      vehiclesArray.sort((a, b) => b.profit_loss - a.profit_loss);
      setVehiclesList(vehiclesArray);
    } catch (error) {
      console.error("Error fetching vehicle performance:", error);
    } finally {
      setVehiclePerformanceLoading(false);
    }
  };

  return (
    <AdminLayout title="Vehicle Performance Overview">
      <div className="space-y-6">
        {/* Weekly Filter */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehicle Performance Overview
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekOffset(weekOffset - 1)}
                  className="px-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="default"
                  onClick={() => setWeekOffset(0)}
                  className="min-w-[140px]"
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekOffset(weekOffset + 1)}
                  className="px-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {vehiclePerformanceLoading || settingsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-fleet-purple" />
                <span className="ml-2 text-sm text-gray-600">
                  Loading vehicle performance data...
                </span>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <Card className="bg-gradient-to-br from-sky-100 to-sky-50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-sky-800">
                        Total Active Vehicles
                      </CardTitle>
                      <Car className="h-5 w-5 text-sky-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-sky-900">
                        {vehicleStats.totalActiveVehicles}
                      </div>
                      <div className="flex items-center text-xs text-sky-600 mt-2">
                        <Activity className="h-4 w-4 mr-1" />
                        <span>Weekly performance data</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-100 to-green-50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-green-800">
                        Profitable Vehicles
                      </CardTitle>
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-900">
                        {vehicleStats.profitableVehicles}
                      </div>
                      <div className="flex items-center text-xs text-green-600 mt-2">
                        <Percent className="h-4 w-4 mr-1" />
                        <span>
                          {vehicleStats.totalActiveVehicles > 0
                            ? formatPercentage(
                                (vehicleStats.profitableVehicles /
                                  vehicleStats.totalActiveVehicles) *
                                  100
                              )
                            : "0%"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-red-100 to-red-50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-red-800">
                        Loss Vehicles
                      </CardTitle>
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-900">
                        {vehicleStats.lossVehicles}
                      </div>
                      <div className="flex items-center text-xs text-red-600 mt-2">
                        <Percent className="h-4 w-4 mr-1" />
                        <span>
                          {vehicleStats.totalActiveVehicles > 0
                            ? formatPercentage(
                                (vehicleStats.lossVehicles /
                                  vehicleStats.totalActiveVehicles) *
                                  100
                              )
                            : "0%"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Summary Statistics Cards */}
                {(() => {
                  const totals = vehiclesList.reduce(
                    (acc, vehicle) => ({
                      totalRentalIncome:
                        acc.totalRentalIncome + vehicle.total_earnings,
                      totalPenaltyIncome:
                        acc.totalPenaltyIncome + vehicle.transaction_income,
                      totalOtherExpense:
                        acc.totalOtherExpense + (vehicle.other_expense || 0),
                      totalFleetRent: acc.totalFleetRent + vehicle.total_rent,
                      totalProfitLoss:
                        acc.totalProfitLoss + vehicle.profit_loss,
                      totalWorkingDays:
                        acc.totalWorkingDays +
                        (vehicle.working_days_multiplier || 0),
                      totalTrips: acc.totalTrips + vehicle.total_trips,
                      totalRentalDays:
                        acc.totalRentalDays + (vehicle.exact_working_days || 7),
                    }),
                    {
                      totalRentalIncome: 0,
                      totalPenaltyIncome: 0,
                      totalOtherExpense: 0,
                      totalFleetRent: 0,
                      totalProfitLoss: 0,
                      totalWorkingDays: 0,
                      totalTrips: 0,
                      totalRentalDays: 0,
                    }
                  );

                  // Calculate trip count categories
                  const vehiclesBelow65 = vehiclesList.filter(
                    (v) => v.total_trips < 65
                  ).length;
                  const vehiclesBelow80 = vehiclesList.filter(
                    (v) => v.total_trips < 80
                  ).length;
                  const vehiclesAbove80 = vehiclesList.filter(
                    (v) => v.total_trips >= 80
                  ).length;
                  const vehiclesAbove125 = vehiclesList.filter(
                    (v) => v.total_trips >= 125
                  ).length;

                  // Calculate vehicle utilization percentage
                  // Total Working Days / Total Rental Days
                  const vehicleUtilization =
                    totals.totalRentalDays > 0
                      ? (totals.totalWorkingDays / totals.totalRentalDays) * 100
                      : 0;

                  // Calculate averages
                  const avgIncomePerDay =
                    totals.totalWorkingDays > 0
                      ? totals.totalRentalIncome / totals.totalWorkingDays
                      : 0;
                  const avgPenaltyIncomePerDay =
                    totals.totalWorkingDays > 0
                      ? totals.totalPenaltyIncome / totals.totalWorkingDays
                      : 0;

                  // Avg Income/Day + p income/day (combined)
                  const avgTotalIncomePerDay =
                    avgIncomePerDay + avgPenaltyIncomePerDay;

                  // Avg Fleetrent/day = Total Fleet Rent / Total Working Days
                  const avgFleetRentPerDay =
                    totals.totalWorkingDays > 0
                      ? totals.totalFleetRent / totals.totalWorkingDays
                      : 0;

                  // Avg Other Expense/Day = Total Other Expense / Total Working Days
                  const avgOtherExpensePerDay =
                    totals.totalWorkingDays > 0
                      ? totals.totalOtherExpense / totals.totalWorkingDays
                      : 0;

                  // Avg Gross Profit (G/P) = Avg Income/Day - Avg Fleetrent/day - Avg Other Expense/Day
                  const avgGrossProfit =
                    avgTotalIncomePerDay -
                    avgFleetRentPerDay -
                    avgOtherExpensePerDay;

                  // Avg Trips/Day = Total trips / Total Working Days
                  const avgTripsPerDay =
                    totals.totalWorkingDays > 0
                      ? totals.totalTrips / totals.totalWorkingDays
                      : 0;

                  // Percentage calculations
                  const avgFleetRentPercentage =
                    avgTotalIncomePerDay > 0
                      ? (avgFleetRentPerDay / avgTotalIncomePerDay) * 100
                      : 0;
                  // Avg Gross Profit percentage = (Avg Gross Profit / Avg Income/Day) * 100
                  const avgGrossProfitPercentage =
                    avgTotalIncomePerDay > 0
                      ? (avgGrossProfit / avgTotalIncomePerDay) * 100
                      : 0;

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      <Card className="bg-gradient-to-br from-green-100 to-green-50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-green-800">
                            Total Rental Income
                          </CardTitle>
                          <DollarSign className="h-5 w-5 text-green-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-900">
                            ₹{totals.totalRentalIncome.toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-green-100 to-green-50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-green-800">
                            Total Penalty Income
                          </CardTitle>
                          <DollarSign className="h-5 w-5 text-green-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-900">
                            ₹{totals.totalPenaltyIncome.toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-red-100 to-red-50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-red-800">
                            Total Other Expense
                          </CardTitle>
                          <TrendingDown className="h-5 w-5 text-red-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-red-900">
                            ₹{totals.totalOtherExpense.toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-red-100 to-red-50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-red-800">
                            Total Fleet Rent
                          </CardTitle>
                          <TrendingDown className="h-5 w-5 text-red-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-red-900">
                            ₹{totals.totalFleetRent.toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>

                      <Card
                        className={`bg-gradient-to-br ${
                          totals.totalProfitLoss >= 0
                            ? "from-green-100 to-green-50"
                            : "from-red-100 to-red-50"
                        }`}
                      >
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle
                            className={`text-sm font-medium ${
                              totals.totalProfitLoss >= 0
                                ? "text-green-800"
                                : "text-red-800"
                            }`}
                          >
                            Total Profit/Loss
                          </CardTitle>
                          {totals.totalProfitLoss >= 0 ? (
                            <TrendingUp
                              className={`h-5 w-5 ${
                                totals.totalProfitLoss >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-600" />
                          )}
                        </CardHeader>
                        <CardContent>
                          <div
                            className={`text-2xl font-bold ${
                              totals.totalProfitLoss >= 0
                                ? "text-green-900"
                                : "text-red-900"
                            }`}
                          >
                            ₹{totals.totalProfitLoss.toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-sky-100 to-sky-50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-sky-800">
                            Total Working Days
                          </CardTitle>
                          <Activity className="h-5 w-5 text-sky-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-sky-900">
                            {totals.totalWorkingDays.toFixed(1)}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-emerald-100 to-emerald-50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-emerald-800">
                            Avg Income/Day
                          </CardTitle>
                          <TrendingUp className="h-5 w-5 text-emerald-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-emerald-900">
                            ₹{avgTotalIncomePerDay.toFixed(0)}
                          </div>
                          <div className="text-xs text-emerald-700 mt-1">
                            {formatPercentage(100)}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-lime-100 to-lime-50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-lime-800">
                            p income/day
                          </CardTitle>
                          <TrendingUp className="h-5 w-5 text-lime-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-lime-900">
                            ₹{avgPenaltyIncomePerDay.toFixed(0)}
                          </div>
                          <div className="text-xs text-lime-700 mt-1">
                            {avgTotalIncomePerDay > 0
                              ? formatPercentage(
                                  (avgPenaltyIncomePerDay /
                                    avgTotalIncomePerDay) *
                                    100
                                )
                              : "0%"}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-rose-100 to-rose-50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-rose-800">
                            Avg Fleetrent/day
                          </CardTitle>
                          <TrendingDown className="h-5 w-5 text-rose-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-rose-900">
                            ₹{avgFleetRentPerDay.toFixed(0)}
                          </div>
                          <div className="text-xs text-rose-700 mt-1">
                            {formatPercentage(avgFleetRentPercentage)}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-red-100 to-red-50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-red-800">
                            Avg Other Expense/Day
                          </CardTitle>
                          <TrendingDown className="h-5 w-5 text-red-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-red-900">
                            ₹{avgOtherExpensePerDay.toFixed(0)}
                          </div>
                          <div className="text-xs text-red-700 mt-1">
                            {avgTotalIncomePerDay > 0
                              ? formatPercentage(
                                  (avgOtherExpensePerDay /
                                    avgTotalIncomePerDay) *
                                    100
                                )
                              : "0%"}
                          </div>
                        </CardContent>
                      </Card>

                      <Card
                        className={`bg-gradient-to-br ${
                          avgGrossProfit >= 0
                            ? "from-green-100 to-green-50"
                            : "from-red-100 to-red-50"
                        }`}
                      >
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle
                            className={`text-sm font-medium ${
                              avgGrossProfit >= 0
                                ? "text-green-800"
                                : "text-red-800"
                            }`}
                          >
                            Avg Gross Profit (G/P)
                          </CardTitle>
                          {avgGrossProfit >= 0 ? (
                            <TrendingUp
                              className={`h-5 w-5 ${
                                avgGrossProfit >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-600" />
                          )}
                        </CardHeader>
                        <CardContent>
                          <div
                            className={`text-2xl font-bold ${
                              avgGrossProfit >= 0
                                ? "text-green-900"
                                : "text-red-900"
                            }`}
                          >
                            ₹{avgGrossProfit.toFixed(0)}
                          </div>
                          <div
                            className={`text-xs mt-1 ${
                              avgGrossProfit >= 0
                                ? "text-green-700"
                                : "text-red-700"
                            }`}
                          >
                            {formatPercentage(avgGrossProfitPercentage)}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-blue-100 to-blue-50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-blue-800">
                            Avg Trips/Day
                          </CardTitle>
                          <Activity className="h-5 w-5 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-blue-900">
                            {avgTripsPerDay.toFixed(1)}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-purple-100 to-purple-50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-purple-800">
                            Total Rental Days
                          </CardTitle>
                          <Activity className="h-5 w-5 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-purple-900">
                            {totals.totalRentalDays}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-orange-100 to-orange-50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-orange-800">
                            Vehicles {"<"} 65 Trips
                          </CardTitle>
                          <Car className="h-5 w-5 text-orange-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-orange-900">
                            {vehiclesBelow65}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-amber-100 to-amber-50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-amber-800">
                            Vehicles {"<"} 80 Trips
                          </CardTitle>
                          <Car className="h-5 w-5 text-amber-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-amber-900">
                            {vehiclesBelow80}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-teal-100 to-teal-50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-teal-800">
                            Vehicles {"≥"} 80 Trips
                          </CardTitle>
                          <Car className="h-5 w-5 text-teal-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-teal-900">
                            {vehiclesAbove80}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-indigo-100 to-indigo-50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-indigo-800">
                            Vehicles {"≥"} 125 Trips
                          </CardTitle>
                          <Car className="h-5 w-5 text-indigo-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-indigo-900">
                            {vehiclesAbove125}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-cyan-100 to-cyan-50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-cyan-800">
                            Vehicle Utilization
                          </CardTitle>
                          <Percent className="h-5 w-5 text-cyan-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-cyan-900">
                            {formatPercentage(vehicleUtilization)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })()}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default VehiclePerformanceOverview;
