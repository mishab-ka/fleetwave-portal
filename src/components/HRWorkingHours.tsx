import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  Calendar,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  BarChart3,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getWorkingHoursRange,
  getWeeklyWorkingHours,
  getMonthlyWorkingHours,
  formatHours,
} from "@/services/hrWorkingHoursService";

interface WorkingHoursData {
  date: string;
  active_work_hours: number;
  clock_in_time: string | null;
  clock_out_time: string | null;
  total_sessions: number;
}

interface WeeklyData {
  week_start: string;
  total_hours: number;
  days_worked: number;
  avg_hours_per_day: number;
}

interface MonthlyData {
  month: string;
  year: number;
  total_hours: number;
  days_worked: number;
  avg_hours_per_day: number;
}

const HRWorkingHours: React.FC = () => {
  const { user } = useAuth();
  const [view, setView] = useState<"daily" | "weekly" | "monthly">("daily");
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>(
    []
  );

  // Daily view state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dailyData, setDailyData] = useState<WorkingHoursData[]>([]);

  // Weekly view state
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // Monthly view state
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchStaffList();
  }, []);

  useEffect(() => {
    if (view === "daily") {
      fetchDailyData();
    } else if (view === "weekly") {
      fetchWeeklyData();
    } else if (view === "monthly") {
      fetchMonthlyData();
    }
  }, [
    view,
    selectedStaff,
    currentDate,
    currentWeekStart,
    currentMonth,
    currentYear,
  ]);

  const fetchStaffList = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name")
        .eq("role", "hr_staff")
        .order("name", { ascending: true });

      if (error) throw error;
      setStaffList(data || []);
    } catch (error) {
      console.error("Error fetching staff list:", error);
    }
  };

  const fetchDailyData = async () => {
    setLoading(true);
    try {
      const startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() - 30); // Last 30 days
      const startDateStr = startDate.toISOString().split("T")[0];

      const endDate = new Date(currentDate);
      endDate.setDate(endDate.getDate() + 1);
      const endDateStr = endDate.toISOString().split("T")[0];

      const data = await getWorkingHoursRange(
        selectedStaff === "all" ? null : selectedStaff,
        startDateStr,
        endDateStr
      );

      setDailyData(data);
    } catch (error) {
      console.error("Error fetching daily data:", error);
      setDailyData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyData = async () => {
    setLoading(true);
    try {
      const data = await getWeeklyWorkingHours(
        selectedStaff === "all" ? null : selectedStaff,
        currentWeekStart
      );
      setWeeklyData(data);
    } catch (error) {
      console.error("Error fetching weekly data:", error);
      setWeeklyData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyData = async () => {
    setLoading(true);
    try {
      const data = await getMonthlyWorkingHours(
        selectedStaff === "all" ? null : selectedStaff
      );
      setMonthlyData(data);
    } catch (error) {
      console.error("Error fetching monthly data:", error);
      setMonthlyData([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateDay = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    setCurrentDate(newDate);
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const newWeek = new Date(currentWeekStart);
    newWeek.setDate(newWeek.getDate() + (direction === "next" ? 7 : -7));
    setCurrentWeekStart(newWeek);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "next") {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    } else {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    }
  };

  const getCurrentDayData = () => {
    const todayStr = currentDate.toISOString().split("T")[0];
    return (
      dailyData.find((d) => d.date === todayStr) || {
        date: todayStr,
        active_work_hours: 0,
        clock_in_time: null,
        clock_out_time: null,
        total_sessions: 0,
      }
    );
  };

  const getWeekRange = () => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return {
      start: currentWeekStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      end: weekEnd.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };
  };

  // Staff Breakdown State
  const [staffBreakdown, setStaffBreakdown] = useState<
    Array<{
      staff_id: string;
      staff_name: string;
      hours: number;
      days_worked?: number;
      avg_hours?: number;
    }>
  >([]);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  const fetchStaffBreakdown = async () => {
    if (selectedStaff !== "all") return; // Only show when "All Staff" is selected

    setBreakdownLoading(true);
    try {
      let query = supabase
        .from("hr_staff_daily_stats")
        .select("staff_user_id, active_work_hours, date");

      if (view === "daily") {
        const dateStr = currentDate.toISOString().split("T")[0];
        query = query.eq("date", dateStr);
      } else if (view === "weekly") {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        query = query
          .gte("date", currentWeekStart.toISOString().split("T")[0])
          .lte("date", weekEnd.toISOString().split("T")[0]);
      } else if (view === "monthly") {
        const monthStart = new Date(currentYear, currentMonth, 1);
        const monthEnd = new Date(currentYear, currentMonth + 1, 0);
        query = query
          .gte("date", monthStart.toISOString().split("T")[0])
          .lte("date", monthEnd.toISOString().split("T")[0]);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by staff and calculate totals
      const staffMap: {
        [key: string]: {
          staff_id: string;
          staff_name: string;
          hours: number;
          days: number;
        };
      } = {};

      data?.forEach((record) => {
        if (!staffMap[record.staff_user_id]) {
          staffMap[record.staff_user_id] = {
            staff_id: record.staff_user_id,
            staff_name: "",
            hours: 0,
            days: 0,
          };
        }
        staffMap[record.staff_user_id].hours += record.active_work_hours || 0;
        if ((record.active_work_hours || 0) > 0) {
          staffMap[record.staff_user_id].days += 1;
        }
      });

      // Get staff names
      const staffIds = Object.keys(staffMap);
      if (staffIds.length > 0) {
        const { data: staffData } = await supabase
          .from("users")
          .select("id, name")
          .in("id", staffIds);

        staffData?.forEach((staff) => {
          if (staffMap[staff.id]) {
            staffMap[staff.id].staff_name = staff.name || "Unknown";
          }
        });
      }

      // Convert to array and calculate averages
      const result = Object.values(staffMap).map((staff) => ({
        staff_id: staff.staff_id,
        staff_name: staff.staff_name,
        hours: Math.round(staff.hours * 100) / 100,
        days_worked: staff.days,
        avg_hours:
          staff.days > 0
            ? Math.round((staff.hours / staff.days) * 100) / 100
            : 0,
      }));

      // Sort by hours descending
      result.sort((a, b) => b.hours - a.hours);

      setStaffBreakdown(result);
    } catch (error) {
      console.error("Error fetching staff breakdown:", error);
      setStaffBreakdown([]);
    } finally {
      setBreakdownLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStaff === "all") {
      fetchStaffBreakdown();
    } else {
      setStaffBreakdown([]);
    }
  }, [
    view,
    selectedStaff,
    currentDate,
    currentWeekStart,
    currentMonth,
    currentYear,
  ]);

  if (loading && dailyData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-fleet-purple to-blue-600 bg-clip-text text-transparent">
            Working Hours
          </h2>
          <p className="text-gray-600 mt-1 text-sm">
            Track daily, weekly, and monthly working hours
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-fleet-purple to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Clock className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-gray-500" />
              <Select value={view} onValueChange={(v: any) => setView(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">📅 Daily</SelectItem>
                  <SelectItem value="weekly">📊 Weekly</SelectItem>
                  <SelectItem value="monthly">📈 Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-500" />
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">👥 All Staff</SelectItem>
                  {staffList.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily View */}
      {view === "daily" && (
        <div className="space-y-4">
          {/* Day Navigator */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDay("prev")}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-800">
                    {currentDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                    className="text-xs text-gray-500"
                  >
                    Today
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDay("next")}
                  disabled={
                    currentDate.toISOString().split("T")[0] >=
                    new Date().toISOString().split("T")[0]
                  }
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Current Day Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-none shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/90">
                  Today's Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-white">
                  {formatHours(getCurrentDayData().active_work_hours)}
                </div>
                <p className="text-xs text-white/80 mt-1">Active work time</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 border-none shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/90">
                  Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-white">
                  {getCurrentDayData().total_sessions}
                </div>
                <p className="text-xs text-white/80 mt-1">Clock in sessions</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-none shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/90">
                  Average (30 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-white">
                  {formatHours(
                    dailyData.length > 0
                      ? dailyData.reduce(
                          (sum, d) => sum + d.active_work_hours,
                          0
                        ) / Math.min(30, dailyData.length)
                      : 0
                  )}
                </div>
                <p className="text-xs text-white/80 mt-1">Per day</p>
              </CardContent>
            </Card>
          </div>

          {/* Staff Breakdown - Show individual staff hours */}
          {selectedStaff === "all" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Staff Breakdown -{" "}
                  {currentDate.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {breakdownLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fleet-purple"></div>
                  </div>
                ) : staffBreakdown.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No working hours data available for this day
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead>Staff Member</TableHead>
                          <TableHead>Total Hours</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staffBreakdown.map((staff) => (
                          <TableRow key={staff.staff_id}>
                            <TableCell className="font-medium">
                              {staff.staff_name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  staff.hours >= 8
                                    ? "default"
                                    : staff.hours >= 4
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {formatHours(staff.hours)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {staff.hours >= 8 ? (
                                <Badge className="bg-green-500">Good</Badge>
                              ) : staff.hours >= 4 ? (
                                <Badge className="bg-yellow-500">
                                  Moderate
                                </Badge>
                              ) : (
                                <Badge variant="outline">Low</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Daily History Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Daily History (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead>Active Hours</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Sessions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyData.map((record, index) => {
                      const date = new Date(record.date);
                      const isToday =
                        record.date === currentDate.toISOString().split("T")[0];
                      return (
                        <TableRow
                          key={record.date}
                          className={isToday ? "bg-blue-50 font-semibold" : ""}
                        >
                          <TableCell>
                            {date.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            {date.toLocaleDateString("en-US", {
                              weekday: "short",
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                record.active_work_hours >= 8
                                  ? "default"
                                  : record.active_work_hours >= 4
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {formatHours(record.active_work_hours)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {record.clock_in_time
                              ? new Date(
                                  record.clock_in_time
                                ).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {record.clock_out_time
                              ? new Date(
                                  record.clock_out_time
                                ).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </TableCell>
                          <TableCell>{record.total_sessions}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Weekly View */}
      {view === "weekly" && (
        <div className="space-y-4">
          {/* Week Navigator */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek("prev")}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous Week
                </Button>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-800">
                    {getWeekRange().start} - {getWeekRange().end}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      const dayOfWeek = today.getDay();
                      const diff =
                        today.getDate() -
                        dayOfWeek +
                        (dayOfWeek === 0 ? -6 : 1);
                      const monday = new Date(today.setDate(diff));
                      monday.setHours(0, 0, 0, 0);
                      setCurrentWeekStart(monday);
                    }}
                    className="text-xs text-gray-500"
                  >
                    This Week
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek("next")}
                >
                  Next Week
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-none shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/90">
                  This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-white">
                  {formatHours(weeklyData[0]?.total_hours || 0)}
                </div>
                <p className="text-xs text-white/80 mt-1">Total hours</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 border-none shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/90">
                  Days Worked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-white">
                  {weeklyData[0]?.days_worked || 0}
                </div>
                <p className="text-xs text-white/80 mt-1">Out of 7 days</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-none shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/90">
                  Average/Day
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-white">
                  {formatHours(weeklyData[0]?.avg_hours_per_day || 0)}
                </div>
                <p className="text-xs text-white/80 mt-1">Per working day</p>
              </CardContent>
            </Card>
          </div>

          {/* Staff Breakdown - Show individual staff hours */}
          {selectedStaff === "all" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Staff Breakdown - Week of {getWeekRange().start}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {breakdownLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fleet-purple"></div>
                  </div>
                ) : staffBreakdown.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No working hours data available for this week
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead>Staff Member</TableHead>
                          <TableHead>Total Hours</TableHead>
                          <TableHead>Days Worked</TableHead>
                          <TableHead>Avg Hours/Day</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staffBreakdown.map((staff) => (
                          <TableRow key={staff.staff_id}>
                            <TableCell className="font-medium">
                              {staff.staff_name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  staff.hours >= 40
                                    ? "default"
                                    : staff.hours >= 20
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {formatHours(staff.hours)}
                              </Badge>
                            </TableCell>
                            <TableCell>{staff.days_worked || 0} days</TableCell>
                            <TableCell>
                              {formatHours(staff.avg_hours || 0)}
                            </TableCell>
                            <TableCell>
                              {staff.hours >= 40 ? (
                                <Badge className="bg-green-500">Complete</Badge>
                              ) : staff.hours >= 20 ? (
                                <Badge className="bg-yellow-500">Partial</Badge>
                              ) : (
                                <Badge variant="outline">Low</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Weekly History Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Weekly Summary (Last 12 Weeks)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead>Week</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Days Worked</TableHead>
                      <TableHead>Avg Hours/Day</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weeklyData.map((week, index) => {
                      const weekStart = new Date(week.week_start);
                      const weekEnd = new Date(weekStart);
                      weekEnd.setDate(weekEnd.getDate() + 6);
                      const isCurrentWeek = index === 0;

                      return (
                        <TableRow
                          key={week.week_start}
                          className={
                            isCurrentWeek ? "bg-blue-50 font-semibold" : ""
                          }
                        >
                          <TableCell>
                            {weekStart.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            -{" "}
                            {weekEnd.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                week.total_hours >= 40
                                  ? "default"
                                  : week.total_hours >= 20
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {formatHours(week.total_hours)}
                            </Badge>
                          </TableCell>
                          <TableCell>{week.days_worked} days</TableCell>
                          <TableCell>
                            {formatHours(week.avg_hours_per_day)}
                          </TableCell>
                          <TableCell>
                            {week.total_hours >= 40 ? (
                              <Badge className="bg-green-500">Complete</Badge>
                            ) : week.total_hours >= 20 ? (
                              <Badge className="bg-yellow-500">Partial</Badge>
                            ) : (
                              <Badge variant="outline">Low</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly View */}
      {view === "monthly" && (
        <div className="space-y-4">
          {/* Monthly Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-none shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/90">
                  This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-white">
                  {formatHours(monthlyData[0]?.total_hours || 0)}
                </div>
                <p className="text-xs text-white/80 mt-1">Total hours</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 border-none shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/90">
                  Days Worked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-white">
                  {monthlyData[0]?.days_worked || 0}
                </div>
                <p className="text-xs text-white/80 mt-1">Working days</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-none shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/90">
                  Average/Day
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-white">
                  {formatHours(monthlyData[0]?.avg_hours_per_day || 0)}
                </div>
                <p className="text-xs text-white/80 mt-1">Per working day</p>
              </CardContent>
            </Card>
          </div>

          {/* Staff Breakdown - Show individual staff hours */}
          {selectedStaff === "all" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Staff Breakdown -{" "}
                  {new Date(currentYear, currentMonth).toLocaleDateString(
                    "en-US",
                    {
                      month: "long",
                      year: "numeric",
                    }
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {breakdownLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fleet-purple"></div>
                  </div>
                ) : staffBreakdown.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No working hours data available for this month
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead>Staff Member</TableHead>
                          <TableHead>Total Hours</TableHead>
                          <TableHead>Days Worked</TableHead>
                          <TableHead>Avg Hours/Day</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staffBreakdown.map((staff) => (
                          <TableRow key={staff.staff_id}>
                            <TableCell className="font-medium">
                              {staff.staff_name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  staff.hours >= 160
                                    ? "default"
                                    : staff.hours >= 80
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {formatHours(staff.hours)}
                              </Badge>
                            </TableCell>
                            <TableCell>{staff.days_worked || 0} days</TableCell>
                            <TableCell>
                              {formatHours(staff.avg_hours || 0)}
                            </TableCell>
                            <TableCell>
                              {staff.hours >= 160 ? (
                                <Badge className="bg-green-500">Complete</Badge>
                              ) : staff.hours >= 80 ? (
                                <Badge className="bg-yellow-500">Partial</Badge>
                              ) : (
                                <Badge variant="outline">Low</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Monthly History Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Monthly Summary (Last 12 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Days Worked</TableHead>
                      <TableHead>Avg Hours/Day</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyData.map((month, index) => {
                      const isCurrentMonth = index === 0;
                      return (
                        <TableRow
                          key={`${month.year}-${month.month}`}
                          className={
                            isCurrentMonth ? "bg-blue-50 font-semibold" : ""
                          }
                        >
                          <TableCell>
                            {month.month} {month.year}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                month.total_hours >= 160
                                  ? "default"
                                  : month.total_hours >= 80
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {formatHours(month.total_hours)}
                            </Badge>
                          </TableCell>
                          <TableCell>{month.days_worked} days</TableCell>
                          <TableCell>
                            {formatHours(month.avg_hours_per_day)}
                          </TableCell>
                          <TableCell>
                            {month.total_hours >= 160 ? (
                              <Badge className="bg-green-500">Complete</Badge>
                            ) : month.total_hours >= 80 ? (
                              <Badge className="bg-yellow-500">Partial</Badge>
                            ) : (
                              <Badge variant="outline">Low</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default HRWorkingHours;
