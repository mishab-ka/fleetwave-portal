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
  Phone,
  Clock,
  TrendingUp,
  Users,
  Calendar,
  BarChart3,
  Target,
  AlertCircle,
  Activity,
  Trophy,
} from "lucide-react";
import HRLiveActivityDashboard from "./HRLiveActivityDashboard";
import HRAlertCenter from "./HRAlertCenter";
import HRTargetManagement from "./HRTargetManagement";

interface PerformanceData {
  staff_user_id: string;
  staff_name: string;
  total_calls: number;
  total_duration: number;
  avg_duration: number;
  successful_calls: number;
  conversion_rate: number;
  calls_today: number;
  calls_this_week: number;
  calls_this_month: number;
  calls_by_status: { [key: string]: number };
  calls_by_source: { [key: string]: number };
  daily_breakdown: { [key: string]: number };
  weekly_breakdown: { [key: string]: number };
  monthly_breakdown: { [key: string]: number };
}

interface CallData {
  id: string;
  staff_user_id: string;
  name: string;
  phone: string;
  status: string;
  called_date: string;
  call_duration: number;
  source: string;
  notes: string;
  created_at: string;
  users?: {
    name: string;
  };
}

interface AttendanceData {
  staff_user_id: string;
  staff_name: string;
  total_hours: number;
  total_days: number;
  avg_hours_per_day: number;
}

