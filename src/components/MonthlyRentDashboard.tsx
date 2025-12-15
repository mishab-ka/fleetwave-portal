import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Download,
  BarChart3,
  PieChart,
} from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  format,
  parseISO,
  isValid,
  addMonths,
  subMonths,
} from "date-fns";

interface MonthlyRentData {
  month: string;
  total_reports: number;
  total_rent: number;
  occupied_beds: number;
  revenue_per_bed: number;
  driver_count: number;
}

interface DriverRentData {
  id: string;
  name: string;
  phone_number: string;
  room_number: number;
  bed_name: string;
  shift: string;
  reports_count: number;
  total_rent: number;
  last_report_date: string;
}

const MonthlyRentDashboard: React.FC = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyRentData[]>([]);
  const [driverData, setDriverData] = useState<DriverRentData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM format
  );
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"summary" | "drivers">("summary");
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedMonth]);

  const fetchMonthlyData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchMonthlySummary(), fetchDriverRentData()]);
    } catch (error) {
      console.error("Error fetching monthly data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlySummary = async () => {
    try {
      // Use date-fns for accurate date calculations
      const selectedDate = parseISO(selectedMonth + "-01");
      if (!isValid(selectedDate)) {
        throw new Error(`Invalid date: ${selectedMonth}`);
      }

      const startOfMonthDate = startOfMonth(selectedDate);
      const endOfMonthDate = endOfMonth(selectedDate);

      // Get reports for the selected month
      const { data: reports, error: reportsError } = await supabase
        .from("fleet_reports")
        .select("user_id, rent_date, status")
        .gte("rent_date", format(startOfMonthDate, "yyyy-MM-dd"))
        .lte("rent_date", format(endOfMonthDate, "yyyy-MM-dd"));

      if (reportsError) throw reportsError;

      // Get total reports count for comparison
      const { data: allReports, error: allReportsError } = await supabase
        .from("fleet_reports")
        .select("id, rent_date, status")
        .gte("rent_date", format(startOfMonthDate, "yyyy-MM-dd"))
        .lte("rent_date", format(endOfMonthDate, "yyyy-MM-dd"));

      // Use date-fns for accurate month name display
      const monthName = format(selectedDate, "MMMM yyyy");

      const debugData = {
        selectedMonth,
        displayMonth: monthName, // Show the actual month name
        startDate: format(startOfMonthDate, "yyyy-MM-dd"),
        endDate: format(endOfMonthDate, "yyyy-MM-dd"),
        totalReports: reports?.length || 0,
        allReportsCount: allReports?.length || 0,
        statusBreakdown: allReports?.reduce((acc: any, report: any) => {
          acc[report.status] = (acc[report.status] || 0) + 1;
          return acc;
        }, {}),
        reports: reports?.slice(0, 5), // Show first 5 reports for debugging
      };

      console.log("Monthly Summary Debug:", debugData);
      console.log("Date Range Debug:", {
        selectedMonth,
        startOfMonth: format(startOfMonthDate, "yyyy-MM-dd"),
        endOfMonth: format(endOfMonthDate, "yyyy-MM-dd"),
        startMonth: format(startOfMonthDate, "M"),
        endMonth: format(endOfMonthDate, "M"),
        startYear: format(startOfMonthDate, "yyyy"),
        endYear: format(endOfMonthDate, "yyyy"),
        monthName: format(selectedDate, "MMMM yyyy"),
      });
      setDebugInfo(debugData);

      // Get current bed assignments (active assignments)
      const { data: assignments, error: assignmentsError } = await supabase
        .from("bed_assignments")
        .select(
          `
          user_id,
          bed_id,
          shift,
          bed:beds(
            bed_name,
            room:rooms(
              room_number,
              room_name
            )
          )
        `
        )
        .eq("status", "active")
        .is("end_date", null);

      if (assignmentsError) throw assignmentsError;

      // Get all beds to calculate total capacity
      const { data: allBeds, error: bedsError } = await supabase
        .from("beds")
        .select("id, room_id");

      if (bedsError) throw bedsError;

      const totalReports = reports?.length || 0;
      const totalRent = totalReports * 100; // ₹100 per report
      const uniqueDrivers = new Set(reports?.map((r) => r.user_id) || []);

      // Calculate occupied beds (beds with at least one active assignment)
      const occupiedBedIds = new Set(assignments?.map((a) => a.bed_id) || []);
      const totalBeds = allBeds?.length || 30; // Default to 30 if query fails
      const occupiedBeds = occupiedBedIds.size;

      setMonthlyData([
        {
          month: selectedMonth,
          total_reports: totalReports,
          total_rent: totalRent,
          occupied_beds: occupiedBeds,
          revenue_per_bed: occupiedBeds > 0 ? totalRent / occupiedBeds : 0,
          driver_count: uniqueDrivers.size,
        },
      ]);
    } catch (error) {
      console.error("Error fetching monthly summary:", error);
    }
  };

  const fetchDriverRentData = async () => {
    try {
      // Use date-fns for accurate date calculations
      const selectedDate = parseISO(selectedMonth + "-01");
      if (!isValid(selectedDate)) {
        throw new Error(`Invalid date: ${selectedMonth}`);
      }

      const startOfMonthDate = startOfMonth(selectedDate);
      const endOfMonthDate = endOfMonth(selectedDate);

      // Get driver reports with room/bed info
      const { data: driverReports, error } = await supabase
        .from("fleet_reports")
        .select(
          `
          user_id,
          driver_name,
          rent_date,
          status,
          users!inner(
            id,
            name,
            phone_number,
            current_room_id,
            current_bed_id,
            current_shift,
            current_bed_assignment:bed_assignments!bed_assignments_user_id_fkey(
              bed:beds(
                bed_name,
                room:rooms(
                  room_number,
                  room_name
                )
              ),
              shift
            )
          )
        `
        )
        .gte("rent_date", format(startOfMonthDate, "yyyy-MM-dd"))
        .lte("rent_date", format(endOfMonthDate, "yyyy-MM-dd"))
        // .in("status", ["approved", "pending_verification"])
        .eq("users.current_bed_assignment.status", "active")
        .is("users.current_bed_assignment.end_date", null);

      if (error) throw error;

      // Use date-fns for accurate month name display
      const monthName = format(selectedDate, "MMMM yyyy");

      console.log("Driver Reports Debug:", {
        selectedMonth,
        displayMonth: monthName,
        startDate: format(startOfMonthDate, "yyyy-MM-dd"),
        endDate: format(endOfMonthDate, "yyyy-MM-dd"),
        startMonth: format(startOfMonthDate, "M"),
        endMonth: format(endOfMonthDate, "M"),
        totalDriverReports: driverReports?.length || 0,
        driverReports: driverReports?.slice(0, 3), // Show first 3 reports for debugging
      });

      // Group by driver and calculate totals
      const driverMap = new Map<string, DriverRentData>();

      driverReports?.forEach((report: any) => {
        const userId = report.user_id;
        const user = report.users;
        const bedAssignment = user.current_bed_assignment?.[0];

        if (!driverMap.has(userId)) {
          driverMap.set(userId, {
            id: userId,
            name: user.name,
            phone_number: user.phone_number,
            room_number: bedAssignment?.bed?.room?.room_number || 0,
            bed_name: bedAssignment?.bed?.bed_name || "Not Assigned",
            shift: bedAssignment?.shift || user.current_shift || "N/A",
            reports_count: 0,
            total_rent: 0,
            last_report_date: report.rent_date,
          });
        }

        const driverData = driverMap.get(userId)!;
        driverData.reports_count += 1;
        driverData.total_rent += 100; // ₹100 per report
        driverData.last_report_date =
          report.rent_date > driverData.last_report_date
            ? report.rent_date
            : driverData.last_report_date;
      });

      setDriverData(Array.from(driverMap.values()));
    } catch (error) {
      console.error("Error fetching driver rent data:", error);
    }
  };

  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();

    for (let i = 0; i < 12; i++) {
      const date = subMonths(currentDate, i);
      const monthString = format(date, "yyyy-MM");
      const monthName = format(date, "MMMM yyyy");
      options.push({ value: monthString, label: monthName });
    }

    return options;
  };

  const exportToCSV = () => {
    if (viewMode === "summary") {
      // Export monthly summary
      const csvContent = [
        [
          "Month",
          "Total Reports",
          "Total Rent (₹)",
          "Occupied Beds",
          "Revenue per Bed (₹)",
          "Driver Count",
        ],
        ...monthlyData.map((data) => [
          data.month,
          data.total_reports.toString(),
          data.total_rent.toString(),
          data.occupied_beds.toString(),
          data.revenue_per_bed.toFixed(2),
          data.driver_count.toString(),
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `monthly-rent-summary-${selectedMonth}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      // Export driver data
      const csvContent = [
        [
          "Driver Name",
          "Phone",
          "Room",
          "Bed",
          "Shift",
          "Reports Count",
          "Total Rent (₹)",
          "Last Report Date",
        ],
        ...driverData.map((data) => [
          data.name,
          data.phone_number,
          data.room_number.toString(),
          data.bed_name,
          data.shift,
          data.reports_count.toString(),
          data.total_rent.toString(),
          data.last_report_date,
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `driver-rent-data-${selectedMonth}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  const currentMonthData = monthlyData[0];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-fleet-purple mb-2">
          Monthly Rent Dashboard
        </h1>
        <p className="text-gray-600">Track rent collection and bed occupancy</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {generateMonthOptions().map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant={viewMode === "summary" ? "default" : "outline"}
            onClick={() => setViewMode("summary")}
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Summary
          </Button>
          <Button
            variant={viewMode === "drivers" ? "default" : "outline"}
            onClick={() => setViewMode("drivers")}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Drivers
          </Button>
        </div>

        <Button
          onClick={exportToCSV}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>

        <Button
          onClick={() => setShowDebug(!showDebug)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <BarChart3 className="w-4 h-4" />
          {showDebug ? "Hide Debug" : "Show Debug"}
        </Button>
      </div>

      {/* Debug Information */}
      {showDebug && debugInfo && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">
              Debug Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Date Range</h4>
                <p>
                  Month: {debugInfo.displayMonth || debugInfo.selectedMonth}
                </p>
                <p>Start: {debugInfo.startDate}</p>
                <p>End: {debugInfo.endDate}</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Report Counts</h4>
                <p>Filtered Reports: {debugInfo.totalReports}</p>
                <p>All Reports: {debugInfo.allReportsCount}</p>
                <p>
                  Difference:{" "}
                  {debugInfo.allReportsCount - debugInfo.totalReports}
                </p>
              </div>
              <div className="md:col-span-2">
                <h4 className="font-medium mb-2">Status Breakdown</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(debugInfo.statusBreakdown || {}).map(
                    ([status, count]) => (
                      <Badge key={status} variant="outline">
                        {status}: {count as number}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === "summary" ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Reports
                    </p>
                    <p className="text-2xl font-bold text-fleet-purple">
                      {currentMonthData?.total_reports || 0}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-fleet-purple" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Rent
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      ₹{currentMonthData?.total_rent || 0}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Active Drivers
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {currentMonthData?.driver_count || 0}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Revenue per Bed
                    </p>
                    <p className="text-2xl font-bold text-purple-600">
                      ₹{currentMonthData?.revenue_per_bed?.toFixed(0) || 0}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Summary */}
          <Card>
            <CardHeader>
              <CardTitle>
                Monthly Summary -{" "}
                {(() => {
                  const selectedDate = parseISO(selectedMonth + "-01");
                  return isValid(selectedDate)
                    ? format(selectedDate, "MMMM yyyy")
                    : selectedMonth;
                })()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Average Reports per Driver
                  </p>
                  <p className="text-2xl font-bold text-fleet-purple">
                    {currentMonthData?.driver_count > 0
                      ? (
                          currentMonthData.total_reports /
                          currentMonthData.driver_count
                        ).toFixed(1)
                      : 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Occupied Beds</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {currentMonthData?.occupied_beds || 0}/30
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Occupancy Rate</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {currentMonthData?.occupied_beds > 0
                      ? ((currentMonthData.occupied_beds / 30) * 100).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rent Calculation Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Rent Calculation Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Rent Structure</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Cost per Report:</span>
                      <span className="font-medium">₹100</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Reports Submitted:</span>
                      <span className="font-medium">
                        {currentMonthData?.total_reports || 0}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">Total Rent Collected:</span>
                      <span className="font-bold text-green-600">
                        ₹{currentMonthData?.total_rent || 0}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">
                    Bed Space Utilization
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Bed Spaces:</span>
                      <span className="font-medium">30</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Occupied Bed Spaces:</span>
                      <span className="font-medium text-orange-600">
                        {currentMonthData?.occupied_beds || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Available Bed Spaces:</span>
                      <span className="font-medium text-green-600">
                        {30 - (currentMonthData?.occupied_beds || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">Revenue per Bed:</span>
                      <span className="font-bold text-blue-600">
                        ₹{currentMonthData?.revenue_per_bed?.toFixed(0) || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Driver Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Drivers</p>
                  <p className="text-2xl font-bold text-fleet-purple">
                    {driverData.length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Assigned Drivers</p>
                  <p className="text-2xl font-bold text-green-600">
                    {driverData.filter((d) => d.room_number > 0).length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Reports</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {driverData.reduce((sum, d) => sum + d.reports_count, 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Rent</p>
                  <p className="text-2xl font-bold text-green-600">
                    ₹{driverData.reduce((sum, d) => sum + d.total_rent, 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Driver Details */}
          <Card>
            <CardHeader>
              <CardTitle>
                Driver Rent Details -{" "}
                {(() => {
                  const selectedDate = parseISO(selectedMonth + "-01");
                  return isValid(selectedDate)
                    ? format(selectedDate, "MMMM yyyy")
                    : selectedMonth;
                })()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Driver</th>
                      <th className="text-left py-3 px-4">Phone</th>
                      <th className="text-left py-3 px-4">Room</th>
                      <th className="text-left py-3 px-4">Bed</th>
                      <th className="text-left py-3 px-4">Shift</th>
                      <th className="text-left py-3 px-4">Reports</th>
                      <th className="text-left py-3 px-4">Total Rent</th>
                      <th className="text-left py-3 px-4">Last Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driverData.map((driver) => (
                      <tr key={driver.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{driver.name}</td>
                        <td className="py-3 px-4">{driver.phone_number}</td>
                        <td className="py-3 px-4">
                          {driver.room_number > 0 ? (
                            <Badge variant="outline">
                              Room {driver.room_number}
                            </Badge>
                          ) : (
                            <span className="text-gray-500 italic">
                              Not Assigned
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {driver.bed_name !== "Not Assigned" ? (
                            <span className="font-medium">
                              {driver.bed_name}
                            </span>
                          ) : (
                            <span className="text-gray-500 italic">
                              Not Assigned
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              driver.shift === "morning"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {driver.shift}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">{driver.reports_count}</td>
                        <td className="py-3 px-4 font-semibold text-green-600">
                          ₹{driver.total_rent}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(
                            driver.last_report_date
                          ).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default MonthlyRentDashboard;
