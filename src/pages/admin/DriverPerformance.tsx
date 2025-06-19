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
import { Input } from "@/components/ui/input";
import {
  Search,
  Trophy,
  TrendingUp,
  DollarSign,
  Car,
  Users,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import {
  format,
  startOfWeek,
  endOfWeek,
  subDays,
  startOfDay,
  endOfDay,
  addDays,
} from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DriverPerformance {
  driver_id: string;
  driver_name: string;
  total_trips: number;
  total_earnings: number;
  worked_days: number;
  //   total_distance: number;
  //   average_rating: number;
  rank: number;
  combined_score?: number; // Add combined score for ranking
  online: boolean;
  last_active: string;
}

const DriverPerformance = () => {
  const [drivers, setDrivers] = useState<DriverPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("week");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("earnings");
  const [statistics, setStatistics] = useState({
    totalDrivers: 0,
    totalTrips: 0,
    totalEarnings: 0,
    //   averageRating: 0,
    onlineDrivers: 0,
  });

  // Low performance filters
  const [lowPerfFilters, setLowPerfFilters] = useState({
    minTrips: "",
    maxTrips: "",
    minEarnings: "",
    maxEarnings: "",
    minDays: "",
    maxDays: "",
  });

  useEffect(() => {
    fetchDriverPerformance();
  }, [filterType, customStart, customEnd, activeTab]);

  const fetchDriverPerformance = async () => {
    try {
      setLoading(true);
      let startDate: Date;
      let endDate: Date = new Date();

      // Set date range based on filter type
      switch (filterType) {
        case "daily":
          // Only today's data
          const today = new Date();
          startDate = startOfDay(today);
          endDate = endOfDay(today);

          break;
        case "week":
          // Full week: Monday to Sunday (7 days)
          startDate = startOfWeek(new Date(), { weekStartsOn: 2 }); // Monday, 00:00:00
          endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
          console.log(
            "Week filter: rent_date between",
            startDate.toISOString(),
            "and",
            endDate.toISOString()
          );
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
          // Default to full week: Monday to Sunday
          startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
          endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
      }

      console.log("Date range:", {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      });

      // Step 1: Fetch ALL reports first
      let query = supabase
        .from("fleet_reports")
        .select("*")
        .eq("status", "approved");

      if (filterType === "daily") {
        // For daily, use exact date match
        const todayString = new Date().toISOString().split("T")[0];
        query = query.eq("rent_date", todayString);
        console.log("Daily filter: rent_date =", todayString);
      } else {
        // For other filters, use date range
        query = query
          .gte("rent_date", startDate.toISOString().split("T")[0])
          .lte("rent_date", endDate.toISOString().split("T")[0]);
        console.log(
          "Range filter: rent_date between",
          startDate.toISOString().split("T")[0],
          "and",
          endDate.toISOString().split("T")[0]
        );
      }

      const { data: allReports, error: reportsError } = await query;

      if (reportsError) {
        console.error("Error fetching reports:", reportsError);
        throw reportsError;
      }

      // Step 2: Get unique driver IDs from reports
      const driverIds = [
        ...new Set(allReports?.map((report) => report.user_id) || []),
      ].filter((id) => id !== undefined && id !== null);
      console.log("Unique driver IDs found in reports:", driverIds);

      console.log("Drivers id:", driverIds);

      // Step 3: Fetch driver details for these IDs
      const { data: driversData, error: driversError } = await supabase
        .from("users")
        .select("*")
        .in("id", driverIds);

      if (driversError) {
        console.error("Error fetching drivers:", driversError);
        throw driversError;
      }

      // Step 4: Create trips aggregation by user
      const tripsByUser: Record<string, number> = {};
      const earningsByUser: Record<string, number> = {};
      const workedDaysByUser: Record<string, number> = {}; // Add worked days tracking

      allReports?.forEach((report) => {
        const userId = report.user_id;
        const trips = report.total_trips || 0;
        const earnings = report.total_earnings || 0;

        if (!tripsByUser[userId]) {
          tripsByUser[userId] = 0;
        }
        if (!earningsByUser[userId]) {
          earningsByUser[userId] = 0;
        }
        if (!workedDaysByUser[userId]) {
          workedDaysByUser[userId] = 0;
        }

        tripsByUser[userId] += trips;
        earningsByUser[userId] += earnings;

        // Count worked days based on approved reports
        if (report.status === "approved") {
          workedDaysByUser[userId] += 1;
        }
      });

      console.log("Trips by user:", tripsByUser);
      console.log("Earnings by user:", earningsByUser);
      console.log("Worked days by user:", workedDaysByUser);

      // Step 5: Initialize driver stats
      const driverStats = new Map<string, DriverPerformance>();

      driverIds.forEach((driverId) => {
        const driverInfo = driversData?.find((d) => d.id === driverId);
        driverStats.set(driverId, {
          driver_id: driverId,
          driver_name: driverInfo?.name || "Unknown Driver",
          total_trips: tripsByUser[driverId] || 0,
          total_earnings: earningsByUser[driverId] || 0,
          worked_days: workedDaysByUser[driverId] || 0,
          rank: 0,
          online: driverInfo?.online || false,
          last_active: driverInfo?.last_active || "",
        });
      });

      console.log("Initialized driver stats for:", driverStats.size, "drivers");

      // Step 6: Aggregate data from reports (GROUP BY user_id and SUM trips)
      let totalProcessedReports = 0;
      allReports?.forEach((report, index) => {
        const driverId = report.user_id;
        const stats = driverStats.get(driverId);

        if (stats) {
          // Convert values properly
          const trips = Number(report.trips) || 0;
          const earnings = Number(report.earnings) || 0;
          const distance = Number(report.distance) || 0;
          const rating = Number(report.rating) || 0;

          // Add to totals
          stats.total_trips += trips;
          stats.total_earnings += earnings;
          //   stats.total_distance += distance;

          //   if (rating > 0) {
          //     if (stats.average_rating === 0) {
          //       stats.average_rating = rating;
          //     } else {
          //       stats.average_rating = (stats.average_rating + rating) / 2;
          //     }
          //   }

          totalProcessedReports++;

          // Log first few for debugging
          if (index < 5) {
            console.log(
              `Report ${
                index + 1
              }: User ${driverId} - trips: ${trips} (${typeof report.trips}), earnings: ${earnings} (${typeof report.earnings})`
            );
            console.log(
              `Running total for ${stats.driver_name}: trips=${stats.total_trips}, earnings=${stats.total_earnings}`
            );
          }
        }
      });

      //   console.log(`Processed ${totalProcessedReports} reports`);

      // Log final stats for debugging
      driverStats.forEach((stats, driverId) => {
        console.log(
          `Final stats for ${stats.driver_name} (${driverId}): trips=${stats.total_trips}, earnings=${stats.total_earnings}`
        );
      });

      // Convert to array and sort based on active tab
      let driverArray = Array.from(driverStats.values());

      // Calculate combined score for combined ranking
      if (activeTab === "combined") {
        // Normalize trips and earnings to create a combined score
        const maxTrips = Math.max(...driverArray.map((d) => d.total_trips));
        const maxEarnings = Math.max(
          ...driverArray.map((d) => d.total_earnings)
        );

        driverArray.forEach((driver) => {
          // Weighted score: 40% trips + 60% earnings (you can adjust these weights)
          const tripsScore =
            maxTrips > 0 ? (driver.total_trips / maxTrips) * 40 : 0;
          const earningsScore =
            maxEarnings > 0 ? (driver.total_earnings / maxEarnings) * 60 : 0;
          driver.combined_score = tripsScore + earningsScore;
        });
      }

      // Calculate low performance score for low performance ranking
      if (activeTab === "low_performance") {
        driverArray.forEach((driver) => {
          let performanceScore = 0;

          if (driver.worked_days > 0) {
            const avgTripsPerDay = driver.total_trips / driver.worked_days;
            const avgEarningsPerDay =
              driver.total_earnings / driver.worked_days;

            // Low performance indicators (higher score = worse performance)
            let tripsPenalty = 0;
            let earningsPenalty = 0;
            let daysPenalty = 0;

            // Trips per day penalty
            if (avgTripsPerDay < 10) tripsPenalty += 30;
            else if (avgTripsPerDay < 11) tripsPenalty += 15;

            // Earnings per day penalty
            if (avgEarningsPerDay < 2000) earningsPenalty += 40;
            else if (avgEarningsPerDay < 2500) earningsPenalty += 20;

            // Low worked days penalty
            if (driver.worked_days < 3) daysPenalty += 25;
            else if (driver.worked_days < 5) daysPenalty += 10;

            performanceScore = tripsPenalty + earningsPenalty + daysPenalty;
          } else {
            // No worked days = maximum penalty
            performanceScore = 100;
          }

          driver.combined_score = performanceScore;
        });
      }

      // Sort based on active tab
      switch (activeTab) {
        case "earnings":
          driverArray.sort((a, b) => b.total_earnings - a.total_earnings);
          break;
        case "trips":
          driverArray.sort((a, b) => b.total_trips - a.total_trips);
          break;
        case "combined":
          driverArray.sort(
            (a, b) => (b.combined_score || 0) - (a.combined_score || 0)
          );
          break;
        case "low_performance":
          // For low performance, higher score = worse performance, so sort descending
          driverArray.sort(
            (a, b) => (b.combined_score || 0) - (a.combined_score || 0)
          );
          break;
      }

      // Add ranks
      driverArray = driverArray.map((driver, index) => ({
        ...driver,
        rank: index + 1,
      }));

      //   console.log("Final driver array:", driverArray);

      // Calculate statistics
      const totalDrivers = driverArray.length;
      const totalTrips = driverArray.reduce(
        (sum, driver) => sum + driver.total_trips,
        0
      );
      const totalEarnings = driverArray.reduce(
        (sum, driver) => sum + driver.total_earnings,
        0
      );
      //   const averageRating =
      //     driverArray.reduce((sum, driver) => sum + driver.average_rating, 0) /
      //     totalDrivers;
      const onlineDrivers = driverArray.filter(
        (driver) => driver.online
      ).length;

      setStatistics({
        totalDrivers,
        totalTrips,
        totalEarnings,
        // averageRating,
        onlineDrivers,
      });

      setDrivers(driverArray);
    } catch (error) {
      console.error("Error fetching driver performance:", error);
      toast.error("Failed to load driver performance data");
    } finally {
      setLoading(false);
    }
  };

  const filteredDrivers = drivers.filter((driver) => {
    // Basic search filter
    const matchesSearch =
      (driver.driver_name?.toLowerCase() || "").includes(
        searchQuery.toLowerCase()
      ) ||
      (driver.driver_id?.toLowerCase() || "").includes(
        searchQuery.toLowerCase()
      );

    // Low performance specific filters
    if (activeTab === "low_performance") {
      const matchesTrips =
        (lowPerfFilters.minTrips === "" ||
          driver.total_trips >= parseInt(lowPerfFilters.minTrips)) &&
        (lowPerfFilters.maxTrips === "" ||
          driver.total_trips <= parseInt(lowPerfFilters.maxTrips));

      const matchesEarnings =
        (lowPerfFilters.minEarnings === "" ||
          driver.total_earnings >= parseInt(lowPerfFilters.minEarnings)) &&
        (lowPerfFilters.maxEarnings === "" ||
          driver.total_earnings <= parseInt(lowPerfFilters.maxEarnings));

      const matchesDays =
        (lowPerfFilters.minDays === "" ||
          driver.worked_days >= parseInt(lowPerfFilters.minDays)) &&
        (lowPerfFilters.maxDays === "" ||
          driver.worked_days <= parseInt(lowPerfFilters.maxDays));

      return matchesSearch && matchesTrips && matchesEarnings && matchesDays;
    }

    return matchesSearch;
  });

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "bg-yellow-400 text-white";
    if (rank === 2) return "bg-gray-300 text-white";
    if (rank === 3) return "bg-amber-600 text-white";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <AdminLayout title="Driver Performance">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search drivers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
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

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Drivers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.totalDrivers}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Online Drivers
              </CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.onlineDrivers}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalTrips}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Earnings
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{statistics.totalEarnings.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          {/* <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Average Rating
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.averageRating.toFixed(1)}
              </div>
            </CardContent>
          </Card> */}
        </div>

        {/* Ranking Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="earnings">Earnings Rank</TabsTrigger>
            <TabsTrigger value="trips">Trips Rank</TabsTrigger>
            <TabsTrigger value="combined">Combined Rank</TabsTrigger>
            <TabsTrigger value="low_performance">Low Performance</TabsTrigger>
          </TabsList>
          <TabsContent value="earnings" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Driver Rankings by Total Earnings</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto h-[460px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Driver Name</TableHead>
                          <TableHead>Total Trips</TableHead>
                          <TableHead>Total Earnings</TableHead>
                          <TableHead>Worked Days</TableHead>
                          <TableHead>Average Earnings/day</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDrivers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              No drivers found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredDrivers.map((driver) => (
                            <TableRow key={driver.driver_id}>
                              <TableCell>
                                <Badge
                                  className={`${getRankBadge(
                                    driver.rank
                                  )} px-2 py-1 rounded-full`}
                                >
                                  {driver.rank === 1 && (
                                    <Trophy className="h-4 w-4 mr-1" />
                                  )}
                                  {driver.rank}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                {driver.driver_name}
                              </TableCell>
                              <TableCell>{driver.total_trips}</TableCell>
                              <TableCell className="font-semibold text-green-600">
                                ₹{driver.total_earnings.toLocaleString()}
                              </TableCell>
                              <TableCell>{driver.worked_days}</TableCell>
                              <TableCell>
                                <span
                                  className="font-semibold"
                                  style={{
                                    color:
                                      Math.round(
                                        driver.total_earnings /
                                          driver.worked_days
                                      ) < 2000
                                        ? "red"
                                        : Math.round(
                                            driver.total_earnings /
                                              driver.worked_days
                                          ) < 2500
                                        ? "orange"
                                        : "green",
                                  }}
                                >
                                  ₹
                                  {Math.round(
                                    driver.total_earnings / driver.worked_days
                                  ).toLocaleString()}
                                  /day
                                </span>
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
          <TabsContent value="trips" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Driver Rankings by Total Trips</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto h-[460px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Driver Name</TableHead>
                          <TableHead>Total Trips</TableHead>
                          <TableHead>Total Earnings</TableHead>
                          <TableHead>Worked Days</TableHead>
                          <TableHead>Average Trips/day</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDrivers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              No drivers found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredDrivers.map((driver) => (
                            <TableRow key={driver.driver_id}>
                              <TableCell>
                                <Badge
                                  className={`${getRankBadge(
                                    driver.rank
                                  )} px-2 py-1 rounded-full`}
                                >
                                  {driver.rank === 1 && (
                                    <Trophy className="h-4 w-4 mr-1" />
                                  )}
                                  {driver.rank}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                {driver.driver_name}
                              </TableCell>
                              <TableCell className="font-semibold text-blue-600">
                                {driver.total_trips}
                              </TableCell>
                              <TableCell>
                                ₹{driver.total_earnings.toLocaleString()}
                              </TableCell>
                              <TableCell>{driver.worked_days}</TableCell>
                              <TableCell>
                                <span
                                  className="font-semibold"
                                  style={{
                                    color:
                                      Math.round(
                                        driver.total_trips / driver.worked_days
                                      ) < 10
                                        ? "red"
                                        : Math.round(
                                            driver.total_trips /
                                              driver.worked_days
                                          ) < 11
                                        ? "orange"
                                        : "green",
                                  }}
                                >
                                  {Math.round(
                                    driver.total_trips / driver.worked_days
                                  ).toLocaleString()}
                                  /day
                                </span>
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
          <TabsContent value="combined" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Driver Rankings by Combined Score</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto h-[460px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Driver Name</TableHead>
                          <TableHead>Total Trips</TableHead>
                          <TableHead>Total Earnings</TableHead>
                          <TableHead>Worked Days</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDrivers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              No drivers found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredDrivers.map((driver) => (
                            <TableRow key={driver.driver_id}>
                              <TableCell>
                                <Badge
                                  className={`${getRankBadge(
                                    driver.rank
                                  )} px-2 py-1 rounded-full`}
                                >
                                  {driver.rank === 1 && (
                                    <Trophy className="h-4 w-4 mr-1" />
                                  )}
                                  {driver.rank}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                {driver.driver_name}
                              </TableCell>
                              <TableCell className="font-semibold text-blue-600">
                                {driver.total_trips}
                              </TableCell>
                              <TableCell>
                                ₹{driver.total_earnings.toLocaleString()}
                              </TableCell>
                              <TableCell>{driver.worked_days}</TableCell>
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
          <TabsContent value="low_performance" className="mt-4 ">
            <Card>
              <CardHeader>
                <CardTitle>Low Performance Drivers</CardTitle>
              </CardHeader>
              <CardContent className="">
                {/* Low Performance Filters */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium mb-3">Filter Drivers</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Total Trips
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={lowPerfFilters.minTrips}
                          onChange={(e) =>
                            setLowPerfFilters({
                              ...lowPerfFilters,
                              minTrips: e.target.value,
                            })
                          }
                          className="text-xs"
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={lowPerfFilters.maxTrips}
                          onChange={(e) =>
                            setLowPerfFilters({
                              ...lowPerfFilters,
                              maxTrips: e.target.value,
                            })
                          }
                          className="text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Total Earnings (₹)
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={lowPerfFilters.minEarnings}
                          onChange={(e) =>
                            setLowPerfFilters({
                              ...lowPerfFilters,
                              minEarnings: e.target.value,
                            })
                          }
                          className="text-xs"
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={lowPerfFilters.maxEarnings}
                          onChange={(e) =>
                            setLowPerfFilters({
                              ...lowPerfFilters,
                              maxEarnings: e.target.value,
                            })
                          }
                          className="text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Worked Days
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={lowPerfFilters.minDays}
                          onChange={(e) =>
                            setLowPerfFilters({
                              ...lowPerfFilters,
                              minDays: e.target.value,
                            })
                          }
                          className="text-xs"
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={lowPerfFilters.maxDays}
                          onChange={(e) =>
                            setLowPerfFilters({
                              ...lowPerfFilters,
                              maxDays: e.target.value,
                            })
                          }
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setLowPerfFilters({
                          minTrips: "",
                          maxTrips: "",
                          minEarnings: "",
                          maxEarnings: "",
                          minDays: "",
                          maxDays: "",
                        })
                      }
                    >
                      Clear Filters
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        setLowPerfFilters({
                          minTrips: "",
                          maxTrips: "10",
                          minEarnings: "",
                          maxEarnings: "2000",
                          minDays: "",
                          maxDays: "3",
                        })
                      }
                    >
                      Show Critical Cases
                    </Button>
                  </div>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Driver Name</TableHead>
                          <TableHead>Total Trips</TableHead>
                          <TableHead>Total Earnings</TableHead>
                          <TableHead>Worked Days</TableHead>
                          <TableHead>Performance Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDrivers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              No drivers found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredDrivers.map((driver) => (
                            <TableRow key={driver.driver_id}>
                              <TableCell>
                                <Badge
                                  className={`${getRankBadge(
                                    driver.rank
                                  )} px-2 py-1 rounded-full`}
                                >
                                  {driver.rank === 1 && (
                                    <Trophy className="h-4 w-4 mr-1" />
                                  )}
                                  {driver.rank}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                {driver.driver_name}
                              </TableCell>
                              <TableCell>{driver.total_trips}</TableCell>
                              <TableCell>
                                ₹{driver.total_earnings.toLocaleString()}
                              </TableCell>
                              <TableCell>{driver.worked_days}</TableCell>
                              <TableCell>
                                <span
                                  className="font-semibold px-2 py-1 rounded"
                                  style={{
                                    backgroundColor:
                                      (driver.combined_score || 0) >= 70
                                        ? "#fee2e2"
                                        : (driver.combined_score || 0) >= 40
                                        ? "#fef3c7"
                                        : "#dcfce7",
                                    color:
                                      (driver.combined_score || 0) >= 70
                                        ? "#dc2626"
                                        : (driver.combined_score || 0) >= 40
                                        ? "#d97706"
                                        : "#16a34a",
                                  }}
                                >
                                  {driver.combined_score?.toFixed(1) || "0.0"}
                                </span>
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
      </div>
    </AdminLayout>
  );
};

export default DriverPerformance;