const HRPerformanceAnalytics: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [callData, setCallData] = useState<CallData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("week");
  const [selectedStaff, setSelectedStaff] = useState("all");
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>(
    []
  );
  const [filteredData, setFilteredData] = useState<PerformanceData[]>([]);
  const [staffNames, setStaffNames] = useState<{ [key: string]: string }>({});
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [activeView, setActiveView] = useState<
    "performance" | "attendance" | "targets" | "alerts" | "live"
  >("performance");

  useEffect(() => {
    fetchStaffList();
    fetchPerformanceData();
    fetchCallData();
    fetchAttendanceData();
  }, [timeFilter, selectedStaff]);

  useEffect(() => {
    filterData();
  }, [performanceData, selectedStaff]);

  useEffect(() => {
    if (Object.keys(staffNames).length > 0) {
      fetchPerformanceData();
    }
  }, [staffNames]);

  const fetchStaffList = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name")
        .eq("role", "hr_staff")
        .order("name", { ascending: true });

      if (error) throw error;
      setStaffList(data || []);

      // Create a mapping of staff IDs to names
      const nameMap: { [key: string]: string } = {};
      data?.forEach((staff) => {
        nameMap[staff.id] = staff.name;
      });
      setStaffNames(nameMap);
    } catch (error) {
      console.error("Error fetching staff list:", error);
    }
  };

  const filterData = () => {
    if (selectedStaff === "all") {
      setFilteredData(performanceData);
    } else {
      setFilteredData(
        performanceData.filter((staff) => staff.staff_user_id === selectedStaff)
      );
    }
  };

  const fetchAttendanceData = async () => {
    try {
      // Calculate date range based on filter
      const now = new Date();
      let startDate: Date;

      switch (timeFilter) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const { data, error } = await supabase
        .from("hr_staff_attendance")
        .select("staff_user_id, total_work_duration_seconds, clock_in_time")
        .gte("clock_in_time", startDate.toISOString());

      if (error) throw error;

      // Aggregate attendance data by staff
      const attendanceMap: { [key: string]: AttendanceData } = {};

      data?.forEach((record) => {
        const staffId = record.staff_user_id;
        if (!attendanceMap[staffId]) {
          attendanceMap[staffId] = {
            staff_user_id: staffId,
            staff_name: staffNames[staffId] || "Unknown",
            total_hours: 0,
            total_days: 0,
            avg_hours_per_day: 0,
          };
        }

        attendanceMap[staffId].total_hours +=
          (record.total_work_duration_seconds || 0) / 3600;
        attendanceMap[staffId].total_days++;
      });

      // Calculate averages
      Object.values(attendanceMap).forEach((staff) => {
        staff.avg_hours_per_day =
          staff.total_days > 0 ? staff.total_hours / staff.total_days : 0;
      });

      setAttendanceData(Object.values(attendanceMap));
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    }
  };

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);

      // Calculate date range based on filter
      const now = new Date();
      let startDate: Date;

      switch (timeFilter) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const { data, error } = await supabase
        .from("hr_call_tracking")
        .select(
          `
          staff_user_id,
          call_duration,
          status,
          called_date,
          source
        `
        )
        .gte("called_date", startDate.toISOString().split("T")[0])
        .order("called_date", { ascending: false });

      if (error) throw error;

      // Process data to calculate performance metrics
      const staffMetrics: { [key: string]: PerformanceData } = {};

      // Get today's date in YYYY-MM-DD format for comparison
      const todayString = now.toISOString().split("T")[0];
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekAgoString = weekAgo.toISOString().split("T")[0];
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthAgoString = monthAgo.toISOString().split("T")[0];

      data?.forEach((call) => {
        const staffId = call.staff_user_id;
        if (!staffMetrics[staffId]) {
          staffMetrics[staffId] = {
            staff_user_id: staffId,
            staff_name: staffNames[staffId] || "Unknown Staff",
            total_calls: 0,
            total_duration: 0,
            avg_duration: 0,
            successful_calls: 0,
            conversion_rate: 0,
            calls_today: 0,
            calls_this_week: 0,
            calls_this_month: 0,
            calls_by_status: {},
            calls_by_source: {},
            daily_breakdown: {},
            weekly_breakdown: {},
            monthly_breakdown: {},
          };
        }

        // Use string comparison for dates (called_date is stored as DATE type in YYYY-MM-DD format)
        const callDateString = call.called_date;

        staffMetrics[staffId].total_calls++;
        staffMetrics[staffId].total_duration += call.call_duration || 0;

        // Count calls today - compare date strings directly
        if (callDateString === todayString) {
          staffMetrics[staffId].calls_today++;
        }

        // Count calls this week
        if (callDateString >= weekAgoString) {
          staffMetrics[staffId].calls_this_week++;
        }

        // Count calls this month
        if (callDateString >= monthAgoString) {
          staffMetrics[staffId].calls_this_month++;
        }

        if (["joined", "hot_lead", "callback"].includes(call.status)) {
          staffMetrics[staffId].successful_calls++;
        }

        // Count by status
        staffMetrics[staffId].calls_by_status[call.status] =
          (staffMetrics[staffId].calls_by_status[call.status] || 0) + 1;

        // Count by source
        if (call.source) {
          staffMetrics[staffId].calls_by_source[call.source] =
            (staffMetrics[staffId].calls_by_source[call.source] || 0) + 1;
        }

        // Daily breakdown
        staffMetrics[staffId].daily_breakdown[callDateString] =
          (staffMetrics[staffId].daily_breakdown[callDateString] || 0) + 1;

        // Weekly breakdown
        const callDate = new Date(callDateString + "T00:00:00");
        const weekKey = getWeekKey(callDate);
        staffMetrics[staffId].weekly_breakdown[weekKey] =
          (staffMetrics[staffId].weekly_breakdown[weekKey] || 0) + 1;

        // Monthly breakdown
        const monthKey = callDateString.substring(0, 7);
        staffMetrics[staffId].monthly_breakdown[monthKey] =
          (staffMetrics[staffId].monthly_breakdown[monthKey] || 0) + 1;
      });

      // Calculate averages and conversion rates
      Object.values(staffMetrics).forEach((staff) => {
        staff.avg_duration =
          staff.total_calls > 0 ? staff.total_duration / staff.total_calls : 0;
        staff.conversion_rate =
          staff.total_calls > 0
            ? (staff.successful_calls / staff.total_calls) * 100
            : 0;
      });

      setPerformanceData(Object.values(staffMetrics));
    } catch (error) {
      console.error("Error fetching performance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCallData = async () => {
    try {
      const { data, error } = await supabase
        .from("hr_call_tracking")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setCallData(data || []);
    } catch (error) {
      console.error("Error fetching call data:", error);
    }
  };

  const getWeekKey = (date: Date) => {
    const year = date.getFullYear();
    const week = Math.ceil(
      (date.getTime() - new Date(year, 0, 1).getTime()) /
        (7 * 24 * 60 * 60 * 1000)
    );
    return `${year}-W${week}`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      joined: "bg-green-100 text-green-800",
      hot_lead: "bg-orange-100 text-orange-800",
      callback: "bg-purple-100 text-purple-800",
      contacted: "bg-blue-100 text-blue-800",
      not_interested: "bg-red-100 text-red-800",
      call_not_picked: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col w-full bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* Header */}

      {/* Filters */}
      <div className="flex-shrink-0 mb-6 px-6">
        <Card className="border-none ">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-40 border-gray-300 focus:ring-2 focus:ring-fleet-purple">
                    <SelectValue placeholder="Time Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">📅 Today</SelectItem>
                    <SelectItem value="week">📊 This Week</SelectItem>
                    <SelectItem value="month">📈 This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger className="w-48 border-gray-300 focus:ring-2 focus:ring-fleet-purple">
                    <SelectValue placeholder="Select Staff" />
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
      </div>

      {/* Two Column Layout - No Scrolling */}
      {/* Performance Overview */}
      <div className="">
        <div className="grid grid-cols-4 gap-4 flex-shrink-0">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/90">
                Total Calls
              </CardTitle>
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Phone className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white">
                {filteredData.reduce(
                  (sum, staff) => sum + staff.total_calls,
                  0
                )}
              </div>
              <p className="text-xs text-white/80 mt-1 font-medium">
                Across all staff
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/90">
                Total Duration
              </CardTitle>
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white">
                {(() => {
                  const totalSeconds = filteredData.reduce(
                    (sum, staff) => sum + staff.total_duration,
                    0
                  );
                  const hours = Math.floor(totalSeconds / 3600);
                  const minutes = Math.floor((totalSeconds % 3600) / 60);
                  return `${hours}h ${minutes}m`;
                })()}
              </div>
              <p className="text-xs text-white/80 mt-1 font-medium">
                Total call time
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/90">
                Avg Duration
              </CardTitle>
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white">
                {filteredData.length > 0
                  ? (() => {
                      const avgSeconds = Math.round(
                        filteredData.reduce(
                          (sum, staff) => sum + staff.avg_duration,
                          0
                        ) / filteredData.length
                      );
                      const minutes = Math.floor(avgSeconds / 60);
                      const seconds = avgSeconds % 60;
                      return `${minutes}m ${seconds}s`;
                    })()
                  : "0m 0s"}
              </div>
              <p className="text-xs text-white/80 mt-1 font-medium">
                Average per call
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/90">
                Conversion Rate
              </CardTitle>
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Trophy className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white">
                {filteredData.length > 0
                  ? Math.round(
                      filteredData.reduce(
                        (sum, staff) => sum + staff.conversion_rate,
                        0
                      ) / filteredData.length
                    )
                  : 0}
                %
              </div>
              <p className="text-xs text-white/80 mt-1 font-medium">
                Average success rate
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 flex-shrink-0 mt-10">
        {/* Recent Activity - Prominent Section */}
        <Card className="flex-1 flex flex-col overflow-y-auto h-[600px] border-none shadow-xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="pb-4 flex-shrink-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-green-200/50">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-800">
                Recent Activity
              </span>
              <Badge className="ml-auto bg-green-500 text-white border-none shadow-sm animate-pulse">
                Live
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <div className="overflow-x-auto h-full overflow-y-auto border border-gray-200 rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="font-bold text-gray-700">
                      Staff
                    </TableHead>
                    <TableHead className="font-bold text-gray-700">
                      Contact
                    </TableHead>
                    <TableHead className="font-bold text-gray-700">
                      Status
                    </TableHead>
                    <TableHead className="font-bold text-gray-700">
                      Duration
                    </TableHead>
                    <TableHead className="font-bold text-gray-700">
                      Source
                    </TableHead>
                    <TableHead className="font-bold text-gray-700">
                      Date & Time
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {callData.slice(0, 20).map((call, index) => (
                    <TableRow
                      key={call.id}
                      className={`hover:bg-green-50/50 transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      }`}
                    >
                      <TableCell className="font-medium">
                        {staffNames[call.staff_user_id] || "Unknown"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{call.name}</div>
                          <div className="text-xs text-gray-500">
                            {call.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(call.status)}>
                          {call.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {Math.floor(call.call_duration / 60)}m{" "}
                        {call.call_duration % 60}s
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {call.source?.toUpperCase() || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>
                          {new Date(call.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(call.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1 flex flex-col overflow-y-auto h-[600px] border-none shadow-xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="pb-4 flex-shrink-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-blue-200/50">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-800">
                Staff Performance Summary
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <div className="overflow-x-auto h-full overflow-y-auto border border-gray-200 rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="font-bold text-gray-700">
                      Staff Member
                    </TableHead>
                    <TableHead className="font-bold text-gray-700">
                      Total Calls
                    </TableHead>
                    <TableHead className="font-bold text-gray-700">
                      Total Duration
                    </TableHead>
                    <TableHead className="font-bold text-gray-700">
                      Avg Duration
                    </TableHead>
                    <TableHead className="font-bold text-gray-700">
                      Success Rate
                    </TableHead>
                    <TableHead className="font-bold text-gray-700">
                      Today
                    </TableHead>
                    <TableHead className="font-bold text-gray-700">
                      This Week
                    </TableHead>
                    <TableHead className="font-bold text-gray-700">
                      This Month
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((staff, index) => (
                    <TableRow
                      key={staff.staff_user_id}
                      className={`hover:bg-blue-50/50 transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      }`}
                    >
                      <TableCell className="font-medium">
                        {staff.staff_name}
                      </TableCell>
                      <TableCell>{staff.total_calls}</TableCell>
                      <TableCell>
                        {formatDuration(staff.total_duration)}
                      </TableCell>
                      <TableCell>
                        {formatDuration(Math.round(staff.avg_duration))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {Math.round(staff.conversion_rate)}%
                        </Badge>
                      </TableCell>
                      <TableCell>{staff.calls_today}</TableCell>
                      <TableCell>{staff.calls_this_week}</TableCell>
                      <TableCell>{staff.calls_this_month}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HRPerformanceAnalytics;
